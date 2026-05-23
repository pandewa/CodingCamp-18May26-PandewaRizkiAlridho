# Design Document: To-Do Life Dashboard

## Overview

The To-Do Life Dashboard is a single-page, client-side productivity application built with plain HTML, CSS, and Vanilla JavaScript. It requires no build toolchain, no backend, and no external dependencies — the entire application is delivered as three static files (`index.html`, `style.css`, `app.js`) that can be opened directly in a browser or hosted on GitHub Pages.

The application is organized around four independent widgets that share a single persistent store (browser Local Storage):

- **Greeting Widget** — real-time clock, date, time-of-day greeting, and personalized user name
- **Focus Timer** — Pomodoro-style 25-minute countdown with start/stop/reset controls
- **Task List** — full CRUD task management with completion toggling and sort
- **Quick Links** — user-defined shortcut buttons that open URLs in new tabs

A global theme toggle switches between Light and Dark color schemes, and the preference is persisted alongside all other user data.

### Design Goals

1. **Zero dependencies** — no npm, no bundler, no framework; runs from the file system.
2. **Resilient storage** — every read/write is wrapped in try/catch; failures degrade gracefully with inline error messages rather than crashes.
3. **Predictable state** — each widget owns its own in-memory state object; the storage layer is a thin serialization wrapper.
4. **Testable logic** — pure functions (validation, formatting, sorting, serialization) are isolated from DOM manipulation so they can be unit- and property-tested without a browser.

---

## Architecture

The application follows a simple **Widget + Shared Store** architecture. There is no virtual DOM, no reactive framework, and no module bundler. All code lives in a single `app.js` file, organized into clearly separated sections.

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Greeting    │  │ Focus Timer  │  │  Task List    │  │
│  │  Widget      │  │  Widget      │  │  Widget       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │           │
│  ┌──────┴─────────────────┴──────────────────┴────────┐  │
│  │              Quick Links Widget                    │  │
│  └──────────────────────────┬─────────────────────────┘  │
│                             │                            │
│  ┌──────────────────────────▼─────────────────────────┐  │
│  │              Storage Module (app.js)               │  │
│  │   read(key) / write(key, value) / remove(key)      │  │
│  └──────────────────────────┬─────────────────────────┘  │
│                             │                            │
│  ┌──────────────────────────▼─────────────────────────┐  │
│  │           Browser Local Storage API                │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Execution Flow

1. **Page load** — `app.js` runs a single `init()` function that:
   - Reads the saved theme and applies it immediately (within 100 ms, before paint).
   - Reads saved tasks, links, and user name from storage.
   - Renders each widget with its initial state.
   - Starts the clock interval (1-second tick).
2. **User interactions** — each widget registers its own event listeners. Handlers mutate the widget's in-memory state, re-render the affected DOM subtree, then call the storage write function.
3. **Clock tick** — a `setInterval` callback fires every 1000 ms, reads `new Date()`, and updates only the clock/date/greeting DOM nodes.
4. **Timer tick** — a separate `setInterval` (created on start, cleared on stop/reset) decrements the remaining seconds and updates the timer display.

---

## Components and Interfaces

### 1. Storage Module

Thin wrapper around `localStorage` with error handling.

```js
// Internal storage keys
const STORAGE_KEYS = {
  TASKS:     'tdld_tasks',
  LINKS:     'tdld_links',
  USER_NAME: 'tdld_username',
  THEME:     'tdld_theme',
};

/**
 * Read and JSON-parse a value from localStorage.
 * Returns `fallback` on any error (null, parse failure, quota, etc.).
 */
function storageRead(key, fallback) { ... }

/**
 * JSON-serialize and write a value to localStorage.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
function storageWrite(key, value) { ... }

/**
 * Remove a key from localStorage.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
function storageRemove(key) { ... }
```

**Fallback defaults:**

| Key          | Fallback value |
|--------------|----------------|
| `tdld_tasks` | `[]`           |
| `tdld_links` | `[]`           |
| `tdld_username` | `""`        |
| `tdld_theme` | `"light"`      |

