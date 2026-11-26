import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {studioLabs} from './_studio-labs.mjs';
import {db,json,parse,checkAdmin,hashPassword,safeFile} from './_shared.mjs';
const fail = (message) => {throw new Error(message)};
const required = (s,max=160) => typeof s==='string' && s.trim().length>0 && s.trim().length<=max;
const idOk = x => typeof x==='string' && /^[a-f0-9-]{36}$/i.test(x);
const galleryFields = 'id,slug,title,client_name,client_email,print_store_url,expires_at,downloads_enabled,release_enabled,created_at';
const photoFields = 'id,gallery_id,preview_path,original_path,filename,created_at';
export async function handler(event) {
 if(event.httpMethod!=='POST') return json(405,{error:'Use POST'});
 try {
 const supabase=db(), user=await checkAdmin(event,supabase);
 if(!user) return json(403,{error:'Studio admin access required'});
 const body=parse(event), op=body.op;
 if(op==='studioLabs') return json(200,studioLabs);
 const query = async p => { const {data,error}=await p; if(error) throw error; return data };
 const galleryExists=async id => {if(!idOk(id)) fail('Invalid gallery'); const a=await query(supabase.from('client_galleries').select('id,slug').eq('id',id).maybeSingle()); if(!a) fail('Gallery not found');return a};
 if(op==='list') {const galleries=await query(supabase.from('client_galleries').select(galleryFields).order('created_at',{ascending:false}));return json(200,{galleries})}
 if(op==='create') {
  const {clientName,clientEmail,title,slug,password,expiresAt,permissions}=body;
  if(!required(clientName,120)||!required(title,150)||!/^\S+@\S+\.\S+$/.test(clientEmail||'')||!/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug||'')) fail('Invalid gallery details');
  const expiry=new Date(expiresAt);if(!Number.isFinite(expiry.getTime()) || expiry<=new Date()) fail('Expiration must be in future');
  const pw=hashPassword(password);
  const gallery=await query(supabase.from('client_galleries').insert({client_name:clientName.trim(),client_email:clientEmail.trim().toLowerCase(),title:title.trim(),slug,password_hash:pw.hash,password_salt:pw.salt,expires_at:expiry.toISOString(),downloads_enabled:permissions==='download'||permissions==='release',release_enabled:permissions==='release'}).select(galleryFields).single());
  return json(200,{gallery});
 }
 if(op==='update') {
  await galleryExists(body.id);
  if(!required(body.title,150)||!required(body.clientName,120)||!/^\S+@\S+\.\S+$/.test(body.clientEmail||'')) fail('Invalid gallery details');
  const expiry=new Date(body.expiresAt);if(!Number.isFinite(expiry.getTime())) fail('Invalid expiration');
  const updates={title:body.title.trim(),client_name:body.clientName.trim(),client_email:body.clientEmail.trim().toLowerCase(),print_store_url:body.printStoreUrl||null,expires_at:expiry.toISOString(),downloads_enabled:['download','release'].includes(body.permissions),release_enabled:body.permissions==='release'};
  if(updates.print_store_url){try{const link=new URL(updates.print_store_url);if(link.protocol!=='https:')fail('Print store URL must use HTTPS')}catch{fail('Invalid print store URL')}}
  if(body.password) {const pw=hashPassword(body.password);updates.password_hash=pw.hash;updates.password_salt=pw.salt}
  const gallery=await query(supabase.from('client_galleries').update(updates).eq('id',body.id).select(galleryFields).single());
  return json(200,{gallery});
 }
 if(op==='photos') {
  await galleryExists(body.id);
  const photos=await query(supabase.from('client_photos').select(photoFields).eq('gallery_id',body.id).order('created_at'));
  const enriched=await Promise.all(photos.map(async item=>{const {data}=await supabase.storage.from('client-previews').createSignedUrl(item.preview_path,600);return {...item,preview_url:data?.signedUrl||''}}));
  return json(200,{photos:enriched});
 }
 if(op==='presign') {
  await galleryExists(body.id);
  if(!required(body.filename,120)||!['image/jpeg','image/png','image/webp'].includes(body.mimeType)||!Number.isSafeInteger(body.size)||body.size<1||body.size>50*1024*1024) fail('Unsupported file');
  const path=`${body.id}/${randomUUID()}-${safeFile(body.filename)}`;
  const {data,error}=await supabase.storage.from('client-originals').createSignedUploadUrl(path);
  if(error) throw error;
  return json(200,{path,token:data.token});
 }
 if(op==='finalize') {
  await galleryExists(body.id);
  if(typeof body.path!=='string'||!body.path.startsWith(body.id+'/')||body.path.includes('..')) fail('Invalid path');
  const exists=await query(supabase.from('client_photos').select('id').eq('original_path',body.path).maybeSingle());
  if(exists) fail('Photo already finalized');
  const {data:blob,error:err}=await supabase.storage.from('client-originals').download(body.path);if(err) throw err;
  const input=Buffer.from(await blob.arrayBuffer());if(input.length>50*1024*1024) fail('File too large');
  const details=await sharp(input).metadata();if(!['jpeg','png','webp'].includes(details.format)) fail('Not a supported image');
  const previewPath=`${body.id}/${randomUUID()}.jpg`;
  const sized=await sharp(input).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).toBuffer();
  const {width:w,height:h}=await sharp(sized).metadata();
  const size=Math.max(16,Math.round(w*.09));
  const mark=Buffer.from(`<svg width="${w}" height="${h}"><g transform="rotate(-22 ${w/2} ${h/2})"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-weight="900" font-size="${size}" letter-spacing="${size*.08}" fill="#ffffff" fill-opacity="0.42">RJ VISUALS</text></g></svg>`);
  const preview=await sharp(sized).composite([{input:mark}]).jpeg({quality:77,mozjpeg:true}).toBuffer();
  const {error:upErr}=await supabase.storage.from('client-previews').upload(previewPath,preview,{contentType:'image/jpeg',upsert:false});if(upErr) throw upErr;
  const photo=await query(supabase.from('client_photos').insert({gallery_id:body.id,original_path:body.path,preview_path:previewPath,filename:safeFile(body.filename)}).select(photoFields).single());
  return json(200,{photo});
 }
 if(op==='deletePhotos') {
  await galleryExists(body.id);
  if(!Array.isArray(body.photoIds)||body.photoIds.length===0||body.photoIds.length>100||body.photoIds.some(x=>!idOk(x))) fail('Select up to 100 photos');
  const photos=await query(supabase.from('client_photos').select(photoFields).eq('gallery_id',body.id).in('id',body.photoIds));
  if(!photos.length) return json(200,{deleted:0});
  const {error:a}=await supabase.storage.from('client-originals').remove(photos.map(p=>p.original_path));if(a) throw a;
  const {error:b}=await supabase.storage.from('client-previews').remove(photos.map(p=>p.preview_path));if(b) throw b;
  await query(supabase.from('client_photos').delete().eq('gallery_id',body.id).in('id',photos.map(p=>p.id)));
  return json(200,{deleted:photos.length});
 }
 if(op==='deleteGallery') {
  await galleryExists(body.id);
  const photos=await query(supabase.from('client_photos').select(photoFields).eq('gallery_id',body.id));
  for(let i=0;i<photos.length;i+=100){const chunk=photos.slice(i,i+100);let r=await supabase.storage.from('client-originals').remove(chunk.map(x=>x.original_path));if(r.error) throw r.error;r=await supabase.storage.from('client-previews').remove(chunk.map(x=>x.preview_path));if(r.error) throw r.error}
  await query(supabase.from('client_galleries').delete().eq('id',body.id));return json(200,{deleted:true});
 }
 return json(400,{error:'Unknown operation'});
 }catch(err){console.error('admin-gallery',err);return json(400,{error:err.message||'Request failed'})}
}
