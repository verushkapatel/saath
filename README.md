# Saath

Saath is the app students take home from The Skyward Project's school programme. It gives a few minutes of money practice a day, and it reads a loan or scheme paper on the phone so a family can see what it really costs.

It runs in English, Hindi and Marathi. There is no account, no server, no advertising and no tracking. Everything a student does stays on that phone unless they choose to share anonymous class numbers.

## Programme context

The Skyward Project is a youth-led initiative from Pune (theskywardproject.com). Its programme runs for two days in a school, for every student in Grades 9 to 12, at no cost to the school.

- Day 1: students sit the FinLit Index, thirty minutes of real-life money situations.
- Day 2: the team returns with the results and teaches a session built around what each grade got wrong. Students learn by doing: spotting scams in real-looking messages, filling a mock bank form, racing to find the real price of a phone on EMI, and working through true stories.
- Every student leaves with the Skyward Handbook, the Skyward comic and Saath.

Saath's job is to lock in the learning after the classroom. It is built for a student aged 14 to 18, often on a shared or low-end phone, who will soon meet a first salary, a loan offer, a scam call or a fake job.

## Setup

You need Node.js 20 or newer. No keys are required.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm test              # 88 tests
npm run lint
npm run build         # server build
npm run build:pages   # static site in out/, for GitHub Pages
npm run handbook:pdf  # one handbook PDF per language, from the built site (needs Chrome)
```

`npm install` copies locales and content into `public/`, writes the service worker, and downloads English, Hindi and Marathi OCR data.

## What is in the app

| Screen | What it does |
| --- | --- |
| Language, then Welcome | Pick a language, read one screen, tap Start. The student is inside as a guest. |
| Home | Masthead, greeting, the one next thing to do (the FinLit Check, or the current path), today's three tasks with the week strip, the current path, the Leo practice companion, and a quiet "Join your school" row |
| FinLit Check (`/check`) | Twelve situations, three per unit. Result is four slim unit bars with "Start here" on the weakest unit and a link to the matching path |
| Learn (`/guide`) | The Handbook and the Comic, then 37 lessons filtered by unit, with search by text or voice |
| Drills (`/drills`) | Spot the scam, Fill the form, Real price race, True stories |
| Scan | Photo or sample, confirm the numbers, then the result. Framed as the thing a student takes home to read a parent's loan paper |
| Money Lab | Month view, logging sheet, spending bars, savings goal, weekly case |
| Handbook (`/handbook`) | All four units to keep, with Listen, share-as-text and a PDF |
| Comic (`/comic`) | A swipeable panel reader with captions that can be read aloud |
| Profile | Nickname and school, the sharing switch, language, PIN, backup, privacy, "How Saath works", "Delete everything on this phone" |

Two pages are for partners and are not linked from the student app: `/impact` and `/link`.

### The four units

Everything is organised under the Skyward syllabus. `lib/catalog.ts` holds the unit ids and the lesson and path order. Every lesson, path, task and drill shows a unit badge.

1. **Handling your own money** (`own-money`): budgeting, saving before spending, the true cost of what you buy, subscription traps, lending to friends, an emergency fund.
2. **Your bank and your paperwork** (`bank-paper`): a first bank account, bank charges, acting fast when money goes missing, keeping ID safe, proof of payment, the credit record, UPI and OTP safety, tax, insurance.
3. **Borrowing and staying safe** (`borrow-safe`): "pay later", signing as guarantor, interest and EMI, fees, reading a loan paper, dangerous loan apps, scam calls, fake jobs, double-your-money schemes.
4. **How money works** (`how-money`): why prices rise, why savings need to grow, where to keep savings, who keeps money safe.

There are 37 lessons and 13 paths. Twelve lessons were written for this version to cover gaps in the syllabus: true cost, subscription traps, lending to friends, first bank account, bank charges, money missing, proof of payment, pay later, guarantor, scam calls, double-your-money, and who keeps your money safe. Four paths are new: Spend with open eyes, When money goes missing, Shut down a scam, and Borrow with your eyes open.

### Tasks, streak and paths

- Home shows three tasks. "Answer today's question" is always one. The other two rotate with the date between logging an expense, reading a lesson, checking a fee, scanning a sample and doing a drill. See `lib/tasks.ts`.
- A day counts toward the streak when at least one task is finished. Finishing a drill, a case, a path step or the FinLit Check also counts.
- One missed day in each Monday-to-Sunday week is forgiven automatically. See `lib/streak.ts`.
- A path is five to seven steps: lessons, real-world actions finished with "I did it", and a one-question check. Some action steps open a drill. Finishing a path unlocks a milestone card and a short burst of confetti.

### The FinLit Check

A twelve-question quick version of the Index: three situations per unit, written as real-life moments, in `content/finlit-check.json`.

- It runs once at the start and once after the student finishes their first path, so the app shows a before and an after.
- The result is four slim bars. It is never shown as a grade, a percentage total or a rank. The weakest unit is marked "Start here" and links to that unit's path (`UNIT_PATH` in `lib/catalog.ts`). When two units are level, the earlier one is chosen.
- Results are stored on the device (`lib/finlit.ts`).

### Drills

- **Spot the scam**: 15 real-looking messages (SMS, WhatsApp, UPI collect requests, loan app prompts, calls), five per round. Swipe right for real, left for fake, or use the buttons. The warning words are then highlighted in the message. Four of the fifteen are genuine, so "fake" is not always the answer.
- **Fill the form**: a mock account opening form with six deliberate problems. Tap each wrong line, then check. A short debrief follows.
- **Real price race**: pick a phone, an EMI offer and a fee table, then find the true total. The numbers come from the same finance engine as the scanner (`emiFlat` in `lib/finance.ts`). The timer is optional, off by default, and only counts up.
- **True stories**: the twelve cases, as scene-by-scene simulations. The weekly case in Money Lab is one of these.

Each drill takes under three minutes, works offline, has a Listen button, and counts toward tasks and the streak.

## How a school code works

1. On Day 2 the Skyward team gives the class a code, for example `PUNE01`.
2. A student opens Profile > Join your school, types the code, picks a grade, and may add a nickname.
3. That is all. The code links the student to a cohort without a name, phone number or email.

To put the code in a student's hands without typing, open `/link`, enter the code, and print the QR code or link on the handbook. Scanning it opens Saath with the code already filled in (`?school=PUNE01`).

Codes are 3 to 12 letters, digits or hyphens. Saath does not check a code against a list, because there is no server to hold one.

## Measuring impact

**What is collected by default: nothing.** With no endpoint configured, Saath never sends anything to anyone.

**What can be collected, only if all three are true:** the deployment sets `NEXT_PUBLIC_SAATH_IMPACT_URL`, the student has joined a school, and the student has switched on "Share anonymous class numbers" in the profile. The switch is off by default and is explained in one sentence in each language.

Then Saath sends small events. This is the whole of what an event can hold (`lib/impact.ts`):

```json
{ "cohort": "PUNE01", "grade": "9", "kind": "check-before", "units": [0.33, 0.67, 0.33, 0] }
```

- `kind` is one of `join`, `check-before`, `check-after`, `lesson`, `path`.
- `units` appears only on check events: the share right in each of the four units.
- `count` appears on lesson and path events when more than one is reported at once.

**What is never collected:** names, nicknames, phone numbers, emails, locations, device identifiers, individual answers, tracker entries, scanned documents, or anything about how a student moves through the app. Events are sent once and not queued or retried.

**The endpoint contract.** `POST` receives one event as JSON. `GET` returns a JSON array of all events. Any small serverless function with a table will do. The endpoint must not log IP addresses or add identifiers, and should itself refuse to return groups smaller than ten.

**The partner view** at `/impact` reads those events and shows, per school and grade: students joined, lessons and paths finished, and the average before and after per unit with the change in points. It never shows an individual, and any group with fewer than ten students is left out entirely (`MIN_COHORT` in `lib/impact.ts`). With no endpoint it says so, and can show clearly labelled sample data.

**Limits to be honest about.** Because there are no identifiers, a student who reinstalls and rejoins is counted twice, and before and after averages are not matched pairs. The numbers describe a cohort, not individual progress.

## Privacy for minors (DPIA-style note)

| Data | Where it lives | Leaves the phone? |
| --- | --- | --- |
| Language | Browser local storage | No |
| Nickname (optional), school code and grade (optional) | Browser local storage | Code and grade only, and only inside an opted-in event |
| Sharing switch | Browser local storage | No |
| PIN (optional) | Browser local storage, as a salted PBKDF2 hash | No |
| FinLit Check results | Browser local storage | Four unit scores only, and only if opted in |
| Tracker entries, savings goal, tracked loans | IndexedDB | No |
| Lessons, paths, tasks, streak, drill rounds, case progress | IndexedDB and local storage | Counts only, and only if opted in |
| Scanned photos and the text read from them | Memory, for the length of the scan | No |
| Backup file | Wherever the student saves it | Only if the student moves the file |

- There are no accounts. Saath collects no real names, phone numbers, emails, locations or device identifiers.
- Documents and images never leave the device. The earlier optional cloud reading layer and the Supabase sync were removed for this reason.
- No analytics, no ads, no tracking, no behavioural profiling.
- "Delete everything on this phone" in the profile removes all of the above from the browser.
- A forgotten PIN cannot be recovered. The reset clears local data, and the app says so in one line. Nothing implies cloud recovery, because there is none.
- The student privacy page is `/privacy`. The longer page for teachers and partners is `/privacy/partners`.

**Before any cloud sync, account system or new data collection is added, a qualified person must review it against India's Digital Personal Data Protection Act, 2023, including the rules on children's data and verifiable parental consent.** This note is a description written by the developers. It is not legal advice and has not been reviewed by a lawyer.

## Content

All content is JSON in `content/`, with English, Hindi and Marathi in every record. After editing, run `npm run sync` (it also runs before `dev` and `build`).

Every lesson carries `reviewed`, the month its facts were last checked, and `sources`, the official pages used. The facts in this version were checked in October 2026 against:

- cybercrime.gov.in and I4C for the 1930 helpline
- RBI for unauthorised transaction liability, minors' accounts, basic savings accounts, digital lending and free credit reports
- DICGC for deposit insurance of ₹5,00,000 per depositor per bank
- sancharsaathi.gov.in for Chakshu
- sachet.rbi.org.in for unregistered deposit schemes
- UIDAI for masked Aadhaar

One rule is changing: RBI's revised framework on fraudulent electronic transactions applies from 1 January 2027 and moves the reporting window from three working days to five calendar days. The "When money goes missing" lesson states both. Review it again in January 2027.

### Adding a lesson

1. Add the id to `LESSON_IDS` in `lib/catalog.ts`, in the position it should appear.
2. Add the lesson to `content/guide.json` with: `id`, `unit`, `icon` (a name from `ICONS` in `components/ui.tsx`), `title`, `summary`, `body` (a short intro; wrap a glossary id as `[[emi]]` to make it tappable), three to five `points`, one `example`, `tryIt` (text and a link), a `check` with three options, `reviewed` and, if it states rules or limits, `sources`.
3. `tryIt.link` and path action links can be `tracker`, `scan`, `scan:personal-loan`, `scan:gold-loan`, `scan:scheme-form`, `case:<id>`, `drill:<id>`, `drills`, `finlit` or `null`.
4. Update the lesson count in `tests/content.test.ts`.

### Adding a path

Add the id to `PATH_IDS` and the path to `content/paths.json`. Use five to seven steps with at least one action and one check, a `unit`, and a milestone line that starts "You can now".

### Adding a drill or drill content

- More scam messages: add to `scams` in `content/drills.json`. Every phrase in `flags` must appear word for word in `text` in that language, because the app highlights it. A test checks this.
- A different form or price table: edit `form` and `price` in the same file.
- A new kind of drill: add the id to `DRILL_IDS` and `DRILL_UNIT` in `lib/catalog.ts`, a component in `components/drill-screens.tsx`, and titles under `drills.<id>` in each locale.

### Adding comic pages

`content/comic.json` holds a list of episodes. The first is shown.

```json
{
  "id": "episode-1",
  "title": { "en": "...", "hi": "...", "mr": "..." },
  "panels": [
    { "image": "/comic/episode-1/01.webp", "caption": { "en": "...", "hi": "...", "mr": "..." } }
  ]
}
```

Put the images in `public/comic/`. Square images at about 1080px work best. Keep any speech in the caption, not in the picture, so it can be translated and read aloud. The episode that ships is marked `"sample": true` and has no pictures: it exists to show the reader working. Remove it when the real comic arrives, and add the image paths to `FILES` in `scripts/sw.template.js` so they work offline.

### The Handbook

The Handbook screen is built from the lessons, grouped by unit, so the app, the PDF and the printed copy cannot disagree. `npm run handbook:pdf` prints `/handbook` from the built site with Chrome and writes `saath-handbook-en.pdf`, `-hi.pdf` and `-mr.pdf` into `public/handbook/` and `out/handbook/`. Without Chrome, the "Print or save as PDF" button in the app gives the same pages.

The Skyward Handbook handed out in schools was not available as text when this was built. If its wording differs from the lessons, edit the lessons so both come from one place.

### Adding a language

Saath supports exactly English, Hindi and Marathi. To add another: add the code to `LANGS` in `lib/catalog.ts`; copy `locales/en.json` and add an entry to `locales/gate.json`; add the language to every record in `content/`; add a speech locale in `lib/speech.ts`, a number locale in `lib/format.ts` and an OCR code in `lib/ocr.ts`; add the name in `components/profile-sheet.tsx`; add the locale file and OCR data to `scripts/sw.template.js` and `scripts/sync-static.mjs`; and add a font if the script is not Latin or Devanagari.

## Design system

Saath is meant to read like the same publication as theskywardproject.com.

- Skyward navy `#011B3D` is the canvas, with lighter navy surfaces layered on it. Text is cream `#F4EFE3`. Gold `#F2B544` is kept for the one primary action on a screen and for rewards.
- A light theme follows the system: warm paper `#F7F3EA`, navy ink, and a deeper gold `#B8791A` with navy text on buttons.
- The typefaces are the site's: Playfair Display for headings and hero numbers, Newsreader for body text, and Noto Sans Devanagari for Hindi and Marathi. `next/font` serves them from the site.
- Eyebrow labels (`.masthead`, `.kicker`, `.unit-badge`) are small capitals with wide spacing in English, and plain in Devanagari. Sections are separated by a thin double rule (`.rule-double`). Home carries the masthead "Saath · from The Skyward Project", and the Skyward seal is the logo mark.
- All tokens are in one block at the top of `app/globals.css`. Components use token names only.
- One primary action per screen. The bottom bar is fixed with safe-area padding and the page reserves space for it. Sheets render through a portal.
- Motion uses only transform and opacity and collapses under `prefers-reduced-motion`. Confetti appears only when a path is finished.
- Illustrations in `components/illustrations.tsx` are line drawings in navy and gold with no faces.