### 2. Greeting Widget

**State:**
```js
let greetingState = {
  userName: '',   // string, max 50 chars
};
```

**Pure functions (testable):**
```js
// Returns "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night"
function getGreetingPhrase(hour) { ... }

// Returns "HH:MM:SS" string from a Date object
function formatTime(date) { ... }

// Returns "Weekday, DD Month YYYY" string from a Date object
function formatDate(date) { ... }

// Returns full greeting string, e.g. "Good Morning, Alex!" or "Good Morning!"
function buildGreetingText(phrase, userName) { ... }

// Validates user name: non-empty after trim, max 50 chars
function validateUserName(input) { ... }  // returns { valid, error }
```

**DOM interactions:**
- `renderClock()` — updates `#clock`, `#date`, `#greeting` text nodes every second.
- `renderUserName()` — updates the name input field and greeting display.
- `handleNameSubmit()` — validates, writes to storage, updates state, re-renders.
- `handleNameClear()` — removes from storage, resets state, re-renders.

### 3. Focus Timer Widget

**State:**
```js
let timerState = {
  remaining: 1500,   // seconds
  running: false,
  intervalId: null,
};
```

**Pure functions (testable):**
```js
// Returns "MM:SS" string from a seconds integer
function formatTimerDisplay(seconds) { ... }

// Returns the next timer state after a tick (decrements remaining, clamps to 0)
function timerTick(state) { ... }   // returns new state object (pure)

// Returns whether the timer has reached zero
function isTimerExpired(state) { ... }
```

**DOM interactions:**
- `renderTimer()` — updates `#timer-display`, enables/disables start/stop buttons.
- `handleTimerStart()` — sets `running = true`, creates interval.
- `handleTimerStop()` — clears interval, sets `running = false`.
- `handleTimerReset()` — clears interval, resets `remaining` to 1500, re-renders.
- `handleTimerExpiry()` — shows persistent notification `#timer-notification`, re-enables start.

### 4. Task List Widget

**State:**
```js
let taskState = {
  tasks: [],   // Task[]
  editingId: null,  // string | null
};
```

**Task data model:**
```js
{
  id:        string,   // crypto.randomUUID() or Date.now().toString()
  label:     string,   // trimmed, max 200 chars
  completed: boolean,
  createdAt: number,   // Date.now() timestamp
}
```

**Pure functions (testable):**
```js
// Validates a task label: non-empty after trim, max 200 chars
function validateTaskLabel(input) { ... }  // returns { valid, error }

// Trims and truncates a label to 200 chars
function normalizeTaskLabel(input) { ... }

// Sorts tasks: incomplete first, then completed; stable within each group
function sortTasks(tasks) { ... }

// Toggles the completed state of a task by id
function toggleTask(tasks, id) { ... }

// Removes a task by id
function deleteTask(tasks, id) { ... }

// Updates the label of a task by id
function updateTaskLabel(tasks, id, newLabel) { ... }
```

**DOM interactions:**
- `renderTaskList()` — full re-render of `#task-list` from `taskState.tasks`.
- `handleTaskAdd()` — validates, normalizes, creates task object, appends to state, persists, re-renders.
- `handleTaskEdit(id)` — sets `editingId`, re-renders row in edit mode.
- `handleTaskEditConfirm(id)` — validates new label, updates state, persists, re-renders.
- `handleTaskEditCancel()` — clears `editingId`, re-renders.
- `handleTaskToggle(id)` — toggles completion, persists, re-renders.
- `handleTaskDelete(id)` — removes task, persists, re-renders.
- `handleTaskSort()` — applies `sortTasks()` to in-memory array, re-renders (no storage write).

### 5. Quick Links Widget

**State:**
```js
let linksState = {
  links: [],   // Link[]
};
```

**Link data model:**
```js
{
  id:    string,   // crypto.randomUUID() or Date.now().toString()
  label: string,   // trimmed, max 100 chars
  url:   string,   // validated URL string
}
```

