#!/usr/bin/env python3
"""Run trigger evaluation for a skill description (OpenCode port).

Tests whether a skill's description causes the model to trigger (load the
skill) for a set of queries. Runs `opencode2 run --format json` per query and
watches the NDJSON event stream for a `skill` tool call whose input id
matches the registered eval skill. Outputs results as JSON.

The original Anthropic version shelled out to the Claude Code CLI (`claude -p`
plus `.claude/commands/`). OpenCode discovers skills from `.opencode/skills/`
directories, and the background service keeps advertising a skill for a while
even after its directory disappears (client+kills can't stop a server-side
session). So this port registers ONE uniquely named skill for the whole eval
invocation, reuses it for every query, and deletes it once at the end — that
keeps the advertised list stable during the run and avoids empty or
missing-skill artifacts.
"""

import argparse
import json
import queue
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from scripts.utils import find_opencode_cli, parse_skill_md


def find_project_root() -> Path:
    """Find the project root by walking up from cwd.

    The eval skill is registered under the root's `.opencode/skills/` so
    `opencode2 run` (started with cwd=root) discovers it. Both `.opencode`
    and `.claude` count as root markers, matching what OpenCode itself
    treats as project roots.
    """
    current = Path.cwd()
    for parent in [current, *current.parents]:
        if (parent / ".opencode").is_dir() or (parent / ".claude").is_dir():
            return parent
    return current


def _clean_skill_name(skill_name: str) -> str:
    """Normalize a skill name into a lowercase kebab id."""
    return re.sub(r"[^a-z0-9]+", "-", skill_name.lower()).strip("-") or "skill"


def _register_eval_skill(project_root: Path, skill_name: str, description: str) -> tuple[Path, str]:
    """Copy the skill under test into `.opencode/skills/` under a unique id.

    The candidate description goes into the frontmatter because that is what
    the model sees when deciding whether to load the skill. The directory is
    kept for the whole eval invocation and removed by the caller afterwards;
    deleting per-query races with server-side sessions that keep running after
    the CLI is killed.
    """
    clean_name = _clean_skill_name(skill_name)
    skill_dir_name = f"{clean_name}-skill-{uuid.uuid4().hex[:8]}"
    skill_dir = project_root / ".opencode" / "skills" / skill_dir_name
    skill_dir.mkdir(parents=True, exist_ok=True)
    indented_desc = "\n  ".join(description.splitlines())
    (skill_dir / "SKILL.md").write_text(
        f"---\n"
        f"name: {clean_name}\n"
        f"description: |\n"
        f"  {indented_desc}\n"
        f"---\n\n"
        f"# {clean_name}\n\n"
        f"This skill handles: {description}\n",
        encoding="utf-8",
    )
    return skill_dir, skill_dir_name


def _line_verdict(line: str, clean_name: str, skill_dir_name: str) -> bool | None:
    """Classify one NDJSON event line.

    Returns True as soon as a skill with our registered id (or a leftover of
    an earlier eval of the same skill) is loaded, and None for everything
    else so the scan continues. A run is only decided "not triggered" once
    the stream ends — an unrelated tool call first does not mean the skill
    can't be loaded later in the same run.
    """
    try:
        event = json.loads(line)
    except (json.JSONDecodeError, TypeError):
        return None
    if event.get("type") != "tool_use":
        return None
    part = event.get("part") or {}
    if part.get("type") != "tool":
        return None
    tool = part.get("tool")
    tool_input = (part.get("state") or {}).get("input") or {}
    if tool == "skill":
        skill_id = str(tool_input.get("id", ""))
        if skill_id == skill_dir_name:
            return True
        # The background service can advertise leftovers of earlier evals of
        # this same skill; they carry the same description, so triggering on
        # one is a real trigger. The strict pattern (our own id shape) keeps
        # unrelated real skills with similar names from matching.
        return re.fullmatch(re.escape(clean_name) + r"-skill-[0-9a-f]{8}", skill_id) is not None
    if tool == "read":
        return skill_dir_name in str(tool_input.get("path", ""))
    return None


def _stream_lines(process, out_queue: "queue.Queue[str | None]") -> None:
    """Drain the process stdout into a queue; None marks EOF."""
    assert process.stdout is not None
    for line in process.stdout:
        out_queue.put(line)
    out_queue.put(None)


def _decode_run(process, clean_name: str, skill_dir_name: str, timeout: int) -> bool:
    """Watch the run's event stream until the trigger verdict is decided.

    The background service keeps running the session even after the client is
    killed, so we only wait for the trigger decision and return immediately;
    the caller kills the client to stop local streaming.
    """
    out: "queue.Queue[str | None]" = queue.Queue()
    threading.Thread(target=_stream_lines, args=(process, out), daemon=True).start()

    start = time.time()
    while time.time() - start < timeout:
        try:
            line = out.get(timeout=1.0)
        except queue.Empty:
            continue
        if line is None:
            break
        verdict = _line_verdict(line, clean_name, skill_dir_name)
        if verdict is not None:
            return verdict
    return False


