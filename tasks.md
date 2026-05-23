# Implementation Plan: To-Do Life Dashboard

## Overview

Build a zero-dependency, client-side productivity dashboard as three static files (`index.html`, `style.css`, `app.js`). Implementation proceeds in layers: project scaffold → pure utility functions → storage module → each widget (Greeting, Timer, Task List, Quick Links) → theme module → wiring and integration. Property-based tests validate pure functions; unit and integration tests cover DOM behavior and storage round-trips.

## Tasks

- [ ] 1. Scaffold project structure and HTML skeleton
  - Create `index.html` with semantic sections for each widget: `#greeting-widget`, `#timer-widget`, `#task-widget`, `#links-widget`
  - Add theme-flash-prevention inline `<script>` in `<head>` that reads `tdld_theme` from localStorage and sets `data-theme` on `<html>` before first paint
  - Link `style.css` and `app.js` in `index.html`
  - Create empty `style.css` and `app.js` stubs
  - Set up Vitest + jsdom + fast-check as dev dependencies (`package.json`, `vitest.config.js`)
  - _Requirements: 9.4, 11.1_

- [ ] 2. Implement Storage Module
  - [ ] 2.1 Implement `storageRead`, `storageWrite`, `storageRemove` with try/catch error handling and result objects
    - Define `STORAGE_KEYS` constants (`tdld_tasks`, `tdld_links`, `tdld_username`, `tdld_theme`)
    - `storageRead(key, fallback)` returns fallback on null, parse error, or any exception
    - `storageWrite(key, value)` returns `{ ok: true }` or `{ ok: false, error }`
    - `storageRemove(key)` returns `{ ok: true }` or `{ ok: false, error }`
    - Export all three functions for testing
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 2.2 Write property test for storage round-trip (Property 5)
    - **Property 5: Storage round-trip preserves data integrity**
    - **Validates: Requirements 2.3, 4.4, 4.6, 7.8, 7.9, 9.3, 10.1**

  - [ ] 2.3 Write property test for storage fallback on invalid data (Property 6)
    - **Property 6: Storage read returns fallback for any invalid or missing value**
    - **Validates: Requirements 9.5, 10.2**

- [ ] 3. Implement Greeting Widget pure functions
  - [ ] 3.1 Implement `formatTime(date)`, `formatDate(date)`, `getGreetingPhrase(hour)`, `buildGreetingText(phrase, userName)`, `validateUserName(input)`
    - `formatTime` returns `"HH:MM:SS"` using device local timezone
    - `formatDate` returns `"Weekday, DD Month YYYY"` using device local timezone
    - `getGreetingPhrase` maps hour ranges: [5–11] → Morning, [12–17] → Afternoon, [18–20] → Evening, [0–4, 21–23] → Night
    - `buildGreetingText` appends `, ${userName}!` when name is non-empty, else `!`
    - `validateUserName` rejects empty-after-trim and length > 50
    - Export all five functions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.5_

  - [ ] 3.2 Write property test for time formatting (Property 1)
    - **Property 1: Time formatting produces valid HH:MM:SS output**
    - **Validates: Requirements 1.1**

  - [ ] 3.3 Write property test for date formatting (Property 2)
    - **Property 2: Date formatting produces valid "Weekday, DD Month YYYY" output**
    - **Validates: Requirements 1.2**

  - [ ] 3.4 Write property test for greeting phrase coverage (Property 3)
    - **Property 3: Greeting phrase is correct for every hour of the day**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

  - [ ] 3.5 Write property test for greeting text format (Property 4)
    - **Property 4: Greeting text format is correct for any name and phrase**
    - **Validates: Requirements 2.2, 2.5**

  - [ ] 3.6 Write property test for user name validation (Property 7)
    - **Property 7: User name validation enforces length constraint**
    - **Validates: Requirements 2.1**

