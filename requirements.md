# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side web application that serves as a personal productivity homepage. It provides users with a real-time clock and greeting, a Pomodoro-style focus timer, a task management list, and a quick-access link panel — all persisted via the browser's Local Storage API. The application is built with plain HTML, CSS, and Vanilla JavaScript, requires no backend, and can be deployed as a static site on GitHub Pages or used as a browser homepage.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI component that displays the current time, date, and a personalized greeting message.
- **Focus_Timer**: The UI component that implements a countdown timer (default 25 minutes) with start, stop, and reset controls.
- **Task_List**: The UI component that manages the user's to-do items.
- **Task**: A single to-do item with a text label and a completion state.
- **Quick_Links**: The UI component that displays user-defined shortcut buttons linking to external websites.
- **Link**: A single quick-access entry consisting of a label and a URL.
- **Storage**: The browser's Local Storage API used to persist all user data client-side.
- **Theme**: The visual color scheme of the Dashboard, either Light or Dark.
- **User_Name**: A custom name entered by the user, displayed in the greeting.
- **Session**: A single browser tab or window in which the Dashboard is open.

---

## Requirements

### Requirement 1: Real-Time Clock and Date Display

**User Story:** As a user, I want to see the current time and date at a glance, so that I can stay oriented throughout my day without switching tabs.

#### Acceptance Criteria

1. WHEN each second elapses, THE Greeting_Widget SHALL update the displayed time to the current time in HH:MM:SS format using the device's local timezone.
2. THE Greeting_Widget SHALL display the current date in the format "Weekday, DD Month YYYY" (e.g., Monday, 26 May 2025), derived from the device's local timezone.
3. IF the current hour is between 05 and 11 inclusive, THEN THE Greeting_Widget SHALL display the greeting "Good Morning".
4. IF the current hour is between 12 and 17 inclusive, THEN THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. IF the current hour is between 18 and 20 inclusive, THEN THE Greeting_Widget SHALL display the greeting "Good Evening".
6. IF the current hour is between 21 and 23 inclusive, or between 00 and 04 inclusive, THEN THE Greeting_Widget SHALL display the greeting "Good Night".
7. THE Greeting_Widget SHALL derive all time-based display values (clock, date, greeting) from the device's local timezone.

---

### Requirement 2: Custom Name in Greeting

**User Story:** As a user, I want to personalize the greeting with my name, so that the Dashboard feels tailored to me.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display an input field that allows the user to enter a User_Name of up to 50 characters.
2. WHEN the user submits a User_Name, THE Greeting_Widget SHALL display the greeting in the format "[Greeting], [User_Name]!" (e.g., "Good Morning, Alex!").
3. WHEN the user submits a User_Name, THE Storage SHALL persist the User_Name so it is restored on subsequent Sessions.
4. IF the Storage write operation for User_Name fails, THEN THE Greeting_Widget SHALL display an inline error message indicating the name could not be saved, and SHALL still display the entered name for the current Session.
5. WHEN no User_Name has been saved, THE Greeting_Widget SHALL display the greeting without a name (e.g., "Good Morning!").
6. WHEN the user clears the User_Name field and submits, THE Storage SHALL remove the saved User_Name.
7. WHEN the saved User_Name is removed from Storage, THE Greeting_Widget SHALL revert to the nameless greeting format.
8. IF the Storage remove operation for User_Name fails, THEN THE Greeting_Widget SHALL display an inline error message indicating the name could not be cleared.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can use the Pomodoro technique to manage focused work sessions.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialize with a countdown duration of 25 minutes (1500 seconds).
2. WHEN the user activates the start control, THE Focus_Timer SHALL begin counting down one second per real-world second.
3. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL display the remaining time in MM:SS format.
4. WHEN the user activates the stop control, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the user activates the reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a persistent on-page notification that remains visible until the user explicitly dismisses it.
7. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL disable the start control to prevent duplicate timers.
8. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL re-enable the start control so the user can immediately begin a new 25-minute session.
9. WHILE the Focus_Timer is paused or stopped (including after a reset), THE Focus_Timer SHALL disable the stop control.
10. THE Focus_Timer SHALL keep the reset control enabled at all times regardless of the timer state.