def run_single_query(
    query: str,
    clean_name: str,
    skill_dir_name: str,
    timeout: int,
    project_root: Path,
    model: str | None = None,
) -> bool:
    """Run a single query and return whether the skill was triggered."""
    cmd = [find_opencode_cli(), "run", "--format", "json", "--auto"]
    if model:
        cmd.extend(["--model", model])
    cmd.append(query)

    process = None
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            cwd=project_root,
            text=True,
            encoding="utf-8",
        )
        return _decode_run(process, clean_name, skill_dir_name, timeout)
    finally:
        if process is not None and process.poll() is None:
            process.kill()
            process.wait()


def _remove_skill_dir(skill_dir: Path, attempts: int = 10, delay: float = 1.0) -> None:
    """Delete the eval skill directory, retrying while it is still locked.

    Server-side sessions outlive the killed CLI, so the background service
    may keep the directory's files open for a few seconds after the eval
    finishes; on Windows that makes deletion fail transiently.
    """
    for _ in range(attempts):
        shutil.rmtree(skill_dir, ignore_errors=True)
        if not skill_dir.exists():
            return
        time.sleep(delay)
    print(f"Warning: could not remove {skill_dir}; delete it manually", file=sys.stderr)


def run_eval(
    eval_set: list[dict],
    skill_name: str,
    description: str,
    num_workers: int,
    timeout: int,
    project_root: Path,
    runs_per_query: int = 1,
    trigger_threshold: float = 0.5,
    model: str | None = None,
) -> dict:
    """Run the full eval set and return results."""
    clean_name = _clean_skill_name(skill_name)
    skill_dir, skill_dir_name = _register_eval_skill(project_root, skill_name, description)

    results = []
    try:
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            future_to_info = {}
            for item in eval_set:
                for run_idx in range(runs_per_query):
                    future = executor.submit(
                        run_single_query,
                        item["query"],
                        clean_name,
                        skill_dir_name,
                        timeout,
                        project_root,
                        model,
                    )
                    future_to_info[future] = (item, run_idx)

            query_triggers: dict[str, list[bool]] = {}
            query_items: dict[str, dict] = {}
            for future in as_completed(future_to_info):
                item, _ = future_to_info[future]
                query = item["query"]
                query_items[query] = item
                if query not in query_triggers:
                    query_triggers[query] = []
                try:
                    query_triggers[query].append(future.result())
                except Exception as e:
                    print(f"Warning: query failed: {e}", file=sys.stderr)
                    query_triggers[query].append(False)

        for query, triggers in query_triggers.items():
            item = query_items[query]
            trigger_rate = sum(triggers) / len(triggers)
            should_trigger = item["should_trigger"]
            if should_trigger:
                did_pass = trigger_rate >= trigger_threshold
            else:
                did_pass = trigger_rate < trigger_threshold
            results.append({
                "query": query,
                "should_trigger": should_trigger,
                "trigger_rate": trigger_rate,
                "triggers": sum(triggers),
                "runs": len(triggers),
                "pass": did_pass,
            })
    finally:
        _remove_skill_dir(skill_dir)

    passed = sum(1 for r in results if r["pass"])
    total = len(results)

    return {
        "skill_name": skill_name,
        "description": description,
        "results": results,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": total - passed,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Run trigger evaluation for a skill description")
    parser.add_argument("--eval-set", required=True, help="Path to eval set JSON file")
    parser.add_argument("--skill-path", required=True, help="Path to skill directory")
    parser.add_argument("--description", default=None, help="Override description to test")
    parser.add_argument("--num-workers", type=int, default=10, help="Number of parallel workers")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout per query in seconds")
    parser.add_argument("--runs-per-query", type=int, default=3, help="Number of runs per query")
    parser.add_argument("--trigger-threshold", type=float, default=0.5, help="Trigger rate threshold")
    parser.add_argument("--model", default=None, help="Model to use for opencode2 run (default: user's configured model)")
    parser.add_argument("--verbose", action="store_true", help="Print progress to stderr")
    args = parser.parse_args()

    eval_set = json.loads(Path(args.eval_set).read_text())
    skill_path = Path(args.skill_path)

    if not (skill_path / "SKILL.md").exists():
        print(f"Error: No SKILL.md found at {skill_path}", file=sys.stderr)
        sys.exit(1)

    name, original_description, content = parse_skill_md(skill_path)
    description = args.description or original_description
    project_root = find_project_root()

    if args.verbose:
        print(f"Evaluating: {description}", file=sys.stderr)

    output = run_eval(
        eval_set=eval_set,
        skill_name=name,
        description=description,
        num_workers=args.num_workers,
        timeout=args.timeout,
        project_root=project_root,
        runs_per_query=args.runs_per_query,
        trigger_threshold=args.trigger_threshold,
        model=args.model,
    )

    if args.verbose:
        summary = output["summary"]
        print(f"Results: {summary['passed']}/{summary['total']} passed", file=sys.stderr)
        for r in output["results"]:
            status = "PASS" if r["pass"] else "FAIL"
            rate_str = f"{r['triggers']}/{r['runs']}"
            print(f"  [{status}] rate={rate_str} expected={r['should_trigger']}: {r['query'][:70]}", file=sys.stderr)

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()