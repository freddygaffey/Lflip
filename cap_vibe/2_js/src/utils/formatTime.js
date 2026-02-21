export function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function formatHoursMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatHoursDecimal(hours) {
  return `${hours.toFixed(1)}h`;
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** If within 10 days: "2 days ago". Otherwise: full date format. */
export function formatDateOrDaysAgo(ts, withinDays = 10) {
  const d = new Date(ts);
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysAgo = Math.floor((now - d) / msPerDay);
  if (daysAgo >= 0 && daysAgo <= withinDays) {
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return '1 day ago';
    return `${daysAgo} days ago`;
  }
  return formatDate(ts);
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(ts) {
  return `${formatDate(ts)}, ${formatTime(ts)}`;
}