---

### Requirement 4: Task Management — Add and Display Tasks

**User Story:** As a user, I want to add tasks to a list and see them displayed, so that I can track what I need to accomplish.

#### Acceptance Criteria

1. THE Task_List SHALL provide a text input field and a submit control (button or Enter key) for entering new Tasks.
2. WHEN the user submits a non-empty task label, THE Task_List SHALL trim leading and trailing whitespace, enforce a maximum label length of 200 characters, add the Task to the list, and display it.
3. IF the user submits an empty or whitespace-only task label, THEN THE Task_List SHALL reject the input and display an inline validation message indicating the label cannot be empty.
4. WHEN a Task is added, THE Storage SHALL persist the updated task collection so Tasks are restored on subsequent Sessions.
5. IF the Storage write operation fails when adding a Task, THEN THE Task_List SHALL display an inline error message and retain the Task in the current Session's displayed list.
6. WHEN the Dashboard loads, THE Task_List SHALL retrieve and display all previously saved Tasks from Storage.
7. IF the Storage read operation fails on Dashboard load, THEN THE Task_List SHALL display an inline error message and render an empty list.

---

### Requirement 5: Task Management — Edit, Complete, and Delete Tasks

**User Story:** As a user, I want to edit, mark as done, and delete tasks, so that I can keep my list accurate and up to date.

#### Acceptance Criteria

1. WHEN the user activates the edit control on a Task, THE Task_List SHALL replace the task label with an editable input field pre-filled with the current label, enforcing a maximum of 200 characters.
2. WHEN the user confirms an edit with a non-empty label, THE Task_List SHALL trim leading and trailing whitespace, update the Task label, and return to display mode.
3. IF the user confirms an edit with an empty or whitespace-only label, THEN THE Task_List SHALL reject the edit and retain the original label.
4. WHEN the user cancels an edit (e.g., presses Escape), THE Task_List SHALL discard the in-progress edit and restore the original label in display mode.
5. WHEN the user activates the complete control on a Task, THE Task_List SHALL toggle the Task's completion state and apply a strikethrough style to the task label of completed Tasks.
6. WHEN the user activates the delete control on a Task, THE Task_List SHALL remove the Task from the list.
7. WHEN any Task is modified (edited, completed, or deleted), THE Storage SHALL persist the updated task collection within 500ms of the modification.

---

### Requirement 6: Task Sorting

**User Story:** As a user, I want to sort my task list, so that I can prioritize completed or incomplete tasks.

#### Acceptance Criteria

1. THE Task_List SHALL provide a sort control that allows the user to order Tasks with incomplete Tasks displayed before completed Tasks.
2. WHEN the user activates the sort control, THE Task_List SHALL reorder the displayed list so all incomplete Tasks appear before all completed Tasks.
3. THE Task_List SHALL preserve the relative order of Tasks within each group (incomplete and completed) after sorting, where relative order is defined as the order in which Tasks appeared in the list immediately before the sort was applied.
4. THE sort order SHALL apply only for the current Session and SHALL NOT be persisted to Storage; on the next Session load, Tasks SHALL be displayed in their saved insertion order.
5. WHEN the user activates the sort control while the list is already sorted (incomplete before completed), THE Task_List SHALL apply the sort again without changing the displayed order.

---

### Requirement 7: Quick Links — Add and Display Links

