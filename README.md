# Saath

Saath is a free web app for students and young adults in India. It reads a loan or scheme paper on the phone, says in plain words what it will really cost, and gives three small tasks a day that build money confidence. Money Lab, from The Skyward Project and the Interact Club of Pune Skyward, is the tracker inside the same app.

It runs in English, Hindi and Marathi. Everyone creates an account (a name and a password kept on the phone). There are no ads and no tracking, and it keeps working offline after the first visit.

## Setup

You need Node.js 20 or newer. No keys are required.

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first screen asks for a language. The second is the introduction: a full-screen headline with "Create an account" and "Log in", then eight sections in full. Each section says what the feature is, gives a small working model to try (`components/intro-demos.tsx`, built on the same code and sample paper as the real app), and lists three steps on how to use it. A bar with "Create an account" stays at the bottom once the first buttons scroll away. Nobody reaches the app without an account. The same guide is at `/about`, linked from the profile.

```bash
npm test          # 65 tests
npm run lint
npm run build     # server build (Vercel, or `npm start`)
npm run build:pages   # static site in out/ for GitHub Pages
```

`npm install` copies locales and content into `public/`, writes the service worker, and downloads English, Hindi and Marathi OCR data into `public/tessdata/`.

## What is in the app

| Screen | What it does |
| --- | --- |
| Home | Greeting with a small streak count, "Scan a document", one Today card (the week strip and three tasks; the daily question opens in a sheet), and the active path |
| Paths | Eight guided paths of five to seven steps. Each step is a lesson, a real-world action or a one-question check |
| Scan | Photo or sample, confirm the numbers, then the result: total repayment, borrowed against extra, four short blocks, calm flags, questions to ask |
| Money Lab | Month view, a number-pad sheet for logging, spending bars, a savings goal ring, a weekly line, one insight from your own entries, tracked loans, the weekly case |
| Guide | 25 mini lessons in six categories, with search, tappable glossary words, Listen, a "Try it" action and one question |
| Profile | Language, backup, sign-in, PIN lock, privacy page, account deletion |

### Tasks and the streak

- Home shows three tasks. "Answer today's question" is always one. The other two rotate with the date between logging an expense, reading a lesson, checking a fee and scanning a sample. The same date always shows the same three. See `lib/tasks.ts`.
- A day counts toward the streak when at least one task is finished. Tasks are: the daily question, a logged entry, a finished lesson, confirming a scanned loan (the fee check), reaching a sample result, answering a case, or finishing a path step.
- One missed day in each Monday-to-Sunday week is forgiven automatically. The forgiven day holds the streak together but is not counted in the number. Two missed days in a row are not forgiven. See `lib/streak.ts`.
- Finishing a path unlocks one milestone card that can be shared as text or as a picture drawn on the phone. There are no points, badges or leaderboards.

### Scan result

- The hero number is the total repayment, with the amount borrowed beneath it and a bar that splits borrowed from extra paid.
- Four blocks: what you get, what you pay back, what it really costs each year, and what happens if you pay late. Each has its own Listen button, and there is one for the whole result.
- Flags are sorted most serious first and collapsed to the top two. Severity is shown with a label and an icon as well as colour.
- The confirm screen shows the processing fee and other charges as two fields, each with the clause it came from, and a total beneath them.

### What the numbers mean

These rules are fixed in code so the same paper always gives the same result.

- A reducing EMI is the usual monthly payment on the remaining balance.
- A flat EMI is principal plus simple interest for the whole time, split by the number of months.
- Fees are taken out of the amount you receive. They are not added on top of the EMIs.
- The yearly cost is the effective annual rate: a monthly internal rate of return on the amount received, turned into `(1 + monthly) ^ 12 - 1`.
- The last instalment absorbs leftover paise so the balance ends at zero.
- Flags: a yearly cost far above typical bands and a late penalty of 2 percent or more a month are "serious". Fees above 3 percent of principal, a flat rate, no right to repay early and blank spaces are "worth asking about". A missing number is "good to know". Saath never guesses a missing figure.
- The daily question is the day of the year, modulo the number of questions. The weekly case is the ISO week, modulo the number of cases.
- The tracker insight appears after entries exist on three different days. It reports the largest spending category if it is 40 percent or more of spending, otherwise the share of income saved, otherwise the average spend on a logged day.

