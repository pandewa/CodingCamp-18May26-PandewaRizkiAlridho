/* =============================================================================
   To-Do Life Dashboard — app.js
   Single JavaScript file for all widget logic.
   Sections: Storage · Greeting · Focus Timer · Task List · Quick Links · Theme
   ============================================================================= */

'use strict';

// =============================================================================
// STORAGE MODULE
// =============================================================================

const STORAGE_KEYS = {
  TASKS:     'tdld_tasks',
  LINKS:     'tdld_links',
  USER_NAME: 'tdld_username',
  THEME:     'tdld_theme',
};

/**
 * Read and JSON-parse a value from localStorage.
 * Returns `fallback` when the key is absent, unparseable, or any error occurs.
 */
function storageRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * JSON-serialize and write a value to localStorage.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
function storageWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/**
 * Remove a key from localStorage.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
function storageRemove(key) {
  try {
    localStorage.removeItem(key);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// =============================================================================
// PURE UTILITY FUNCTIONS (testable, no DOM access)
// =============================================================================

// --- Greeting helpers ---

/** Returns "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night" */
function getGreetingPhrase(hour) {
  if (hour >= 5  && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 20) return 'Good Evening';
  return 'Good Night';
}

/** Returns "HH:MM:SS" from a Date object */
function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/** Returns "Weekday, DD Month YYYY" from a Date object */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day:     '2-digit',
    month:   'long',
    year:    'numeric',
  });
}

/** Returns the full greeting string, e.g. "Good Morning, Alex!" or "Good Morning!" */
function buildGreetingText(phrase, userName) {
  return userName.trim() ? `${phrase}, ${userName.trim()}!` : `${phrase}!`;
}

/** Validates a user name: non-empty after trim, max 50 chars */
function validateUserName(input) {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Name cannot be empty.' };
  if (trimmed.length > 50)  return { valid: false, error: 'Name must be 50 characters or fewer.' };
  return { valid: true };
}

// --- Timer helpers ---

/** Returns "MM:SS" from a seconds integer */
function formatTimerDisplay(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Returns the next timer state after one tick (pure, no side effects) */
function timerTick(state) {
  return { ...state, remaining: Math.max(0, state.remaining - 1) };
}

/** Returns true when the timer has reached zero */
function isTimerExpired(state) {
  return state.remaining === 0;
}

// --- Task helpers ---

/** Validates a task label: non-empty after trim, max 200 chars */
function validateTaskLabel(input) {
  const trimmed = input.trim();
  if (trimmed.length === 0)  return { valid: false, error: 'Task cannot be empty.' };
  if (trimmed.length > 200)  return { valid: false, error: 'Task must be 200 characters or fewer.' };
  return { valid: true };
}

/** Trims and truncates a label to 200 chars */
function normalizeTaskLabel(input) {
  return input.trim().slice(0, 200);
}

/** Sorts tasks: incomplete first, then completed; stable within each group */
function sortTasks(tasks) {
  return [
    ...tasks.filter(t => !t.completed),
    ...tasks.filter(t =>  t.completed),
  ];
}

/** Toggles the completed state of a task by id */
function toggleTask(tasks, id) {
  return tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
}

/** Removes a task by id */
function deleteTask(tasks, id) {
  return tasks.filter(t => t.id !== id);
}

/** Updates the label of a task by id */
function updateTaskLabel(tasks, id, newLabel) {
  return tasks.map(t => t.id === id ? { ...t, label: newLabel } : t);
}

// --- Link helpers ---

/** Validates a URL: non-empty, starts with http:// or https://, has a hostname */
function validateUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, error: 'URL cannot be empty.' };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: 'URL must start with http:// or https://.' };
    }
    if (!url.hostname) return { valid: false, error: 'URL must have a valid hostname.' };
    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid URL.' };
  }
}

/** Validates a link label: non-empty after trim, max 100 chars */
function validateLinkLabel(input) {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Label cannot be empty.' };
  if (trimmed.length > 100) return { valid: false, error: 'Label must be 100 characters or fewer.' };
  return { valid: true };
}

/** Returns true if the URL already exists in the links array */
function isDuplicateUrl(links, url) {
  return links.some(l => l.url === url.trim());
}

// --- Theme helpers ---

/** Returns the opposite theme */
function toggleTheme(current) {
  return current === 'light' ? 'dark' : 'light';
}

/** Returns true for valid theme values */
function isValidTheme(value) {
  return value === 'light' || value === 'dark';
}

// =============================================================================
// WIDGET STATE
// =============================================================================