**User Story:** As a user, I want to add shortcut buttons to my favorite websites, so that I can navigate to them quickly from the Dashboard.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide an input field for a link label (up to 100 characters), an input field for a URL, and a submit control for adding a new Link.
2. WHEN the user submits a Link with a non-empty label and a valid URL, THE Quick_Links SHALL add the Link and display it as a clickable button.
3. A valid URL is defined as a non-empty string that begins with "http://" or "https://" and contains a hostname of at least one character after the scheme.
4. IF the user submits a Link with an empty label, THEN THE Quick_Links SHALL reject the input and display an inline validation message identifying the label field as the source of the error.
5. IF the user submits a Link with an invalid URL, THEN THE Quick_Links SHALL reject the input and display an inline validation message identifying the URL field as the source of the error.
6. IF the user submits a Link with a URL that is identical to an existing Link's URL, THEN THE Quick_Links SHALL reject the input and display an inline validation message indicating the URL already exists.
7. WHEN a Link button is activated, THE Dashboard SHALL open the associated URL in a new browser tab.
8. WHEN a Link is added, THE Storage SHALL persist the updated link collection so Links are restored on subsequent Sessions.
9. WHEN the Dashboard loads, THE Quick_Links SHALL retrieve and display all previously saved Links from Storage.
10. IF the Storage read operation fails on Dashboard load, THEN THE Quick_Links SHALL display an inline error message and render an empty link panel.

---

### Requirement 8: Quick Links — Delete Links

**User Story:** As a user, I want to remove quick links I no longer need, so that the panel stays relevant and uncluttered.

#### Acceptance Criteria

1. WHEN the user activates the delete control on a Link, THE Quick_Links SHALL remove the Link from the panel.
2. IF the Storage write operation fails when deleting a Link, THEN THE Quick_Links SHALL display an inline error message describing the failure and keep the Link visible in the panel until a subsequent deletion attempt succeeds.
3. WHEN a Link is successfully deleted, THE Storage SHALL persist the updated link collection within 500ms of the deletion.
4. WHEN the last Link is deleted, THE Quick_Links SHALL display an empty-state message indicating no links have been added.

---

### Requirement 9: Light / Dark Mode

**User Story:** As a user, I want to switch between a light and dark color scheme, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control that switches the Theme between Light and Dark, and SHALL visually indicate the currently active Theme on the toggle (e.g., icon or label change).
2. WHEN the user activates the theme toggle, THE Dashboard SHALL apply the selected Theme to all visible UI components without a page reload.
3. WHEN the user selects a Theme, THE Storage SHALL persist the Theme preference and retain it until the user explicitly changes it.
4. WHEN the Dashboard loads, THE Dashboard SHALL apply the previously saved Theme preference within 100ms of page load to prevent a flash of unstyled content.
5. IF no Theme preference has been saved, or IF the saved Theme preference cannot be retrieved due to a storage error or corruption, THEN THE Dashboard SHALL apply the Light Theme within 200ms of page load.

---

### Requirement 10: Data Persistence and Storage Integrity

**User Story:** As a user, I want my tasks, links, name, and preferences to be saved automatically, so that I never lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. THE Storage SHALL store all user data (Tasks, Links, User_Name, Theme) as serialized JSON strings under distinct Local Storage keys, and SHALL write to Storage on every data change event (task add/edit/delete/complete, link add/delete, name change, theme change).
2. IF the Storage read operation returns a null, malformed, or otherwise unreadable value, THEN THE Dashboard SHALL initialize the affected data to its default fallback state (empty array for Tasks and Links, empty string for User_Name, "light" for Theme) without throwing an unhandled error.
3. THE Dashboard SHALL NOT require any user account, login, or network connection to read or write data.
4. IF a Storage write operation fails due to quota exceeded or any other error, THEN THE Dashboard SHALL display an inline error message in the affected widget indicating the data could not be saved.

---

### Requirement 11: Responsive Layout and Visual Design

**User Story:** As a user, I want the Dashboard to be visually clean and usable on different screen sizes, so that I can use it on both desktop and laptop displays.

#### Acceptance Criteria

1. THE Dashboard SHALL use a single CSS file for all styling and a single JavaScript file for all scripting.
2. THE Dashboard SHALL render all widgets without horizontal scrolling on viewport widths between 768px and 1920px inclusive.
3. THE Dashboard SHALL apply a clear visual hierarchy with each widget (Greeting_Widget, Focus_Timer, Task_List, Quick_Links) visually separated by at least 16px of spacing or a visible divider.
4. THE Dashboard SHALL use a minimum body font size of 14px for all body text and widget content.
5. WHERE the viewport width is below 768px, THE Dashboard SHALL stack all widgets vertically and remain usable without horizontal scrolling.
