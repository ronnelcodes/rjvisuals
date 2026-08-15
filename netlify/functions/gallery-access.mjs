import { json, supabase, verifyPassword } from './_shared.mjs';
export const handler = async event => {
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  try{
    const {slug,password}=JSON.parse(event.body||'{}');if(!slug||!password)return json(400,{error:'Gallery name and password are required.'});
    const galleries=await supabase(`/rest/v1/galleries?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,title,password_hash,password_salt&limit=1`);
    const gallery=galleries[0];if(!gallery||!verifyPassword(password,gallery.password_salt,gallery.password_hash))return json(401,{error:'That gallery name or password is not correct.'});
    const photos=await supabase(`/rest/v1/gallery_photos?gallery_id=eq.${gallery.id}&select=filename,storage_path,sort_order&order=sort_order.asc,created_at.asc`);
    const signed=await Promise.all(photos.map(async p=>{const s=await supabase(`/storage/v1/object/sign/private-galleries/${p.storage_path}`,{method:'POST',body:JSON.stringify({expiresIn:3600})});return{filename:p.filename,url:s.signedURL.startsWith('http')?s.signedURL:`${process.env.SUPABASE_URL}${s.signedURL}`};}));
    return json(200,{title:gallery.title,photos:signed,expiresIn:3600});
  }catch(error){console.error(error);return json(500,{error:'The gallery could not be opened. Please try again.'});}
};

