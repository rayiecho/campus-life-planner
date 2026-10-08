// Everything that draws on the page: errors, status messages, the task table and cards.

import { highlight } from './search.js';

export function showError(input, message) {
  const box = document.getElementById(input.id + '-error');
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    box.textContent = message;
  } else {
    input.removeAttribute('aria-invalid');
    box.textContent = '';
  }
}

export function clearErrors(form) {
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.error').forEach(el => (el.textContent = ''));
}

// Emptying first makes screen readers repeat the message even if the text is the same
export function setStatus(id, message) {
  const el = document.getElementById(id);
  el.textContent = '';
  setTimeout(() => (el.textContent = message), 50);
}

export function formatDuration(minutes, unit = 'minutes') {
  if (unit === 'hours') return `${+(minutes / 60).toFixed(2)} h`;
  return `${minutes} min`;
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function button(text, className, action, id, label) {
  const btn = el('button', className);
  btn.type = 'button';
  btn.textContent = text;
  btn.dataset.action = action;
  btn.dataset.id = id;
  btn.setAttribute('aria-label', label);
  return btn;
}

function actionButtons(task) {
  const wrap = el('div', 'row-actions');
  wrap.append(
    button('Edit', 'btn btn-small', 'edit', task.id, `Edit ${task.title}`),
    button('Delete', 'btn btn-small btn-danger', 'delete', task.id, `Delete ${task.title}`)
  );
  return wrap;
}

function tagLabel(tag, re) {
  const span = el('span', 'tag');
  span.append(highlight(tag, re));
  return span;
}

function taskRow(task, re, unit) {
  const tr = el('tr');
  tr.dataset.id = task.id;

  const title = el('td');
  title.append(highlight(task.title, re));
  const due = el('td');
  due.append(highlight(task.dueDate, re));
  const duration = el('td');
  duration.textContent = formatDuration(task.duration, unit);
  const tag = el('td');
  tag.append(tagLabel(task.tag, re));
  const actions = el('td');
  actions.append(actionButtons(task));

  tr.append(title, due, duration, tag, actions);
  return tr;
}

function taskCard(task, re, unit) {
  const li = el('li', 'task-card');
  li.dataset.id = task.id;

  const h = el('h3');
  h.append(highlight(task.title, re));

  const meta = el('p', 'task-meta');
  meta.append('Due ', highlight(task.dueDate, re), `, ${formatDuration(task.duration, unit)}`);

  const tagP = el('p');
  tagP.append(tagLabel(task.tag, re));

  li.append(h, meta, tagP, actionButtons(task));
  return li;
}

// The table and the cards both get an edit form, so ids need a prefix to stay unique
function editForm(task, prefix) {
  const form = el('form', 'edit-form');
  form.dataset.id = task.id;
  form.noValidate = true;
  form.setAttribute('aria-label', `Edit ${task.title}`);

  const fields = [
    ['title', 'Title', 'text', task.title],
    ['dueDate', 'Due date', 'date', task.dueDate],
    ['duration', 'Duration (minutes)', 'text', String(task.duration)],
    ['tag', 'Tag', 'text', task.tag]
  ];

  for (const [name, labelText, type, value] of fields) {
    const id = `${prefix}-${task.id}-${name}`;
    const wrap = el('div', 'field');

    const label = el('label');
    label.htmlFor = id;
    label.textContent = labelText;

    const input = el('input');
    input.type = type;
    input.id = id;
    input.name = name;
    input.value = value;
    if (name === 'duration') input.inputMode = 'decimal';
    if (name === 'tag') input.setAttribute('list', 'tag-list');

    const error = el('p', 'error');
    error.id = id + '-error';
    input.setAttribute('aria-describedby', error.id);

    wrap.append(label, input, error);
    form.append(wrap);
  }

  const actions = el('div', 'form-actions');
  const save = el('button', 'btn btn-primary btn-small');
  save.type = 'submit';
  save.textContent = 'Save';
  actions.append(save, button('Cancel', 'btn btn-small', 'cancel', task.id, 'Cancel editing'));
  form.append(actions);

  return form;
}

function editRow(task) {
  const tr = el('tr', 'editing');
  tr.dataset.id = task.id;
  const td = el('td');
  td.colSpan = 5;
  td.append(editForm(task, 'row'));
  tr.append(td);
  return tr;
}

function editCard(task) {
  const li = el('li', 'task-card editing');
  li.dataset.id = task.id;
  li.append(editForm(task, 'card'));
  return li;
}

export function renderTasks({ list, re, editingId, newId, unit, emptyText }) {
  const rows = document.getElementById('task-rows');
  const cards = document.getElementById('task-cards');
  const empty = document.getElementById('empty-state');

  rows.replaceChildren();
  cards.replaceChildren();

  for (const task of list) {
    const editing = task.id === editingId;
    const row = editing ? editRow(task) : taskRow(task, re, unit);
    const card = editing ? editCard(task) : taskCard(task, re, unit);
    if (task.id === newId) {
      row.classList.add('is-new');
      card.classList.add('is-new');
    }
    rows.append(row);
    cards.append(card);
  }

  const none = list.length === 0;
  empty.hidden = !none;
  empty.textContent = emptyText;
  document.querySelector('.table-wrap').hidden = none;
  cards.hidden = none;
}

// Tells screen readers which column the table is sorted by
export function setSortIndicator(key) {
  const [field, dir] = key.split('-');
  const columns = { title: 0, date: 1, duration: 2 };
  const headers = document.querySelectorAll('.task-table th');
  headers.forEach(th => th.removeAttribute('aria-sort'));
  headers[columns[field]].setAttribute('aria-sort', dir === 'desc' ? 'descending' : 'ascending');
}

// Both the table and the cards exist, but only one is visible at a time.
// This focuses the element in whichever one is showing.
export function focusInTask(id, selector) {
  const found = document.querySelectorAll(`[data-id="${id}"] ${selector}`);
  for (const node of found) {
    if (node.offsetParent !== null) {
      node.focus();
      return;
    }
  }
}