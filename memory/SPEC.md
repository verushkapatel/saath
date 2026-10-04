# SAATH — Living Product Specification

## Product
Saath is a free, installable financial-life learning companion. Its central journey follows the fictional Verena through 45 connected chapters from her first job to retirement. The experience is available in English, Hindi and Marathi, with a default near-black/white visual system, restrained navy interaction accents, an intentional light mode, and reduced-motion, larger-text and high-contrast settings.

## Core flow
1. Choose language before any product copy appears.
2. Explore the interactive immersion (Verena, decisions, drills, guides, forms, Saath AI, MoneyLab, rewards and personalization).
3. Create a local username/password account. Passwords are PBKDF2-hashed; accounts and learning data remain in that browser.
4. Select difficult money topics and appearance preferences.
5. Complete Verena chapters in order. Each includes story beats, a hands-on simulation, a consequential decision, state changes, explanation, five-question drill, XP and rewards. Completed chapters remain replayable.
6. Continue with daily challenges, guides, forms, MoneyLab, sourced stories, drills and Saath AI.

## Verena state
State is derived from the user's first saved choice in every chapter: cash, monthly income, savings, emergency fund, investments, debt, protection, dependents, confidence and resilience. Negative cash/savings becomes debt; confidence/resilience are bounded to 0–100. Chapter replay never overwrites the first consequence or grants duplicate XP.

## Persistence and privacy
Accounts, progress, MoneyLab entries, preferences and optional AI history use localStorage/IndexedDB and remain scoped per local account. Receipt/form images are processed locally and discarded. Backups and CSV exports are user-initiated. Sharing previews exclude MoneyLab and usernames.

## Saath AI
Provider order is: optional local Qwen 2.5 WebLLM model, optional hosted worker, deterministic checked-content provider. The app always works without a model. Responses are grounded in Saath content, redact identity numbers before remote use, exclude MoneyLab, and distinguish education from financial advice.

## Optional service worker backend
The Cloudflare Worker supports grounded AI, confirmed feedback delivery to the fixed owner destination, anonymous heartbeat storage in a single Durable Object, and protected `/admin/live` counts. A live user is an anonymous session seen in the last five minutes. No username, financial data or fingerprint is used for analytics. Owner credentials are Worker secrets.

## Roles
- Learner: local account; all learning, story, MoneyLab and settings features.
- Owner: `/admin` credential form; can view only the measured active-session count.

## Content safety
Verena is fictional. Real stories are sourced. Current schemes, tax, forms and changing requirements must display authoritative source and review dates. Saath is educational and never recommends a specific investment or guarantees returns.