# Kitten Voice Worker

This Worker proxies kitten speech text to OpenAI Text to Speech so the browser never receives `OPENAI_API_KEY`.

## Deploy

```bash
cd workers/kitten-voice
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

After deploy, add the Worker endpoint to the frontend environment:

```bash
VITE_KITTEN_VOICE_API_URL=https://your-worker.your-subdomain.workers.dev/kitten-speech
```

If the variable is empty, the app keeps using browser-local speech synthesis.
