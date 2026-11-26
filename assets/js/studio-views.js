(() => {
  const app = document.getElementById('admin-app');
  const choices = ['sales','galleries','labs'];
  const choice = new URLSearchParams(location.search).get('view');
  const active = choices.includes(choice) ? choice : 'sales';
  for (const name of choices) document.getElementById('studio-' + name).hidden = name !== active;
  app.querySelector('a[href="?view=' + active + '"]').setAttribute('aria-current','page');
  if (active !== 'labs') return;
  const status = document.getElementById('studio-labs-status');
  const out = document.getElementById('studio-labs-content');
  let sequence = 0;
  async function refresh() {
    const request = ++sequence;
    out.replaceChildren();
    if (app.classList.contains('hidden')) { status.textContent = ''; return; }
    status.textContent = 'Loading print labs…';
    try {
      await ensureAccessToken();
      if (request !== sequence || app.classList.contains('hidden')) return;
      const response = await fetch('/api/studio-labs', {
        headers: { authorization: 'Bearer ' + accessToken }, cache: 'no-store'
      });
      if (!response.ok) throw Error('Request failed');
      const data = await response.json();
      if (request !== sequence || app.classList.contains('hidden')) return;
      for (const [role, name, note] of data.labs) {
        const card = document.createElement('article');
        card.className = 'form-card';
        for (const [tag, value] of [['p',role],['h2',name],['p',note]]) {
          const item = document.createElement(tag);
          item.textContent = value;
          card.append(item);
        }
        out.append(card);
      }
      const notes = document.createElement('ul');
      for (const note of data.notes) {
        const item = document.createElement('li');
        item.textContent = note;
        notes.append(item);
      }
      out.append(notes);
      status.textContent = '';
    } catch {
      if (request === sequence && !app.classList.contains('hidden')) {
        status.textContent = 'Unable to load print labs. Refresh or sign in again.';
      }
    }
  }
  new MutationObserver(refresh).observe(app,{attributes:true,attributeFilter:['class']});
  void refresh();
})();
