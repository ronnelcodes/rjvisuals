let accessToken = sessionStorage.getItem('rj_admin_token');
let refreshToken = sessionStorage.getItem('rj_admin_refresh_token');
let expiresAt = Number(sessionStorage.getItem('rj_admin_expires_at')) || getTokenExpiry(accessToken);
let refreshPromise = null;
let galleries = [];
let editingGalleryId = null;
let managedGalleryId = '';
let managedPhotos = [];
const selectedPhotoIds = new Set();
const loginView = document.querySelector('#admin-login');
const appView = document.querySelector('#admin-app');
const galleryForm = document.querySelector('#gallery-form');

async function getConfig() {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Site configuration is incomplete.');
  return response.json();
}

function getTokenExpiry(token) {
  if (!token) return 0;
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    return Number(JSON.parse(atob(padded)).exp || 0) * 1000;
  } catch {
    return 0;
  }
}

function saveSession(data) {
  accessToken = data.access_token;
  refreshToken = data.refresh_token || refreshToken;
  expiresAt = data.expires_at ? Number(data.expires_at) * 1000 : Date.now() + Number(data.expires_in || 3600) * 1000;
  sessionStorage.setItem('rj_admin_token', accessToken);
  if (refreshToken) sessionStorage.setItem('rj_admin_refresh_token', refreshToken);
  sessionStorage.setItem('rj_admin_expires_at', String(expiresAt));
}

function clearSession() {
  accessToken = null;
  refreshToken = null;
  expiresAt = 0;
  sessionStorage.removeItem('rj_admin_token');
  sessionStorage.removeItem('rj_admin_refresh_token');
  sessionStorage.removeItem('rj_admin_expires_at');
}

function returnToLogin(message) {
  clearSession();
  appView.classList.add('hidden');
  loginView.classList.remove('hidden');
  const status = document.querySelector('#login-status');
  status.className = 'error';
  status.textContent = message;
}

async function refreshAdminSession() {
  const config = await getConfig();
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: config.supabaseAnonKey },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  const data = await response.json();
  if (!response.ok) {
    const message = 'Your admin session expired. Please sign in again.';
    returnToLogin(message);
    throw new Error(message);
  }
  saveSession(data);
  return accessToken;
}

async function ensureAccessToken() {
  if (accessToken && expiresAt > Date.now() + 60000) return accessToken;
  if (!refreshToken) {
    const message = 'Your admin session expired. Please sign in again.';
    returnToLogin(message);
    throw new Error(message);
  }
  if (!refreshPromise) refreshPromise = refreshAdminSession().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function api(body, method = 'POST') {
  await ensureAccessToken();
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
    saveSession(data);
    await showAdmin();
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
  }
});