let greetingState = { userName: '' };

let timerState = {
  remaining:  1500,  // 25 minutes in seconds
  running:    false,
  intervalId: null,
};

let taskState = {
  tasks:     [],
  editingId: null,
};

let linksState = { links: [] };

let currentTheme = 'light';

// =============================================================================
// DOM HELPERS
// =============================================================================

/** Show an inline error message inside a widget section */
function showError(section, message) {
  const el = section.querySelector('.error-msg');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

/** Hide the inline error message inside a widget section */
function hideError(section) {
  const el = section.querySelector('.error-msg');
  if (el) el.hidden = true;
}

/** Show a validation message next to an input */
function showValidation(span, message) {
  span.textContent = message;
  span.hidden = false;
}

/** Hide a validation message */
function hideValidation(span) {
  span.hidden = true;
  span.textContent = '';
}

// =============================================================================
// GREETING WIDGET
// =============================================================================

const greetingSection = document.getElementById('greeting-widget');
const clockEl         = document.getElementById('clock');
const dateEl          = document.getElementById('date');
const greetingEl      = document.getElementById('greeting');
const nameInput       = document.getElementById('name-input');
const nameSubmitBtn   = document.getElementById('name-submit');
const nameClearBtn    = document.getElementById('name-clear');
const nameValidMsg    = greetingSection.querySelector('.validation-msg');

function renderClock() {
  const now    = new Date();
  const phrase = getGreetingPhrase(now.getHours());
  clockEl.textContent    = formatTime(now);
  dateEl.textContent     = formatDate(now);
  greetingEl.textContent = buildGreetingText(phrase, greetingState.userName);
}

function renderUserName() {
  nameInput.value = greetingState.userName;
}

function handleNameSubmit() {
  const result = validateUserName(nameInput.value);
  if (!result.valid) {
    showValidation(nameValidMsg, result.error);
    nameInput.setAttribute('aria-invalid', 'true');
    return;
  }
  hideValidation(nameValidMsg);
  nameInput.removeAttribute('aria-invalid');

  greetingState.userName = nameInput.value.trim();
  const writeResult = storageWrite(STORAGE_KEYS.USER_NAME, greetingState.userName);
  if (!writeResult.ok) {
    showError(greetingSection, 'Could not save your name. Storage may be full.');
  } else {
    hideError(greetingSection);
  }
  renderClock();
}

function handleNameClear() {
  greetingState.userName = '';
  storageRemove(STORAGE_KEYS.USER_NAME);
  nameInput.value = '';
  hideValidation(nameValidMsg);
  nameInput.removeAttribute('aria-invalid');
  hideError(greetingSection);
  renderClock();
}

function initGreeting() {
  greetingState.userName = storageRead(STORAGE_KEYS.USER_NAME, '');
  renderUserName();
  renderClock();
  setInterval(renderClock, 1000);

  nameSubmitBtn.addEventListener('click', handleNameSubmit);
  nameClearBtn.addEventListener('click', handleNameClear);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleNameSubmit(); });
}

// =============================================================================
// FOCUS TIMER WIDGET
// =============================================================================

const timerSection      = document.getElementById('timer-widget');
const timerDisplayEl    = document.getElementById('timer-display');
const timerStartBtn     = document.getElementById('timer-start');
const timerStopBtn      = document.getElementById('timer-stop');
const timerResetBtn     = document.getElementById('timer-reset');
const timerNotification = document.getElementById('timer-notification');

function renderTimer() {
  timerDisplayEl.textContent = formatTimerDisplay(timerState.remaining);
  timerStartBtn.disabled     = timerState.running;
  timerStopBtn.disabled      = !timerState.running;
}

function handleTimerExpiry() {
  timerState.running = false;
  clearInterval(timerState.intervalId);
  timerState.intervalId = null;
  timerNotification.hidden = false;
  renderTimer();
}

function handleTimerStart() {
  if (timerState.running) return;
  timerNotification.hidden = true;
  timerState.running = true;
  timerState.intervalId = setInterval(() => {
    timerState = timerTick(timerState);
    renderTimer();
    if (isTimerExpired(timerState)) handleTimerExpiry();
  }, 1000);
  renderTimer();
}

function handleTimerStop() {
  if (!timerState.running) return;
  clearInterval(timerState.intervalId);
  timerState.intervalId = null;
  timerState.running = false;
  renderTimer();
}

function handleTimerReset() {
  clearInterval(timerState.intervalId);
  timerState = { remaining: 1500, running: false, intervalId: null };
  timerNotification.hidden = true;
  renderTimer();
}

