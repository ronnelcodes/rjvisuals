import {db,json,parse,verifyPassword} from './_shared.mjs';
// Temporary, signed links. Password checked on the server; no client-facing DB secrets.
export async function handler(event) {
 if(event.httpMethod!=='POST') return json(405,{error:'Use POST'});
 try {
  const {slug,password}=parse(event);
  if(typeof slug!=='string'||!/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug)) return json(403,{error:'Invalid gallery credentials'});
  const supabase=db();
  const {data:g,error}=await supabase.from('client_galleries').select('*').eq('slug',slug).maybeSingle();
  if(error) throw error;
  if(!g||!verifyPassword(password,g.password_salt,g.password_hash)) return json(403,{error:'Invalid gallery credentials'});
  if(new Date(g.expires_at)<=new Date()) return json(410,{error:'This gallery has expired. Contact RJ Visuals to request access.'});
  const {data:photos,error:pError}=await supabase.from('client_photos').select('id,filename,preview_path,original_path').eq('gallery_id',g.id).order('created_at');
  if(pError) throw pError;
  const result=await Promise.all(photos.map(async p=>{
    const {data:preview,error:pe}=await supabase.storage.from('client-previews').createSignedUrl(p.preview_path,300);if(pe) throw pe;
    let downloadUrl=null;
    if(g.downloads_enabled){const {data:original,error:oe}=await supabase.storage.from('client-originals').createSignedUrl(p.original_path,300,{download:p.filename});if(oe) throw oe;downloadUrl=original.signedUrl}
    return {id:p.id,filename:p.filename,previewUrl:preview.signedUrl,downloadUrl};
  }));
  return json(200,{title:g.title,clientName:g.client_name,expiresAt:g.expires_at,downloadsEnabled:g.downloads_enabled,releaseEnabled:g.release_enabled,printStoreUrl:g.print_store_url||null,photos:result});
 }catch(err){console.error('client-gallery',err);return json(400,{error:'Unable to open gallery'})}
}
