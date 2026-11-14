import { derivePassword, hash, randomToken } from './security';
export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
  IP_HASH_SECRET: string;
  RESEND_API_KEY: string;
  SIGNUP_NOTICE_TO: string;
  SIGNUP_NOTICE_FROM: string;
}

const bodyJson = async (request: Request): Promise<Record<string, unknown> | null> => {
  try { const value: unknown = await request.json(); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { return null; }
};
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
function sessionToken(request: Request) {
  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (bearer) return bearer;
  return (request.headers.get('Cookie') || '').match(/(?:^|;\s*)ls_session=([^;]+)/)?.[1] || '';
}
function sessionCookie(request: Request, token: string, clear = false) {
  const secure = new URL(request.url).protocol === 'https:';
  return `ls_session=${clear ? '' : token}; Path=/api; HttpOnly; SameSite=${secure ? 'None' : 'Lax'}${secure ? '; Secure; Partitioned' : ''}; Max-Age=${clear ? 0 : SESSION_SECONDS}`;
}
async function clientIpHash(request: Request, secret: string) {
  const ip = request.headers.get('CF-Connecting-IP')?.trim();
  if (!ip || !secret) return null;
  let normalizedIp: string;
  try { normalizedIp = new URL(`http://${ip.includes(':') ? `[${ip}]` : ip}`).hostname.replace(/^\[|\]$/g,'').toLowerCase(); }
  catch { return null; }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(normalizedIp)));
  return btoa(String.fromCharCode(...digest)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
async function currentUser(request: Request, env: Env) {
  const token = sessionToken(request);
  if (!token) return null;
  return (await env.DB.prepare('SELECT users.id, users.username, users.is_admin FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?').bind(await hash(token), Date.now()).first<{id:string;username:string;is_admin:number}>()) || null;
}
async function api(request: Request, env: Env, url: URL, origin: string): Promise<Response | null> {
  if (url.pathname === '/api/signup-requests' && request.method === 'POST') {
    const input=await bodyJson(request); const username=clean(input?.username,20); const password=typeof input?.password==='string'?input.password:'';
    if(!/^[A-Za-z0-9_]{3,20}$/.test(username)||password.length<12||password.length>128)return json({error:'Use a username of 3 to 20 letters, digits, or underscores, and a password of at least 12 characters.'},400,origin);
    if(!env.RESEND_API_KEY||!env.SIGNUP_NOTICE_TO)return json({error:'Signup notifications are not configured yet. Please try again later.'},503,origin);
    const ipHash=await clientIpHash(request,env.IP_HASH_SECRET);
    if(!ipHash)return json({error:'Signup is temporarily unavailable because IP verification is not configured.'},503,origin);
    if(await env.DB.prepare("SELECT id FROM users WHERE ip_hash=? UNION SELECT id FROM signup_requests WHERE ip_hash=? AND status='pending'").bind(ipHash,ipHash).first())return json({error:'Only one account can be requested or used from each IP address.'},409,origin);
    if(await env.DB.prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE UNION SELECT id FROM signup_requests WHERE username=? COLLATE NOCASE AND status='pending'").bind(username,username).first())return json({error:'That username is already in use or awaiting review.'},409,origin);
    const id=crypto.randomUUID(),salt=randomToken(16),passwordHash=await derivePassword(password,salt);
    try { await env.DB.prepare('INSERT INTO signup_requests(id,username,password_salt,password_hash,ip_hash) VALUES(?,?,?,?,?)').bind(id,username,salt,passwordHash,ipHash).run(); }
    catch { return json({error:'Only one account can be requested or used from each IP address.'},409,origin); }
    try {
      const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:'LibreSociety <onboarding@resend.dev>',to:env.SIGNUP_NOTICE_TO,subject:'LibreSociety signup request',text:`A new signup request needs your review.\n\nUsername: ${username}\nSubmitted: ${new Date().toISOString()}\n\nReview it in the LibreSociety admin panel: https://libresociety.github.io/libre/#admin\n\nSign in with an administrator account, then type admin in the terminal. No password or password hash is included in this email.`})});
      if(!sent.ok){console.error('Signup notification delivery failed',sent.status,(await sent.text()).slice(0,300));throw new Error('Email provider rejected the request.');}
    }
    catch { await env.DB.prepare('DELETE FROM signup_requests WHERE id=?').bind(id).run(); return json({error:'We could not send the review request. Please try again later.'},503,origin); }
    return json({ok:true,message:'Request sent for manual review. You can sign in after it is approved.'},202,origin);
  }
  if (url.pathname === '/api/register' && request.method === 'POST') {
    return json({error:'Direct registration is disabled. Submit a request for manual review.'},410,origin);
  }
  if (url.pathname === '/api/login' && request.method === 'POST') {
    const input=await bodyJson(request); const username=clean(input?.username,20); const password=typeof input?.password==='string'?input.password:'';
    const user=await env.DB.prepare('SELECT id, username, password_salt, password_hash, is_admin, ip_hash FROM users WHERE username = ? COLLATE NOCASE').bind(username).first<{id:string;username:string;password_salt:string;password_hash:string;is_admin:number;ip_hash:string|null}>();
    if (!user || !password || await derivePassword(password,user.password_salt)!==user.password_hash) return json({error:'Invalid username or password.'},401,origin);
    if(!user.ip_hash){const ipHash=await clientIpHash(request,env.IP_HASH_SECRET);if(ipHash)try{await env.DB.prepare('UPDATE users SET ip_hash=? WHERE id=? AND ip_hash IS NULL').bind(ipHash,user.id).run();}catch{/* Existing accounts may share an address before IP enforcement. */}}
    const token=randomToken(); await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hash(token),user.id,Date.now()+SESSION_SECONDS*1000).run();
    return json({user:{id:user.id,username:user.username,isAdmin:Boolean(user.is_admin)}},200,origin,undefined,{'Set-Cookie':sessionCookie(request,token)});
  }
  if (url.pathname === '/api/logout' && request.method === 'POST') { const token=sessionToken(request); if(token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token)).run(); return json({ok:true},200,origin,undefined,{'Set-Cookie':sessionCookie(request,'',true)}); }
  const user = await currentUser(request,env);
  if (url.pathname === '/api/me' && request.method === 'GET') return user ? json({user:{id:user.id,username:user.username,isAdmin:Boolean(user.is_admin)}},200,origin) : json({error:'Sign in required.'},401,origin);
  if (url.pathname === '/api/admin/signup-requests' && request.method === 'GET') {
    if(!user)return json({error:'Sign in required.'},401,origin);
    if(!user.is_admin)return json({error:'Administrator access required.'},403,origin);
    const requests=await env.DB.prepare("SELECT id,username,submitted_at FROM signup_requests WHERE status='pending' ORDER BY submitted_at ASC LIMIT 100").all<{id:string;username:string;submitted_at:string}>();
    return json(requests.results,200,origin);
  }
  const signupDecision=url.pathname.match(/^\/api\/admin\/signup-requests\/([a-f0-9-]{36})\/decision$/i);
  if(signupDecision&&request.method==='POST'){
    if(!user)return json({error:'Sign in required.'},401,origin);
    if(!user.is_admin)return json({error:'Administrator access required.'},403,origin);
    const input=await bodyJson(request),decision=input?.decision;
    if(decision!=='approve'&&decision!=='deny')return json({error:'Decision must be approve or deny.'},400,origin);
    const requestId=signupDecision[1];
    if(decision==='deny'){
      const result=await env.DB.prepare("UPDATE signup_requests SET status='rejected',decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by=? WHERE id=? AND status='pending'").bind(user.id,requestId).run();
      return result.meta.changes?json({ok:true,status:'rejected'},200,origin):json({error:'Pending request not found.'},404,origin);
    }
    const pending=await env.DB.prepare("SELECT username FROM signup_requests WHERE id=? AND status='pending'").bind(requestId).first<{username:string}>();
    if(!pending)return json({error:'Pending request not found.'},404,origin);
    const results=await env.DB.batch([
      env.DB.prepare("INSERT INTO users(id,username,password_salt,password_hash,ip_hash) SELECT r.id,r.username,r.password_salt,r.password_hash,r.ip_hash FROM signup_requests AS r WHERE r.id=? AND r.status='pending' AND NOT EXISTS (SELECT 1 FROM users AS existing WHERE existing.username=r.username COLLATE NOCASE OR existing.ip_hash=r.ip_hash)").bind(requestId),
      env.DB.prepare("UPDATE signup_requests SET status='approved',decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by=? WHERE id=? AND status='pending' AND EXISTS (SELECT 1 FROM users WHERE id=?)").bind(user.id,requestId,requestId),
    ]);
    if(!results[0].meta.changes)return json({error:'That username or IP address is already associated with an account. The request remains pending.'},409,origin);
    return json({ok:true,status:'approved'},200,origin);
  }
  if (url.pathname === '/api/profile' && request.method === 'PATCH') {
    if(!user) return json({error:'Sign in required.'},401,origin); const input=await bodyJson(request); const bio=clean(input?.bio,240);
    await env.DB.prepare('UPDATE users SET bio=? WHERE id=?').bind(bio,user.id).run(); return json({user:{...user,bio}},200,origin);
  }
  if (url.pathname === '/api/account' && request.method === 'DELETE') { if(!user) return json({error:'Sign in required.'},401,origin); await env.DB.prepare('DELETE FROM users WHERE id=?').bind(user.id).run(); return json({ok:true},200,origin); }
  const fav = url.pathname.match(/^\/api\/favorites\/([a-z0-9_-]{1,60})$/i);
  if(fav && (request.method==='PUT'||request.method==='DELETE')) { if(!user) return json({error:'Sign in required.'},401,origin); if(request.method==='PUT') await env.DB.prepare('INSERT OR IGNORE INTO favorites(user_id,game_id) SELECT ?,id FROM games WHERE id=?').bind(user.id,fav[1]).run(); else await env.DB.prepare('DELETE FROM favorites WHERE user_id=? AND game_id=?').bind(user.id,fav[1]).run(); return json({ok:true},200,origin); }
  if(url.pathname==='/api/favorites'&&request.method==='GET') { if(!user) return json({error:'Sign in required.'},401,origin); const rows=await env.DB.prepare('SELECT games.id, title, category, description, tags, url, credit FROM favorites JOIN games ON games.id=favorites.game_id WHERE user_id=? ORDER BY title COLLATE NOCASE').bind(user.id).all<GameRow>(); return json(rows.results.map(mapGame),200,origin); }
  if(url.pathname==='/api/submissions'&&request.method==='POST') { if(!user) return json({error:'Sign in required.'},401,origin); const input=await bodyJson(request); const title=clean(input?.title,120), category=clean(input?.category,40), description=clean(input?.description,1000), link=clean(input?.url,500), credit=clean(input?.credit,160); try { if(!title||!category||!description||!credit||new URL(link).protocol!=='https:') throw new Error(); } catch { return json({error:'Provide a title, category, description, creator credit, and HTTPS URL.'},400,origin); } const recent=await env.DB.prepare("SELECT COUNT(*) AS count FROM submissions WHERE user_id=? AND created_at > datetime('now','-1 day')").bind(user.id).first<{count:number}>(); if((recent?.count||0)>=5)return json({error:'Submission limit reached (5 per day).'},429,origin); const id=crypto.randomUUID(); await env.DB.prepare('INSERT INTO submissions(id,user_id,title,category,description,url,credit) VALUES(?,?,?,?,?,?,?)').bind(id,user.id,title,category,description,link,credit).run(); return json({id,status:'pending'},201,origin); }
  if(url.pathname==='/api/chat/messages'&&request.method==='GET') { const channel=clean(url.searchParams.get('channel')||'general',32); const after=Math.max(0,Number(url.searchParams.get('after'))||0); const rows=await env.DB.prepare('SELECT chat_messages.id, users.username, channel, body, created_at FROM chat_messages JOIN users ON users.id=chat_messages.user_id WHERE channel=? AND id>? ORDER BY id DESC LIMIT 50').bind(channel,after).all(); return json(rows.results.reverse(),200,origin); }
  if(url.pathname==='/api/chat/messages'&&request.method==='POST') { if(!user)return json({error:'Sign in required.'},401,origin); const input=await bodyJson(request); const channel=clean(input?.channel,32).toLowerCase()||'general', body=clean(input?.body,500); if(!/^[a-z0-9-]{1,32}$/.test(channel)||!body)return json({error:'Message (up to 500 characters) and valid channel required.'},400,origin); const recent=await env.DB.prepare("SELECT COUNT(*) AS count FROM chat_messages WHERE user_id=? AND created_at > datetime('now','-1 minute')").bind(user.id).first<{count:number}>(); if((recent?.count||0)>=8)return json({error:'Slow down; chat is limited to 8 messages per minute.'},429,origin); const result=await env.DB.prepare('INSERT INTO chat_messages(user_id,channel,body) VALUES(?,?,?)').bind(user.id,channel,body).run(); return json({id:result.meta.last_row_id},201,origin); }
  if(url.pathname==='/api/chat/report'&&request.method==='POST') { if(!user)return json({error:'Sign in required.'},401,origin); const input=await bodyJson(request); const messageId=Number(input?.messageId), reason=clean(input?.reason,200)||'No reason provided'; if(!Number.isSafeInteger(messageId)||messageId<=0)return json({error:'Invalid message id.'},400,origin); await env.DB.prepare('INSERT OR IGNORE INTO chat_reports(id,reporter_id,message_id,reason) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.id,messageId,reason).run(); return json({ok:true},201,origin); }
  if(url.pathname==='/api/admin/submissions'&&request.method==='GET') { if(!user)return json({error:'Sign in required.'},401,origin); const admin=await env.DB.prepare('SELECT is_admin FROM users WHERE id=?').bind(user.id).first<{is_admin:number}>(); if(!admin?.is_admin)return json({error:'Administrator access required.'},403,origin); const rows=await env.DB.prepare("SELECT id,title,category,description,url,credit,status,created_at FROM submissions WHERE status='pending' ORDER BY created_at").all(); return json(rows.results,200,origin); }
  const review=url.pathname.match(/^\/api\/admin\/submissions\/([a-f0-9-]+)$/i); if(review&&request.method==='PATCH') { if(!user)return json({error:'Sign in required.'},401,origin); const admin=await env.DB.prepare('SELECT is_admin FROM users WHERE id=?').bind(user.id).first<{is_admin:number}>(); if(!admin?.is_admin)return json({error:'Administrator access required.'},403,origin); const input=await bodyJson(request), status=input?.status; if(status!=='approved'&&status!=='rejected')return json({error:'Status must be approved or rejected.'},400,origin); if(status==='approved') await env.DB.prepare("INSERT OR IGNORE INTO games(id,title,category,description,tags,url,credit) SELECT lower(hex(randomblob(6))),title,category,description,'[]',url,credit FROM submissions WHERE id=? AND status='pending'").bind(review[1]).run(); await env.DB.prepare('UPDATE submissions SET status=? WHERE id=? AND status=\'pending\'').bind(status,review[1]).run(); return json({ok:true},200,origin); }
  return null;
}

interface GameRow {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string;
  url: string;
  credit: string;
}

const headers = (origin: string, cacheControl = 'no-store') => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Credentials': 'true',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-LibreSociety-Request',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': cacheControl,
});

