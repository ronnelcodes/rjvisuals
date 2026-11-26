'use strict';
const els=document.querySelectorAll('.reveal');
if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){els.forEach(el=>el.classList.add('visible'));}
else{const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:0.1});els.forEach(el=>observer.observe(el));}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
