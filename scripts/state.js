// Keeps the list of tasks in memory. Saving to localStorage is added in M6.

export const DEFAULT_TAGS = ['Assignment', 'Class', 'Exam', 'Club', 'Personal', 'Other'];

let tasks = [];
let counter = 0;

function idNumber(id) {
  const m = /^task_(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}

export function getTasks() {
  return tasks;
}

// Replaces the whole list and makes sure new ids never clash with old ones
export function setTasks(list) {
  tasks = list;
  counter = Math.max(counter, 0, ...list.map(t => idNumber(t.id)));
}

export function findTask(id) {
  return tasks.find(t => t.id === id);
}

export function addTask(data) {
  counter++;
  const now = new Date().toISOString();
  const task = {
    id: 'task_' + String(counter).padStart(4, '0'),
    title: data.title,
    dueDate: data.dueDate,
    duration: Number(data.duration),
    tag: data.tag,
    createdAt: now,
    updatedAt: now
  };
  tasks.push(task);
  return task;
}

export function updateTask(id, data) {
  const task = findTask(id);
  if (!task) return null;
  task.title = data.title;
  task.dueDate = data.dueDate;
  task.duration = Number(data.duration);
  task.tag = data.tag;
  task.updatedAt = new Date().toISOString();
  return task;
}

export function deleteTask(id) {
  const before = tasks.length;
  tasks = tasks.filter(t => t.id !== id);
  return tasks.length < before;
}