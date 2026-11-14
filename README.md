# Underground Terminal Network

A terminal-first, unofficial student game directory built with React, TypeScript, and Vite. **Phase 1 only:** entirely static, no backend, account, telemetry, or paid API. Game listings link to original creators; no game files are redistributed or embedded.

## Local development

Use Node.js 22.12+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173).

```sh
npm test
npm run build
npm run preview
```

Build output is `dist/`. Relative asset paths support both root and repository-subpath hosting. No environment variables are needed; `.env.example` documents this. Never put secrets in Vite client variables.

## Commands

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

Try `games search puzzle`, `games info 2048`, and `play 2048`. Quoted arguments are supported. Invalid commands suggest nearby spellings. An explicit launch link remains available if the browser blocks a popup. External games have their own policies and availability; returning to the original tab returns to the terminal. This application does not bypass network policies.

Keyboard: Up/Down recall history (including restoring an unfinished draft); Tab completes commands, game IDs, and themes; Ctrl+L clears output; Escape or Ctrl+U clears the input. When no completion matches, Tab retains normal focus navigation. Quick-start buttons and game launch links provide touch access. History is in memory, capped at 100 commands; output is capped at 150 entries. Only theme preference persists in local storage; storage failures are tolerated. All command output is rendered as React text, never HTML.

## Free deployment: Cloudflare Pages

Hosting is a user deployment step; this repository has not been published automatically.

1. Push the repository to GitHub or GitLab.
2. Create a Cloudflare account and choose **Workers & Pages → Create → Pages → Import an existing Git repository** (dashboard labels may change).
3. Choose the Free plan, repository, and production branch. Build command: `npm run build`; output directory: `dist`; project root: repository root. Use Node 24 for the build environment.
4. Deploy. Use the provided `https://<project>.pages.dev` address. No custom domain, Workers, database, or payment method is needed for Phase 1.

Cloudflare advertises Pages as free to start without a credit card: [Pages product page](https://www.cloudflare.com/products/pages/). The published Free plan limits include 500 builds/month, one concurrent build, 20,000 files/site, and 25 MiB per asset; stay within current limits. Static asset requests do not use Workers API quotas. Review [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) and [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) before deployment (checked November 14, 2026). `public/_headers` supplies security headers on Pages.

If onboarding asks for a payment method, do not enable a paid plan: use the public-repository GitHub Pages fallback below. Later phases must independently verify Workers/D1/Durable Objects eligibility, quotas, and payment requirements before selecting infrastructure.

## Free fallback: GitHub Pages

Use a **public repository on GitHub Free**, without paid Actions runners or a custom domain. The included `.github/workflows/pages.yml` is manually triggered to avoid unexpected publication.

1. Push these files to your public repository.
2. Open repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. In **Actions**, select **Deploy static site**, then **Run workflow** on your intended branch.
4. Open `https://<username>.github.io/<repository>/` after deployment completes.

GitHub Pages is available for public repositories on GitHub Free; its published limits include a 1 GB published site and a soft 100 GB/month bandwidth limit. See [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). This project requires no paid feature. Cloudflare `_headers` is ignored by GitHub Pages; its platform controls response headers.

## Source map

- `src/main.tsx`: accessible terminal UI, session history, keyboard handling, safe external launches.
- `src/style.css`: responsive terminal layout and green/amber/ice themes, system monospace fonts.
- `src/terminal/commands.ts`: pure parser, command registry, completion, typed command results.
- `src/terminal/commands.test.ts`: parser, searching, validation, completion, catalog, and action tests.
- `src/catalog.ts`: typed, local sample directory with creator credits and original HTTPS URLs.
- `public/_headers`: Cloudflare Pages security headers.
- `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`: toolchain and reproducible dependencies.
- `.github/workflows/pages.yml`: optional manually triggered GitHub Pages deployment.

To extend the directory, add entries to `src/catalog.ts` with unique IDs and original HTTPS URLs. Add commands through the typed registry; keep parsing independent from browser effects. React renders text safely, and only allowlisted catalog destinations can be launched.

## Scope and next phases

Complete in Phase 1: terminal UI, local game directory, modular parser, required commands, keyboard controls, responsive themes, static deployment configuration, and core tests.

Not implemented: backend persistence (Phase 2), authentication and submissions (Phase 3), public chat and moderation (Phase 4), profiles/favorites and advanced features (Phase 5). No online presence or fake chat is shown. Backend API interfaces, migrations, authentication, and moderation belong to their respective phases. Do not treat this phase as a production community service with accounts. Phase 2 has not been started.
