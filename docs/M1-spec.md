# Campus Life Planner: M1 Spec

## What it is
A planner for keeping track of assignments, classes, exams and club stuff. Each task has a due date, how long it takes and a tag. You can search with regex, sort, and set a weekly hours target so you know when you're overloading a week.

Plain HTML, CSS and JS. No frameworks. Everything is saved in localStorage.

## Sections
It's one page split into sections:

- **Dashboard** (`#dashboard`): stats, last 7 days chart, weekly target status
- **Tasks** (`#tasks`): search, sort, and the list (table on desktop, cards on mobile)
- **Add / Edit** (`#form`): the form, with error messages under each field
- **Settings** (`#settings`): minutes or hours, weekly target, tags, import/export, clear data
- **About** (`#about`): what the app is for, my GitHub and email

## Data model
One task looks like this:

```json
{
  "id": "task_0001",
  "title": "CS lab report",
  "dueDate": "2026-10-14",
  "duration": 90,
  "tag": "Assignment",
  "createdAt": "2026-10-08T11:20:00.000Z",
  "updatedAt": "2026-10-08T11:20:00.000Z"
}
```

Notes:
- `id` is `task_` plus a 4 digit number. A counter is saved so ids never repeat, even after a delete.
- `duration` is always saved in minutes. Hours are only for display.
- `updatedAt` changes every time the task is edited.

Settings are saved separately:

```json
{
  "unit": "minutes",
  "weeklyCap": 1200,
  "tags": ["Assignment", "Class", "Exam", "Club", "Personal", "Other"]
}
```

localStorage keys: `planner:tasks`, `planner:settings`, `planner:counter`

## Validation rules

| Field | Regex | What it checks |
|---|---|---|
| Title | `^\S(?:.*\S)?$` | No spaces at the start or end. Double spaces get collapsed first. |
| Duration | `^(0\|[1-9]\d*)(\.\d{1,2})?$` | A number, max 2 decimals, no leading zeros |
| Due date | `^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$` | YYYY-MM-DD |
| Tag | `^[A-Za-z]+(?:[ -][A-Za-z]+)*$` | Letters, with single spaces or hyphens between words |
| Duplicate words (advanced) | `\b(\w+)\s+\1\b` | Uses a back-reference to catch things like "the the" in a title |

## Search patterns I'll show in the demo
- `^@tag:\w+` to filter by tag, e.g. `@tag:Exam`
- `\b\d{2}:\d{2}\b` to find times in titles like "Group meeting 14:30"
- `\b(\w+)\s+\1\b` to find duplicate words
- A broken pattern like `(abc` to show the app doesn't crash

## Wireframes

Mobile (360px):

```
+------------------------+
| Skip to content        |
| CAMPUS PLANNER         |
| Dashboard Tasks Add .. |
+------------------------+
| [ 12 tasks ][ 14h    ] |
| [ Top: Assignment    ] |
| 7 day chart: | || |||  |
| 6h left of 20h         |
+------------------------+
| Search [________] [Aa] |
| Sort by [Due date v]   |
| +--------------------+ |
| | CS lab report      | |
| | Oct 14, 1.5h       | |
| | Assignment         | |
| | [Edit] [Delete]    | |
| +--------------------+ |
+------------------------+
| Add task form          |
+------------------------+
| Settings               |
| About                  |
+------------------------+
```

Tablet (768px): nav in one row, 4 stat boxes in a row, task cards in 2 columns.

Desktop (1024px):

```
+-----------------------------------------------------+
| CAMPUS PLANNER    Dashboard  Tasks  Add  Settings   |
+-------------------------------+---------------------+
| [12] [14h] [Assignment] [6h]  |  Add task           |
| 7 day chart                   |  Title    [_____]   |
+-------------------------------+  Due date [_____]   |
| Search [_______] [Aa]         |  Duration [_____]   |
| Title | Due | Duration | Tag  |  Tag      [_____]   |
| ...   | ... | ...      | ...  |  [Save] [Cancel]    |
+-------------------------------+---------------------+
```

## Look
Black and white only. Since there's no red or green, states are shown with borders, bold text and icons:
- Errors have a thick black left border and the message in text
- Focused elements get a thick outline
- Search matches are white text on black
- When the weekly target is passed, the banner flips to white on black
- Small fade and slide animations, turned off if the user has reduced motion on

## Accessibility plan
- `header`, `nav`, `main`, `section`s with `h2`s, `footer`. One `h1`.
- A skip link is the first thing you tab to.
- Every input has a label. Error messages are linked with `aria-describedby` and the input gets `aria-invalid`.
- Save, delete and search results are announced with `role="status"`. Going over the weekly target is announced with `aria-live="assertive"`.
- Table headers use `scope="col"` and the sorted column gets `aria-sort`.
- Delete asks before removing anything.
- Escape cancels an edit.
- Black on white is 21:1 contrast, so it passes easily.

## Files
```
index.html
tests.html
seed.json
README.md
.gitignore
docs/M1-spec.md
styles/main.css
scripts/app.js
scripts/storage.js
scripts/state.js
scripts/validators.js
scripts/search.js
scripts/ui.js
assets/
```
