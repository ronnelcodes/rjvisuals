import { createClient } from '@supabase/supabase-js';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
const env = process.env;
export const db = () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Server Supabase configuration is missing');
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false,autoRefreshToken:false} });
};
export const json = (statusCode, value) => ({statusCode,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'none'},body:JSON.stringify(value)});
export const parse = event => {if (!event.body || event.body.length > 120000) throw new Error('Invalid request body'); return JSON.parse(event.body)};
export const hashPassword = (password, salt = randomBytes(16).toString('hex')) => {
 if (typeof password !== 'string' || password.length < 10 || password.length > 256) throw new Error('Password must contain 10–256 characters');
 return {salt, hash:scryptSync(password,salt,64).toString('hex')};
};
export const verifyPassword = (password,salt,hex) => {
 if (typeof password !== 'string' || password.length > 256) return false;
 try { const a=scryptSync(password,salt,64); const b=Buffer.from(hex,'hex'); return a.length===b.length && timingSafeEqual(a,b); } catch {return false}
};
export async function checkAdmin(event, supabase) {
 const bearer=event.headers.authorization || event.headers.Authorization || '';
 if (!bearer.startsWith('Bearer ')) return null;
 const {data:{user},error}=await supabase.auth.getUser(bearer.slice(7));
 if(error || !user) return null;
 const {data:admin,error:lookupErr}=await supabase.from('studio_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 return lookupErr || !admin ? null : user;
}
export function safeFile(name) {return String(name).replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100) || 'photo.jpg'}