function initTimer() {
  renderTimer();
  timerStartBtn.addEventListener('click', handleTimerStart);
  timerStopBtn.addEventListener('click', handleTimerStop);
  timerResetBtn.addEventListener('click', handleTimerReset);
}

// =============================================================================
// TASK LIST WIDGET
// =============================================================================

const taskSection   = document.getElementById('task-widget');
const taskInput     = document.getElementById('task-input');
const taskAddBtn    = document.getElementById('task-add');
const taskSortBtn   = document.getElementById('task-sort');
const taskList      = document.getElementById('task-list');
const taskValidMsg  = taskSection.querySelector('.validation-msg');

function persistTasks() {
  const result = storageWrite(STORAGE_KEYS.TASKS, taskState.tasks);
  if (!result.ok) showError(taskSection, 'Could not save tasks. Storage may be full.');
  else hideError(taskSection);
}

function renderTaskList() {
  taskList.innerHTML = '';

  if (taskState.tasks.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No tasks yet. Add one above!';
    empty.style.color = 'var(--text-muted)';
    empty.style.fontSize = '0.875rem';
    empty.style.justifyContent = 'center';
    taskList.appendChild(empty);
    return;
  }

  taskState.tasks.forEach(task => {
    const li = document.createElement('li');
    if (task.completed) li.classList.add('completed');

    if (taskState.editingId === task.id) {
      // --- Edit mode ---
      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'task-edit-input';
      editInput.value = task.label;
      editInput.maxLength = 200;

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = '✓';
      confirmBtn.title = 'Save';
      confirmBtn.addEventListener('click', () => handleTaskEditConfirm(task.id, editInput.value));
      editInput.addEventListener('keydown', e => {
        if (e.key === 'Enter')  handleTaskEditConfirm(task.id, editInput.value);
        if (e.key === 'Escape') handleTaskEditCancel();
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '✕';
      cancelBtn.title = 'Cancel';
      cancelBtn.addEventListener('click', handleTaskEditCancel);

      li.append(editInput, confirmBtn, cancelBtn);
      setTimeout(() => editInput.focus(), 0);
    } else {
      // --- Display mode ---
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.title = task.completed ? 'Mark incomplete' : 'Mark complete';
      checkbox.addEventListener('change', () => handleTaskToggle(task.id));

      const label = document.createElement('span');
      label.className = 'task-label';
      label.textContent = task.label;

      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', () => handleTaskEdit(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Delete';
      deleteBtn.style.background = 'var(--btn-danger-bg)';
      deleteBtn.style.borderColor = 'transparent';
      deleteBtn.addEventListener('click', () => handleTaskDelete(task.id));

      li.append(checkbox, label, editBtn, deleteBtn);
    }

    taskList.appendChild(li);
  });
}

function handleTaskAdd() {
  const result = validateTaskLabel(taskInput.value);
  if (!result.valid) {
    showValidation(taskValidMsg, result.error);
    taskInput.setAttribute('aria-invalid', 'true');
    return;
  }
  hideValidation(taskValidMsg);
  taskInput.removeAttribute('aria-invalid');

  const task = {
    id:        (typeof crypto !== 'undefined' && crypto.randomUUID)
                 ? crypto.randomUUID()
                 : Date.now().toString(),
    label:     normalizeTaskLabel(taskInput.value),
    completed: false,
    createdAt: Date.now(),
  };

  taskState.tasks.push(task);
  taskInput.value = '';
  persistTasks();
  renderTaskList();
}

function handleTaskEdit(id) {
  taskState.editingId = id;
  renderTaskList();
}

function handleTaskEditConfirm(id, newValue) {
  const result = validateTaskLabel(newValue);
  if (!result.valid) return; // stay in edit mode silently (input is focused)
  taskState.tasks = updateTaskLabel(taskState.tasks, id, normalizeTaskLabel(newValue));
  taskState.editingId = null;
  persistTasks();
  renderTaskList();
}

function handleTaskEditCancel() {
  taskState.editingId = null;
  renderTaskList();
}

function handleTaskToggle(id) {
  taskState.tasks = toggleTask(taskState.tasks, id);
  persistTasks();
  renderTaskList();
}

function handleTaskDelete(id) {
  taskState.tasks = deleteTask(taskState.tasks, id);
  if (taskState.editingId === id) taskState.editingId = null;
  persistTasks();
  renderTaskList();
}

function handleTaskSort() {
  taskState.tasks = sortTasks(taskState.tasks);
  // Sort is a view-only operation — no storage write
  renderTaskList();
}

function initTasks() {
  taskState.tasks = storageRead(STORAGE_KEYS.TASKS, []);
  renderTaskList();

  taskAddBtn.addEventListener('click', handleTaskAdd);
  taskSortBtn.addEventListener('click', handleTaskSort);
  taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleTaskAdd(); });
}

