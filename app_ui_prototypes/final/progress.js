/** Progress rings and pie charts */

import { TOTAL_HRS, NIGHT_HRS, DAY_HRS, TOTAL_REQ, NIGHT_REQ } from './data.js';
import { $ } from './ui.js';

export function renderProgressMini() {
  const circ = 2 * Math.PI * 24;
  const totalPct = Math.min(TOTAL_HRS / TOTAL_REQ, 1);
  const nightPct = Math.min(NIGHT_HRS / NIGHT_REQ, 1);
  const container = $('progressMini');
  if (!container) return;
  container.innerHTML = `
    <div class="ring">
      <svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--border)" stroke-width="4"/><circle class="fg" cx="28" cy="28" r="24" fill="none" stroke="var(--accent)" stroke-width="4" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - totalPct)}" stroke-linecap="round"/></svg>
      <div class="ring-text"><span>${TOTAL_HRS}h</span><span class="ring-sub">of 120</span></div>
    </div>
    <div class="ring">
      <svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--border)" stroke-width="4"/><circle class="fg" cx="28" cy="28" r="24" fill="none" stroke="#818cf8" stroke-width="4" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - nightPct)}" stroke-linecap="round"/></svg>
      <div class="ring-text"><span>${NIGHT_HRS}h</span><span class="ring-sub">of 20</span></div>
    </div>
  `;
}

export function renderPieCharts() {
  const dayPct = (DAY_HRS / TOTAL_HRS * 100) || 0;
  const nightPct = (NIGHT_HRS / TOTAL_HRS * 100) || 0;
  const totalPct = (TOTAL_HRS / TOTAL_REQ * 100) || 0;
  const circ = 2 * Math.PI * 32;
  const container = $('pieCharts');
  if (!container) return;
  container.innerHTML = `
    <div class="pie-card">
      <h3>Total</h3>
      <div class="pie-svg"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" stroke-width="8"/><circle cx="40" cy="40" r="32" fill="none" stroke="var(--accent)" stroke-width="8" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - totalPct / 100)}" stroke-linecap="round" transform="rotate(-90 40 40)"/></svg></div>
      <div class="pie-val">${TOTAL_HRS}h</div>
      <div class="pie-sub">of 120h (${Math.round(totalPct)}%)</div>
    </div>
    <div class="pie-card">
      <h3>Day</h3>
      <div class="pie-svg"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" stroke-width="8"/><circle cx="40" cy="40" r="32" fill="none" stroke="#ffb347" stroke-width="8" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - dayPct / 100)}" stroke-linecap="round" transform="rotate(-90 40 40)"/></svg></div>
      <div class="pie-val">${DAY_HRS}h</div>
      <div class="pie-sub">${Math.round(dayPct)}% of total</div>
    </div>
    <div class="pie-card">
      <h3>Night</h3>
      <div class="pie-svg"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" stroke-width="8"/><circle cx="40" cy="40" r="32" fill="none" stroke="#818cf8" stroke-width="8" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - nightPct / 100)}" stroke-linecap="round" transform="rotate(-90 40 40)"/></svg></div>
      <div class="pie-val">${NIGHT_HRS}h</div>
      <div class="pie-sub">of 20h (${Math.round(NIGHT_HRS/NIGHT_REQ*100)}%)</div>
    </div>
  `;
}
