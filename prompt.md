Project: Underground Terminal Network

You are an experienced full-stack TypeScript engineer. Build a polished, functional, terminal-based web application inspired by classic BBS systems, Linux terminals, and underground internet communities.

Core concept

Create an unofficial student-oriented online network accessed entirely through a simulated terminal interface.

The platform combines:

* A browser game directory
* Public chatrooms
* User accounts and profiles
* Game discovery and search
* User-submitted game listings
* Hidden commands and Easter eggs
* A retro terminal aesthetic

The terminal must be the application’s actual primary interface, not merely a visual decoration.

Users should interact by typing commands and receiving formatted terminal output.

The experience should feel like discovering a hidden network, while remaining intuitive, responsive, and accessible.

Critical requirements

1. The entire project must be deployable and operable for $0 within published free-tier quotas.
2. NO self-hosting, VPS, rented servers, or paid services.
3. NO paid domain requirements. Use free hosting subdomains.
4. Use Cloudflare Pages or GitHub Pages for the frontend.
5. Use Cloudflare Workers for backend APIs.
6. Use Cloudflare D1 for persistent database storage.
7. Use Cloudflare Durable Objects for real-time chat if appropriate and available within the free tier.
8. Prefer React, TypeScript, and Vite for the frontend.
9. Avoid unnecessary dependencies and complex infrastructure.
10. Never assume access to a paid API.
11. Do not require a credit card or payment method as part of the proposed architecture. Verify service requirements and provide a fallback if needed.
12. Do not implement features intended to circumvent organizational network controls.
13. Build a maintainable, secure, production-oriented project, not a throwaway prototype.

Visual design

The website should resemble an authentic Linux terminal or 1990s bulletin board system.

Design elements:

* Almost-black background
* Monospaced typography
* Green terminal text by default
* Subtle amber and white accents
* ASCII art for the startup banner
* Command prompt such as guest@underground:~$
* Optional animated text, but no excessively slow typing animations
* Command history with up/down arrow navigation
* Tab completion for commands
* Scrollable terminal output
* Functional keyboard shortcuts
* Mobile-friendly layout
* Multiple optional themes

Avoid a generic SaaS dashboard design. The interface should genuinely feel like a terminal.

Terminal command system

Implement a modular command parser supporting commands and arguments.

Core commands:

help - Display available commands
about - Display information about the network
clear - Clear terminal output
games - List games with IDs, names, and categories
games search <query> - Search the game directory
games category <category> - Filter games
games info <id> - Display game information
play <id> - Open a game
chat - Enter the public chat
chat <channel> - Switch chat channels
channels - List public chat channels
who - View connected users when supported
login - Log into an account
register - Create an account
profile - View account details
theme <name> - Change terminal theme
history - Display previous commands
submit - Submit a game suggestion

Include helpful error messages, command suggestions for typos, and contextual help.

Game directory

Build a searchable game directory supporting:

* Game titles and descriptions
* Categories and tags
* Search functionality
* Alphabetical sorting
* Favorites for authenticated users
* User-submitted listings
* Administrator approval for submissions
* External game URLs
* Optional embedded games when permitted by the provider
* Graceful fallback when embedding is blocked

Games should launch through terminal commands while allowing users to return to the network easily.

Use a few legally distributable sample games or placeholder listings during development.

Do not scrape or redistribute copyrighted games without permission.

Chatroom system

Implement real-time public chat using free Cloudflare infrastructure.

Desired functionality:

* Multiple public channels
* Persistent usernames
* Real-time messages
* Timestamps
* Message history
* Online presence if practical
* Rate limiting
* Basic moderation
* Reporting and blocking
* Spam protection

Avoid collecting unnecessary personal information. Do not display real names, student IDs, or school schedules.

Private messaging can be considered for a later version after the public chat and moderation tools are working.

User accounts

Implement a simple, secure authentication system using free infrastructure.

Requirements:

* Usernames
* Secure password hashing
* Persistent sessions
* Profiles
* Game favorites
* Account deletion
* Sensible limits on data collection

Do not use insecure homemade cryptography.

Additional features

Structure the code so the following can be added later:

* Terminal-based multiplayer games
* Achievements
* Leaderboards
* Hidden commands
* User customization
* Administrator dashboard
* Community announcements

Do not implement all of these immediately.

Engineering requirements

* TypeScript throughout
* Clear separation of frontend and backend
* Modular terminal commands
* Type-safe API interfaces
* Input validation
* Secure backend authorization
* Database migrations
* Proper error handling
* Environment configuration examples
* README with setup instructions
* Cloudflare deployment instructions
* No secrets committed to Git
* Reasonable tests for core functionality

IMPORTANT: Conserve AI agent usage

Development MUST be incremental.

Do not attempt to implement the entire application in one execution.

Start with Phase 1 ONLY.

Phase 1 requirements:

1. Initialize the React + TypeScript + Vite project.
2. Build the functional terminal interface.
3. Implement a modular command parser.
4. Implement help, about, clear, games, games search, games info, play, and theme.
5. Create a local sample game catalog.
6. Implement command history and keyboard controls.
7. Make the interface responsive.
8. Ensure it builds successfully.
9. Add a README with instructions for free static hosting.

Phase 1 must work without a backend.

For later phases:

Phase 2: Cloudflare Workers, D1, and persistent game listings.

Phase 3: Accounts, authentication, and game submissions.

Phase 4: Real-time public chat, moderation, and presence.

Phase 5: Profiles, favorites, advanced commands, and final polish.

After completing Phase 1:

* Run the build and relevant tests.
* Fix any errors.
* Summarize the files created.
* Explain how to run the project locally.
* State what is complete and what remains.
* STOP and wait for my next instruction.

Do not proceed to Phase 2 automatically.

Make reasonable implementation decisions independently. Favor clean, simple solutions over unnecessary complexity.

Begin implementing Phase 1 now.