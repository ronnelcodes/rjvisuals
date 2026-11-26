'use strict';
const $=s=>document.querySelector(s);
const msg=(message,error=false)=>{$('#notice').textContent=message;$('#notice').style.color=error?'#a12332':'#563A54'};
const slug=new URLSearchParams(location.search).get('g');if(slug){$('#slug').value=slug;$('#recoverySlug').value=slug;}
let current=null;
$('#unlockForm').addEventListener('submit',async e=>{
 e.preventDefault();const form=new FormData(e.currentTarget),button=$('#unlockBtn');button.disabled=true;msg('Checking your gallery…');
 try{
  const response=await fetch('/api/client-gallery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:form.get('slug'),password:form.get('password')})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Gallery access failed');current=result;
  $('#galleryTitle').textContent=result.title;
  $('#galleryMeta').textContent=`${result.clientName} · Available until ${new Date(result.expiresAt).toLocaleString()} · ${result.photos.length} photograph(s)`;
  const photos=$('#galleryPhotos');photos.replaceChildren();
  for(const p of result.photos){const fig=document.createElement('figure');fig.className='gallery-tile';const img=document.createElement('img');img.src=p.previewUrl;img.alt=p.filename;img.loading='lazy';img.addEventListener('contextmenu',ev=>ev.preventDefault());img.draggable=false;img.addEventListener('dragstart',ev=>ev.preventDefault());const cap=document.createElement('figcaption');cap.append(document.createTextNode(p.filename));if(p.downloadUrl){const a=document.createElement('a');a.href=p.downloadUrl;a.textContent=' · Download original';a.rel='noreferrer noopener';cap.append(a)}fig.append(img,cap);photos.append(fig)}
  $('#printRelease').classList.toggle('hidden',!result.releaseEnabled);$('#printStore').classList.toggle('hidden',!result.printStoreUrl);if(result.printStoreUrl)$('#printStoreLink').href=result.printStoreUrl;
  $('#galleryContents').classList.remove('hidden');$('#unlockPanel').classList.add('hidden');e.currentTarget.reset();msg('Gallery unlocked. Links expire after five minutes. Reopen the gallery to refresh them.');
 }catch(err){msg(err.message,true)}finally{button.disabled=false}
});
$('#lockAgain').addEventListener('click',()=>{current=null;$('#galleryPhotos').replaceChildren();$('#galleryContents').classList.add('hidden');$('#unlockPanel').classList.remove('hidden');msg('Gallery locked')});
$('#printReleaseBtn').addEventListener('click',()=>{
 if(!current?.releaseEnabled)return;
 const popup=window.open('','_blank','width=800,height=700');if(!popup){msg('Allow popups to print the release.',true);return}
 popup.opener=null;const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 popup.document.write(`<html><head><title>RJ Visuals Print Release</title><style>body{font:17px/1.6 Arial,sans-serif;max-width:720px;margin:6em auto;padding:2em}h1{font-size:2.3em}small{color:#666}</style></head><body><h1>RJ Visuals · Personal Print Release</h1><p>This certifies that RJ Visuals grants <strong>${safe(current.clientName)}</strong> permission to make prints of the photographs delivered in the gallery <strong>${safe(current.title)}</strong> for personal, non-commercial use.</p><p>Copyright remains with RJ Visuals. Commercial use, resale, licensing, or editing for commercial distribution requires separate written approval.</p><p>Gallery access until: ${safe(new Date(current.expiresAt).toLocaleDateString())}</p><small>Issued electronically by RJ Visuals through its gallery delivery system.</small><script>window.print();<\/script></body></html>`);
 popup.document.close();
});

// Request a short-lived, emailed reset link. Server checks the registered email.
$('#forgotGallery').addEventListener('click',()=>{$('#galleryRecoveryRequest').classList.toggle('hidden')});
$('#galleryRecoveryRequest').addEventListener('submit',async e=>{e.preventDefault();try{const f=new FormData(e.currentTarget);await fetch('/api/gallery-recovery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'request',slug:f.get('slug'),email:f.get('email')})});msg('If those details match an active gallery, a reset link will be sent to the registered email.');e.currentTarget.reset();}catch{msg('Unable to request a reset right now.',true)}});
const resetToken=new URLSearchParams(location.search).get('reset');
if(resetToken && slug){$('#galleryPasswordReset').classList.remove('hidden');$('#galleryRecoveryRequest').classList.add('hidden');$('#forgotGallery').classList.add('hidden');msg('Set a new password for this gallery.');}
$('#galleryPasswordReset').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{const password=new FormData(e.currentTarget).get('password');const response=await fetch('/api/gallery-recovery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'reset',slug,token:resetToken,password})});const result=await response.json();if(!response.ok)throw Error(result.error||'The link is invalid or expired');$('#galleryPasswordReset').classList.add('hidden');$('#slug').value=slug;history.replaceState(null,'',`gallery.html?g=${encodeURIComponent(slug)}`);msg('Gallery password updated. Sign in above with your new password.');}catch(err){msg(err.message,true)}finally{button.disabled=false}});