- [ ] 4. Implement Greeting Widget DOM layer
  - [ ] 4.1 Implement `renderClock()`, `renderUserName()`, `handleNameSubmit()`, `handleNameClear()`
    - `renderClock()` updates `#clock`, `#date`, `#greeting` text nodes
    - `handleNameSubmit()` validates input, writes to storage, updates `greetingState`, re-renders; shows inline error on storage failure
    - `handleNameClear()` removes from storage, resets state, re-renders; shows inline error on storage failure
    - Add `<p class="error-msg" aria-live="polite">` and `<span class="validation-msg">` elements to the widget HTML
    - Start 1-second `setInterval` for clock updates in `init()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ] 4.2 Write unit tests for Greeting Widget DOM interactions
    - Test clock renders correct HH:MM:SS on tick
    - Test name submit persists to storage and updates greeting display
    - Test name clear removes from storage and reverts to nameless greeting
    - Test inline error appears when storageWrite fails
    - _Requirements: 2.3, 2.4, 2.7, 2.8_

- [ ] 5. Implement Focus Timer pure functions
  - [ ] 5.1 Implement `formatTimerDisplay(seconds)`, `timerTick(state)`, `isTimerExpired(state)`
    - `formatTimerDisplay` returns `"MM:SS"` zero-padded; MM = floor(s/60), SS = s%60
    - `timerTick` returns new state with `remaining` decremented by 1, clamped to 0
    - `isTimerExpired` returns true when `remaining === 0`
    - Export all three functions
    - _Requirements: 3.2, 3.3, 3.6_

  - [ ] 5.2 Write property test for timer display formatting (Property 8)
    - **Property 8: Timer display formats any second count as MM:SS**
    - **Validates: Requirements 3.3**

  - [ ] 5.3 Write property test for timer tick decrement (Property 9)
    - **Property 9: Timer tick decrements remaining by exactly one second**
    - **Validates: Requirements 3.2, 3.6**

  - [ ] 5.4 Write property test for timer reset state (Property 10)
    - **Property 10: Timer reset always produces the initial state**
    - **Validates: Requirements 3.5**

- [ ] 6. Implement Focus Timer DOM layer
  - [ ] 6.1 Implement `renderTimer()`, `handleTimerStart()`, `handleTimerStop()`, `handleTimerReset()`, `handleTimerExpiry()`
    - `renderTimer()` updates `#timer-display`, enables/disables start and stop buttons per timer state
    - `handleTimerStart()` sets `running = true`, creates `setInterval` that calls `timerTick` each second; disables start button
    - `handleTimerStop()` clears interval, sets `running = false`; disables stop button
    - `handleTimerReset()` clears interval, resets `remaining` to 1500, sets `running = false`, re-renders
    - `handleTimerExpiry()` shows persistent `#timer-notification`, re-enables start button
    - Reset control remains enabled at all times
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [ ] 6.2 Write unit tests for Focus Timer DOM interactions
    - Test initial state: display shows "25:00", start enabled, stop disabled
    - Test start disables start button and enables stop button
    - Test stop pauses countdown and retains remaining time
    - Test reset restores "25:00" from any state
    - Test expiry shows notification and re-enables start
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Task List pure functions
  - [ ] 8.1 Implement `validateTaskLabel(input)`, `normalizeTaskLabel(input)`, `sortTasks(tasks)`, `toggleTask(tasks, id)`, `deleteTask(tasks, id)`, `updateTaskLabel(tasks, id, newLabel)`
    - `validateTaskLabel` rejects empty-after-trim and length > 200
    - `normalizeTaskLabel` trims and truncates to 200 chars
    - `sortTasks` places incomplete tasks before completed tasks, stable within each group
    - `toggleTask` returns new array with target task's `completed` flipped
    - `deleteTask` returns new array without the task matching `id`
    - `updateTaskLabel` returns new array with target task's `label` replaced
    - Export all six functions
    - _Requirements: 4.2, 4.3, 5.2, 5.3, 5.5, 5.6, 6.2, 6.3_

  - [ ] 8.2 Write property test for task label validation (Property 11)
    - **Property 11: Task label validation rejects whitespace-only and empty inputs**
    - **Validates: Requirements 4.2, 4.3, 5.3**

  - [ ] 8.3 Write property test for task label normalization (Property 12)
    - **Property 12: Task label normalization trims whitespace and enforces max length**
    - **Validates: Requirements 4.2, 5.2**

  - [ ] 8.4 Write property test for task toggle round-trip (Property 13)
    - **Property 13: Task completion toggle is its own inverse (round-trip)**
    - **Validates: Requirements 5.5**

  - [ ] 8.5 Write property test for task deletion (Property 14)
    - **Property 14: Task deletion removes exactly the targeted task**
    - **Validates: Requirements 5.6**

  - [ ] 8.6 Write property test for task sort correctness and idempotence (Property 15)
    - **Property 15: Sort places all incomplete tasks before all completed tasks (and is idempotent)**
    - **Validates: Requirements 6.2, 6.3, 6.5**

