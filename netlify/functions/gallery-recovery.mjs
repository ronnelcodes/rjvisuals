import { randomBytes, createHash } from 'node:crypto';
import { db, json, parse, hashPassword } from './_shared.mjs';
const digest = s => createHash('sha256').update(s).digest('hex');
const slugOk = s => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{2,79}$/.test(s);
const generic = () => json(200,{message:'If a matching active gallery exists, a recovery email will be sent.'});
// Requires RESEND_API_KEY, RECOVERY_FROM_EMAIL, SITE_URL (HTTPS).
export async function handler(event) {
 if(event.httpMethod!=='POST')return json(405,{error:'Use POST'});
 try {
  const body=parse(event);if(!slugOk(body.slug))return json(400,{error:'Invalid gallery code'});
  const supabase=db();
  if(body.op==='request'){
   const email=String(body.email||'').trim().toLowerCase();if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return generic();
   const {data:g,error}=await supabase.from('client_galleries').select('id,slug,client_email,expires_at').eq('slug',body.slug).maybeSingle();
   if(error)throw error;
   if(!g || !g.client_email || g.client_email.toLowerCase()!==email || new Date(g.expires_at)<=new Date())return generic();
   // Gallery-specific throttle: max three emails in 60 minutes.
   const since=new Date(Date.now()-3600000).toISOString();
   const {count,error:countError}=await supabase.from('gallery_reset_tokens').select('id',{head:true,count:'exact'}).eq('gallery_id',g.id).gte('created_at',since);
   if(countError)throw countError;
   if(count>=3)return generic();
   if(!process.env.RESEND_API_KEY || !process.env.RECOVERY_FROM_EMAIL || !process.env.SITE_URL)throw Error('Recovery email service not configured');
   const site=new URL(process.env.SITE_URL);if(site.protocol!=='https:')throw Error('SITE_URL must use HTTPS');
   const token=randomBytes(32).toString('base64url');
   const expires_at=new Date(Date.now()+30*60000).toISOString();
   const {data:record,error:insertError}=await supabase.from('gallery_reset_tokens').insert({gallery_id:g.id,token_hash:digest(token),expires_at}).select('id').single();
   if(insertError)throw insertError;
   const link=new URL('/gallery.html',site);link.searchParams.set('g',g.slug);link.searchParams.set('reset',token);
   const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RECOVERY_FROM_EMAIL,to:[email],subject:'Reset your RJ Visuals gallery password',text:`A password reset was requested for your private RJ Visuals gallery.\n\nUse this link within 30 minutes:\n${link.href}\n\nIf you did not request this, you can ignore this email. Your password has not changed.`})});
   if(!sent.ok){await supabase.from('gallery_reset_tokens').delete().eq('id',record.id);console.error('Resend error',sent.status);return json(503,{error:'Email service temporarily unavailable. Contact RJ Visuals.'})}
   return generic();
  }
  if(body.op==='reset'){
   if(typeof body.token!=='string'||! /^[A-Za-z0-9_-]{40,80}$/.test(body.token))return json(400,{error:'Invalid reset link'});
   const pw=hashPassword(body.password);
   const {data:g,error:gErr}=await supabase.from('client_galleries').select('id,expires_at').eq('slug',body.slug).maybeSingle();
   if(gErr)throw gErr;
   if(!g || new Date(g.expires_at)<=new Date())return json(410,{error:'Gallery expired. Contact RJ Visuals.'});
   // Conditional consume prevents reuse of the same token in a concurrent request.
   const {data:used,error:uErr}=await supabase.from('gallery_reset_tokens').update({used_at:new Date().toISOString()}).eq('gallery_id',g.id).eq('token_hash',digest(body.token)).is('used_at',null).gt('expires_at',new Date().toISOString()).select('id').maybeSingle();
   if(uErr)throw uErr;
   if(!used)return json(400,{error:'Reset link invalid or expired. Request another link.'});
   const {error:updateError}=await supabase.from('client_galleries').update({password_hash:pw.hash,password_salt:pw.salt}).eq('id',g.id);
   if(updateError)throw updateError;
   await supabase.from('gallery_reset_tokens').delete().eq('gallery_id',g.id);
   return json(200,{message:'Gallery password updated'});
  }
  return json(400,{error:'Unknown operation'});
 }catch(error){console.error('gallery-recovery:',error);return json(500,{error:'Unable to complete recovery request'})}
}
