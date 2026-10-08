// Regex rules for the task form and settings.

export const patterns = {
  title: /^\S(?:.*\S)?$/,
  duration: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  tag: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  // back-reference: \1 matches whatever (\w+) matched, so "the the" is caught
  duplicateWord: /\b(\w+)\s+\1\b/i
};

// "Group   meeting" becomes "Group meeting"
export function collapseSpaces(text) {
  return text.replace(/ {2,}/g, ' ');
}

// The date regex lets 2026-02-31 through, so check the day really exists
function isRealDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Each function returns an error message, or an empty string if the value is fine

export function checkTitle(value) {
  if (value === '') return 'Title is required.';
  if (!patterns.title.test(value)) return 'Remove the spaces at the start or end.';
  const dup = value.match(patterns.duplicateWord);
  if (dup) return `"${dup[0]}" has a repeated word.`;
  if (value.length > 80) return 'Keep the title under 80 characters.';
  return '';
}

export function checkDuration(value) {
  if (value === '') return 'Duration is required.';
  if (!patterns.duration.test(value)) return 'Use a number like 45 or 90.5 (max 2 decimals, no leading zeros).';
  if (Number(value) === 0) return 'Duration must be more than 0.';
  return '';
}

export function checkDate(value) {
  if (value === '') return 'Due date is required.';
  if (!patterns.date.test(value)) return 'Use the format YYYY-MM-DD.';
  if (!isRealDate(value)) return 'That date does not exist.';
  return '';
}

export function checkTag(value) {
  if (value === '') return 'Tag is required.';
  if (!patterns.tag.test(value)) return 'Letters only, with single spaces or hyphens between words.';
  return '';
}

export function checkCap(value) {
  if (value === '') return '';
  if (!patterns.duration.test(value)) return 'Use a number like 600 or 1200.';
  return '';
}

const checks = {
  title: checkTitle,
  dueDate: checkDate,
  duration: checkDuration,
  tag: checkTag
};

export function checkField(name, value) {
  return checks[name] ? checks[name](value) : '';
}

// Returns { title: '...', duration: '...' } with only the fields that failed
export function checkTask(task) {
  const errors = {};
  for (const name of Object.keys(checks)) {
    const msg = checkField(name, String(task[name] ?? ''));
    if (msg) errors[name] = msg;
  }
  return errors;
}