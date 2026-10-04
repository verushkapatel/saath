# Build Saath: the full brief for Claude Code

Paste everything below into Claude Code as one message.

---

## Who you are and what you are building

You are building **Saath**, a financial-life companion for adults in India. "Saath" means "together" in Hindi. It is a free, installable web app (a PWA) that works on phones and laptops, in English, Hindi and Marathi.

Saath is for anyone who wants help managing money in adult life: a young person starting their first job, a homemaker running a household budget, a gig worker, a parent planning for children, someone nearing retirement. It is built especially for people who were never taught any of this and cannot afford a financial adviser. Treat every screen as if it will be used by a first-generation earner on a mid-range Android phone with patchy internet.

The heart of Saath is a story. Users follow **Verena**, a fictional young woman, from her first month away from home to a secure retirement. Every day they live one part of her life, make her money decisions, see what follows (including her mistakes), learn why, and answer a short drill. Around that story sit daily challenges built from what the user finds hardest, a library of every important form, plain guides for revision, a true story every day, a Money Lab for tracking their own spending, games, rewards, and Saath AI, a tutor they can ask anything by typing or speaking.

The finished product must feel as polished as an Apple app: calm, sleek, well spaced, every element clearly defined, nothing cluttered or shabby. It should be the kind of project that shows real care, real research and real usefulness.

You have full permission to create, edit and delete files in this repository, install dependencies, run builds and tests, and deploy. Work autonomously until everything in this brief is done and verified. Do not stop to ask for confirmation on routine decisions; pick sensible defaults and note them.

## Non-negotiable rules

