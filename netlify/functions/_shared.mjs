import { scryptSync, timingSafeEqual } from 'node:crypto';

export const json = (statusCode, body) => ({ statusCode, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }, body: JSON.stringify(body) });
export const env = () => ({ url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY, adminEmail: process.env.ADMIN_EMAIL?.toLowerCase() });
export function requireEnv(){ const e=env(); if(!e.url||!e.anon||!e.service||!e.adminEmail) throw new Error('Server configuration is incomplete'); return e; }
export async function supabase(path, options={}) { const e=requireEnv(); const r=await fetch(`${e.url}${path}`,{...options,headers:{apikey:e.service,authorization:`Bearer ${e.service}`,'content-type':'application/json',...(options.headers||{})}});const text=await r.text();const data=text?JSON.parse(text):null;if(!r.ok)throw new Error(data?.message||data?.error||'Database request failed');return data; }
export async function requireAdmin(event){ const e=requireEnv();const token=(event.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)throw new Error('Unauthorized');const r=await fetch(`${e.url}/auth/v1/user`,{headers:{apikey:e.anon,authorization:`Bearer ${token}`}});const user=await r.json();if(!r.ok||user.email?.toLowerCase()!==e.adminEmail)throw new Error('Unauthorized');return user; }
export function hashPassword(password,salt){return scryptSync(password,salt,64).toString('hex');}
export function verifyPassword(password,salt,hash){const actual=Buffer.from(hashPassword(password,salt),'hex');const expected=Buffer.from(hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}

