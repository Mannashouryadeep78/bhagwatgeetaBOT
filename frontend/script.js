// ── API URL (auto-switch local vs production) ─────────────────────────────────
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://hibque-bhagwatgita-bot.hf.space/api';

// ── Track the currently viewed history item ───────────────────────────────────
let activeHistoryId = null;

// ═════════════════════════════════════════════════════════════════════════════
//  CHAT
// ═════════════════════════════════════════════════════════════════════════════

async function sendQuestion() {
  const input = document.getElementById('questionInput');
  const question = input.value.trim();
  if (!question) return;

  addMessage(question, 'user');
  input.value = '';
  activeHistoryId = null;
  clearActiveHistory();

  const btn = document.getElementById('sendButton');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="loading"></span>';
  btn.disabled = true;

  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question })
    });

    const data = await response.json();

    if (response.ok) {
      addMessage(data.answer, 'bot');
      // Live-add to sidebar if a conversation was saved (user is logged in)
      if (data.conversation_id) {
        prependHistoryItem({
          id: data.conversation_id,
          question,
          answer: data.answer,
          created_at: new Date().toISOString()
        });
        showSidebarFooter();
      }
    } else {
      addMessage('Sorry, I encountered an error. Please try again.', 'bot');
    }
  } catch (error) {
    console.error('Error:', error);
    addMessage('Sorry, I cannot connect to the server. Please make sure the backend is running.', 'bot');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function addMessage(content, sender) {
  const chatContainer = document.getElementById('chatContainer');
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}-message`;
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  msgDiv.appendChild(contentDiv);
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleKeyPress(event) {
  if (event.key === 'Enter') sendQuestion();
}

// ═════════════════════════════════════════════════════════════════════════════
//  HISTORY
// ═════════════════════════════════════════════════════════════════════════════

async function loadHistory() {
  const token = getToken();
  const listEl = document.getElementById('historyList');

  if (!token) {
    listEl.innerHTML = `
      <div class="sidebar-guest">
        <p>Login to save your conversations and revisit them anytime.</p>
        <a href="login.html">Login / Register</a>
      </div>`;
    return;
  }

  try {
    const res = await fetch(`${API_URL}/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { renderEmptyHistory(); return; }
    const data = await res.json();
    renderHistoryList(data.history || []);
  } catch {
    renderEmptyHistory();
  }
}

function renderHistoryList(items) {
  const listEl = document.getElementById('historyList');

  if (!items.length) {
    renderEmptyHistory();
    return;
  }

  // Group by date
  const groups = groupByDate(items);
  let html = '';

  for (const [label, group] of Object.entries(groups)) {
    if (!group.length) continue;
    html += `<div class="history-group-label">${label}</div>`;
    for (const item of group) {
      html += buildHistoryItemHTML(item);
    }
  }

  listEl.innerHTML = html;
  showSidebarFooter();
}

function buildHistoryItemHTML(item) {
  const preview = item.question.length > 52
    ? item.question.slice(0, 52) + '…'
    : item.question;
  const time = formatTime(item.created_at);
  const activeClass = item.id === activeHistoryId ? ' active' : '';
  return `
    <div class="history-item${activeClass}" id="hi-${item.id}"
         onclick="loadConversation(${item.id}, ${JSON.stringify(item.question).replace(/</g,'&lt;')}, ${JSON.stringify(item.answer).replace(/</g,'&lt;')})">
      <div class="history-item-question">${escapeHtml(preview)}</div>
      <div class="history-item-date">${time}</div>
      <button class="history-item-delete" title="Delete"
              onclick="event.stopPropagation(); deleteHistoryItem(${item.id})">&#x2715;</button>
    </div>`;
}

