# Campus Life Planner

A planner for students to keep track of assignments, classes, exams and club activities. You can see how much time each week needs, set a weekly target, and find tasks quickly with regex search.

Built with plain HTML, CSS and JavaScript (ES modules). No frameworks.

**Theme:** Campus Life Planner

**Live site:** https://rayiecho.github.io/campus-life-planner/

**Demo video:** ADD-YOUR-UNLISTED-LINK-HERE

## Features

- **Dashboard:** total tasks, total time, top tag, time due in the next 7 days, and a bar chart of the last 7 days
- **Weekly target:** set a time limit for the next 7 days. The app tells you how much is left, and warns you when you go over.
- **Task list:** a table on desktop and cards on phones
- **Sorting** by due date, title (A to Z or Z to A) or duration (shortest or longest)
- **Live regex search** with matches highlighted, a match case toggle, and an `@tag:` filter
- **Add, edit and delete:** editing happens right in the row, and delete asks first
- **Validation:** 5 regex rules with error messages under each field
- **Auto-save** to localStorage, including settings
- **Import and export** as JSON, with every record checked before anything loads
- **Settings:** show time in minutes or hours, set the weekly target, add or remove tags, clear all data
- **Responsive:** layouts for phones (360px), tablets (768px) and desktop (1024px)
- **Black and white design.** States are shown with borders, bold text and symbols instead of colour.

## Running it

The app uses ES modules, which browsers block when you open the file directly (`file://`). It needs to be served:

1. Clone the repo
   ```
   git clone https://github.com/rayiecho/campus-life-planner.git
   ```
2. Open the folder in VS Code
3. Right-click `index.html` and choose **Open with Live Server**

Or run `python3 -m http.server` in the folder and go to `http://localhost:8000`.

The first time it opens, the 12 sample tasks from `seed.json` load. After that, your own saved data is used.

## Files

```
index.html          the app
tests.html          test page
seed.json           12 sample tasks
styles/main.css     all styles, mobile first
scripts/app.js      connects everything, handles events
scripts/state.js    tasks and settings in memory
scripts/storage.js  localStorage, import and export checks
scripts/validators.js  regex rules
scripts/search.js   regex search, highlighting, sorting
scripts/stats.js    dashboard numbers
scripts/ui.js       drawing the page
docs/M1-spec.md     spec, wireframes and accessibility plan
```

## Data model

```json
{
  "id": "task_0001",
  "title": "CS lab report",
  "dueDate": "2026-10-14",
  "duration": 90,
  "tag": "Assignment",
  "createdAt": "2026-10-01T08:15:00.000Z",
  "updatedAt": "2026-10-01T08:15:00.000Z"
}
```

- `duration` is always stored in minutes. The hours setting only changes how it's shown.
- Ids come from a saved counter, so an id is never reused, even after its task is deleted.
- `updatedAt` changes every time a task is edited.

localStorage keys: `planner:tasks`, `planner:settings`, `planner:counter`

## Regex catalog

### Validation

| Field | Pattern | Passes | Fails |
|---|---|---|---|
| Title | `^\S(?:.*\S)?$` | `CS lab report`, `A` | ` leading space`, `trailing space ` |
| Duration | `^(0\|[1-9]\d*)(\.\d{1,2})?$` | `90`, `45.5`, `0.5` | `012`, `10.555`, `-5`, `abc` |
| Due date | `^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$` | `2026-10-14`, `2028-02-29` | `2026-13-01`, `14/10/2026` |
| Tag | `^[A-Za-z]+(?:[ -][A-Za-z]+)*$` | `Exam`, `Group Project`, `Part-time` | `CS101`, `-Club`, `Two  spaces` |
| Duplicate words (advanced) | `\b(\w+)\s+\1\b` with `i` flag | `Read the theory` | `Read the the notes`, `Study study group` |

Notes:
- The duplicate word rule uses a **back-reference**. `\1` has to match the same text that `(\w+)` captured, so it only catches a word repeated straight after itself.
- Double spaces in a title are collapsed to one before checking: `Group   meeting` becomes `Group meeting`.
- The date regex lets `2026-02-30` through, so there's also a check that the date really exists. Leap years are handled.
- Duration also has to be more than 0.

