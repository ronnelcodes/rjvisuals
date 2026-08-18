let accessToken = sessionStorage.getItem('rj_admin_token');
let galleries = [];
let editingGalleryId = null;
let managedGalleryId = '';
const loginView = document.querySelector('#admin-login');
const appView = document.querySelector('#admin-app');
const galleryForm = document.querySelector('#gallery-form');

async function getConfig() {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Site configuration is incomplete.');
  return response.json();
}

async function api(body, method = 'POST') {
  const response = await fetch('/api/admin', {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: method === 'GET' ? undefined : JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#login-status');
  status.className = '';
  status.textContent = 'Signing in…';
  try {
    const config = await getConfig();
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: config.supabaseAnonKey },
      body: JSON.stringify({ email: value('admin-email'), password: value('admin-password') })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Sign-in failed');
    accessToken = data.access_token;
    sessionStorage.setItem('rj_admin_token', accessToken);
    await showAdmin();
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
  }
});

document.querySelector('#sign-out').addEventListener('click', () => {
  sessionStorage.removeItem('rj_admin_token');
  location.reload();
});

galleryForm.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#admin-status');
  const wasEditing = Boolean(editingGalleryId);
  status.className = '';
  status.textContent = wasEditing ? 'Saving gallery…' : 'Creating gallery…';
  try {
    await api({
      action: wasEditing ? 'update' : 'create',
      galleryId: editingGalleryId,
      title: value('gallery-title'),
      slug: value('gallery-slug'),
      clientName: value('gallery-client'),
      password: value('gallery-password'),
      status: value('gallery-status')
    });
    resetGalleryForm();
    status.className = 'success';
    status.textContent = wasEditing ? 'Gallery updated.' : 'Gallery created.';
    await loadGalleries();
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
  }
});

document.querySelector('#cancel-edit').addEventListener('click', resetGalleryForm);
document.querySelector('#admin-gallery-list').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-gallery]');
  if (!button) return;
  const gallery = galleries.find(item => item.id === button.dataset.editGallery);
  if (!gallery) return;
  editingGalleryId = gallery.id;
  document.querySelector('#gallery-form-title').textContent = 'Edit gallery';
  document.querySelector('#gallery-submit').textContent = 'Save changes';
  document.querySelector('#cancel-edit').classList.remove('hidden');
  document.querySelector('#password-help').textContent = 'Leave blank to keep the current password, or enter a new one.';
  document.querySelector('#gallery-title').value = gallery.title;
  document.querySelector('#gallery-slug').value = gallery.slug;
  document.querySelector('#gallery-client').value = gallery.client_name;
  document.querySelector('#gallery-password').required = false;
  document.querySelector('#gallery-password').value = '';
  document.querySelector('#gallery-status').value = gallery.status;
  galleryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#upload-form').addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#upload-status');
  const galleryId = value('upload-gallery');
  const files = [...document.querySelector('#upload-files').files];
  status.className = '';
  try {
    const config = await getConfig();
    let done = 0;
    for (const file of files) {
      status.textContent = `Uploading ${++done} of ${files.length}…`;
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
      const storagePath = `${galleryId}/${crypto.randomUUID()}-${safeName}`;
      const upload = await fetch(`${config.supabaseUrl}/storage/v1/object/private-galleries/${storagePath}`, {
        method: 'POST',
        headers: { apikey: config.supabaseAnonKey, authorization: `Bearer ${accessToken}`, 'content-type': file.type, 'x-upsert': 'false' },
        body: file
      });
      if (!upload.ok) {
        const detail = await upload.json().catch(() => ({}));
        throw new Error(detail.message || `Upload failed for ${file.name}`);
      }
      await api({ action: 'add-photo', galleryId, storagePath, filename: file.name });
    }
    status.className = 'success';
    status.textContent = `Uploaded ${files.length} photograph${files.length === 1 ? '' : 's'}.`;
    event.target.reset();
    await loadGalleries();
    document.querySelector('#manage-gallery').value = galleryId;
    managedGalleryId = galleryId;
    await loadManagedPhotos();
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
  }
});

document.querySelector('#manage-gallery').addEventListener('change', event => {
  managedGalleryId = event.target.value;
  loadManagedPhotos();
});