**Pure functions (testable):**
```js
// Validates a URL: non-empty, starts with http:// or https://, has hostname
function validateUrl(input) { ... }  // returns { valid, error }

// Validates a link label: non-empty after trim, max 100 chars
function validateLinkLabel(input) { ... }  // returns { valid, error }

// Checks if a URL already exists in the links array
function isDuplicateUrl(links, url) { ... }  // returns boolean
```

**DOM interactions:**
- `renderLinks()` — full re-render of `#links-panel` from `linksState.links`.
- `handleLinkAdd()` — validates label and URL, checks duplicate, creates link, persists, re-renders.
- `handleLinkDelete(id)` — removes link, persists, re-renders.

### 6. Theme Module

**Pure functions (testable):**
```js
// Returns the opposite theme
function toggleTheme(current) { ... }  // "light" | "dark"

// Validates a theme value read from storage
function isValidTheme(value) { ... }  // returns boolean
```

**DOM interactions:**
- `applyTheme(theme)` — sets `data-theme` attribute on `<html>` element; CSS variables handle all color changes.
- `handleThemeToggle()` — calls `toggleTheme`, applies, persists, updates toggle button label/icon.

---

## Data Models

### Local Storage Schema

All data is stored as JSON strings. Keys are namespaced with the `tdld_` prefix to avoid collisions.

#### `tdld_tasks` — `Task[]`

```json
[
  {
    "id": "1716739200000",
    "label": "Write design document",
    "completed": false,
    "createdAt": 1716739200000
  }
]
```

| Field       | Type    | Constraints                        |
|-------------|---------|------------------------------------|
| `id`        | string  | Unique, non-empty                  |
| `label`     | string  | Trimmed, 1–200 characters          |
| `completed` | boolean | `true` or `false`                  |
| `createdAt` | number  | Unix timestamp (ms)                |

#### `tdld_links` — `Link[]`

```json
[
  {
    "id": "1716739300000",
    "label": "GitHub",
    "url": "https://github.com"
  }
]
```

| Field   | Type   | Constraints                                      |
|---------|--------|--------------------------------------------------|
| `id`    | string | Unique, non-empty                                |
| `label` | string | Trimmed, 1–100 characters                        |
| `url`   | string | Starts with `http://` or `https://`, has hostname |

#### `tdld_username` — `string`

```json
"Alex"
```

| Constraint | Value                    |
|------------|--------------------------|
| Max length | 50 characters            |
| Empty      | Stored as `""` or absent |

#### `tdld_theme` — `"light" | "dark"`

```json
"dark"
```

### In-Memory State Summary

| Widget        | State variable  | Shape                                      |
|---------------|-----------------|--------------------------------------------|
| Greeting      | `greetingState` | `{ userName: string }`                     |
| Focus Timer   | `timerState`    | `{ remaining: number, running: boolean, intervalId: number\|null }` |
| Task List     | `taskState`     | `{ tasks: Task[], editingId: string\|null }` |
| Quick Links   | `linksState`    | `{ links: Link[] }`                        |
| Theme         | `currentTheme`  | `"light" \| "dark"`                        |

### State Transitions

#### Focus Timer

```
         start()
IDLE ──────────────► RUNNING
 ▲                      │
 │       stop()         │
 └──────────────────────┘
 │
 │  reset() (from any state)
 └──────────────────────────► IDLE (remaining = 1500)

RUNNING ──► (remaining reaches 0) ──► EXPIRED
EXPIRED ──► start() ──► RUNNING (remaining = 1500)
```

#### Task Edit