function json(data: unknown, status: number, origin: string, cacheControl?: string, extraHeaders?: Record<string,string>): Response {
  return new Response(JSON.stringify(data), { status, headers: {...headers(origin, cacheControl), ...extraHeaders} });
}

function mapGame(row: GameRow) {
  return { ...row, tags: JSON.parse(row.tags) as string[] };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowedOrigins = [env.ALLOWED_ORIGIN || 'https://libresociety.github.io','http://localhost:5173','http://127.0.0.1:5173'];
    const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : (env.ALLOWED_ORIGIN || 'https://libresociety.github.io');
    if (origin && !allowedOrigins.includes(origin)) {
      return json({ error: 'Origin not allowed' }, 403, allowedOrigin);
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(allowedOrigin) });
    const url = new URL(request.url);
    try { const response = await api(request, env, url, allowedOrigin); if(response) return response; }
    catch (error) { console.error('API request failed', error instanceof Error ? error.message : 'Unknown error'); return json({error:'Request could not be completed.'},500,allowedOrigin); }
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, allowedOrigin);
    if (url.pathname === '/api/health') return json({ ok: true }, 200, allowedOrigin);
    if (url.pathname !== '/api/games') return json({ error: 'Not found' }, 404, allowedOrigin);

    const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const category = (url.searchParams.get('category') || '').trim().toLowerCase().slice(0, 40);
    if (query.length > 0) {
      const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
      const results = await env.DB.prepare(
        `SELECT id, title, category, description, tags, url, credit FROM games
         WHERE title LIKE ? ESCAPE '\\' COLLATE NOCASE
            OR description LIKE ? ESCAPE '\\' COLLATE NOCASE
            OR category LIKE ? ESCAPE '\\' COLLATE NOCASE
            OR tags LIKE ? ESCAPE '\\' COLLATE NOCASE
         ORDER BY title COLLATE NOCASE LIMIT 100`,
      ).bind(pattern, pattern, pattern, pattern).all<GameRow>();
      return json(results.results.map(mapGame), 200, allowedOrigin, 'public, max-age=60, stale-while-revalidate=300');
    }
    if (category) {
      const results = await env.DB.prepare(
        'SELECT id, title, category, description, tags, url, credit FROM games WHERE category = ? COLLATE NOCASE ORDER BY title COLLATE NOCASE LIMIT 100',
      ).bind(category).all<GameRow>();
      return json(results.results.map(mapGame), 200, allowedOrigin, 'public, max-age=60, stale-while-revalidate=300');
    }
    const results = await env.DB.prepare(
      'SELECT id, title, category, description, tags, url, credit FROM games ORDER BY title COLLATE NOCASE LIMIT 100',
    ).all<GameRow>();
    return json(results.results.map(mapGame), 200, allowedOrigin, 'public, max-age=60, stale-while-revalidate=300');
  },
} satisfies ExportedHandler<Env>;