- [ ] 9. Implement Task List DOM layer
  - [ ] 9.1 Implement `renderTaskList()`, `handleTaskAdd()`, `handleTaskEdit(id)`, `handleTaskEditConfirm(id)`, `handleTaskEditCancel()`, `handleTaskToggle(id)`, `handleTaskDelete(id)`, `handleTaskSort()`
    - `renderTaskList()` fully re-renders `#task-list` from `taskState.tasks`; applies strikethrough style to completed tasks
    - `handleTaskAdd()` validates, normalizes, creates task with `id` (crypto.randomUUID or Date.now), appends to state, persists, re-renders; shows inline validation or storage error as appropriate
    - `handleTaskEdit(id)` sets `editingId`, re-renders row in edit mode pre-filled with current label
    - `handleTaskEditConfirm(id)` validates new label; on valid: updates state, persists, re-renders; on invalid: stays in edit mode with error
    - `handleTaskEditCancel()` clears `editingId`, re-renders
    - `handleTaskToggle(id)` toggles completion, persists within 500ms, re-renders
    - `handleTaskDelete(id)` removes task, persists within 500ms, re-renders
    - `handleTaskSort()` applies `sortTasks()` to in-memory array, re-renders without writing to storage
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 9.2 Write unit tests for Task List DOM interactions
    - Test add: empty label shows validation message; valid label appends task and calls storageWrite
    - Test edit: activating edit pre-fills input; cancel restores original label; confirm with empty label stays in edit mode
    - Test toggle: completed task gets strikethrough; calls storageWrite
    - Test delete: task removed from DOM; calls storageWrite
    - Test sort: does NOT call storageWrite; incomplete tasks appear before completed
    - _Requirements: 4.2, 4.3, 4.5, 5.1, 5.3, 5.4, 5.7, 6.4_

- [ ] 10. Implement Quick Links pure functions
  - [ ] 10.1 Implement `validateUrl(input)`, `validateLinkLabel(input)`, `isDuplicateUrl(links, url)`
    - `validateUrl` accepts strings starting with `http://` or `https://` with at least one hostname character after the scheme
    - `validateLinkLabel` rejects empty-after-trim and length > 100
    - `isDuplicateUrl` returns true iff any link in the array has `url === input`
    - Export all three functions
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6_

  - [ ] 10.2 Write property test for URL validation (Property 16)
    - **Property 16: URL validation accepts only http/https URLs with a hostname**
    - **Validates: Requirements 7.3, 7.5**

  - [ ] 10.3 Write property test for link label validation (Property 17)
    - **Property 17: Link label validation rejects empty and oversized labels**
    - **Validates: Requirements 7.1, 7.4**

  - [ ] 10.4 Write property test for duplicate URL detection (Property 18)
    - **Property 18: Duplicate URL detection is consistent with the links array**
    - **Validates: Requirements 7.6**

  - [ ] 10.5 Write property test for link deletion (Property 19)
    - **Property 19: Link deletion removes exactly the targeted link**
    - **Validates: Requirements 8.1**

- [ ] 11. Implement Quick Links DOM layer
  - [ ] 11.1 Implement `renderLinks()`, `handleLinkAdd()`, `handleLinkDelete(id)`
    - `renderLinks()` fully re-renders `#links-panel`; each link renders as a `<button>` or `<a target="_blank">` with the link label; shows empty-state message when `linksState.links` is empty
    - `handleLinkAdd()` validates label and URL, checks for duplicate URL, creates link with unique id, persists, re-renders; shows per-field inline validation messages on failure
    - `handleLinkDelete(id)` removes link, persists within 500ms, re-renders; on storage failure shows inline error and keeps link visible
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 8.1, 8.2, 8.3, 8.4_

  - [ ] 11.2 Write unit tests for Quick Links DOM interactions
    - Test add: empty label shows label validation message; invalid URL shows URL validation message; duplicate URL shows duplicate message; valid input adds link and calls storageWrite
    - Test link button has `target="_blank"` and correct `href`
    - Test delete: link removed from DOM; calls storageWrite; storage failure keeps link visible with error message
    - Test empty-state message appears when links array is empty
    - _Requirements: 7.4, 7.5, 7.6, 7.7, 8.2, 8.4_

