/** Authentication: login, register, sign out */

import { state } from './state.js';
import { USERS } from './data.js';
import { $, toast } from './ui.js';

export function showAuth(id) {
  document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
  $(id)?.classList.add('active');
}

export function handleLogin() {
  const email = $('loginEmail')?.value.trim() || '';
  const pass = $('loginPass')?.value || '';
  if (!email || !email.includes('@')) { toast('Enter a valid email'); return; }
  if (!pass || pass.length < 8) { toast('Password must be 8+ characters'); return; }
  const user = USERS.find(u => u.email === email && u.password === pass);
  if (!user) { toast('Invalid credentials. Try demo@lplate.app / password123'); return; }
  state.currentUser = user;
  sessionStorage.setItem('lplate_user', JSON.stringify(user));
  return user;
}

export function handleRegister() {
  const first = $('regFirst')?.value.trim() || '';
  const last = $('regLast')?.value.trim() || '';
  const email = $('regEmail')?.value.trim() || '';
  const pass = $('regPass')?.value || '';
  if (!first || !last || !email || !pass) { toast('Fill all fields'); return null; }
  if (pass.length < 8) { toast('Password 8+ characters'); return null; }
  const newUser = {
    email,
    password: pass,
    first,
    last,
    type: $('regType')?.value || 'learner',
    state: $('regState')?.value || 'NSW',
  };
  USERS.push(newUser);
  state.currentUser = newUser;
  sessionStorage.setItem('lplate_user', JSON.stringify(newUser));
  toast('Account created!');
  return newUser;
}

export function demoLogin(type) {
  state.currentUser = type === 'learner' ? USERS[0] : USERS[1];
  sessionStorage.setItem('lplate_user', JSON.stringify(state.currentUser));
  return state.currentUser;
}

export function updateUserUI() {
  if (!state.currentUser) return;
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const u = state.currentUser;
  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set('greeting', g);
  set('userName', u.first);
  set('settingsAvatar', u.first[0]);
  set('settingsName', u.first + ' ' + u.last);
  set('settingsRole', u.type === 'learner' ? 'Learner Driver' : 'Parent / Supervisor');
}

export function applyRoleUI() {
  const isParent = state.currentUser?.type === 'parent';
  const navApprovals = $('navApprovals');
  const driveNav = document.querySelector('[data-screen="loggerScreen"]');
  if (navApprovals) navApprovals.style.display = isParent ? '' : 'none';
  if (driveNav) driveNav.style.display = isParent ? 'none' : '';
}