## Accounts

An account is compulsory. It is a name and a password, created on the phone and kept in the browser (`lib/account.ts`). The password is stored only as a salted PBKDF2 hash. Each account gets its own IndexedDB database, so people sharing a phone do not see each other's tracker or progress. The first account on a phone adopts whatever data was already there.

Limits to know about: the account does not travel to another phone or browser, and a forgotten password cannot be reset, because there is no server. Clearing the browser's site data removes the accounts and their data. The optional Supabase backup below is what carries progress between phones.

## Backup across phones (optional)

Saath is local-first. With no keys set the Supabase code is never downloaded.

When keys are set, the profile sheet shows "Back up across phones". Sign-in for the backup is by email magic link or Google. There is no phone OTP, because SMS costs money.

What syncs: tracker entries, the savings goal, the streak, tasks and path progress. Nothing else. Photos, documents, OCR text and tracked loans (which come from documents) stay on the phone.

### How the privacy works

After signing in, the user chooses a secret word. On the phone, Web Crypto turns that word into an AES-256-GCM key with PBKDF2 (SHA-256, 210,000 rounds, a random salt). The synced data is encrypted with that key before upload. The server stores one row per user holding the salt, a nonce and unreadable text. The key and the secret word never leave the phone, so the server cannot read the data and the word cannot be reset by anyone. A second phone asks for the same word and must be able to open the row before it is trusted.

Row level security limits every user to their own row.

### Supabase setup

1. Create a free project at https://supabase.com.
2. In the SQL editor, run the two files in `supabase/migrations/` in order. The first creates the `saath_vault` table with row level security. The second adds the `saath_delete_account` function used by "Delete my account".
3. In Authentication > Providers, keep Email on. To offer Google, turn Google on and paste a client ID and secret from Google Cloud Console (OAuth consent screen, then Credentials > OAuth client ID > Web application, with the redirect URI Supabase shows you).
4. In Authentication > URL Configuration, set Site URL to where Saath is hosted (for example `https://verushkapatel.github.io/saath/`) and add the same address, plus `http://localhost:3000`, to Redirect URLs.
5. Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

6. Rebuild. Both values are public by design. The anon key only allows what row level security allows.

The provider interface is `lib/sync/provider.ts`. `lib/sync/supabase.ts` is the only file that imports Supabase. To use another service, write another object with the same nine methods and return it from `getProvider()`.

### PIN lock

An optional four-digit PIN for shared phones. It is off by default, offered on the sign-in sheet, and also reachable from the profile sheet. The PIN is stored as a salted PBKDF2 hash in the browser. It keeps a casual borrower of the phone out of the app. It does not encrypt local data. A forgotten PIN cannot be recovered: "Start fresh on this phone" clears local data, and a signed-in user gets their progress back by signing in again.

### Account deletion

Profile > Delete my account calls `saath_delete_account`, which removes the user's vault row and their auth user. Data on the phone stays until the browser's site data is cleared.

## Privacy

- No analytics, no ads, no tracking, no data selling.
- Documents, images and OCR text are processed in memory on the device and are never sent to or stored on a server. (The optional AI reading layer below is the one exception, it is off by default, and it masks identity numbers first.)
- The in-app privacy page at `/privacy` says all of this in six plain sentences, in each language.

## Design system

One visual language for every screen: navy so deep it is almost black is the world, white is the text, the reward and the one primary action. No section has its own theme, and there is one theme only. The app is navy on every phone, whatever the system setting.

All tokens live in one block at the top of `app/globals.css`. Components use token names only, never raw values. Tailwind supplies the base reset and nothing else.

