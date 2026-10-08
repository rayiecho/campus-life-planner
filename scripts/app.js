import { checkField, checkTask, checkCap, checkTag, collapseSpaces } from './validators.js';
import {
  showError, clearErrors, setStatus, renderTasks, setSortIndicator, focusInTask,
  renderStats, renderChart, renderCap, renderTagChips, downloadFile
} from './ui.js';
import {
  getTasks, setTasks, addTask, updateTask, deleteTask, findTask,
  getSettings, updateSettings, resetSettings, getCounter, setCounter
} from './state.js';
import {
  loadTasks, saveTasks, loadSettings, saveSettings, loadCounter, saveCounter,
  buildExport, parseImport, validateTasks
} from './storage.js';
import { compileRegex, parseQuery, filterTasks, sortTasks } from './search.js';
import { computeStats, capStatus, localDateString } from './stats.js';

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

// Every change to the tasks is saved straight away
function persist() {
  const ok = saveTasks(getTasks()) && saveCounter(getCounter());
  if (!ok) setStatus('data-status', "Couldn't save to this browser. Your changes will be lost when you close the page.");
}

function afterChange() {
  refresh();
  updateDashboard();
  persist();
}

function saveAllSettings() {
  if (!saveSettings(getSettings())) setStatus('data-status', "Couldn't save your settings in this browser.");
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

// Settings

const settingsForm = document.getElementById('settings-form');
const capInput = document.getElementById('weekly-cap');
const newTagInput = document.getElementById('new-tag');

// pressing Enter in a settings field would otherwise reload the page
settingsForm.addEventListener('submit', e => e.preventDefault());

function showSettings() {
  const { unit, weeklyCap, tags } = getSettings();
  document.getElementById(unit === 'hours' ? 'unit-hr' : 'unit-min').checked = true;
  capInput.value = weeklyCap || '';
  renderTagChips(tags);
}

// Minutes or hours. Tasks are always saved in minutes, this only changes how they're shown.
settingsForm.addEventListener('change', e => {
  if (e.target.name !== 'unit') return;
  updateSettings({ unit: e.target.value });
  saveAllSettings();
  refresh();
  updateDashboard();
  setStatus('data-status', `Showing time in ${e.target.value}.`);
});

capInput.addEventListener('change', () => {
  const value = capInput.value.trim();
  const msg = checkCap(value);
  showError(capInput, msg);
  if (msg) return;
  updateSettings({ weeklyCap: value === '' ? 0 : Number(value) });
  saveAllSettings();
  updateDashboard();
});

capInput.addEventListener('input', () => {
  if (capInput.hasAttribute('aria-invalid')) showError(capInput, checkCap(capInput.value.trim()));
});

function addTag() {
  const tag = collapseSpaces(newTagInput.value.trim());
  const tags = getSettings().tags;
  let msg = checkTag(tag);
  if (!msg && tags.some(t => t.toLowerCase() === tag.toLowerCase())) msg = `"${tag}" is already a tag.`;
  showError(newTagInput, msg);
  if (msg) {
    newTagInput.focus();
    return;
  }

  updateSettings({ tags: [...tags, tag] });
  saveAllSettings();
  renderTagChips(getSettings().tags);
  newTagInput.value = '';
  setStatus('data-status', `Added tag "${tag}".`);
}

document.getElementById('add-tag-btn').addEventListener('click', addTag);
newTagInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTag();
  }
});
newTagInput.addEventListener('input', () => {
  if (newTagInput.hasAttribute('aria-invalid')) showError(newTagInput, '');
});

// Removing a tag doesn't touch existing tasks, it just stops suggesting it
document.getElementById('tag-chips').addEventListener('click', e => {
  const btn = e.target.closest('.chip-remove');
  if (!btn) return;
  const tag = btn.dataset.tag;
  const tags = getSettings().tags;
  if (tags.length === 1) {
    setStatus('data-status', 'You need to keep at least one tag.');
    return;
  }

  const index = tags.indexOf(tag);
  updateSettings({ tags: tags.filter(t => t !== tag) });
  saveAllSettings();
  renderTagChips(getSettings().tags);
  setStatus('data-status', `Removed tag "${tag}".`);

  // move focus to a nearby chip so keyboard users don't get sent back to the top
  const buttons = document.querySelectorAll('#tag-chips .chip-remove');
  (buttons[Math.min(index, buttons.length - 1)] || newTagInput).focus();
});

// Import, export and clear

document.getElementById('export-btn').addEventListener('click', () => {
  const name = `campus-planner-${localDateString()}.json`;
  downloadFile(name, buildExport(getTasks(), getSettings()));
  setStatus('data-status', `Exported ${getTasks().length} tasks to ${name}.`);
});

const importInput = document.getElementById('import-file');

importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  importInput.value = ''; // so picking the same file again still triggers change
  if (!file) return;

  let text;
  try {
    text = await file.text();
  } catch {
    setStatus('data-status', "Couldn't read that file.");
    return;
  }

  const result = parseImport(text);
  if (!result.ok) {
    const shown = result.problems.slice(0, 3).join(' ');
    const more = result.problems.length > 3 ? ` (and ${result.problems.length - 3} more problems)` : '';
    setStatus('data-status', `Import cancelled. ${shown}${more}`);
    return;
  }

  if (!confirm(`Replace your ${getTasks().length} tasks with ${result.tasks.length} tasks from "${file.name}"?`)) {
    setStatus('data-status', 'Import cancelled.');
    return;
  }

  editingId = null;
  setTasks(result.tasks);
  setCounter(getCounter());
  if (result.settings) {
    updateSettings(result.settings);
    saveAllSettings();
    showSettings();
  }
  afterChange();
  setStatus('data-status', `Imported ${result.tasks.length} tasks from "${file.name}".`);
});

document.getElementById('clear-btn').addEventListener('click', () => {
  if (!confirm('Delete all tasks and reset settings? Export first if you want a backup.')) return;
  editingId = null;
  setTasks([]);
  resetSettings();
  saveAllSettings();
  showSettings();
  afterChange();
  setStatus('data-status', 'All data cleared.');
});

// Keyboard shortcuts: "/" jumps to search, "n" jumps to the add form.
// Ignored while typing in a field so they never get in the way.
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const typing = e.target.closest('input, select, textarea, [contenteditable]');
  if (typing) return;

  if (e.key === '/') {
    e.preventDefault();
    searchInput.focus();
  } else if (e.key === 'n') {
    e.preventDefault();
    document.getElementById('title').focus();
  }
});

// Start up

// Only used the very first time, when nothing has been saved yet
async function loadSeed() {
  try {
    const res = await fetch('seed.json');
    if (!res.ok) throw new Error(res.status);
    return validateTasks(await res.json()).valid;
  } catch {
    return [];
  }
}

updateSettings(loadSettings());
const saved = loadTasks();
setTasks(saved === null ? await loadSeed() : saved);
setCounter(loadCounter());
showSettings();
afterChange();