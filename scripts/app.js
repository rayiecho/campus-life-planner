import { checkField, checkTask, checkCap, collapseSpaces } from './validators.js';
import {
  showError, clearErrors, setStatus, renderTasks, setSortIndicator, focusInTask,
  renderStats, renderChart, renderCap
} from './ui.js';
import {
  getTasks, setTasks, addTask, updateTask, deleteTask, findTask, getSettings, updateSettings
} from './state.js';
import { compileRegex, parseQuery, filterTasks, sortTasks } from './search.js';
import { computeStats, capStatus } from './stats.js';

const form = document.getElementById('task-form');
const tasksSection = document.getElementById('tasks');
const searchInput = document.getElementById('search');
const caseToggle = document.getElementById('case-toggle');
const sortSelect = document.getElementById('sort');

let editingId = null;
let newId = null;

// input id -> field name in the task object
const fields = {
  'title': 'title',
  'due-date': 'dueDate',
  'duration': 'duration',
  'tag': 'tag'
};

// Drawing the list

function refresh() {
  const query = parseQuery(searchInput.value);
  const { re, error } = compileRegex(query.pattern, caseToggle.checked);
  const all = getTasks();
  const shown = sortTasks(filterTasks(all, query, re), sortSelect.value);

  let emptyText = 'No tasks yet. Add your first one below.';
  if (all.length && !shown.length) emptyText = 'No tasks match that search.';

  renderTasks({ list: shown, re, editingId, newId, unit: getSettings().unit, emptyText });
  setSortIndicator(sortSelect.value);
  newId = null;

  return { shown: shown.length, total: all.length, error };
}

// Search and sort only change the list. Adding, editing and deleting change the numbers too.
function updateDashboard() {
  const { unit, weeklyCap } = getSettings();
  const stats = computeStats(getTasks());
  renderStats(stats, unit);
  renderChart(stats.days, unit);
  renderCap(capStatus(stats.next7, weeklyCap), stats.next7, weeklyCap, unit);
}

function afterChange() {
  refresh();
  updateDashboard();
}

function runSearch() {
  const { shown, total, error } = refresh();
  if (error) {
    setStatus('search-status', `That pattern isn't valid regex, so it's being ignored. (${error})`);
  } else if (searchInput.value) {
    setStatus('search-status', `${shown} of ${total} tasks match.`);
  } else {
    setStatus('search-status', '');
  }
}

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 200);
});
caseToggle.addEventListener('change', runSearch);
sortSelect.addEventListener('change', refresh);

// Add task form

function readForm() {
  const task = {};
  for (const [id, name] of Object.entries(fields)) {
    task[name] = document.getElementById(id).value;
  }
  return task;
}

function validateInput(input) {
  const msg = checkField(fields[input.id], input.value);
  showError(input, msg);
  return msg === '';
}

for (const id of Object.keys(fields)) {
  const input = document.getElementById(id);

  // check when leaving the field
  input.addEventListener('blur', () => {
    if (id === 'title') input.value = collapseSpaces(input.value);
    if (input.value !== '') validateInput(input);
  });

  // once a field has an error, re-check as the user types so the error clears
  input.addEventListener('input', () => {
    if (input.hasAttribute('aria-invalid')) validateInput(input);
  });
}

form.addEventListener('submit', e => {
  e.preventDefault();

  const titleInput = document.getElementById('title');
  titleInput.value = collapseSpaces(titleInput.value);

  const data = readForm();
  const errors = checkTask(data);
  let firstBad = null;

  for (const [id, name] of Object.entries(fields)) {
    const input = document.getElementById(id);
    showError(input, errors[name] || '');
    if (errors[name] && !firstBad) firstBad = input;
  }

  if (firstBad) {
    const count = Object.keys(errors).length;
    setStatus('form-status', `Fix ${count} ${count === 1 ? 'field' : 'fields'} before saving.`);
    firstBad.focus();
    return;
  }

  const task = addTask(data);
  newId = task.id;
  form.reset();
  afterChange();
  setStatus('form-status', `Added "${task.title}".`);
  titleInput.focus();
});

