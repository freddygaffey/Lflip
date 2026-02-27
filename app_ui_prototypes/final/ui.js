/** DOM helpers, toast, theme */

export function $(id) {
  return document.getElementById(id);
}

export function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

export function toggleClass(el, cls, on) {
  if (!el) return;
  el.classList.toggle(cls, on);
}

export function toast(msg) {
  const container = $('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function toggleTheme(state) {
  const toggle = $('themeToggle');
  if (state.isDark) {
    document.documentElement.removeAttribute('data-theme');
    toggle?.classList.remove('on');
    localStorage.setItem('lplate_theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    toggle?.classList.add('on');
    localStorage.setItem('lplate_theme', 'light');
  }
}

export function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return m + ':' + s;
}
