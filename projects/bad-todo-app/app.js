const STORAGE_KEY = 'todos';

let todos = [];
let filter = 'all';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const remainingEl = document.getElementById('remaining');
const emptyState = document.getElementById('empty-state');
const clearBtn = document.getElementById('clear-completed');

function load() {
  try {
    todos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    todos = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function render() {
  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'completed') return t.done;
    return true;
  });

  list.innerHTML = '';

  for (const todo of filtered) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.done ? ' completed' : '');

    const check = document.createElement('button');
    check.className = 'todo-check' + (todo.done ? ' checked' : '');
    check.setAttribute('aria-label', todo.done ? 'Mark incomplete' : 'Mark complete');
    check.addEventListener('click', () => toggle(todo.id));
    li.appendChild(check);

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;
    li.appendChild(span);

    const del = document.createElement('button');
    del.className = 'todo-delete';
    del.textContent = '×';
    del.setAttribute('aria-label', 'Delete');
    del.addEventListener('click', () => remove(todo.id));
    li.appendChild(del);

    list.appendChild(li);
  }

  const remaining = todos.filter((t) => !t.done).length;
  remainingEl.textContent = remaining;

  if (todos.length === 0 || filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }
}

function add(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.push({ id: Date.now(), text: trimmed, done: false });
  save();
  render();
  input.value = '';
  input.focus();
}

function toggle(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    save();
    render();
  }
}

function remove(id) {
  todos = todos.filter((t) => t.id !== id);
  save();
  render();
}

function clearCompleted() {
  todos = todos.filter((t) => !t.done);
  save();
  render();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  add(input.value);
});

document.querySelectorAll('.filter').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.filter.active').classList.remove('active');
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});

clearBtn.addEventListener('click', clearCompleted);

load();
render();
