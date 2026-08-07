"""Shared utilities for skill-creator scripts."""

import shutil
import subprocess
import sys
from pathlib import Path



def parse_skill_md(skill_path: Path) -> tuple[str, str, str]:
    """Parse a SKILL.md file, returning (name, description, full_content)."""
    content = (skill_path / "SKILL.md").read_text()
    lines = content.split("\n")

    if lines[0].strip() != "---":
        raise ValueError("SKILL.md missing frontmatter (no opening ---)")

    end_idx = None
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end_idx = i
            break

    if end_idx is None:
        raise ValueError("SKILL.md missing frontmatter (no closing ---)")

    name = ""
    description = ""
    frontmatter_lines = lines[1:end_idx]
    i = 0
    while i < len(frontmatter_lines):
        line = frontmatter_lines[i]
        if line.startswith("name:"):
            name = line[len("name:"):].strip().strip('"').strip("'")
        elif line.startswith("description:"):
            value = line[len("description:"):].strip()
            # Handle YAML multiline indicators (>, |, >-, |-)
            if value in (">", "|", ">-", "|-"):
                continuation_lines: list[str] = []
                i += 1
                while i < len(frontmatter_lines) and (frontmatter_lines[i].startswith("  ") or frontmatter_lines[i].startswith("\t")):
                    continuation_lines.append(frontmatter_lines[i].strip())
                    i += 1
                description = " ".join(continuation_lines)
                continue
            else:
                description = value.strip('"').strip("'")
        i += 1

    return name, description, content


def find_opencode_cli() -> str:
    """Locate the opencode2 executable, resolving npm shims on Windows.

    npm puts `.cmd`/`.ps1` shims on PATH, which Python's subprocess cannot
    execute directly (WinError 2). Look for a real binary next to the shim
    (npm global layout), then fall back to scanning `where` output on
    Windows for any other executable on PATH.
    """
    candidate = shutil.which("opencode2")
    if candidate and candidate.lower().endswith(".exe"):
        return candidate
    if candidate:
        shim_dir = Path(candidate).resolve().parent
        pkg_bin = shim_dir / "node_modules" / "@opencode-ai" / "cli" / "bin" / "opencode2.exe"
        if pkg_bin.is_file():
            return str(pkg_bin)
    if sys.platform == "win32":
        try:
            where = subprocess.run(
                ["where", "opencode2"], capture_output=True, text=True, timeout=10
            )
            for line in where.stdout.splitlines():
                if line.strip().lower().endswith(".exe"):
                    return line.strip()
        except (OSError, subprocess.SubprocessError):
            pass
    hint = f" (shell finds a shim at {candidate})" if candidate else ""
    raise RuntimeError(
        "opencode2 CLI not found; install OpenCode V2 "
        "(npm install -g @opencode-ai/cli@next)" + hint
    )
