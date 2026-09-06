# table-spit scan proxy

A Cloudflare Worker that holds the Gemini API key and turns a photo of a
restaurant ticket into structured line items.

It exists because the key cannot live in the browser: anything shipped to the
client can be read out of it and spent by anyone.

## Deploy

```bash
cd worker
npm install
npx wrangler secret put GEMINI_API_KEY   # from aistudio.google.com
npx wrangler deploy
```

Then edit `ALLOWED_ORIGIN` in `wrangler.toml` to the exact origin of the
deployed app and redeploy, and set `VITE_SCAN_ENDPOINT` in the app's build
environment to the Worker URL.

## Cost

Both halves are free and neither asks for a card:

- Cloudflare Workers free plan: 100,000 requests/day.
- Gemini API free tier: roughly 10 requests/minute and 1,500/day, and the
  limits are no longer published as fixed numbers — check them in AI Studio.

Because the account is in the EEA, Google's paid-service data terms apply to
the free tier, so ticket photos are not used to train models. Outside the EEA
that is not true and the free tier does feed product improvement, with human
review. Check the terms before deploying elsewhere.

## Limits it enforces

| Rule | Response |
|---|---|
| Anything but POST | 405 |
| Missing or unreadable image | 400 |
| Content type not an image | 415 |
| Body over 5 MB | 413 |
| Upstream failure | 502 with a generic message |

The upstream error body is logged, never returned: it can carry quota details
and echoes of the request.

## What it does not do

No authentication and no rate limiting of its own. Anyone who learns the URL
can spend the quota. `ALLOWED_ORIGIN` only stops browsers on other pages; it
stops nothing that is not a browser. If the URL leaks, rotate it, or put
Cloudflare Access in front.

The free tier has no SLA and can change or disappear. The app must keep working
without this Worker — the photo is a shortcut, never a dependency.