function prependHistoryItem(item) {
  const listEl = document.getElementById('historyList');

  // Remove guest prompt or empty state if present
  const guest = listEl.querySelector('.sidebar-guest, .sidebar-empty');
  if (guest) guest.remove();

  // Check if a "Today" group label already exists
  let todayLabel = listEl.querySelector('.history-group-label');
  if (!todayLabel || todayLabel.textContent !== 'Today') {
    const label = document.createElement('div');
    label.className = 'history-group-label';
    label.textContent = 'Today';
    listEl.insertBefore(label, listEl.firstChild);
    todayLabel = label;
  }

  // Insert new item right after the Today label
  const div = document.createElement('div');
  div.innerHTML = buildHistoryItemHTML(item);
  todayLabel.insertAdjacentElement('afterend', div.firstElementChild);
}

function renderEmptyHistory() {
  document.getElementById('historyList').innerHTML = `
    <div class="sidebar-empty">
      <div class="sidebar-empty-icon">📜</div>
      No conversations yet.<br/>Start asking to build your history.
    </div>`;
}

function loadConversation(id, question, answer) {
  // Set active state on sidebar item
  clearActiveHistory();
  activeHistoryId = id;
  const item = document.getElementById(`hi-${id}`);
  if (item) item.classList.add('active');

  // Restore that Q&A in the chat area
  const chatContainer = document.getElementById('chatContainer');
  chatContainer.innerHTML = `
    <div class="message bot-message">
      <div class="message-content">
        🙏 Namaste! I am your guide to the Bhagavad Gita. Ask me about duty,
        karma, devotion, or life wisdom.
      </div>
    </div>
    <div class="message user-message">
      <div class="message-content">${escapeHtml(question)}</div>
    </div>
    <div class="message bot-message">
      <div class="message-content">${escapeHtml(answer)}</div>
    </div>`;
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function newChat() {
  clearActiveHistory();
  activeHistoryId = null;
  document.getElementById('chatContainer').innerHTML = `
    <div class="message bot-message">
      <div class="message-content">
        🙏 Namaste! I am your guide to the Bhagavad Gita. Ask me about duty,
        karma, devotion, or life wisdom.
      </div>
    </div>`;
  document.getElementById('questionInput').focus();
}

async function deleteHistoryItem(id) {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/history/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const el = document.getElementById(`hi-${id}`);
      if (el) el.remove();
      if (activeHistoryId === id) newChat();
      // Remove orphaned group labels
      removeEmptyGroups();
    }
  } catch (e) {
    console.error('Delete failed', e);
  }
}

async function clearAllHistory() {
  if (!confirm('Clear all conversation history? This cannot be undone.')) return;
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/history/clear`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      renderEmptyHistory();
      document.getElementById('sidebarFooter').style.display = 'none';
      newChat();
    }
  } catch (e) {
    console.error('Clear failed', e);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function groupByDate(items) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const groups = { 'Today': [], 'Yesterday': [], 'This Week': [], 'Earlier': [] };
  for (const item of items) {
    const d = new Date(item.created_at);
    if (d >= todayStart)          groups['Today'].push(item);
    else if (d >= yesterdayStart) groups['Yesterday'].push(item);
    else if (d >= weekStart)      groups['This Week'].push(item);
    else                          groups['Earlier'].push(item);
  }
  return groups;
}

function formatTime(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= todayStart) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clearActiveHistory() {
  document.querySelectorAll('.history-item.active').forEach(el => el.classList.remove('active'));
}

function removeEmptyGroups() {
  const listEl = document.getElementById('historyList');
  const labels = listEl.querySelectorAll('.history-group-label');
  labels.forEach(label => {
    const next = label.nextElementSibling;
    if (!next || next.classList.contains('history-group-label')) {
      label.remove();
    }
  });
  // If list is empty now, show empty state
  if (!listEl.querySelector('.history-item')) {
    renderEmptyHistory();
    document.getElementById('sidebarFooter').style.display = 'none';
  }
}

function showSidebarFooter() {
  const footer = document.getElementById('sidebarFooter');
  if (footer) footer.style.display = 'block';
}

// ── Health check on load ──────────────────────────────────────────────────────
async function checkHealth() {
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    console.log('Backend status:', data.message);
  } catch {
    addMessage('Warning: Cannot connect to the backend server.', 'bot');
  }
}

window.onload = async () => {
  await checkHealth();
  await loadHistory();
};