1. **Colour.** Black and white is the identity. Deep navy is the only accent (primary buttons, the active tab, progress, links, the navy "stage" scenes). No light navy combined with gold. No other accent colours. Light mode: soft grey page (#F2F2F7), white cards. Dark mode: true black page, navy-tinted surfaces, a brighter navy (#2F5BB7) for actions. A light/dark/device toggle is in Settings and on the onboarding screens.
2. **No FinLit check.** Users have already taken that exam. Do not add any entry test or exam.
3. **No school code** or class codes anywhere. It clutters the app and Saath is not a school tool.
4. **Accounts are a username and a password**, made on the device, so progress is saved and several people can share one phone. No phone number, no email, no real name required.
5. **Adult level throughout.** No childish language, mascots talking down, "pocket money", "class gifts" or cartoon silliness. Every scenario, form, quiz option and saving method is a simulation of real adult life: salaries, rent, bills, loans, insurance, tax, family, retirement. Wrong answer options must be plausible mistakes adults actually make, never jokes.
6. **Never fabricate.** Every interest rate, limit, scheme rule, eligibility condition, deadline and form requirement must come from an official source (RBI, SEBI, IRDAI, Income Tax Department, EPFO, NHA, India Post, National Savings Institute, ministries) and be shown with its source link and a "verified on" date. Where a figure changes often (interest rates, premiums), say so and point to the official page instead of quoting a number. Real stories must be true and sourced.
7. **Privacy.** Money Lab entries, receipts and photos of forms never leave the device. Photos are read on the phone (OCR) and not kept. Saath AI questions have ID numbers (Aadhaar, PAN, account, phone) stripped before they are sent. No ads, no trackers, no analytics.
8. **No secret keys in the frontend.** The AI model is reached through a small server you deploy (see the Saath AI section).
9. **Three languages, complete.** Every string exists in English, Hindi and Marathi, with identical keys. Hindi and Marathi must read naturally to a native speaker, not like machine translation. Use Devanagari fonts that render well.
10. **Plain writing.** Short sentences, sentence-case headings, no jargon without a one-line explanation, no em-dash tics.

## The user journey, screen by screen

### 1. Language first
The very first screen, before anything else, asks for the preferred language: English, हिन्दी, मराठी. Each option shows the language's own name and a greeting in it. The whole screen re-renders in the chosen language at once. One button: **"Enter the Saath immersion"**.

### 2. The Saath immersion
An immersive, interactive tour that explains **every single feature** in detail before any sign-up. Style it like an Apple product page: full-height chapters that snap into place, alternating deep navy and light sections, large bold headings, smooth reveal animations, a progress indicator on the side, and a floating button to jump to the end. Each chapter has a number, a title, a lead sentence, four precise bullet points of what the user gets, and a live demo they can touch:

1. **Verena's story**, from first salary to retirement. Demo: one real decision with three options and the consequence of each, earning XP.
2. **Daily challenges**: a money crisis, a real-life task and a quiz each day, built from the topics the user finds hardest. Demo: a fake "bank" call crisis.
3. **Streaks, XP, levels and rewards**: outfits, accessories, places and badges for Verena. Demo: dress Verena and watch the XP bar.
4. **Games**. Demo: one round of "Needs or wants?".
5. **Guides** for depth and revision. Demo: tap a question, see the guide.
6. **Forms**: the full library and the photo explainer. Demo: tap lines of a sample loan form to see what each means.
7. **Saath AI**: ask anything in your language, by voice. Demo: three sample questions with answers.
8. **Money Lab**. Demo: log three spends and watch the total.
9. **A true story every day**. Demo: a real, sourced sample.
10. **Set up around what you find hard**. Demo: pick topics.
11. **Your way**: light or dark, language, sharing. Demo: switch the theme live.

The tour ends with "That is all of Saath" and a Continue button.

### 3. Make Saath yours
A single sleek full-screen navy page: Verena standing proud, the Saath logo, the headline **"Make Saath yours."**, one line on what that means, three short reassurances (two minutes to set up; no phone number, email or real name; free with nothing to buy), a primary button "Make Saath yours", and a quiet "I already have an account" link.

### 4. Install on the home screen
Before the account is made, a clean page in the style of lune.page asks the user to add Saath to their home screen or bookmark it:
- An app-icon tile, the title "Put Saath on your home screen", and why (opens in one tap, full screen, works offline).
- A segmented control for **iPhone / Android / Laptop**, preselected from the device.
- Numbered steps with an icon for each: iPhone (Safari Share button, Add to Home Screen, Add, then open from the home screen); Android (Chrome menu, Install app or Add to Home screen, confirm); laptop (install icon in the address bar, or Ctrl/Cmd+D to bookmark).
- Where the browser supports it (`beforeinstallprompt`), a one-tap "Install Saath" button.
- An iPhone note: the home-screen app has its own storage separate from Safari, so the account must be created after opening it from the home screen.
- "Done, set up my account" and "Skip and use it in the browser".
- If Saath is already running as an installed app, skip this page and the tour and go straight to setup.

### 5. Setup, in four clear steps
A step indicator shows "Step n of 4".
1. **Choose a username** (3 to 20 characters, no spaces, checked live for availability on this device).
2. **Set a password**, typed twice, with a show/hide toggle and a warning not to reuse a UPI PIN or bank password. Passwords are stored only as a salted PBKDF2 hash. Explain that Saath cannot reset it, and offer a backup file in Settings.
3. **What feels hardest about money?** Pick up to five of thirteen topics: banking, budgeting, saving, income and salary, investing, insurance, borrowing, tax, government schemes, forms and papers, family money, retirement, scams and fraud. Each topic has a one-line hint.
4. **How should Saath look?** Theme, language and text size, previewed live.

Then "Start my Saath" opens Home.

## The app

Navigation: a frosted bottom tab bar on phones (Home, Story, Learn, Money Lab, Forms) and a left sidebar on laptops that also shows Saath AI, Progress and Settings. A sticky frosted header with the logo, an "Ask" button for Saath AI and the profile button. Every screen works at 360 px wide and at 1440 px wide.

### Home
Calm and uncluttered, in this order: greeting with the user's name and streak; **today's main card** on a navy stage (today's part of the story when it is open, otherwise today's question, real story or recommended guide); **Today's challenges**; your week (streak dots, level and XP bar); today's real story; one recommendation; four quick links to things that are not tabs (Games, Saath AI, Progress, Real stories).

### Verena's story (the core)
Fourteen life stages, one episode each, opening one per day so the journey lasts weeks: early adulthood (the month that runs out on day 18), first job (reading an offer letter), first income (payslip, gross vs take-home, PF and TDS), banking (opening an account, KYC, UPI safety), budgeting, saving (emergency fund), investing (SIPs, risk, scams promising doubling), insurance (health and life, **private or government schemes depending on income level**: PMJJBY, PMSBY, Ayushman Bharat PM-JAY), borrowing (EMIs, flat vs reducing, loan apps, credit cards, gold loans), family finances (marriage, shared costs, lending to relatives), children (planning, Sukanya Samriddhi), long-term planning, financial security (nominees, wills, PPF, EPF), and retirement (Atal Pension Yojana, pension planning).

Each episode plays as an immersive short film, not a page of text:
1. **The scene**: Verena on a deep navy stage, large, one line of narration at a time like Instagram stories (tap or swipe to advance, progress segments at the top, read-aloud on every line). Her face changes with the moment: neutral, worried, happy, proud.
2. **Try it**: a hands-on simulation (a budget slider, an EMI calculator with different terms, compound growth over years, a payslip or loan form with lines to inspect and red flags to catch).
3. **Decide**: three or four realistic options.
4. **What follows**: the consequence, with her money (cash, savings, debt) updated. **Show her failures** clearly: when she chooses badly, the app shows what it cost her and what she learns, so users know what to watch out for in real life.
5. **Why**: the lesson in plain words, links to the guides that go deeper, and "Ask Saath AI".
6. **Drill**: two to three multiple-choice questions right after the simulation.
7. **Done**: XP earned, any rewards unlocked, Verena proud, and a share button for story progress.

Replays are allowed but earn no extra XP. When the whole story is finished, switch the focus to consistency: a revision view that lets users go back **topic by topic**, with the topics where they made mistakes marked first.

### Daily challenges, crises and tasks
Every day, on one of the user's hardest topics (rotating through them):
- **A money crisis**: a short realistic situation with options (a fake bank call asking for an OTP, a ₹1 UPI request, an instant loan app wanting contacts, a hospital desk asking about cover, an agent offering a scheme for a fee, an urgent tax refund SMS).
- **A real-life task**: something to do today (read your last ten bank transactions, save your bank's official helpline number, find where the family's policy papers are, ask an older relative how they fund retirement).
- **A three-question quiz** on that topic.
XP for each part and a bonus for all three. At least one crisis and two tasks for each of the 13 topics, all in three languages, each crisis linked to its guide.

### Progress, streaks and rewards
- Streak of consecutive days with something finished, with one forgiven missed day per week.
- XP from episodes, drills, challenges, guides, real stories and games; levels that take a little longer each time.
- Rewards that unlock over time, never bought: outfits (kurta, hoodie, office blazer, denim jacket, sari, warm shawl, festive lehenga, trouser suit), accessories (shoulder bag, backpack, glasses, sunglasses, jhumkas, scarf, watch, headphones), places (her room, the office, the bank, the café, the rooftop, family home, the garden) and badges. A "Dress Verena" area with a live preview.
- New features unlock with level (for example a second game at level 2) so there is always something new to reach for.
- Verena is a well-drawn flat illustration that ages through the story (hair and clothes change by life stage, grey hair near retirement), not a stick figure.

### Games
At least two: **Needs or wants?** (sort everyday adult spends) and **Scam or safe?** (read realistic SMS and WhatsApp messages and decide). Every answer shows the reason. Best scores are kept, XP once a day, and scores can be shared.

### Learn (guides)
A non-story, comprehensive explanation of everything the story covers, for revision and depth: around 45 guides across the 13 topics. Each has a summary, a clear explanation with glossary terms you can tap, key points, a worked adult example, something to try in real life, official sources with dates, read-aloud and a share button. Search by text or voice, filter by topic, and a **Revise topic by topic** grid showing progress per topic.

### Forms
A library of **all the important forms an adult in India will face**, each with: what it is for, who it is for, the issuing authority, every important field explained in plain words, the documents you need, key terms, common mistakes, what to check before signing, and the official source. At minimum: savings account opening, KYC update, nomination, PAN application, declaration when you have no PAN, Form 16 (TDS certificate), Form 15G/15H, ITR-1 (Sahaj), loan Key Fact Statement, gold loan, credit card application (MITC), insurance proposal, health insurance claim (cashless and reimbursement), PMJJBY and PMSBY enrolment, Ayushman Bharat PM-JAY card, Atal Pension Yojana, Sukanya Samriddhi, PPF account opening, EPF joining and EPF withdrawal claim.

Plus **"Explain a form from a photo"**: take or upload a photo, OCR runs on the phone (tesseract.js with English and Hindi/Marathi data, image cleanup for contrast and skew), Saath matches the fields it finds and explains them in layman's terms, and Saath AI can be asked about the form.

### A true story every day
One short paragraph a day: either a real adult's financial failure and what they learned, or the best financial advice someone received that changed their life. **These must be true**, taken from regulators, government records or reputable news reports, each with the source link, publication date, the lesson, one action the reader can take, and links to related guides. Reading it counts toward the streak.

### Money Lab
Simple, sleek, friendly:
- First visit: a short **introduction simulation** where the user logs Verena's lunch, bus ride and phone recharge by tapping, sees how receipt scanning works, and reads the privacy promise.
- A navy wallet card showing what is left this month, money in, out and saved, a month switcher, and a this-week line.
- Three big round actions: Add, Scan a receipt, Savings goal.
- Adding is an icon grid of adult categories (food, travel, rent, bills, phone, health, shopping, fun, fees, family, other; income: salary, side work, family support, stipend or grant, gift, other; savings) and a large number pad.
- Receipt scanning reads the amount, date and likely category on the device; the user checks and confirms before anything is saved; the photo is never kept.
- Entries grouped by day with category icons; where the money went; patterns (recurring payments, weekend share) after a few days; a savings goal ring; loan EMI schedules.
- Everything stays on the device; CSV export and a backup file in Settings.

### Settings
Theme (light, dark, device), language, text size, reduce motion, stronger contrast, sound and vibration, Saath AI options (on/off, online answers on/off, chat memory, optional on-device model), hardest topics, account (change password, log out, delete account), data (backup, restore, CSV, erase), install, privacy and about.

### Share everywhere it makes sense
A share button on: overall progress (as an image card with Verena, level, streak, stage and newest badge), Verena's look, story progress (from the story map and the end of each episode), each guide, each form, each real story, and game scores. Use the native share sheet, fall back to copying. Never share money data.

## Saath AI

Saath AI is the integrated tutor. Build it so it is genuinely helpful: it should answer every ordinary money question fully and warmly rather than deflecting, because the people using Saath have nobody else to ask.

### What it does
- **Ask anything** about money in adult life: salaries, payslips, bank accounts, UPI, budgeting, saving, loans, EMIs, credit cards, insurance, tax, government schemes, forms, investing basics, family money, retirement, scams. It explains how things work, what to check and what to watch out for, including how common scams operate so users can recognise them.
- **Voice dictation in English, Hindi and Marathi.** A microphone button in the chat uses the Web Speech API (`en-IN`, `hi-IN`, `mr-IN`) with live interim transcription into the input box; the question is sent when the user stops speaking. A "Speak or type in" chooser sets the language. Clear messages if the microphone is blocked or nothing was heard.
- **Answers in the user's language.** It replies in whichever language the question was asked in (detect Devanagari vs Latin script; keep Hindi or Marathi as chosen). Every answer has a read-aloud button using the best available voice (Marathi falls back to a Hindi voice if needed).
- **Knows the screen.** Every screen publishes its context (the guide, form, episode, story or quiz on it). "Explain this" and "Why was I wrong?" buttons open Saath AI with that context.
- **Explains forms from photos** using the OCR text.
- **Recommends what to revise** and **summarises progress** from the user's own record.
- Shows the guides it drew on as tappable sources.

### How it answers
A direct answer in one or two plain sentences, then two to four short bullet points, then one practical tip or something to check. Bold for key terms only. At most about 170 words. Warm and respectful, like a knowledgeable elder sibling, never condescending. Render bullets and bold in the chat bubble, reveal the newest answer word by word, and keep a short conversation memory (on the device, optional).

### Grounding and guardrails (these make it trustworthy, not timid)
- Retrieve the closest passages from Saath's own checked content (guides, forms, glossary, stories) and send them with the question. Facts about Indian rates, limits, scheme rules, fees, deadlines and documents must come from those passages; if they are not there, say there is no checked figure and point to the official source. General concepts (what inflation is, how compound interest works) can be explained in the model's own words.
- After the model replies, reject any answer that contains an invented number (a percentage, a lakh or crore figure, a year, a section number or a stated amount not present in the passages or the question). Round amounts inside a clearly labelled example are allowed. When rejected, fall back to the checked on-device answer.
- Never recommend a specific stock, fund, policy or product, and never predict returns; explain how to compare instead. Say it is not a licensed adviser only when asked for personal investment advice.
- If the user says money was stolen or an OTP was shared, tell them first to call **1930** (national cyber crime helpline) and their bank, and mention cybercrime.gov.in.
- Never ask for, repeat or store Aadhaar, PAN, account numbers, OTPs, PINs or passwords; strip them from what is sent.
- Questions about today's rates or "which is best" get fixed, checked wording plus the relevant guide.

### How it runs
- **Online (default when configured):** a Cloudflare Worker in `server/saath-ai-worker/` that holds no key in the browser, uses the Workers AI binding (try `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, then Llama 4 Scout, Gemma 3 12B, Llama 3.1 8B as fallbacks), allows only the app's origin, limits request size, logs nothing, and returns a diagnostic reason only for a special header used by the repository's check workflow. The system prompt is shared verbatim between the app and the Worker, with a test that keeps them identical. The first time, the chat shows a short note explaining what is sent and offering "Keep it on this phone".
- **On the device (optional):** a small open model (Qwen2.5 0.5B or 1.5B via WebLLM/WebGPU) that the user can download in Settings; nothing leaves the phone.
- **Always available:** a rule-based provider that answers from the checked passages with no network, so Saath AI never breaks offline.
- Provider order: on-device model if switched on, else online if allowed and connected, else rules, with automatic fallback on any error.

## Design system (Apple-level polish)

- **Type:** one clean sans (Inter for Latin, Noto Sans Devanagari for Hindi/Marathi). Large bold titles (about 34 px, weight 800, tight letter spacing), 17 px body, generous line height for Devanagari.
- **Surfaces:** white cards with soft shadows on the grey page, 22 px card radius, 28 px sheet radius, hairline separators in grouped lists, iOS-style segmented controls and switches, bottom sheets with a grabber and blurred backdrop.
- **Navy scenes:** the moments that matter (language screen, tour chapters, today's card, story scenes, finishes, Make Saath yours) sit on a deep navy gradient with white text, like a stage with the house lights down.
- **Motion:** screens fade and lift in, sections arrive one after another, story lines slide up, Verena breathes gently; all of it off when reduced motion is on.
- **Components:** capsule primary buttons in navy, soft navy secondary buttons, big tappable answer options that show the best answer and the user's pick after answering, frosted header and tab bar.
- **Accessibility:** 48 px tap targets, visible focus rings, screen-reader labels on every icon button, text size options, stronger-contrast mode, read-aloud across the app.
- **Responsive:** designed for a 360 px phone first, then a sidebar layout and edge-to-edge tour sections on laptops.

## Technical foundation

- Next.js (App Router) with TypeScript, exported as a static site, deployed to GitHub Pages under a base path, as an installable PWA with a service worker that precaches every page and content file and clears only its own caches on update.
- Content as JSON files (story, guides, forms, form fields, daily questions, challenges, games, stories, glossary) and locale files for EN/HI/MR, copied to `public/` at build time.
- Accounts and data on the device: per-account scoped storage and a separate IndexedDB per account; backup and restore as a file.
- OCR with tesseract.js running in a web worker, with image preprocessing; speech with the Web Speech API.
- GitHub Actions: on push, run type checks and tests, deploy the Worker with `CLOUDFLARE_API_TOKEN` from repository secrets, build with the Worker URL, and publish to Pages; a separate workflow that asks the live Worker a real question in English and Hindi and checks that other origins are refused.

## Quality bar and checks before you finish

- Unit tests for accounts, progress and XP, streaks, challenges planning, rewards, retrieval, the invented-number guard, language detection, receipt parsing, and content integrity (three languages everywhere, every form and story has an https official source and a check date, every guide link resolves, locale keys identical).
- Type check, lint and build all clean.
- Drive the real app in a headless browser at 390 px and 1280 px, in light and dark, in English and Hindi: language, tour, Make Saath yours, install, the four setup steps, Home, a full episode, all three challenges, a game, a form, the photo explainer with a real photo, Money Lab intro and entries, Saath AI typed and in Hindi, Settings, sharing. Fix anything that looks cramped, misaligned, cluttered or unclear, and check there are no console errors.
- Confirm the live Saath AI server answers in English and Hindi after deploy.
- Leave the repository with a README that explains every feature, how Saath AI is set up, and how to deploy.
