const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${base}/api${path}`, { method, credentials: 'include', headers: { 'X-LibreSociety-Request': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({})) as T & {error?:string};
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
