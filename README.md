# Saath

Saath is a financial-life companion for young people in India, from The Skyward Project. It runs in a browser and installs as an app (PWA). It works in English, Hindi and Marathi.

- **Story.** Follow Verena from her first month away from home (age 19) to retirement (age 60) across fourteen life stages. Each part is a loop: story, the slip she made, a hands-on sim (read a payslip, plan a budget, see compounding, compare loan lengths), a decision, what follows, why, two questions, then XP. One new part opens each calendar day. After retirement the story turns into a revision mode, "Stay financially capable".
- **Learn.** 45 short guides, searchable and filtered by thirteen topics, each with the date its facts were checked and, where it states rules, the official sources.
- **Forms.** Fourteen common forms (bank, KYC, PAN, TDS, loan KFS, gold loan, insurance, schemes, EPF) explained field by field, with official sources and a check date. A photo reader explains the fields it recognises on a printed form, on the device.
- **Real stories.** Eight real events, from a regulator, the government or a news report, each with its source link, kind and check date. One is shown each day.
- **Money Lab.** Track your own money by hand or from a receipt photo (take photo, read, check, confirm, save; nothing is saved automatically). Notes, deleting entries, recurring-spend detection and simple patterns.
- **Saath AI.** Ask in your own words. It answers only from Saath's checked content, refuses to quote rates or give investment advice, and says so when it does not know.
- **Progress.** XP, levels, a forgiving streak, badges, and outfits and places for Verena that unlock as you go. A share card shows level, streak, story stage, newest badge and Verena, and nothing else.

The interface is black and white only, with a light and a dark theme.

## Setup