- [ ] 12. Implement Theme Module
  - [ ] 12.1 Implement `toggleTheme(current)`, `isValidTheme(value)`, `applyTheme(theme)`, `handleThemeToggle()`
    - `toggleTheme` returns `"dark"` when given `"light"` and vice versa
    - `isValidTheme` returns true only for `"light"` or `"dark"`
    - `applyTheme(theme)` sets `data-theme` attribute on `<html>` element
    - `handleThemeToggle()` calls `toggleTheme`, applies, persists, updates toggle button label/icon
    - Export `toggleTheme` and `isValidTheme` for testing
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 12.2 Write property test for theme toggle round-trip (Property 20)
    - **Property 20: Theme toggle is its own inverse (round-trip)**
    - **Validates: Requirements 9.1**

  - [ ] 12.3 Write unit tests for Theme Module DOM interactions
    - Test toggle updates `data-theme` attribute on `<html>`
    - Test toggle button label/icon reflects active theme
    - Test persists theme to storage on toggle
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement CSS styling
  - [ ] 14.1 Write `style.css` with CSS custom properties for light and dark themes, widget layout, and responsive breakpoints
    - Define `[data-theme="light"]` and `[data-theme="dark"]` CSS variable sets for all color tokens
    - Lay out widgets in a responsive grid/flex container; minimum 16px spacing between widgets
    - Apply strikethrough style to completed task labels (`.task-item.completed .task-label`)
    - Set minimum body font size to 14px
    - Add `@media (max-width: 767px)` rule to stack all widgets vertically
    - _Requirements: 5.5, 9.2, 11.2, 11.3, 11.4, 11.5_

- [ ] 15. Wire everything together in `init()` and finalize `app.js`
  - [ ] 15.1 Implement `init()` function that orchestrates all widget initialization
    - Apply saved theme immediately (within 100ms) using `storageRead` + `applyTheme`
    - Load and render saved tasks, links, and user name from storage with fallback defaults
    - Register all event listeners for every widget
    - Start the 1-second clock interval
    - Handle storage read failures with inline error messages per widget
    - _Requirements: 1.1, 2.3, 4.6, 4.7, 7.9, 7.10, 9.4, 9.5, 10.1, 10.2_

  - [ ] 15.2 Write integration tests for full widget lifecycles
    - Task lifecycle: add → edit → complete → delete; verify storageWrite called at each step
    - Link lifecycle: add → delete; verify storageWrite called at each step
    - Dashboard init: pre-populate storage, call `init()`, verify all widgets render saved data
    - Storage failure injection: mock `localStorage.setItem` to throw; verify inline error messages appear in affected widgets
    - _Requirements: 4.4, 4.5, 5.7, 7.8, 8.3, 10.1, 10.4_

- [ ] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints at tasks 7, 13, and 16 ensure incremental validation
- Property tests use fast-check and validate universal correctness properties across all valid inputs
- Unit tests validate specific examples, edge cases, and DOM behavior
- Integration tests cover full widget lifecycles and storage failure scenarios
- The theme-flash-prevention script in `<head>` (task 1) must run before `style.css` is applied
- `handleTaskSort()` intentionally does NOT write to storage (Requirement 6.4)
- All pure functions must be exported from `app.js` (or a separate `utils.js`) to enable testing without a browser

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.1", "5.1", "8.1", "10.1", "12.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "5.2", "5.3", "5.4", "8.2", "8.3", "8.4", "8.5", "8.6", "10.2", "10.3", "10.4", "10.5", "12.2"] },
    { "id": 3, "tasks": ["4.1", "6.1", "9.1", "11.1", "14.1"] },
    { "id": 4, "tasks": ["4.2", "6.2", "9.2", "11.2", "12.3"] },
    { "id": 5, "tasks": ["15.1"] },
    { "id": 6, "tasks": ["15.2"] }
  ]
}
```