form.addEventListener('reset', () => {
  clearErrors(form);
  document.getElementById('form-status').textContent = '';
});

// Edit and delete in the list

function startEdit(id) {
  editingId = id;
  refresh();
  focusInTask(id, 'input');
}

function cancelEdit() {
  const id = editingId;
  editingId = null;
  refresh();
  focusInTask(id, '[data-action="edit"]');
  setStatus('search-status', 'Edit cancelled.');
}

function removeTask(id) {
  const task = findTask(id);
  if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;
  deleteTask(id);
  if (editingId === id) editingId = null;
  afterChange();
  setStatus('search-status', `Deleted "${task.title}".`);
  searchInput.focus();
}

tasksSection.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn || !findTask(btn.dataset.id)) return;

  const { action, id } = btn.dataset;
  if (action === 'edit') startEdit(id);
  if (action === 'delete') removeTask(id);
  if (action === 'cancel') cancelEdit();
});

tasksSection.addEventListener('submit', e => {
  const editForm = e.target.closest('.edit-form');
  if (!editForm) return;
  e.preventDefault();

  const input = name => editForm.elements.namedItem(name);
  input('title').value = collapseSpaces(input('title').value);

  const data = {
    title: input('title').value,
    dueDate: input('dueDate').value,
    duration: input('duration').value,
    tag: input('tag').value
  };

  const errors = checkTask(data);
  let firstBad = null;
  for (const name of ['title', 'dueDate', 'duration', 'tag']) {
    showError(input(name), errors[name] || '');
    if (errors[name] && !firstBad) firstBad = input(name);
  }

  if (firstBad) {
    firstBad.focus();
    setStatus('search-status', 'Fix the fields marked with ! before saving.');
    return;
  }

  const id = editForm.dataset.id;
  updateTask(id, data);
  editingId = null;
  afterChange();
  focusInTask(id, '[data-action="edit"]');
  setStatus('search-status', `Saved changes to "${data.title}".`);
});

// check edit fields when leaving them, same as the add form
tasksSection.addEventListener('focusout', e => {
  const target = e.target;
  if (!target.closest('.edit-form') || target.tagName !== 'INPUT') return;
  if (target.value !== '') showError(target, checkField(target.name, target.value));
});

// clear an error while typing, so the Save button doesn't jump when the field loses focus
tasksSection.addEventListener('input', e => {
  const target = e.target;
  if (target.closest('.edit-form') && target.hasAttribute('aria-invalid')) {
    showError(target, checkField(target.name, target.value));
  }
});

tasksSection.addEventListener('keydown', e => {
  if (e.key === 'Escape' && editingId) cancelEdit();
});

// Settings: weekly target (the rest of Settings is added in M6)

const settingsForm = document.getElementById('settings-form');
const capInput = document.getElementById('weekly-cap');

// pressing Enter in a settings field would otherwise reload the page
settingsForm.addEventListener('submit', e => e.preventDefault());

capInput.addEventListener('change', () => {
  const value = capInput.value.trim();
  const msg = checkCap(value);
  showError(capInput, msg);
  if (msg) return;
  updateSettings({ weeklyCap: value === '' ? 0 : Number(value) });
  updateDashboard();
});

capInput.addEventListener('input', () => {
  if (capInput.hasAttribute('aria-invalid')) showError(capInput, checkCap(capInput.value.trim()));
});

// Start up

function fillTagList(tags) {
  const list = document.getElementById('tag-list');
  list.replaceChildren(...tags.map(tag => {
    const option = document.createElement('option');
    option.value = tag;
    return option;
  }));
}

// For now the sample tasks load every time the page opens.
// M6 replaces this with localStorage.
async function loadSeed() {
  try {
    const res = await fetch('seed.json');
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (Array.isArray(data)) setTasks(data);
  } catch {
    // no seed file, start with an empty list
  }
}

fillTagList(getSettings().tags);
capInput.value = getSettings().weeklyCap || '';
await loadSeed();
afterChange();