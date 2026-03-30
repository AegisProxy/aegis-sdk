# Supabase example: encrypted mapping persistence

This folder shows one way to store **encrypted** `AegisProtector` state so workers can reload it **after** decrypting locally. Supabase sees only ciphertext; **RLS** restricts rows to the signed-in user.

## Prerequisites

1. From the **SDK repo root** (`AegisSDK/`), build the package: `npm run build`
2. Create a Supabase project and run `schema.sql` in the SQL editor
3. Install deps here: `npm install`

## Files

- `schema.sql` — table `aegis_session_mappings` + RLS
- `crypto.ts` — AES-GCM + PBKDF2 helpers (Web Crypto; Node 18+ or browser)
- `persist-flow.ts` — `saveEncryptedMappings` / `loadEncryptedMappings` using `exportState` / `importState`
- `demo.ts` — optional smoke test (requires real auth session)

## Wire format

`exportState()` / `importState()` use **v1 JSON** with snake_case keys (`session_id`, `text`, `placeholder`) so Python and TypeScript blobs are interchangeable.

## Security notes

- Use a **password or key** your app controls; for browsers, prefer user-derived secrets or tokens from your backend—not a hard-coded string.
- Use the **anon key** only with the **user JWT**; never ship **service role** to clients.
- This example is **not** a full product hardening review.

## Run `demo.ts`

You must establish a Supabase session (e.g. sign in via your app) so `auth.getUser()` returns a user and RLS passes.

Required environment variables:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anon key (with user session for RLS) |
| `AEGIS_EXAMPLE_ENCRYPTION_PASSWORD` | Demo passphrase for encrypting the mapping blob (never hard-code in real apps) |

```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export AEGIS_EXAMPLE_ENCRYPTION_PASSWORD="long-unique-demo-secret"
npm run demo
```