document.querySelector('#sign-out').addEventListener('click', () => {
  clearSession();
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
  const optimize = document.querySelector('#optimize-uploads').checked;
  status.className = '';
  try {
    const config = await getConfig();
    let done = 0;
    let bytesSaved = 0;
    for (const file of files) {
      status.textContent = `${optimize ? 'Compressing, watermarking, and uploading' : 'Watermarking and uploading'} ${++done} of ${files.length}…`;
      const prepared = await prepareGalleryPhoto(file, optimize);
      bytesSaved += prepared.bytesSaved;
      const safeName = prepared.filename.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
      const storagePath = `${galleryId}/${crypto.randomUUID()}-${safeName}`;
      await ensureAccessToken();
      const upload = await fetch(`${config.supabaseUrl}/storage/v1/object/private-galleries/${storagePath}`, {
        method: 'POST',
        headers: { apikey: config.supabaseAnonKey, authorization: `Bearer ${accessToken}`, 'content-type': prepared.blob.type, 'x-upsert': 'false' },
        body: prepared.blob
      });
      if (!upload.ok) {
        const detail = await upload.json().catch(() => ({}));
        throw new Error(detail.message || `Upload failed for ${file.name}`);
      }
      await api({ action: 'add-photo', galleryId, storagePath, filename: prepared.filename });
    }
    status.className = 'success';
    const savings = bytesSaved > 0 ? ` Saved ${formatBytes(bytesSaved)} of storage.` : '';
    status.textContent = `Uploaded ${files.length} photograph${files.length === 1 ? '' : 's'}.${savings}`;
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
    await api({ action: 'delete-photos', photoIds: [button.dataset.deletePhoto] });
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

document.querySelector('#photo-manager-grid').addEventListener('change', event => {
  const checkbox = event.target.closest('[data-select-photo]');
  if (!checkbox) return;
  if (checkbox.checked) selectedPhotoIds.add(checkbox.value);
  else selectedPhotoIds.delete(checkbox.value);
  updateBulkPhotoControls();
});

document.querySelector('#select-all-photos').addEventListener('click', () => {
  managedPhotos.forEach(photo => selectedPhotoIds.add(photo.id));
  document.querySelectorAll('[data-select-photo]').forEach(checkbox => { checkbox.checked = true; });
  updateBulkPhotoControls();
});

document.querySelector('#clear-photo-selection').addEventListener('click', clearPhotoSelection);

document.querySelector('#delete-selected-photos').addEventListener('click', async () => {
  const ids = [...selectedPhotoIds];
  if (!ids.length) return;
  if (!confirm(`Permanently delete ${ids.length} selected photograph${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
  const status = document.querySelector('#photo-manager-status');
  const button = document.querySelector('#delete-selected-photos');
  button.disabled = true;
  status.className = '';
  status.textContent = `Deleting ${ids.length} photographs…`;
  try {
    const result = await api({ action: 'delete-photos', photoIds: ids });
    clearPhotoSelection();
    status.className = 'success';
    status.textContent = `Deleted ${result.deleted} photograph${result.deleted === 1 ? '' : 's'}.`;
    await loadGalleries();
    await loadManagedPhotos();
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
    updateBulkPhotoControls();
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
    document.querySelector('#bulk-photo-actions').classList.add('hidden');
    managedPhotos = [];
    clearPhotoSelection();
    return;
  }
  status.className = '';
  status.textContent = 'Loading photographs…';
  grid.innerHTML = '';
  try {
    const data = await api({ action: 'list-photos', galleryId: managedGalleryId });
    managedPhotos = data.photos;
    clearPhotoSelection();
    document.querySelector('#bulk-photo-actions').classList.toggle('hidden', data.photos.length === 0);
    status.textContent = `${data.photos.length} photograph${data.photos.length === 1 ? '' : 's'} in this gallery.`;
    grid.innerHTML = data.photos.map(photo => `<article class="admin-photo-card"><label class="photo-select"><input type="checkbox" value="${photo.id}" data-select-photo><span>Select</span></label><img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.filename)}" loading="lazy"><div><strong>${escapeHtml(photo.filename)}</strong><button class="button small delete-button" type="button" data-delete-photo="${photo.id}" data-filename="${escapeHtml(photo.filename)}">Delete</button></div></article>`).join('') || '<p>This gallery has no photographs.</p>';
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
  }
}

function clearPhotoSelection() {
  selectedPhotoIds.clear();
  document.querySelectorAll('[data-select-photo]').forEach(checkbox => { checkbox.checked = false; });
  updateBulkPhotoControls();
}

function updateBulkPhotoControls() {
  const count = selectedPhotoIds.size;
  document.querySelector('#selected-photo-count').textContent = `${count} selected`;
  document.querySelector('#delete-selected-photos').disabled = count === 0;
}

let watermarkImagePromise;

function loadWatermarkImage() {
  if (!watermarkImagePromise) {
    watermarkImagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The RJ Visuals watermark could not be loaded.'));
      image.src = '/assets/images/RJ-Visuals-Gallery-Watermark.png';
    });
  }
  return watermarkImagePromise;
}

async function prepareGalleryPhoto(file, optimize = true) {
  if (!file.type.startsWith('image/')) return { blob: file, filename: file.name, bytesSaved: 0 };
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const maxDimension = optimize ? 3000 : Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const watermark = await loadWatermarkImage();
  const maximumWatermarkWidth = width * 0.82;
  const maximumWatermarkHeight = height * 0.82;
  const watermarkScale = Math.min(maximumWatermarkWidth / watermark.naturalWidth, maximumWatermarkHeight / watermark.naturalHeight);
  const watermarkWidth = watermark.naturalWidth * watermarkScale;
  const watermarkHeight = watermark.naturalHeight * watermarkScale;
  context.save();
  context.globalAlpha = 0.425;
  context.drawImage(watermark, (width - watermarkWidth) / 2, (height - watermarkHeight) / 2, watermarkWidth, watermarkHeight);
  context.restore();
  const quality = optimize ? 0.88 : 0.95;
  const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error(`Could not prepare ${file.name}`)), 'image/webp', quality));
  const base = file.name.replace(/\.[^.]+$/, '') || 'photograph';
  return { blob, filename: `${base}.webp`, bytesSaved: Math.max(0, file.size - blob.size) };
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
