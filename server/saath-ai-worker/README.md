# Saath AI server

Saath AI works without this. Out of the box it answers on the device, from Saath's checked guides, forms and story.
Deploy this only if you want a language model to phrase the answers more naturally.

## What it is

One Cloudflare Worker. The app posts a question to it along with the passages it found in Saath's own content.
The Worker asks a model to answer from those passages only, and returns the text. The model key, if there is one, stays on the Worker.

## Deploy (about ten minutes, free tier)

1. Make a free Cloudflare account.
2. In this folder run `npx wrangler login`, then `npx wrangler deploy`.
3. Copy the address it prints, for example `https://saath-ai.yourname.workers.dev`.
4. Build the app with that address:

   ```bash
   NEXT_PUBLIC_SAATH_AI_URL=https://saath-ai.yourname.workers.dev npm run build:pages
   ```

5. In the app, open Settings, Saath AI, and switch on "Use the online model".

Edit `ALLOWED_ORIGIN` in `wrangler.toml` if the app is served from a different address.

## What is sent

The question, the name and text of the screen the person is on, their learning record (level, streak, which guides are done),
the last few turns of the conversation, and up to five passages from Saath's content. Aadhaar, PAN, phone and account numbers are
replaced with placeholders in the browser before sending. Money Lab entries are never sent. The Worker stores nothing.

## What has not been done

This Worker has not been deployed or run against a live model as part of the build. The app's fallback path
(server unreachable, so answer on the device) is covered by tests.
