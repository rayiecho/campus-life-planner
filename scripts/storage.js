// Saving to localStorage, plus checking JSON before it's allowed in.

import { checkTask, checkTag } from './validators.js';
import { DEFAULT_SETTINGS } from './state.js';

const KEYS = {
  tasks: 'planner:tasks',
  settings: 'planner:settings',
  counter: 'planner:counter'
};

// localStorage can throw (private mode, storage full), and the saved text might not be valid JSON
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Checking records

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

// Returns what's wrong with one record, or '' if it's fine
export function checkRecord(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'is not an object';
  if (typeof r.id !== 'string' || !/^task_\d+$/.test(r.id)) return 'has a missing or badly formed id';

  for (const key of ['title', 'dueDate', 'tag', 'createdAt', 'updatedAt']) {
    if (typeof r[key] !== 'string') return `is missing "${key}"`;
  }
  if (typeof r.duration !== 'number' || !Number.isFinite(r.duration)) return 'has a duration that is not a number';

  const errors = checkTask(r);
  const first = Object.keys(errors)[0];
  if (first) return `has a bad ${first}: ${errors[first]}`;

  for (const key of ['createdAt', 'updatedAt']) {
    if (!ISO_TIME.test(r[key]) || Number.isNaN(Date.parse(r[key]))) return `has a bad ${key} timestamp`;
  }
  return '';
}

// Only keep the fields the app knows about
function cleanRecord(r) {
  const { id, title, dueDate, duration, tag, createdAt, updatedAt } = r;
  return { id, title, dueDate, duration, tag, createdAt, updatedAt };
}

// Goes through a list and splits it into good records and problems
export function validateTasks(list) {
  if (!Array.isArray(list)) return { valid: [], problems: ['Expected a list of tasks.'] };

  const valid = [];
  const problems = [];
  const seen = new Set();

  list.forEach((r, i) => {
    const problem = checkRecord(r);
    if (problem) problems.push(`Task ${i + 1} ${problem}.`);
    else if (seen.has(r.id)) problems.push(`Task ${i + 1} has a duplicate id (${r.id}).`);
    else {
      seen.add(r.id);
      valid.push(cleanRecord(r));
    }
  });

  return { valid, problems };
}

// Bad settings fields fall back to the defaults instead of breaking the app
export function validateSettings(s) {
  const out = { ...DEFAULT_SETTINGS, tags: [...DEFAULT_SETTINGS.tags] };
  if (!s || typeof s !== 'object') return out;

  if (s.unit === 'minutes' || s.unit === 'hours') out.unit = s.unit;
  if (typeof s.weeklyCap === 'number' && Number.isFinite(s.weeklyCap) && s.weeklyCap >= 0) out.weeklyCap = s.weeklyCap;
  if (Array.isArray(s.tags)) {
    const tags = s.tags.filter(t => typeof t === 'string' && checkTag(t) === '');
    if (tags.length) out.tags = [...new Set(tags)];
  }
  return out;
}

// localStorage

// null means nothing was ever saved, so the app can load the sample tasks instead
export function loadTasks() {
  const saved = read(KEYS.tasks, null);
  if (saved === null) return null;
  // keep whatever is still good if the saved data got damaged
  return validateTasks(saved).valid;
}

export const saveTasks = tasks => write(KEYS.tasks, tasks);
export const loadSettings = () => validateSettings(read(KEYS.settings, null));
export const saveSettings = settings => write(KEYS.settings, settings);
export const loadCounter = () => Number(read(KEYS.counter, 0)) || 0;
export const saveCounter = n => write(KEYS.counter, n);

// Import and export

export function buildExport(tasks, settings) {
  return JSON.stringify({
    app: 'campus-planner',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    tasks
  }, null, 2);
}

// Takes the text of a file. Accepts our export format, or a plain list like seed.json.
// The whole import is rejected if any record is bad, so nothing half-loads.
export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, problems: ["This file isn't valid JSON."] };
  }

  let list = data;
  let settings = null;
  if (data && !Array.isArray(data) && typeof data === 'object') {
    if (!Array.isArray(data.tasks)) return { ok: false, problems: ['No "tasks" list found in the file.'] };
    list = data.tasks;
    settings = data.settings ? validateSettings(data.settings) : null;
  }

  const { valid, problems } = validateTasks(list);
  if (problems.length) return { ok: false, problems };
  return { ok: true, tasks: valid, settings };
}