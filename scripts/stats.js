// Works out the numbers for the dashboard. No DOM in here, so it's easy to test.

// "2026-10-08" in the user's own time zone (toISOString would give UTC)
export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDateString(new Date(y, m - 1, d + n));
}

const round = n => Math.round(n * 100) / 100;
const sum = list => round(list.reduce((total, t) => total + t.duration, 0));

// The tag used by the most tasks. Ties go to whichever comes first alphabetically.
export function topTag(tasks) {
  const counts = {};
  for (const t of tasks) counts[t.tag] = (counts[t.tag] || 0) + 1;

  let best = null;
  for (const [tag, count] of Object.entries(counts)) {
    if (!best || count > best.count || (count === best.count && tag < best.tag)) {
      best = { tag, count };
    }
  }
  return best;
}

export function computeStats(tasks, today = localDateString()) {
  const weekEnd = addDays(today, 6);
  const upcoming = tasks.filter(t => t.dueDate >= today && t.dueDate <= weekEnd);

  // one bar per day, from 6 days ago up to today
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i);
    const [y, m, d] = date.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).toLocaleDateString('en', { weekday: 'short' });
    days.push({
      date,
      label: i === 0 ? 'Today' : `${weekday} ${d}`,
      minutes: sum(tasks.filter(t => t.dueDate === date))
    });
  }

  return {
    count: tasks.length,
    total: sum(tasks),
    top: topTag(tasks),
    next7: sum(upcoming),
    days
  };
}

// cap of 0 or empty means no target
export function capStatus(used, cap) {
  if (!cap) return null;
  const diff = round(cap - used);
  return { over: diff < 0, amount: Math.abs(diff) };
}