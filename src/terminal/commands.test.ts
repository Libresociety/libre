import { describe, expect, it } from 'vitest';
import { complete, execute, tokenize } from './commands';
import { games } from '../catalog';
describe('terminal parser', () => {
  it('supports quoted multiword arguments and extra whitespace', () => { expect(tokenize(' games search "single player" ')).toEqual(['games','search','single player']); });
  it('reports malformed quotes without throwing', () => { expect(execute('games search "open').lines[0]).toContain('Unclosed quote'); });
  it('suggests a close command and handles blank input', () => { expect(execute('hlep').lines.join(' ')).toContain('help'); expect(execute('  ').lines).toEqual([]); });
  it('searches tags and filters categories case insensitively', () => { expect(execute('games search KEYBOARD').games?.length).toBeGreaterThan(0); expect(execute('games category puzzle').games?.every(g => g.category === 'puzzle')).toBe(true); expect(execute('games search nonexistent').games).toEqual([]); });
  it('provides information, handles missing IDs and launches only catalog entries', () => { expect(execute('games info 2048').lines.join(' ')).toContain('Gabriele'); expect(execute('play 2048').launch?.url).toBe('https://play2048.co/'); expect(execute('play javascript:alert(1)').launch).toBeUndefined(); expect(execute('games info').lines[0]).toContain('Usage'); });
  it('returns distinct clear and theme actions', () => { expect(execute('clear').clear).toBe(true); expect(execute('theme amber').theme).toBe('amber'); expect(execute('theme bad').theme).toBeUndefined(); });
  it('completes commands and contextual arguments', () => { expect(complete('gam')).toEqual(['games']); expect(complete('games in')).toEqual(['games info']); expect(complete('play 20')).toEqual(['play 2048']); expect(complete('theme a')).toEqual(['theme amber']); });
  it('keeps catalog sorted and links HTTPS-only with unique IDs', () => { expect(games.map(g => g.title)).toEqual(games.map(g => g.title).sort((a,b) => a.localeCompare(b))); expect(new Set(games.map(g => g.id)).size).toBe(games.length); expect(games.every(g => new URL(g.url).protocol === 'https:')).toBe(true); });
  it('renders untrusted input as data and exposes session history', () => { expect(execute('<script>').lines[0]).toContain('<script>'); expect(execute('history', {history:['games']}).lines[0]).toContain('games'); });
});
