// Regex search, highlighting and sorting.

// Bad patterns like "(abc" return an error message instead of crashing the page
export function compileRegex(input, ignoreCase = true) {
  if (!input) return { re: null, error: '' };
  try {
    return { re: new RegExp(input, ignoreCase ? 'gi' : 'g'), error: '' };
  } catch (err) {
    return { re: null, error: err.message };
  }
}

// "@tag:Exam" filters by tag. Anything typed after it is searched as a normal pattern.
export function parseQuery(raw) {
  const m = raw.match(/^@tag:(\w+)\s*(.*)$/);
  if (m) return { tag: m[1], pattern: m[2] };
  return { tag: '', pattern: raw };
}

// The regex has the g flag, so lastIndex has to be reset or test() skips matches
function matches(re, text) {
  re.lastIndex = 0;
  return re.test(text);
}

export function filterTasks(list, query, re) {
  return list.filter(task => {
    if (query.tag && !task.tag.toLowerCase().startsWith(query.tag.toLowerCase())) return false;
    if (!re) return true;
    return [task.title, task.tag, task.dueDate, String(task.duration)].some(text => matches(re, text));
  });
}

// Builds text and <mark> nodes instead of using innerHTML,
// so a title like "<b>hi</b>" shows as text and can't inject HTML
export function highlight(text, re) {
  const frag = document.createDocumentFragment();
  if (!re) {
    frag.append(text);
    return frag;
  }

  re.lastIndex = 0;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    // patterns like "a*" can match nothing, so step forward to avoid looping forever
    if (m[0] === '') {
      re.lastIndex++;
      continue;
    }
    frag.append(text.slice(last, m.index));
    const mark = document.createElement('mark');
    mark.textContent = m[0];
    frag.append(mark);
    last = m.index + m[0].length;
  }
  frag.append(text.slice(last));
  return frag;
}

// key looks like "date-asc" or "duration-desc"
export function sortTasks(list, key) {
  const [field, dir] = key.split('-');
  const sign = dir === 'desc' ? -1 : 1;

  return [...list].sort((a, b) => {
    let diff;
    if (field === 'duration') diff = a.duration - b.duration;
    else if (field === 'title') diff = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    else diff = a.dueDate.localeCompare(b.dueDate);
    return diff * sign;
  });
}