document.querySelector('#refresh-photos').addEventListener('click', loadManagedPhotos);

document.querySelector('#photo-manager-grid').addEventListener('click', async event => {
  const button = event.target.closest('[data-delete-photo]');
  if (!button) return;
  const filename = button.dataset.filename || 'this photograph';
  if (!confirm(`Permanently delete ${filename}? This cannot be undone.`)) return;
  const status = document.querySelector('#photo-manager-status');
  button.disabled = true;
  status.className = '';
  status.textContent = `Deleting ${filename}…`;
  try {
    await api({ action: 'delete-photo', photoId: button.dataset.deletePhoto });
    status.className = 'success';
    status.textContent = `${filename} was deleted.`;
    await loadGalleries();
    await loadManagedPhotos();
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
    button.disabled = false;
  }
});

async function showAdmin() {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');
  try { await loadGalleries(); }
  catch (error) {
    const status = document.querySelector('#dashboard-status');
    status.className = 'notice error';
    status.textContent = `Signed in, but gallery data could not load: ${error.message}`;
  }
}

async function loadGalleries() {
  const data = await api(null, 'GET');
  galleries = data.galleries;
  document.querySelector('#gallery-count').textContent = galleries.length;
  document.querySelector('#published-count').textContent = galleries.filter(g => g.status === 'published').length;
  document.querySelector('#photo-count').textContent = galleries.reduce((total, g) => total + (g.photo_count || 0), 0);
  document.querySelector('#admin-gallery-list').innerHTML = galleries.map(gallery => `<div class="gallery-row"><div><strong>${escapeHtml(gallery.title)}</strong><br><small>${escapeHtml(gallery.slug)} · ${gallery.photo_count || 0} photos</small></div><span class="tag">${escapeHtml(gallery.status)}</span><button class="button small alt" type="button" data-edit-gallery="${gallery.id}">Edit</button></div>`).join('') || '<p>No galleries yet.</p>';
  document.querySelector('#upload-gallery').innerHTML = '<option value="">Choose a gallery</option>' + galleries.map(gallery => `<option value="${gallery.id}">${escapeHtml(gallery.title)}</option>`).join('');
  document.querySelector('#manage-gallery').innerHTML = '<option value="">Choose a gallery</option>' + galleries.map(gallery => `<option value="${gallery.id}">${escapeHtml(gallery.title)} (${gallery.photo_count || 0})</option>`).join('');
  if (managedGalleryId && galleries.some(gallery => gallery.id === managedGalleryId)) document.querySelector('#manage-gallery').value = managedGalleryId;
}

async function loadManagedPhotos() {
  const status = document.querySelector('#photo-manager-status');
  const grid = document.querySelector('#photo-manager-grid');
  if (!managedGalleryId) {
    grid.innerHTML = '';
    status.className = '';
    status.textContent = 'Choose a gallery to view its photographs.';
    return;
  }
  status.className = '';
  status.textContent = 'Loading photographs…';
  grid.innerHTML = '';
  try {
    const data = await api({ action: 'list-photos', galleryId: managedGalleryId });
    status.textContent = `${data.photos.length} photograph${data.photos.length === 1 ? '' : 's'} in this gallery.`;
    grid.innerHTML = data.photos.map(photo => `<article class="admin-photo-card"><img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.filename)}" loading="lazy"><div><strong>${escapeHtml(photo.filename)}</strong><button class="button small delete-button" type="button" data-delete-photo="${photo.id}" data-filename="${escapeHtml(photo.filename)}">Delete</button></div></article>`).join('') || '<p>This gallery has no photographs.</p>';
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
  }
}

function resetGalleryForm() {
  editingGalleryId = null;
  galleryForm.reset();
  document.querySelector('#gallery-form-title').textContent = 'Create gallery';
  document.querySelector('#gallery-submit').textContent = 'Create gallery';
  document.querySelector('#cancel-edit').classList.add('hidden');
  document.querySelector('#password-help').textContent = 'Use at least 10 characters.';
  document.querySelector('#gallery-password').required = true;
}

function value(id) { return document.querySelector(`#${id}`).value.trim(); }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
if (accessToken) showAdmin();
