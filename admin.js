import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.10';
const $=s=>document.querySelector(s), status=$('#status');
const conf=window.RJ_CONFIG||{};
const configured=conf.supabaseUrl?.startsWith('https://') && !conf.supabaseUrl.includes('YOUR_') && conf.supabaseAnonKey && !conf.supabaseAnonKey.includes('YOUR_');
let client=null, token='', galleries=[], selected=null;
const tell=(msg,error=false)=>{status.textContent=msg;status.style.color=error?'#a12332':'#563A54'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate=s=>{const d=new Date(s);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
const perm=g=>g.release_enabled?'release':g.downloads_enabled?'download':'view';
async function api(payload){
  const resp=await fetch('/api/admin-gallery',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
  const data=await resp.json();if(!resp.ok)throw Error(data.error||'Request failed');return data;
}
async function authorized(){const {data:{session}}=await client.auth.getSession();token=session?.access_token||'';
  if(!token){$('#dashboard').classList.add('hidden');$('#loginPanel').classList.remove('hidden');return}
  try {await reload();$('#signedInAs').textContent=session.user.email;$('#loginPanel').classList.add('hidden');$('#dashboard').classList.remove('hidden');tell('Studio access verified');void loadStudioLabs()}catch(e){$('#dashboard').classList.add('hidden');$('#loginPanel').classList.remove('hidden');tell('This account is not approved as a studio administrator.',true)}
}
async function reload(){galleries=(await api({op:'list'})).galleries;$('#galleryList').innerHTML=galleries.length?galleries.map(g=>`<div class="album"><div><strong>${esc(g.title)}</strong><span class="muted">${esc(g.client_name)} · ${esc(g.slug)} · Expires ${new Date(g.expires_at).toLocaleDateString()}</span></div><button class="action ghost" data-edit="${g.id}">Edit gallery</button></div>`).join(''):'<p>No galleries yet.</p>'}
async function loadStudioLabs(){
 const out=$('#labDetails'), note=$('#labStatus'), requestToken=token;
 note.textContent='Loading studio lab details…';
 try {
  const {labs,costs,notes}=await api({op:'studioLabs'});
  if(token!==requestToken) return;
  out.innerHTML=`<ol>${labs.map(([role,name,detail])=>`<li><strong>${esc(role)}: ${esc(name)}</strong>. ${esc(detail)}</li>`).join('')}</ol><p>${esc(notes[0])}</p><h3>Historical production costs</h3><p>${esc(notes[1])}</p><div style="overflow-x:auto"><table><thead><tr><th scope="col">Size</th><th scope="col">${esc(labs[0][1])}</th><th scope="col">${esc(labs[1][1])}</th></tr></thead><tbody>${costs.map(([size,bay,nations])=>`<tr><th scope="row">${esc(size)}</th><td>${esc(bay)}</td><td>${esc(nations)}</td></tr>`).join('')}</tbody></table></div><p>${esc(notes[2])}</p><p>${esc(notes[3])}</p>`;
  note.textContent='';
 } catch {
  if(token===requestToken) note.textContent='Studio lab details could not load. Refresh to try again.';
 }
}
async function editGallery(id){selected=galleries.find(g=>g.id===id);if(!selected)return;
 $('#editor').classList.remove('hidden');$('#editorTitle').textContent=`Edit: ${selected.title}`;
 const link=new URL('gallery.html',location.href);link.searchParams.set('g',selected.slug);
 $('#shareLink').replaceChildren();const a=document.createElement('a');a.href=link.href;a.textContent=link.href;a.target='_blank';a.rel='noopener';$('#shareLink').append('Private gallery link: ',a);
 const f=$('#editForm');f.elements.title.value=selected.title;f.elements.clientEmail.value=selected.client_email||'';f.elements.printStoreUrl.value=selected.print_store_url||'';f.elements.clientName.value=selected.client_name;f.elements.expiresAt.value=localDate(selected.expires_at);f.elements.permissions.value=perm(selected);f.elements.password.value='';
 await loadPhotos();$('#editor').scrollIntoView({behavior:'smooth'});
}
async function loadPhotos(){if(!selected)return;const data=await api({op:'photos',id:selected.id});const out=$('#adminPhotos');out.replaceChildren();for(const p of data.photos){const fig=document.createElement('figure');fig.className='gallery-tile';const image=document.createElement('img');image.src=p.preview_url;image.alt=p.filename;image.loading='lazy';const label=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.dataset.photoId=p.id;label.append(cb,' Select');const cap=document.createElement('figcaption');cap.textContent=p.filename;fig.append(image,label,cap);out.append(fig)}}
if(!configured)tell('Set your Supabase project URL and publishable key in config.js, then configure the Netlify server environment variables.',true);
else {
 client=createClient(conf.supabaseUrl,conf.supabaseAnonKey,{auth:{persistSession:true}});
 client.auth.onAuthStateChange((_event,session)=>{token=session?.access_token||''});
 authorized().catch(e=>tell(e.message,true));
}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{const f=new FormData(e.currentTarget);const {error}=await client.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)throw error;await authorized()}catch(err){tell(err.message,true)}});
$('#signOut').addEventListener('click',async()=>{await client.auth.signOut();token='';selected=null;$('#labDetails').replaceChildren();$('#editor').classList.add('hidden');await authorized()});
$('#createForm').elements.expiresAt.value=localDate(Date.now()+14*86400000);
$('#createForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api({op:'create',clientName:f.get('clientName'),clientEmail:f.get('clientEmail'),title:f.get('title'),slug:f.get('slug'),password:f.get('password'),expiresAt:new Date(f.get('expiresAt')).toISOString(),permissions:f.get('permissions')});e.currentTarget.reset();e.currentTarget.elements.expiresAt.value=localDate(Date.now()+14*86400000);await reload();tell('Gallery created. Share its private link and password separately.')}catch(err){tell(err.message,true)}});
$('#galleryList').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)editGallery(b.dataset.edit).catch(err=>tell(err.message,true))});
$('#editForm').addEventListener('submit',async e=>{e.preventDefault();if(!selected)return;const f=new FormData(e.currentTarget);try{await api({op:'update',id:selected.id,title:f.get('title'),clientName:f.get('clientName'),clientEmail:f.get('clientEmail'),printStoreUrl:f.get('printStoreUrl'),expiresAt:new Date(f.get('expiresAt')).toISOString(),permissions:f.get('permissions'),password:f.get('password')});await reload();await editGallery(selected.id);tell('Gallery updated')}catch(err){tell(err.message,true)}});
$('#removeGallery').addEventListener('click',async()=>{if(!selected||!confirm(`Permanently delete ${selected.title} and ALL its photos? This cannot be undone.`))return;try{await api({op:'deleteGallery',id:selected.id});selected=null;$('#editor').classList.add('hidden');await reload();tell('Gallery and its photos deleted')}catch(err){tell(err.message,true)}});
$('#uploadPhotos').addEventListener('click',async()=>{if(!selected)return;const files=[...$('#photoFiles').files];if(!files.length)return tell('Choose some photos first',true);
 const progress=$('#uploadStatus');$('#uploadPhotos').disabled=true;
 try{for(let i=0;i<files.length;i++){const f=files[i];progress.textContent=`Uploading ${i+1} of ${files.length}: ${f.name}`;
  const {path,token:uploadToken}=await api({op:'presign',id:selected.id,filename:f.name,mimeType:f.type,size:f.size});
  const {error}=await client.storage.from('client-originals').uploadToSignedUrl(path,uploadToken,f,{contentType:f.type});if(error)throw error;
  await api({op:'finalize',id:selected.id,path,filename:f.name});
 }$('#photoFiles').value='';progress.textContent=`Uploaded ${files.length} photo(s).`;await loadPhotos();}catch(err){progress.textContent=`Upload interrupted: ${err.message}. An unfinished original may require cleanup.`}finally{$('#uploadPhotos').disabled=false}
});
$('#deleteSelected').addEventListener('click',async()=>{if(!selected)return;const photoIds=[...$('#adminPhotos').querySelectorAll('input:checked')].map(x=>x.dataset.photoId);if(!photoIds.length)return tell('Choose photos to delete',true);if(!confirm(`Permanently delete ${photoIds.length} selected photo(s)?`))return;try{await api({op:'deletePhotos',id:selected.id,photoIds});await loadPhotos();tell('Selected photos removed')}catch(err){tell(err.message,true)}});

// Supabase Auth handles studio password recovery through verified email links.
$('#forgotAdmin').addEventListener('click',()=>{$('#adminRecoveryForm').classList.toggle('hidden')});
$('#adminRecoveryForm').addEventListener('submit',async e=>{e.preventDefault();if(!client)return tell('Configure Supabase first',true);try{const email=new FormData(e.currentTarget).get('email');const redirectTo=new URL('admin.html',location.href).href;const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;tell('If this studio account exists, a reset email has been sent.');}catch(err){tell('Unable to send reset email. Check your email service configuration.',true)}});
if(client){client.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){$('#loginPanel').classList.remove('hidden');$('#dashboard').classList.add('hidden');$('#adminNewPassword').classList.remove('hidden');tell('Reset link verified. Choose a new password.')}});}
$('#adminNewPassword').addEventListener('submit',async e=>{e.preventDefault();if(!client)return;try{const password=new FormData(e.currentTarget).get('password');const {error}=await client.auth.updateUser({password});if(error)throw error;$('#adminNewPassword').classList.add('hidden');tell('Password updated. You can sign in with your new password.');await client.auth.signOut();await authorized();}catch(err){tell(err.message,true)}});