| Group | Tokens |
| --- | --- |
| Colour | `--bg` #010713, `--surface-1/2/3` #06122A #0B1C3D #142A55, `--line` and `--line-strong` hairlines, `--text` #FFFFFF, `--text-muted` #C3CCDC, `--text-faint` #97A3BA, `--accent` #FFFFFF with `--accent-ink` #011B3D on top of it |
| Meaning | `--sev-high` red, `--sev-medium` amber, `--sev-low` blue, `--ok` green, each with a `-soft` fill |
| Space | `--s-1` to `--s-8` on an 8px grid, `--gutter` 16px |
| Radius | 12, 16, 24, full |
| Shadow | `--shadow-1` resting card, `--shadow-2` hero card, `--shadow-3` sheet |
| Type | `--fs-label`, `--fs-body` (20px in English, 17px in Devanagari), `--fs-lg`, `--fs-h2`, `--fs-h1`, `--fs-hero` |
| Motion | 120, 220 and 360 ms. `--ease-out` for entrances, `--ease-spring` for rewards |

Rules that keep it consistent:

- Fewer things per screen. Detail lives one tap away, in a sheet or a row that opens. If something is not needed to decide what to do next, it does not sit on the screen. Empty sections are not shown. The credit line appears on Home, Money Lab, the guide to the app and the privacy page only.

- White fill is for the single primary action on a screen and for finished things (checks, rings, the streak). Everything else is a quiet outlined or text button.
- Every text and background pair meets WCAG AA.
- Depth comes from layered surfaces, hairlines and soft shadows. The canvas has a faint top wash and a fine grain tile (one inline SVG, drawn once). A soft white glow sits behind the greeting, hero cards and the flame.
- EB Garamond for everything in English: headings, body, buttons and numbers, with lining figures. Noto Serif Devanagari for Hindi and Marathi. Both are served from the site by `next/font`. Garamond is small for its point size, so English body text is 20px. Devanagari steps down to 17px with a line height of 1.85. Eyebrow labels (`.kicker`) are spaced capitals in English and plain in Devanagari.
- Animation moves only `transform` and `opacity`. Screens fade and rise, sections follow with a short stagger (`.rise`), checks draw themselves (`.draw`), options settle or nudge, the Listen pill shows a waveform while playing, and confetti appears only when a path is finished. Under `prefers-reduced-motion` all of it collapses to near-instant changes and the confetti is hidden.
- Tap targets are at least 48px. Focus rings are white with a soft halo.
- Icons come from Lucide only, at one stroke weight. Illustrations are in `components/illustrations.tsx`: seven line drawings in one style with soft fills (first launch, scan, read paper, empty tracker, finished path, streak, offline).
- The bottom tab bar is fixed to the viewport with safe-area padding, a blurred translucent background and a white mark that slides to the open tab. The page has bottom padding equal to the bar. Bottom sheets render through a portal so an animating parent can never move them. At 900px and wider the tabs become a left rail and the content stays in a centred column.
- Empty, error and offline states use `.state`: a small illustration or icon, one line of copy and one action.

## Adding content

### A language

Saath supports exactly English, Hindi and Marathi. To add another:

1. Copy `locales/en.json` and write every value in that language. Add an entry to `locales/gate.json`.
2. Add the code to `LANGS` in `lib/catalog.ts` and to `LANG_NAMES` in `components/profile-sheet.tsx`.
3. Add a speech locale in `lib/speech.ts`, a number locale in `lib/format.ts`, and an OCR code in `lib/ocr.ts`.
4. Add the language as a fourth item in every array in `scripts/content/*.mjs` and to `LANGS` in `scripts/content/build.mjs`, and add it to each record in `content/cases.json`, `content/daily-questions.json`, `content/glossary.json`, and to the title, summary and body of each lesson in `content/guide.json`.
5. Add the locale file to `FILES` in `scripts/sw.template.js`, and the Tesseract data code to `langs` in `scripts/sync-static.mjs`.
6. If the script is not Latin or Devanagari, add a font in `app/layout.tsx` and to `--font-body` in `app/globals.css`.

### A lesson