### Search patterns to try

| Type this | What it finds |
|---|---|
| `@tag:Exam` | only tasks tagged Exam |
| `@tag:Club 14` | Club tasks that also contain "14" |
| `\b\d{2}:\d{2}\b` | titles with a time in them, like `Stats quiz 08:00` |
| `\b(\w+)\s+\1\b` | titles with a repeated word |
| `^C` | titles starting with C |
| `lab\|quiz` | anything with lab or quiz |
| `2026-10-1\d` | due between Oct 10 and 19 |
| `(abc` | invalid pattern. The app shows a message and ignores it instead of crashing. |

Search looks at the title, tag, due date and duration. The **Ignore case** box controls the `i` flag.

## Keyboard map

| Key | What it does |
|---|---|
| `Tab` / `Shift+Tab` | move between links, fields and buttons |
| `Enter` | follow a link, press a button, save a form |
| `Space` | press a button, tick a checkbox |
| Arrow keys | change the minutes or hours radio, or the sort option |
| `Escape` | cancel editing a task |
| `/` | jump to search (when not typing in a field) |
| `n` | jump to the new task form (when not typing in a field) |

The first `Tab` on the page shows a **Skip to content** link that jumps past the navigation.

## Accessibility notes

- Landmarks: `header`, `nav`, `main`, `section`s and `footer`. One `h1`, an `h2` per section, `h3`s inside.
- Every input has a `<label>`. Error messages are linked to their field with `aria-describedby`, and the field gets `aria-invalid="true"`.
- On a failed save, focus moves to the first field with a problem.
- Status messages (saved, deleted, search results, import results) use `role="status"` so screen readers read them out.
- The weekly target message is `aria-live="polite"` while under the target, and switches to `aria-live="assertive"` when you go over.
- The sorted column gets `aria-sort` so screen readers know how the table is ordered.
- Search highlights use `<mark>`. They're built with text nodes instead of `innerHTML`, so a title like `<b>not bold</b>` shows as plain text and can't inject HTML.
- The chart is `role="img"` with a label listing every day's value, since the bars themselves can't be read.
- After editing, cancelling or deleting, focus moves somewhere sensible instead of jumping to the top of the page.
- Edit and Delete buttons have labels like "Edit CS lab report", so they make sense out of context.
- Focus is a thick 3px outline on everything.
- Black on white gives a 21:1 contrast ratio. Errors and warnings don't rely on colour: they use a thick left border, a "!" and dashed input borders.
- Animations turn off if the user has reduced motion enabled.
- Checked with axe-core at 360px, 768px and 1280px with no violations.

## Tests

Open `tests.html` with Live Server (for example `http://127.0.0.1:5500/tests.html`). It runs 60 checks and shows each as PASS or FAIL, with a total at the top.

It covers:
- all 5 validation rules, including edge cases like leap years, leading zeros and repeated words
- the safe regex compiler and `@tag:` parsing
- sorting
- dashboard numbers and the weekly target logic
- import checks: bad ids, wrong types, broken JSON, duplicate ids, and a single bad record rejecting the whole file
- minutes to hours conversion

## Seed data

`seed.json` has 12 tasks picked to test edge cases:
- a leap day (`2028-02-29`) and a year end date (`2026-12-31`)
- very small and very large durations (`0.5` and `1440` minutes) and decimals (`15.75`)
- titles with quotes, `&`, brackets, an accent (`Résumé`), HTML tags, and times like `14:30`
- dates in the past and the future, so the chart and the next 7 days both have data

## Import format

Export gives this shape:

```json
{
  "app": "campus-planner",
  "version": 1,
  "exportedAt": "2026-10-08T12:00:00.000Z",
  "settings": { "unit": "minutes", "weeklyCap": 1200, "tags": ["Assignment", "Exam"] },
  "tasks": [ ... ]
}
```

Import accepts this shape, or a plain list of tasks like `seed.json`. If any record fails a check, nothing is imported and the message says which task is wrong and why.

## Contact

- GitHub: [rayiecho](https://github.com/rayiecho)
- Email: r.ayiecho@alustudent.com