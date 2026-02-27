/** Road Rules AI chatbot */

import { CHATBOT } from './data.js';
import { $ } from './ui.js';

export function sendChat() {
  const input = $('chatInput');
  const msg = input?.value.trim() || '';
  if (!msg) return;
  input.value = '';
  askQuestion(msg);
}

export function askQuestion(q) {
  const messages = $('chatMessages');
  const typing = $('chatTyping');
  const suggestions = $('chatSuggestions');
  if (!messages || !typing) return;

  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.textContent = q;
  messages.insertBefore(userMsg, typing);
  if (suggestions) suggestions.style.display = 'none';
  typing.classList.add('show');
  messages.scrollTop = messages.scrollHeight;

  const lower = q.toLowerCase();
  let response = CHATBOT.default;
  if (lower.includes('hour') || lower.includes('p1') || lower.includes('120')) response = CHATBOT.hours;
  else if (lower.includes('night')) response = CHATBOT.night;
  else if (lower.includes('speed') || lower.includes('limit') || lower.includes('90')) response = CHATBOT.speed;
  else if (lower.includes('logbook') || lower.includes('log book')) response = CHATBOT.logbook;
  else if (lower.includes('l-plate') || lower.includes('l plate')) response = CHATBOT.lplate;
  else if (lower.includes('supervis') || lower.includes('accompan')) response = CHATBOT.supervisor;

  setTimeout(() => {
    typing.classList.remove('show');
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg bot';
    botMsg.innerHTML = response.replace(/\n/g, '<br>');
    messages.insertBefore(botMsg, typing);
    messages.scrollTop = messages.scrollHeight;
  }, 800 + Math.random() * 800);
}