// =============================================================================
// QUICK LINKS WIDGET
// =============================================================================

const linksSection    = document.getElementById('links-widget');
const linkLabelInput  = document.getElementById('link-label-input');
const linkUrlInput    = document.getElementById('link-url-input');
const linkAddBtn      = document.getElementById('link-add');
const linksPanel      = document.getElementById('links-panel');
const linkLabelMsg    = linksSection.querySelector('.link-label-msg');
const linkUrlMsg      = linksSection.querySelector('.link-url-msg');

function persistLinks() {
  const result = storageWrite(STORAGE_KEYS.LINKS, linksState.links);
  if (!result.ok) showError(linksSection, 'Could not save links. Storage may be full.');
  else hideError(linksSection);
}

function renderLinks() {
  linksPanel.innerHTML = '';

  if (linksState.links.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No links yet. Add one above!';
    empty.style.color = 'var(--text-muted)';
    empty.style.fontSize = '0.875rem';
    linksPanel.appendChild(empty);
    return;
  }

  linksState.links.forEach(link => {
    const wrapper = document.createElement('div');
    wrapper.className = 'link-item';

    const anchor = document.createElement('a');
    anchor.href   = link.url;
    anchor.target = '_blank';
    anchor.rel    = 'noopener noreferrer';
    anchor.textContent = link.label;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Remove link';
    deleteBtn.addEventListener('click', () => handleLinkDelete(link.id));

    wrapper.append(anchor, deleteBtn);
    linksPanel.appendChild(wrapper);
  });
}

function handleLinkAdd() {
  const labelResult = validateLinkLabel(linkLabelInput.value);
  const urlResult   = validateUrl(linkUrlInput.value);
  let hasError = false;

  if (!labelResult.valid) {
    showValidation(linkLabelMsg, labelResult.error);
    linkLabelInput.setAttribute('aria-invalid', 'true');
    hasError = true;
  } else {
    hideValidation(linkLabelMsg);
    linkLabelInput.removeAttribute('aria-invalid');
  }

  if (!urlResult.valid) {
    showValidation(linkUrlMsg, urlResult.error);
    linkUrlInput.setAttribute('aria-invalid', 'true');
    hasError = true;
  } else {
    hideValidation(linkUrlMsg);
    linkUrlInput.removeAttribute('aria-invalid');
  }

  if (hasError) return;

  const url = linkUrlInput.value.trim();
  if (isDuplicateUrl(linksState.links, url)) {
    showValidation(linkUrlMsg, 'This URL is already in your links.');
    linkUrlInput.setAttribute('aria-invalid', 'true');
    return;
  }

  const link = {
    id:    (typeof crypto !== 'undefined' && crypto.randomUUID)
             ? crypto.randomUUID()
             : Date.now().toString(),
    label: linkLabelInput.value.trim(),
    url,
  };

  linksState.links.push(link);
  linkLabelInput.value = '';
  linkUrlInput.value   = '';
  persistLinks();
  renderLinks();
}

function handleLinkDelete(id) {
  linksState.links = linksState.links.filter(l => l.id !== id);
  persistLinks();
  renderLinks();
}

function initLinks() {
  linksState.links = storageRead(STORAGE_KEYS.LINKS, []);
  renderLinks();

  linkAddBtn.addEventListener('click', handleLinkAdd);
  linkUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLinkAdd(); });
}

// =============================================================================
// THEME MODULE
// =============================================================================

const themeToggleBtn = document.getElementById('theme-toggle');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggleBtn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

function handleThemeToggle() {
  currentTheme = toggleTheme(currentTheme);
  applyTheme(currentTheme);
  storageWrite(STORAGE_KEYS.THEME, currentTheme);
}

function initTheme() {
  const saved = storageRead(STORAGE_KEYS.THEME, 'light');
  currentTheme = isValidTheme(saved) ? saved : 'light';
  applyTheme(currentTheme);
  themeToggleBtn.addEventListener('click', handleThemeToggle);
}

// =============================================================================
// INIT — wire everything up on DOMContentLoaded
// =============================================================================

function init() {
  initTheme();
  initGreeting();
  initTimer();
  initTasks();
  initLinks();
}

document.addEventListener('DOMContentLoaded', init);
