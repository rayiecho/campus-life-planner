import { checkField, checkTask, collapseSpaces } from './validators.js';
import { showError, clearErrors, setStatus } from './ui.js';

const form = document.getElementById('task-form');

// input id -> field name in the task object
const fields = {
  'title': 'title',
  'due-date': 'dueDate',
  'duration': 'duration',
  'tag': 'tag'
};

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

  const task = readForm();
  const errors = checkTask(task);
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

  // saving to the list is added in M4
  setStatus('form-status', `"${task.title}" is valid.`);
  form.reset();
});

form.addEventListener('reset', () => {
  clearErrors(form);
  setStatus('form-status', '');
});