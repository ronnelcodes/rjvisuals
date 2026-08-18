import { randomBytes } from 'node:crypto';
import { json, supabase, requireAdmin, hashPassword } from './_shared.mjs';

const validStatus = status => ['draft', 'published', 'archived'].includes(status);
const validSlug = slug => /^[a-z0-9-]+$/.test(slug || '');

export const handler = async event => {
  try {
    await requireAdmin(event);
    if (event.httpMethod === 'GET') {
      const galleries = await supabase('/rest/v1/galleries?select=id,title,slug,client_name,status,gallery_photos(count)&order=created_at.desc');
      return json(200, { galleries: galleries.map(gallery => ({ ...gallery, photo_count: gallery.gallery_photos?.[0]?.count || 0, gallery_photos: undefined })) });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const body = JSON.parse(event.body || '{}');

    if (body.action === 'create') {
      if (!body.title || !validSlug(body.slug) || !body.clientName || !body.password || !validStatus(body.status)) return json(400, { error: 'Complete every field and use a lowercase gallery address with only letters, numbers, and hyphens.' });
      if (body.password.length < 10) return json(400, { error: 'Use a password with at least 10 characters.' });
      const salt = randomBytes(16).toString('hex');
      await supabase('/rest/v1/galleries', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ title: body.title, slug: body.slug, client_name: body.clientName, status: body.status, password_salt: salt, password_hash: hashPassword(body.password, salt) }) });
      return json(201, { ok: true });
    }

    if (body.action === 'update') {
      if (!body.galleryId || !body.title || !validSlug(body.slug) || !body.clientName || !validStatus(body.status)) return json(400, { error: 'Complete every field and use a valid gallery address.' });
      const updates = { title: body.title, slug: body.slug, client_name: body.clientName, status: body.status, updated_at: new Date().toISOString() };
      if (body.password) {
        if (body.password.length < 10) return json(400, { error: 'Use a password with at least 10 characters.' });
        const salt = randomBytes(16).toString('hex');
        updates.password_salt = salt;
        updates.password_hash = hashPassword(body.password, salt);
      }
      await supabase(`/rest/v1/galleries?id=eq.${encodeURIComponent(body.galleryId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(updates) });
      return json(200, { ok: true });
    }

    if (body.action === 'add-photo') {
      if (!body.galleryId || !body.storagePath || !body.filename) return json(400, { error: 'Photo information is incomplete.' });
      await supabase('/rest/v1/gallery_photos', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ gallery_id: body.galleryId, storage_path: body.storagePath, filename: body.filename }) });
      return json(201, { ok: true });
    }
    if (body.action === 'list-photos') {
      if (!body.galleryId) return json(400, { error: 'Choose a gallery.' });
      const photos = await supabase(`/rest/v1/gallery_photos?gallery_id=eq.${encodeURIComponent(body.galleryId)}&select=id,filename,storage_path,sort_order,created_at&order=sort_order.asc,created_at.asc`);
      const signed = await Promise.all(photos.map(async photo => {
        const result = await supabase(`/storage/v1/object/sign/private-galleries/${photo.storage_path}`, { method: 'POST', body: JSON.stringify({ expiresIn: 900 }) });
        return { id: photo.id, filename: photo.filename, url: result.signedURL.startsWith('http') ? result.signedURL : `${process.env.SUPABASE_URL}${result.signedURL}` };
      }));
      return json(200, { photos: signed });
    }
    if (body.action === 'delete-photos') {
      const photoIds = [...new Set(Array.isArray(body.photoIds) ? body.photoIds : [])];
      if (!photoIds.length || photoIds.length > 250 || photoIds.some(id => !/^[0-9a-f-]{36}$/i.test(id))) return json(400, { error: 'Choose valid photographs to delete.' });
      const filter = photoIds.join(',');
      const photos = await supabase(`/rest/v1/gallery_photos?id=in.(${filter})&select=id,storage_path`);
      if (!photos.length) return json(404, { error: 'Those photographs no longer exist.' });
      await supabase('/storage/v1/object/private-galleries', { method: 'DELETE', body: JSON.stringify({ prefixes: photos.map(photo => photo.storage_path) }) });
      await supabase(`/rest/v1/gallery_photos?id=in.(${photos.map(photo => photo.id).join(',')})`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return json(200, { ok: true, deleted: photos.length });
    }
    return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error(error);
    return json(error.message === 'Unauthorized' ? 401 : 500, { error: error.message === 'Unauthorized' ? 'Unauthorized' : 'The admin request failed.' });
  }
};