```
DISPLAY ──► edit(id) ──► EDITING
EDITING ──► confirm() ──► DISPLAY  (if label valid)
EDITING ──► cancel()  ──► DISPLAY
EDITING ──► confirm() ──► EDITING  (if label invalid, stays in edit mode with error)
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Time formatting produces valid HH:MM:SS output

*For any* `Date` object, `formatTime(date)` SHALL return a string matching the pattern `HH:MM:SS` where HH is in [00–23], MM is in [00–59], and SS is in [00–59].

**Validates: Requirements 1.1**

---

### Property 2: Date formatting produces valid "Weekday, DD Month YYYY" output

*For any* `Date` object, `formatDate(date)` SHALL return a string whose weekday component is one of the seven English weekday names, whose day component is a valid day of the month, whose month component is one of the twelve English month names, and whose year component is a four-digit integer.

**Validates: Requirements 1.2**

---

### Property 3: Greeting phrase is correct for every hour of the day

*For any* integer hour in [0, 23]:
- If hour ∈ [5, 11] → `getGreetingPhrase(hour)` === `"Good Morning"`
- If hour ∈ [12, 17] → `getGreetingPhrase(hour)` === `"Good Afternoon"`
- If hour ∈ [18, 20] → `getGreetingPhrase(hour)` === `"Good Evening"`
- If hour ∈ [0, 4] ∪ [21, 23] → `getGreetingPhrase(hour)` === `"Good Night"`

Every hour maps to exactly one greeting phrase with no gaps or overlaps.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 4: Greeting text format is correct for any name and phrase

*For any* greeting phrase string and user name string:
- If `userName` is non-empty → `buildGreetingText(phrase, userName)` === `"${phrase}, ${userName}!"`
- If `userName` is empty → `buildGreetingText(phrase, "")` === `"${phrase}!"`

**Validates: Requirements 2.2, 2.5**

---

### Property 5: Storage round-trip preserves data integrity

*For any* serializable value (Task array, Link array, string, or theme value), writing it to storage with `storageWrite(key, value)` and then reading it back with `storageRead(key, fallback)` SHALL return a value deeply equal to the original.

**Validates: Requirements 2.3, 4.4, 4.6, 7.8, 7.9, 9.3, 10.1**

---

### Property 6: Storage read returns fallback for any invalid or missing value

*For any* storage key whose value is `null`, an unparseable string, or absent, `storageRead(key, fallback)` SHALL return `fallback` without throwing an exception.

**Validates: Requirements 9.5, 10.2**

---

### Property 7: User name validation enforces length constraint

*For any* string input to `validateUserName`:
- If `input.trim().length === 0` → result is `{ valid: false }`
- If `input.trim().length > 50` → result is `{ valid: false }`
- If `1 ≤ input.trim().length ≤ 50` → result is `{ valid: true }`

**Validates: Requirements 2.1**

---

### Property 8: Timer display formats any second count as MM:SS

*For any* integer `seconds` in [0, 1500], `formatTimerDisplay(seconds)` SHALL return a string matching `MM:SS` where MM is `Math.floor(seconds / 60)` zero-padded to two digits and SS is `seconds % 60` zero-padded to two digits.

**Validates: Requirements 3.3**

---

### Property 9: Timer tick decrements remaining by exactly one second

*For any* timer state where `remaining > 0`, `timerTick(state).remaining` SHALL equal `state.remaining - 1`. When `remaining === 0`, `timerTick(state).remaining` SHALL remain `0` (no underflow).

**Validates: Requirements 3.2, 3.6**

---

### Property 10: Timer reset always produces the initial state

*For any* timer state (running, stopped, or expired), after a reset operation the resulting state SHALL have `remaining === 1500` and `running === false`.

**Validates: Requirements 3.5**

---

### Property 11: Task label validation rejects whitespace-only and empty inputs

*For any* string where `input.trim() === ""`, `validateTaskLabel(input)` SHALL return `{ valid: false }`. *For any* non-empty trimmed string with length ≤ 200, `validateTaskLabel(input)` SHALL return `{ valid: true }`.

**Validates: Requirements 4.2, 4.3, 5.3**

---

### Property 12: Task label normalization trims whitespace and enforces max length

*For any* string input, `normalizeTaskLabel(input)` SHALL return a string with no leading or trailing whitespace and a length of at most 200 characters.

**Validates: Requirements 4.2, 5.2**

---

### Property 13: Task completion toggle is its own inverse (round-trip)

*For any* tasks array and task `id`, applying `toggleTask` twice SHALL return the task to its original `completed` state: `toggleTask(toggleTask(tasks, id), id)[i].completed === tasks[i].completed` for the task with the given `id`.

**Validates: Requirements 5.5**

---

### Property 14: Task deletion removes exactly the targeted task

*For any* tasks array and valid task `id`, `deleteTask(tasks, id)` SHALL return an array that does not contain any task with that `id`, and all other tasks SHALL remain present and unchanged.

**Validates: Requirements 5.6**

---

### Property 15: Sort places all incomplete tasks before all completed tasks (and is idempotent)

*For any* tasks array, `sortTasks(tasks)` SHALL produce an array where no completed task appears at a lower index than any incomplete task. Additionally, `sortTasks(sortTasks(tasks))` SHALL produce the same order as `sortTasks(tasks)` (idempotence), and the relative order of tasks within each completion group SHALL be preserved (stable sort).

**Validates: Requirements 6.2, 6.3, 6.5**

---

### Property 16: URL validation accepts only http/https URLs with a hostname

*For any* string input to `validateUrl`:
- If the string starts with `"http://"` or `"https://"` and has at least one character after the scheme → result is `{ valid: true }`
- For any other string (empty, wrong scheme, missing hostname) → result is `{ valid: false }`

**Validates: Requirements 7.3, 7.5**

---

### Property 17: Link label validation rejects empty and oversized labels

*For any* string input to `validateLinkLabel`:
- If `input.trim() === ""` → result is `{ valid: false }`
- If `input.trim().length > 100` → result is `{ valid: false }`
- If `1 ≤ input.trim().length ≤ 100` → result is `{ valid: true }`

**Validates: Requirements 7.1, 7.4**

---

### Property 18: Duplicate URL detection is consistent with the links array

*For any* links array and URL string, `isDuplicateUrl(links, url)` SHALL return `true` if and only if at least one link in the array has a `url` field equal to the input URL string.

**Validates: Requirements 7.6**

---

### Property 19: Link deletion removes exactly the targeted link

*For any* links array and valid link `id`, after deletion the resulting array SHALL not contain any link with that `id`, and all other links SHALL remain present and unchanged.

**Validates: Requirements 8.1**

---

### Property 20: Theme toggle is its own inverse (round-trip)

*For any* valid theme value (`"light"` or `"dark"`), `toggleTheme(toggleTheme(theme))` SHALL equal `theme`.

**Validates: Requirements 9.1**

---

## Error Handling

### Storage Failures

Every storage operation is wrapped in a try/catch. The `storageWrite` and `storageRemove` functions return a result object `{ ok: boolean, error?: Error }` rather than throwing. Callers check `ok` and display an inline error message in the affected widget if `ok === false`.

```js
function storageWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}
```

**Inline error display pattern:**
- Each widget has a dedicated `<p class="error-msg" aria-live="polite">` element, hidden by default.
- On storage failure, the element's `textContent` is set and the `hidden` attribute is removed.
- On the next successful operation, the error element is hidden again.

### Malformed Storage Data

`storageRead` catches JSON parse errors and returns the fallback value:

```js
function storageRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
```

### Input Validation Errors

Validation functions return `{ valid: boolean, error?: string }`. The UI layer checks `valid` and, if false, displays the `error` string in an inline `<span class="validation-msg">` adjacent to the offending input field. The field also receives `aria-invalid="true"` for accessibility.

### Timer Edge Cases

- `timerTick` clamps `remaining` to 0 — it never goes negative.
- If `setInterval` fires slightly late (browser throttling), the display still shows the correct remaining value because the state is decremented by 1 per tick, not by elapsed wall-clock time.

### Theme Flash Prevention

The theme is applied in a `<script>` tag in the `<head>` of `index.html` (before the body renders) to prevent a flash of unstyled content:

```html
<script>
  (function() {
    try {
      var t = localStorage.getItem('tdld_theme');
      document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    } catch(e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

---

## Testing Strategy

### Overview

This application is a client-side vanilla JS app. The testable logic is concentrated in pure functions (formatters, validators, state transformers). DOM interactions are tested with example-based tests using a lightweight DOM environment (jsdom via Jest or Vitest).

**Property-based testing IS applicable** for the pure function layer. The correctness properties defined above map directly to property-based tests using a library such as [fast-check](https://github.com/dubzzz/fast-check) (JavaScript).

### Test Layers

| Layer | Tool | What it covers |
|-------|------|----------------|
| Property tests | fast-check + Vitest | Pure functions: formatters, validators, state transformers |
| Unit tests | Vitest | Specific examples, edge cases, error conditions |
| Integration tests | Vitest + jsdom | DOM interactions, storage round-trips, widget behavior |
| Smoke tests | Manual / Playwright | Layout, responsive design, theme flash, no network calls |

### Property-Based Test Configuration

- **Library**: [fast-check](https://github.com/dubzzz/fast-check)
- **Minimum iterations**: 100 per property (fast-check default is 100; increase to 500 for critical properties)
- **Tag format**: Each test is tagged with a comment: `// Feature: todo-life-dashboard, Property N: <property_text>`

**Example property test:**

```js
import fc from 'fast-check';
import { formatTimerDisplay } from '../app.js';

// Feature: todo-life-dashboard, Property 8: Timer display formats any second count as MM:SS
test('formatTimerDisplay produces valid MM:SS for any seconds in [0, 1500]', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1500 }), (seconds) => {
      const result = formatTimerDisplay(seconds);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
      const [mm, ss] = result.split(':').map(Number);
      expect(mm).toBe(Math.floor(seconds / 60));
      expect(ss).toBe(seconds % 60);
    }),
    { numRuns: 500 }
  );
});
```

### Unit Test Focus Areas

Unit tests (example-based) cover:
- Timer initialization state (`remaining === 1500`, `running === false`)
- Start/stop/reset button enable/disable states
- Edit mode pre-fills input with current label
- Sort control does not call `storageWrite`
- Link button has `target="_blank"` and correct `href`
- Empty-state message appears when links array is empty
- Theme toggle updates `data-theme` attribute on `<html>`

### Integration Test Focus Areas

- Full task lifecycle: add → edit → complete → delete, verifying storage is called at each step
- Full link lifecycle: add → delete, verifying storage is called
- Dashboard init: pre-populate storage, call `init()`, verify all widgets render saved data
- Storage failure injection: mock `localStorage.setItem` to throw, verify inline error messages appear

### Smoke Tests (Manual or Playwright)

- Application loads and renders without errors at 768px, 1024px, and 1920px viewport widths
- No horizontal scrollbar appears at any supported viewport width
- Theme is applied before first paint (no flash of unstyled content)
- No network requests are made on load
- All widgets are visually separated by at least 16px

### Pure Functions to Export for Testing

To enable testing without a browser, the following functions MUST be exported from `app.js` (or extracted into a separate `utils.js` module):

- `formatTime(date)`
- `formatDate(date)`
- `getGreetingPhrase(hour)`
- `buildGreetingText(phrase, userName)`
- `validateUserName(input)`
- `formatTimerDisplay(seconds)`
- `timerTick(state)`
- `isTimerExpired(state)`
- `validateTaskLabel(input)`
- `normalizeTaskLabel(input)`
- `sortTasks(tasks)`
- `toggleTask(tasks, id)`
- `deleteTask(tasks, id)`
- `updateTaskLabel(tasks, id, newLabel)`
- `validateUrl(input)`
- `validateLinkLabel(input)`
- `isDuplicateUrl(links, url)`
- `toggleTheme(current)`
- `isValidTheme(value)`
- `storageRead(key, fallback)`
- `storageWrite(key, value)`
- `storageRemove(key)`
