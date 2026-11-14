import { games as localGames, type Game } from '../catalog';
let games: Game[] = [...localGames];
export function setGameCatalog(catalog: Game[]): void { games = [...catalog].sort((a, b) => a.title.localeCompare(b.title)); }
export const themes = ['green', 'amber', 'ice'] as const;
export type Theme = typeof themes[number];
export interface Result { lines: string[]; games?: Game[]; clear?: boolean; theme?: Theme; launch?: Game }
interface Context { history: string[] }
interface Command { usage: string; description: string; run: (args: string[], ctx: Context) => Result }
const out = (...lines: string[]): Result => ({ lines });
export function tokenize(input: string): string[] {
  const tokens: string[] = []; let token = ''; let quote = ''; let active = false;
  for (const char of input.trim()) {
    if (quote) { if (char === quote) quote = ''; else token += char; }
    else if (char === '"' || char === "'") { quote = char; active = true; }
    else if (/\s/.test(char)) { if (active) { tokens.push(token); token = ''; active = false; } }
    else { token += char; active = true; }
  }
  if (quote) throw new Error('Unclosed quote. Close your quoted search and try again.');
  if (active) tokens.push(token);
  return tokens;
}
const registry: Record<string, Command> = {
  help: { usage: 'help [command]', description: 'Your field guide to the network', run: ([name]) => name ? registry[name] ? out(registry[name].usage, registry[name].description) : out(`No help for “${name}”. Type help to see commands.`) : out('AVAILABLE COMMANDS', ...Object.values(registry).map(c => `${c.usage.padEnd(28)} ${c.description}`), '', '↑ / ↓ history   ·   Tab autocomplete   ·   Ctrl+L clear   ·   Esc cancel') },
  about: { usage: 'about', description: 'What is this place?', run: () => out('LIBRESOCIETY / COMMUNITY TERMINAL', 'An independent online society for games and curious minds.', 'No school affiliation. Respect creators, community rules, and your organization’s network policies.') },
  clear: { usage: 'clear', description: 'Start with a clean screen', run: () => ({ lines: [], clear: true }) },
  games: { usage: 'games [search|info|category]', description: 'Explore the browser game directory', run: ([action, ...rest]) => {
    if (!action) return { lines: [`DIRECTORY / ${games.length} games`, 'Use games info <id> for details or play <id> to launch.'], games };
    const query = rest.join(' ').toLowerCase();
    if (!query) return out(`Usage: games ${action} <${action === 'info' ? 'id' : 'query'}>`);
    if (action === 'info') { const game = games.find(g => g.id === query); return game ? out(`${game.title.toUpperCase()} / ${game.id}`, game.description, `Category: ${game.category} · Tags: ${game.tags.join(', ')}`, `Credit: ${game.credit}`, `Destination: ${game.url}`, `Type play ${game.id} to launch in a new tab.`) : out(`No game with ID “${query}”. Type games to see the directory.`); }
    if (action !== 'search' && action !== 'category') return out('Usage: games | games search <query> | games info <id> | games category <category>');
    const matches = games.filter(g => action === 'category' ? g.category === query : [g.title, g.description, g.category, ...g.tags].join(' ').toLowerCase().includes(query));
    return { lines: [matches.length ? `${matches.length} result${matches.length === 1 ? '' : 's'} for “${query}”` : `No games match “${query}”. Try puzzle, arcade, or racing.`], games: matches };
  } },
  play: { usage: 'play <id>', description: 'Launch a game in a new tab', run: ([id]) => { const game = games.find(g => g.id === id?.toLowerCase()); return game ? { lines: [`Launching ${game.title}. Your terminal stays right here.`], launch: game } : out(id ? `Unknown game “${id}”. Type games to find an ID.` : 'Usage: play <id>'); } },
  theme: { usage: 'theme <green|amber|ice>', description: 'Change the phosphor color', run: ([name]) => themes.includes(name as Theme) ? { lines: [`Theme set to ${name}.`], theme: name as Theme } : out('Available themes: green, amber, ice. Example: theme amber') },
  login: { usage: 'login', description: 'Sign in to your account', run: () => out('Enter your username and password in the secure sign-in form below.') },
  register: { usage: 'register', description: 'Create an account', run: () => out('Choose a username and password in the secure registration form below. Passwords need at least 12 characters.') },
  profile: { usage: 'profile', description: 'View your account profile', run: () => out('Sign in to view your profile.') },
  submit: { usage: 'submit', description: 'Suggest a game for review', run: () => out('Sign in to submit a game suggestion for moderator review.') },
  admin: { usage: 'admin', description: 'Open the administrator signup review panel', run: () => out('Opening the signup review panel.') },
  channels: { usage: 'channels', description: 'List public chat channels', run: () => out('general · games · study · Type chat <channel> to join. Sign in to post.') },
  chat: { usage: 'chat [channel]', description: 'View public chat or choose a channel', run: ([channel]) => out(`Public chat${channel ? ` / ${channel}` : ''}. Sign in to post messages.`) },
  who: { usage: 'who', description: 'View active chat users', run: () => out('Presence is available while viewing a chat channel.') },
  history: { usage: 'history', description: 'Show commands from this session', run: (_, ctx) => out(...ctx.history.map((line, i) => `${String(i + 1).padStart(3)}  ${line}`)) },
  sudo: { usage: 'sudo', description: 'Ask the machine nicely', run: () => out('guest is not in the sudoers file. Nice try, explorer.') },
};
function distance(a: string, b: string): number { const row = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let prev = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + Number(a[i - 1] !== b[j - 1])); prev = old; } } return row[b.length]; }
export function execute(input: string, ctx: Context = { history: [] }): Result {
  try { const [raw, ...args] = tokenize(input); if (!raw) return out(); const name = raw.toLowerCase(); if (registry[name]) return registry[name].run(args, ctx);
    const suggested = Object.keys(registry).sort((a,b) => distance(name,a) - distance(name,b))[0];
    return out(`Command not found: ${raw}`, distance(name, suggested) <= 2 ? `Did you mean ${suggested}?` : 'Type help to see available commands.');
  } catch (error) { return out(error instanceof Error ? error.message : 'Unable to process command.'); }
}
export function complete(input: string): string[] { const parts = input.trimStart().split(/\s+/); const last = parts.at(-1) ?? ''; const candidates = parts.length === 1 ? Object.keys(registry) : parts[0] === 'theme' && parts.length === 2 ? [...themes] : parts[0] === 'play' || parts[0] === 'games' && parts[1] === 'info' ? games.map(g => g.id) : parts[0] === 'games' && parts.length === 2 ? ['search', 'info', 'category'] : []; return candidates.filter(c => c.startsWith(last)).map(c => [...parts.slice(0, -1), c].join(' ')); }
