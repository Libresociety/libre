# LibreSociety

LibreSociety is an independent terminal-first community for games and curious minds, built with React, TypeScript, Vite, Cloudflare Workers, and D1.

## Local development

Use Node.js 22.12+ and npm.

```sh
npm ci
npm run db:migrate:local
npm run dev
```

`npm run dev` starts both the Vite frontend and the local Wrangler Worker. Open the URL printed by Vite (normally http://localhost:5173). Vite proxies `/api` to the local Worker on port 8787. Wrangler runs D1 locally; no Cloudflare login is needed for local development. Set `VITE_API_URL` only when pointing the built frontend at a deployed Worker. The app falls back to its local sample catalog if the API cannot be reached.

Local Wrangler does not inherit Cloudflare Worker secrets. To test sign-up email locally, copy `worker/.dev.vars.example` to `worker/.dev.vars` and enter your Resend API key and the email registered with Resend there. That file is ignored by Git. Production secrets are separate and are configured with `wrangler secret put`.

```sh
npm test
npm run build
```

Build output is `dist/`. Never put secrets in `VITE_*` variables; Vite bundles them into public client code.

## Terminal commands

| Command | Behavior |
| --- | --- |
| `help`, `help <command>` | Command list or contextual help |
| `about` | Network and phase information |
| `clear` | Clear command output |
| `games` | Alphabetically sorted directory |
| `games search <query>` | Search titles, descriptions, categories, tags |
| `games category <category>` | Filter by category |
| `games info <id>` | Description, credit, destination |
| `play <id>` | Open original game in a separate tab |
| `theme green`, `theme amber`, `theme ice` | Save color preference locally |
| `history` | Show current session’s commands |

Try `games search puzzle`, `games info 2048`, and `play 2048`. Invalid commands suggest nearby spellings. External games remain on their original creator sites; no game code is redistributed or embedded.

## Cloudflare setup and deployment

Cloudflare account authentication is required only to create the hosted D1 database and deploy the Worker/Pages project. Do not configure a paid plan or provide a payment method; verify the current free plan eligibility and quotas in your account before deployment. Local development above does not need an account.

1. Install dependencies with `npm ci` and authenticate using `npx wrangler login` (browser login) or a scoped API token in your shell environment. Do not commit the token.
2. Create a D1 database: `npm run db:create`. Copy the returned database ID into `worker/wrangler.toml`, replacing `REPLACE_WITH_DATABASE_ID`.
3. Apply the migration remotely: `npm run db:migrate:remote`.
4. Deploy the API: `npm run worker:deploy`. It will be available at `https://underground-terminal-api.<your-account>.workers.dev`.
5. For the Pages frontend, configure `VITE_API_URL` to that Worker URL in the Pages build environment, then build with `npm run build` and use `dist` as the output directory. Alternatively, deploy the static output with GitHub Pages. Without the variable, the static sample directory works.
6. Optionally set `ALLOWED_ORIGIN` in `worker/wrangler.toml` to the exact Pages origin and redeploy. Leaving it unset permits public browser origins, which is suitable for a public read-only API.

### Manual signup requests and private email notifications

The public sign-up form stores a pending request with a salted password hash and sends a notification to the private destination configured in Worker secrets. No inbox address belongs in this repository or frontend configuration. Direct account creation is disabled. Once your account has admin access, use `admin` in the terminal or the **admin** header button to approve or deny requests. Every decision is checked by the Worker.

There are currently no admin accounts by default. Bootstrap your own account once by submitting a signup request, copying its request ID from the notification, then running this from the repository root with Wrangler authenticated. This is the only normal approval flow that requires the CLI:

```sh
npx wrangler d1 execute underground-terminal --remote --config worker/wrangler.toml --command "INSERT INTO users(id,username,password_salt,password_hash,is_admin) SELECT id,username,password_salt,password_hash,1 FROM signup_requests WHERE id='REQUEST_ID' AND status='pending' AND NOT EXISTS (SELECT 1 FROM users WHERE username=signup_requests.username COLLATE NOCASE); UPDATE signup_requests SET status='approved',decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by='REQUEST_ID' WHERE id='REQUEST_ID' AND status='pending' AND EXISTS (SELECT 1 FROM users WHERE id='REQUEST_ID');"
```

The first account becomes an administrator. Sign in, then use the panel for all future requests. The panel shows usernames and submission times only, confirms each choice, and never returns stored password hashes.

Email delivery uses Resend's test sender, which does not need a custom domain but only delivers to the email address registered to your Resend account. Create a free Resend account using your private inbox, then create an API key. The free Resend plan has a published 3,000 monthly email quota with a 100 per day cap. Keep signup requests low volume and disable paid overages in Resend settings. Set the private values in Worker secrets, never in source control:

```sh
npx wrangler secret put SIGNUP_NOTICE_TO --config worker/wrangler.toml
npx wrangler secret put RESEND_API_KEY --config worker/wrangler.toml
```

Use the same email address for `SIGNUP_NOTICE_TO` and your Resend account email. The Worker sends from Resend's shared test address. Until both secrets are set, signup requests return a configuration error and no account is created. Do not put the inbox address or API key in `wrangler.toml`, frontend variables, or source control. Resend's shared sender only allows sending to the account's own email; sending to other recipients requires a verified domain. See [Resend pricing](https://resend.com/pricing) and [test email sending](https://resend.com/changelog/sending-test-emails).

The API exposes `GET /api/health`, `GET /api/games` with optional `q` or `category` query parameters, and admin-only signup review routes. Game directory responses are capped at 100 rows. D1 schema and sample seed data are in `worker/migrations/0001_create_games.sql`.

## Free static hosting fallback

The static frontend can still be hosted on Cloudflare Pages or GitHub Pages without the API. Push the repository and follow the GitHub Actions workflow under `.github/workflows/pages.yml`, or import the repository into Cloudflare Pages with build command `npm run build` and output directory `dist`. The static catalog is used whenever `VITE_API_URL` is unset or the API is unavailable.

## Source map

- `src/main.tsx`: responsive terminal UI, API loading, and admin signup review panel.
- `src/terminal/commands.ts`: pure command parser, completion, and typed results.
- `src/catalog.ts`: local fallback sample catalog.
- `worker/src/index.ts`: Cloudflare Worker API with D1-backed listings, authentication, and administrator authorization.
- `worker/migrations/0001_create_games.sql`: D1 schema, indexes, and sample records.
- `worker/wrangler.toml`: Worker and D1 configuration.
- `public/_headers`: Cloudflare Pages security headers.

## Remaining phases

- Phase 3: accounts, secure authentication, profiles, and moderated game submissions.
- Phase 4: real-time public chat, moderation, reporting, and presence.
- Phase 5: profiles, favorites, and final polish.

No accounts, user-submitted listings, private messages, or chat are implemented yet.
