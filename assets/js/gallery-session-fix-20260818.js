const portalForm = document.querySelector('#portal-form');
const portalStatus = document.querySelector('#portal-status');
if (portalStatus && new URLSearchParams(location.search).has('expired')) {
  portalStatus.className = 'notice error';
  portalStatus.textContent = 'Your previous gallery session expired. Enter the gallery name and password again.';
}
portalForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.querySelector('#portal-status');
  status.textContent = 'Checking gallery…';
  try {
    const response = await fetch('/api/gallery-access', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ slug: document.querySelector('#gallery-slug').value.trim().toLowerCase(), password: document.querySelector('#gallery-password').value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gallery not found');
    data.expiresAt = Number(data.expiresAt) || Date.now() + (Number(data.expiresIn) || 21600) * 1000;
    sessionStorage.setItem('rj_gallery', JSON.stringify(data));
    location.href = '/gallery.html';
  } catch (error) { status.className = 'error'; status.textContent = error.message; }
});

const galleryRoot = document.querySelector('#private-gallery');
if (galleryRoot) {
  let data;
  try { data = JSON.parse(sessionStorage.getItem('rj_gallery')); } catch {}
  const expired = !Number(data?.expiresAt) || Date.now() >= Number(data.expiresAt) - 30000;
  if (!data?.photos || expired) {
    sessionStorage.removeItem('rj_gallery');
    location.replace(`/client-galleries.html${expired ? '?expired=1' : ''}`);
  }
  else {
    document.querySelector('#gallery-title').textContent = data.title;
    document.title = `${data.title} | RJ Visuals`;
    document.querySelector('#order-gallery').value = data.title;
    galleryRoot.innerHTML = data.photos.length ? data.photos.map(photo => `<figure><img src="${escapeAttr(photo.url)}" alt="${escapeAttr(photo.filename)}" loading="lazy" draggable="false"><figcaption>${escapeHtml(photo.filename)}</figcaption></figure>`).join('') : '<p>This gallery is being prepared. Please check back soon.</p>';
    galleryRoot.addEventListener('contextmenu', event => event.preventDefault());
    galleryRoot.addEventListener('dragstart', event => event.preventDefault());
    galleryRoot.addEventListener('error', event => {
      if (!(event.target instanceof HTMLImageElement)) return;
      event.target.closest('figure')?.classList.add('photo-load-error');
      const status = document.querySelector('#gallery-image-status');
      status.className = 'notice error';
      status.innerHTML = 'A photograph could not load. <a href="/client-galleries.html?expired=1">Reopen the gallery</a> to generate fresh secure image links.';
    }, true);
  }
}

const printOrderForm = document.querySelector('#print-order-form');
printOrderForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#print-order-status');
  const submit = printOrderForm.querySelector('button[type="submit"]');
  status.className = '';
  status.textContent = 'Sending your request…';
  submit.disabled = true;
  try {
    const body = new URLSearchParams(new FormData(printOrderForm));
    const response = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    if (!response.ok) throw new Error('Your request could not be sent. Please try again.');
    printOrderForm.classList.add('hidden');
    const success = document.querySelector('#print-order-success');
    success.classList.remove('hidden');
    success.focus();
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
    submit.disabled = false;
  }
});

function escapeAttr(value='') { return String(value).replace(/[&"'<>]/g, c => ({'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'}[c])); }
function escapeHtml(value='') { return escapeAttr(value); }