You need Node.js 20 or newer. No keys are required.

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # vitest
npx tsc --noEmit
npm run lint
npm run build:pages    # static site in out/, for GitHub Pages
```

`npm install` copies `locales/` and `content/` into `public/`, writes the service worker, and downloads English, Hindi and Marathi OCR data.

## Accounts and data: what is true

- **Accounts exist only in this browser on this device.** A username and password are made on first use. The password is never stored; a salted PBKDF2-SHA-256 hash (210,000 iterations) is. Five wrong passwords pause logging in for a minute (`lib/account.ts`).
- **Each account's data is kept apart.** Every account has its own IndexedDB database and its own suffixed localStorage keys (`lib/scope.ts`), so two people sharing a browser do not see each other's progress.
- **Data is not encrypted at rest.** Anyone who can open this browser's storage on this device can read it. The hash protects the password, not the data.
- **There is no sync.** Nothing moves to another device by itself. Settings > Your data saves a backup file, which can be opened on another device.
- **A forgotten password cannot be reset,** because there is no server. The login screen offers to clear Saath from the browser and start again.
- Photos of forms and receipts are read on the device with Tesseract and dropped. They are never saved or uploaded.
- Saath AI never receives Money Lab entries. Sharing never includes money data, names or usernames.

| Data | Where it lives | Leaves the device? |
| --- | --- | --- |
| Username, password hash | localStorage | No |
| Progress, XP, story choices, mistakes by topic | IndexedDB (per account) | No |
| Money Lab entries, goal, loans | IndexedDB (per account) | No |
| AI chat (if "Remember my chat" is on) | IndexedDB (per account) | No |
| Preferences (theme, text size, AI switches) | localStorage (per account) | No |
| School code and grade (optional) | localStorage (per account) | Only inside an opted-in anonymous event |
| Photos and the text read from them | Memory, while reading | No |
| Questions to Saath AI | Memory | Only if a hosted model is configured and switched on; identity numbers are removed first |

Before any cloud sync, server-side accounts or new data collection is added, a qualified person must review it against India's Digital Personal Data Protection Act, 2023, including the rules on children's data and verifiable parental consent. This note is not legal advice.

## Saath AI

Every screen talks to one interface, `SaathAIProvider` (`lib/ai/types.ts`). `getProvider` in `lib/ai/index.ts` picks, in order:

1. **Model in this browser** (`lib/ai/local-provider.ts`), if the person downloaded it and switched it on in Settings. It runs Qwen 2.5 Instruct (0.5B or 1.5B, q4f16) with WebLLM on WebGPU. Nothing leaves the device. Settings shows the download size (read from the model's own file list before downloading), progress, and a button to remove it. WebLLM keeps the files in the browser's Cache Storage; the service worker leaves those caches alone.
2. **Hosted model** (`lib/ai/remote-provider.ts`), if `NEXT_PUBLIC_SAATH_AI_URL` is set at build time, the person allows it, and the device is online. See `server/saath-ai-worker/` (a Cloudflare Worker template; not deployed).
3. **Rules on the device** (`lib/ai/rule-provider.ts`), always available. It retrieves the closest passages from Saath's content and answers by quoting them.

Guardrails shared by all three:

- Passages are retrieved first (`lib/ai/knowledge.ts`), and models are told, with the same system prompt (`lib/ai/prompt.ts`, copied verbatim into the Worker; a test checks they match), to answer only from them in the user's language.
- Questions asking for rates, buy or sell advice, or reporting a just-happened fraud never reach a model. The rule provider answers them with fixed, checked wording (the fraud answer starts with the 1930 helpline).
- If nothing relevant is found, the rule provider says it has no checked answer instead of letting a model guess.
- A local-model answer containing a number that is not in the passages, the screen, or the question is thrown away and the rule answer is used.
- Any failure (no WebGPU, model not downloaded, generation error, server error) falls back to the rule provider.

## Content

All content is JSON in `content/`, with English, Hindi and Marathi in every record. Edit it directly; there are no generator scripts. Run `npm run sync` after editing (it also runs before `dev` and `build`).

| File | What | Checked |
| --- | --- | --- |
| `journey.json` | Verena's fourteen episodes | Money facts checked October 2026 (`reviewed`) |
| `guide.json` | 45 guides | `reviewed` and `sources` per guide |
| `forms.json` | 14 forms | `source` and `verified` per form (2026-10-04) |
| `form-fields.json` | 28 field explanations for the photo reader | |
| `stories.json` | 8 real events | `source`, `kind`, `verified` per story (2026-10-04) |

Rates shown in the story sims (for example 10% a year for growth, 13% for a loan) are labelled on screen as example rates, not current rates.

**Things to re-check:** the income-tax form numbers changed on 1 April 2026 under the Income-tax Rules, 2026 (for example Form 16 to Form 130, Forms 15G/15H to Form 121, Form 49A to Form 93, Form 60 to Form 97); the forms library states both, but have a qualified person confirm them. RBI's revised framework on fraudulent electronic transactions applies from 1 January 2027; review "When money goes missing" then.

### Adding a lesson

1. Add the id to `LESSON_IDS` in `lib/catalog.ts`, in the position it should appear.
2. Add the lesson to `content/guide.json` with: `id`, `unit`, `topic` (one of `TOPICS`), `icon` (a name from `ICONS` in `components/ui.tsx`), `title`, `summary`, `body` (a short intro; wrap a glossary id as `[[emi]]` to make it tappable), three to five `points`, one `example`, `tryIt` (text and a link), a `check` with three options, `reviewed` and, if it states rules or limits, `sources`.
3. `tryIt.link` and path action links can be `tracker`, `episode:<id>`, `form:<id>`, `scan`, `scan:personal-loan`, `scan:gold-loan`, `scan:scheme-form`, `case:<id>`, `drill:<id>`, `drills`, `finlit` or `null`.
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

Saath supports exactly English, Hindi and Marathi, and a test requires the three locale files to have identical keys. To add another: add the code to `LANGS` in `lib/catalog.ts`; add a locale file and an entry in `locales/gate.json`; add the language to every record in `content/`; add speech, number and OCR codes in `lib/speech.ts`, `lib/format.ts` and `lib/ocr.ts`; add the name in `components/settings-screen.tsx`; and add the files to `scripts/sw.template.js`.

## How a school code works

1. On Day 2 the Skyward team gives the class a code, for example `PUNE01`.
2. A student opens Settings > School programme, types the code, picks a grade, and may add a nickname.
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

## Design

- Black and white only. Every colour is a token at the top of `app/globals.css`, redefined for dark mode. There is no accent hue and no gradient; emphasis is weight, size, inversion and space.
- The theme follows the device until the person picks Light or Dark (theme button, or Settings). The choice is applied before first paint.
- Settings also has text size, reduce motion, stronger contrast, sound and vibration.
- Playfair Display for headings, Inter for reading, Noto Sans Devanagari for Hindi and Marathi, all served by `next/font`.
- Verena (`components/character.tsx`) is drawn in ink and paper so she follows the theme.
- Layout: bottom tab bar on phones, a side rail from 900px.

## Offline

`scripts/sw.template.js` becomes `public/sw.js` with every page listed (cache `saath-v12`). On install it saves every page, the assets each names, the locales and content files. OCR data and the local model are saved the first time they are used.

## Deploy

GitHub Pages serves the `main` branch, which holds only the built site.

```bash
NEXT_PUBLIC_BASE_PATH=/saath npm run build:pages
```

Then replace the contents of `main` with `out/`.

## Not yet verified

- Hindi and Marathi text has not been reviewed by native speakers.
- The local model could not be downloaded in the build environment; WebGPU generation is untested on real devices.
- The Saath AI Worker is a template and is not deployed.