Two things from earlier versions do not follow the "no faces" rule and were kept because they are existing features: the Leo practice companion (a lion) and the people in the True stories scenes.

## Offline

`scripts/sw.template.js` becomes `public/sw.js` at sync time with the full list of pages. On install it saves every page, the scripts, styles and fonts each page names, every locale and content file, and the samples. The OCR engine and its language data are saved the first time they are used.

## Deploy

GitHub Pages serves the `main` branch of `verushkapatel/saath`, which holds the built site. The source is on other branches.

```bash
NEXT_PUBLIC_BASE_PATH=/saath npm run build:pages
NEXT_PUBLIC_BASE_PATH=/saath npm run handbook:pdf
```

Then replace the contents of `main` with `out/`.

## Defaults chosen in this build

- The name-and-password account was replaced by a guest profile with an optional nickname, school code, grade and PIN. Anyone who used the earlier build keeps their data.
- Supabase sync and the optional cloud AI reading layer were removed, so that nothing a minor does can leave the device except the opt-in cohort numbers.
- Kannada was removed from locales, content, fonts, OCR data and tests.
- The long landing page was replaced by one welcome screen. "How Saath works" in the profile is six lines.
- The bottom bar has five items: Home, Learn, Drills, Scan, Money Lab.
- Home's one gold action is the FinLit Check until it is taken, then the current path.
- The check has no "retake" button. It appears twice: at the start, and after the first finished path.
- Sharing sends what already exists once when it is switched on, then one event per lesson or path finished. Leaving or changing school switches sharing off again.
- Content is edited directly in `content/*.json`. The earlier generator scripts were removed.
- The daily question bank is tagged by topic, and each topic is mapped to a unit in `TOPIC_UNIT`.
- Voice search moved from Home to the Learn search box.
