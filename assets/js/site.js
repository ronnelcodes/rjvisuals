const pages = [
  ['Home', '/'], ['About', '/about.html'], ['Portfolio', '/portfolio.html'],
  ['Investment', '/investment.html'], ['Book', '/booking.html'], ['Client Galleries', '/client-galleries.html']
];

const favicon = document.querySelector('link[rel~="icon"]') || document.head.appendChild(document.createElement('link'));
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = '/assets/images/RJ-Visuals-Favicon.svg';

const path = location.pathname;
const current = (href) => href === '/' ? path === '/' || path.endsWith('/index.html') : path.endsWith(href);

document.querySelector('[data-header]')?.replaceChildren(htmlToNode(`
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container nav-wrap">
      <a class="brand" href="/" aria-label="RJ Visuals home"><img src="/assets/images/RJ-Visuals-Horizontal-Logo.svg" alt="RJ Visuals"></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav">Menu</button>
      <nav id="main-nav" class="nav-links" aria-label="Main navigation">
        ${pages.map(([label, href]) => `<a href="${href}" ${current(href) ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
      </nav>
    </div>
  </header>`));

document.querySelector('[data-footer]')?.replaceChildren(htmlToNode(`
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div><h2>Photos that feel like you.</h2><p>Inclusive portrait photography in Las Vegas with calm direction, clean editing, and room to be yourself.</p></div>
        <div><strong>Explore</strong><a href="/portfolio.html">Portfolio</a><a href="/investment.html">Investment</a><a href="/booking.html">Book a session</a></div>
        <div><strong>Connect</strong><a href="mailto:hello@rjvisuals.online">hello@rjvisuals.online</a><a href="tel:+17026252329">702-625-2329</a><a href="https://www.instagram.com/rjvisualsphoto" rel="noopener">Instagram</a></div>
      </div>
      <div class="copyright">© ${new Date().getFullYear()} RJ Visuals. Las Vegas, Nevada. <a href="/admin.html">Admin</a></div>
    </div>
  </footer>`));

const toggle = document.querySelector('.menu-toggle');
toggle?.addEventListener('click', () => {
  const nav = document.querySelector('.nav-links');
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
  const filter = button.dataset.filter;
  document.querySelectorAll('[data-category]').forEach(item => item.classList.toggle('hidden', filter !== 'all' && item.dataset.category !== filter));
}));

function htmlToNode(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content;
}
