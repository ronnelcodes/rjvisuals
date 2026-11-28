"use strict";
(() => {
  const brand = document.querySelector(".rj-site-logo");
if (brand) {
  const logo = new Image();
  logo.alt = "RJ Visuals";
  logo.style.cssText = "display:block;width:min(180px,40vw);height:70px;object-fit:contain;object-position:left center";
  logo.onload = () => brand.replaceChildren(logo);
  logo.src = "/assets/images/RJ-Visuals-Horizontal-Logo.svg";
}

const favicon = document.querySelector('link[rel~="icon"]')
  || document.head.appendChild(document.createElement("link"));
favicon.rel = "icon";
favicon.type = "image/svg+xml";
favicon.href = "/assets/images/RJ-Visuals-Favicon.svg";
  const btn=document.getElementById("rjMenuToggle");
  const nav=document.getElementById("rjNavigation");
  if(!btn||!nav)return;
  const backdrop = document.createElement("div");
  backdrop.className = "rj-menu-backdrop";
  backdrop.hidden = true;
  backdrop.setAttribute("aria-hidden", "true");
  nav.before(backdrop);
  const normalizePath = path => (path.replace(/\.html$/, "").replace(/\/$/, "") || "/").replace(/^\/index$/, "/");
  nav.querySelectorAll("a").forEach(a => {
    if (a.origin === location.origin && !a.hash && normalizePath(a.pathname) === normalizePath(location.pathname)) a.setAttribute("aria-current","page");
  });
  const text = btn.querySelector(".rj-menu-text");
  const setOpen = opening => {
    nav.hidden = !opening;
    backdrop.hidden = !opening;
    document.body.classList.toggle("rj-nav-open", opening);
    btn.setAttribute("aria-expanded", String(opening));
    btn.setAttribute("aria-label", opening ? "Close site navigation" : "Open site navigation");
    if (text) text.textContent = opening ? "CLOSE" : "MENU";
    if (opening) nav.querySelector("a")?.focus();
  };
  const close = () => { setOpen(false); btn.focus(); };
  btn.addEventListener("click", () => { if (nav.hidden) setOpen(true); else close(); });
  backdrop.addEventListener("click", close);
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", e => {
    if (nav.hidden) return;
    if(e.key === "Escape"){e.preventDefault();close();}
    if (e.key === "Tab") {
      const focusables = [btn, ...nav.querySelectorAll("a")];
      const index = focusables.indexOf(document.activeElement);
      if (e.shiftKey && index === 0) {e.preventDefault();focusables.at(-1).focus();}
      else if (!e.shiftKey && index === focusables.length - 1) {e.preventDefault();btn.focus();}
    }
  });
})();
