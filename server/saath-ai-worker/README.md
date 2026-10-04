# Saath AI server

Saath AI works without this. Out of the box it answers on the device, from Saath's checked guides, forms and story.
Deploy this only if you want a language model to phrase the answers more naturally.

## What it is

One Cloudflare Worker. The app posts a question to it along with the passages it found in Saath's own content.
The Worker asks a model to answer from those passages only, and returns the text. The model key, if there is one, stays on the Worker.

## Deploy (about ten minutes, free tier)

1. Make a free Cloudflare account at dash.cloudflare.com.
2. In this folder run `npx wrangler login` (a browser window asks you to allow it), then `npx wrangler deploy`.
   It uses Cloudflare Workers AI through the `[ai]` binding in `wrangler.toml`, so there is no API key to create or paste.
3. Copy the address it prints, for example `https://saath-ai.yourname.workers.dev`.
4. Check it: `curl -X POST https://saath-ai.yourname.workers.dev -H "origin: https://verushkapatel.github.io" -H "content-type: application/json" -d '{"task":"answer","lang":"en","input":"What is an EMI?","passages":[{"title":"EMI","text":"An EMI is the same payment every month."}]}'`
   should return `{"text": "..."}`.
5. Give the app the address. Either:
   - **On GitHub (recommended):** in the repository, Settings > Secrets and variables > Actions > Variables > New repository variable,
     name `SAATH_AI_URL`, value the address. Then Actions > Deploy Saath > Run workflow. The site is rebuilt and published.
   - **On your computer:** `NEXT_PUBLIC_BASE_PATH=/saath NEXT_PUBLIC_SAATH_AI_URL=https://saath-ai.yourname.workers.dev npm run build:pages`,
     then publish `out/` to `main`.
6. Everyone using the app now sees, inside Saath AI, a one-tap offer to use online answers. Nothing is sent until they tap it,
   and they can switch it off in Settings > Saath AI.

Edit `ALLOWED_ORIGIN` in `wrangler.toml` if the app is served from a different address.

## What is sent

The question, the name and text of the screen the person is on, their learning record (level, streak, which guides are done),
the last few turns of the conversation, and up to five passages from Saath's content. Aadhaar, PAN, phone and account numbers are
replaced with placeholders in the browser before sending. Money Lab entries are never sent. The Worker stores nothing.

## What has not been done

This Worker has not been deployed or run against a live model as part of the build. The app's fallback path
(server unreachable, so answer on the device) is covered by tests.
