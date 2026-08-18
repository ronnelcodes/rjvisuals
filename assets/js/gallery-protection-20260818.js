const portalForm = document.querySelector('#portal-form');
portalForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.querySelector('#portal-status');
  status.textContent = 'Checking gallery…';
  try {
    const response = await fetch('/api/gallery-access', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ slug: document.querySelector('#gallery-slug').value.trim().toLowerCase(), password: document.querySelector('#gallery-password').value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gallery not found');
    sessionStorage.setItem('rj_gallery', JSON.stringify(data));
    location.href = '/gallery.html';
  } catch (error) { status.className = 'error'; status.textContent = error.message; }
});

const galleryRoot = document.querySelector('#private-gallery');
if (galleryRoot) {
  let data;
  try { data = JSON.parse(sessionStorage.getItem('rj_gallery')); } catch {}
  if (!data?.photos) location.replace('/client-galleries.html');
  else {
    document.querySelector('#gallery-title').textContent = data.title;
    document.title = `${data.title} | RJ Visuals`;
    document.querySelector('#order-gallery').value = data.title;
    galleryRoot.innerHTML = data.photos.length ? data.photos.map(photo => `<figure><img src="${escapeAttr(photo.url)}" alt="${escapeAttr(photo.filename)}" loading="lazy" draggable="false"><figcaption>${escapeHtml(photo.filename)}</figcaption></figure>`).join('') : '<p>This gallery is being prepared. Please check back soon.</p>';
    galleryRoot.addEventListener('contextmenu', event => event.preventDefault());
    galleryRoot.addEventListener('dragstart', event => event.preventDefault());
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