1. Add the id to `LESSON_IDS` in `lib/catalog.ts`.
2. Add the title, summary and intro to `content/guide.json` in all three languages. Wrap a glossary id as `[[emi]]` to make the word tappable.
3. Add the depth to `scripts/content/lessons-a.mjs` or `lessons-b.mjs`: a category, an icon name from `ICONS` in `components/ui.tsx`, three to five points, one example, a "Try it" action with a link (`tracker`, `scan:personal-loan`, `scan:gold-loan`, `scan:scheme-form`, `case:<id>` or `null`), and a one-question check.
4. Run `npm run content`. Update the lesson count in `tests/content.test.ts`.

### A path

1. Add the id to `PATH_IDS` in `lib/catalog.ts`.
2. Add the path to `scripts/content/paths.mjs`. A step is `["L", lessonId]`, `["A", title, body, link]` or `["C", title, check]`. Use five to seven steps, with at least one action and one check. Write the milestone line as "You can now ...".
3. Run `npm run content`.

`npm run content` rebuilds `content/guide.json` and `content/paths.json`, then syncs everything into `public/` and rewrites the service worker's page list.

### Other content

- `content/daily-questions.json`: one question a day, 60 in all.
- `content/cases.json`: one case a week, 12 in all. Link a case to a path through `cases` in `scripts/content/paths.mjs`.
- `content/glossary.json`: 60 shared definitions used by lessons and scan results.

## Offline

`scripts/sw.template.js` becomes `public/sw.js` at sync time with the full list of pages. On install it saves every page, locale, content file and sample. Fonts, built scripts, the OCR engine and its language data are saved the first time they are fetched and served from the cache after that. Everything else is fetched fresh when there is a connection and served from the cache when there is not.

## On-device OCR

Reading a photo happens in the browser with Tesseract.js. English is always loaded. Hindi or Marathi is loaded with it to match the chosen language. Tesseract is only downloaded when a photo is scanned, so Home, Money Lab and Guide stay light.

Known limits: blurry, dark, skewed or stamped photos misread. Handwriting and very small print are often missed. Unusual layouts stay "unclear" and Saath will not invent a number. Sample documents skip the camera but go through confirm, result, listen, share and add-to-tracker like any other paper.

## Optional AI reading layer

Off by default, and not available on a static host. Set `GEMINI_API_KEY` (or `GROQ_API_KEY`) and `NEXT_PUBLIC_SAATH_AI=1` on a server build. Identity numbers are masked first, the call times out after 8 seconds, and any failure falls back to the on-device reader. The model never does arithmetic.

## Deploy

GitHub Pages:

```bash
NEXT_PUBLIC_BASE_PATH=/saath npm run build:pages
```

Upload the contents of `out/` to the Pages branch. Add the two Supabase variables to the same command to switch sign-in on.

Vercel: import the repo. The build command is `npm run build`. Add environment variables in Project Settings.

## Defaults chosen in this build

Where the brief left something open, this is what was chosen.

- Accounts are on-device (see Accounts above). The introduction shows whenever nobody is logged in.
- Kannada was removed from locales, content and OCR data. The amount parser still reads digits from neighbouring scripts.
- Home's one primary action is "Scan a document". Scan's is the camera. The result's is "Listen to all of it". Money Lab's is "Log money".
- Spending is shown as horizontal bars in one hue, sorted and labelled with rupees and percent, instead of a donut. Bars stay readable with seven categories on a small screen and do not depend on telling colours apart.
- Tracked loans do not sync, because they are built from documents.
- The synced goal keeps the phone's value when it has one. Entries merge by id. Progress merges as a union, so nothing finished on either phone is lost.
- The success chime is two soft notes through Web Audio. It follows the media volume and the iOS silent switch, and is skipped under reduced motion. Haptics use `navigator.vibrate` where it exists.
- Marathi Listen falls back to a Hindi voice when the phone has no Marathi voice, since both read Devanagari. If neither exists, a short message says so and the text stays on screen.
- Backup export and import, and CSV export, moved from Money Lab to the profile sheet.
- Devanagari headings use Noto Sans Devanagari at weight 600 instead of a serif, to keep font downloads small.
- Progress keeps the last 400 active days and the last 21 days of task detail.
