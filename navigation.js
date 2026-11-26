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
  const close=()=>{nav.hidden=true;document.body.classList.remove("rj-nav-open");btn.setAttribute("aria-expanded","false");btn.setAttribute("aria-label","Open site navigation");};
  btn.addEventListener("click",()=>{const opening=nav.hidden;nav.hidden=!opening;document.body.classList.toggle("rj-nav-open",opening);btn.setAttribute("aria-expanded",String(opening));btn.setAttribute("aria-label",opening?"Close site navigation":"Open site navigation");if(opening)nav.querySelector("a")?.focus();});
  nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!nav.hidden){close();btn.focus();}if(e.key==="Tab"&&!nav.hidden){const focusables=[btn,...nav.querySelectorAll("a")];const index=focusables.indexOf(document.activeElement);if(e.shiftKey&&index===0){e.preventDefault();focusables[focusables.length-1].focus();}else if(!e.shiftKey&&index===focusables.length-1){e.preventDefault();focusables[0].focus();}}});
})();
