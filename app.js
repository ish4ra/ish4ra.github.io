'use strict';
const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
try { const theme = localStorage.getItem('ishara-theme'); if (theme === 'light' || theme === 'dark') root.dataset.theme = theme; } catch {}
function syncTheme() { $('#theme').setAttribute('aria-label', `Switch to ${root.dataset.theme === 'dark' ? 'light' : 'dark'} theme`); $('#theme').textContent = root.dataset.theme === 'dark' ? '☼' : '☾'; }
syncTheme();
$('#theme').addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; syncTheme(); try { localStorage.setItem('ishara-theme', root.dataset.theme); } catch {} });
$('#year').textContent = new Date().getFullYear();
if ('IntersectionObserver' in window) {

  const reveal = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); } }), { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));
  const nav = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) document.querySelectorAll('nav a').forEach(a => { const active = a.hash === `#${entry.target.id}`; a.classList.toggle('active', active); if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); }); }), { rootMargin: '-15% 0px -65% 0px' });
  document.querySelectorAll('main section').forEach(el => nav.observe(el));
}
let queued = false;
function updateProgress() { const max = root.scrollHeight - innerHeight; $('.progress').style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`; queued = false; }
addEventListener('scroll', () => { if (!queued) { requestAnimationFrame(updateProgress); queued = true; } }, { passive: true });
addEventListener('resize', updateProgress); updateProgress();
const projects = [
 { label: '01 / FULL STACK WEB APPLICATION', name: 'Nictic Travel Platform', description: 'A full-stack travel booking system designed to support seamless end-to-end transactions.', tags: ['React', 'Node.js', 'Payment gateways'], contribution: 'Built the travel booking platform with React and Node.js, integrating payment gateways into the booking experience.', url: 'https://nictic.com' },
 { label: '02 / OPERATIONS & MANAGEMENT', name: 'Car Rental Management System', description: 'An administrative dashboard for managing car rental inventory and improving operational visibility.', tags: ['Java', 'Spring Boot', 'Admin dashboard'], contribution: 'Designed and built the administration dashboard. The project delivered a 50% improvement in inventory tracking efficiency, as documented in my résumé.' },
 { label: '03 / TRAVEL WEB APPLICATION', name: '28 Holidays Travel Platform', description: 'A full-featured travel booking platform with an experience designed for different devices.', tags: ['Responsive design', 'Third-party APIs'], contribution: 'Contributed to the platform by implementing responsive layouts and integrating third-party APIs.', url: 'https://28holidays.com/lander' },
 { label: '04 / LINUX MEDIA SOFTWARE', name: 'Easy Fedora Media', description: 'A media management solution built for the Fedora Linux environment.', tags: ['Fedora Linux', 'Media management', 'System integration'], contribution: 'Built an approachable user interface with system-level integration to simplify media management on Fedora.' },
 {"label": "05 / PRIVATE CLIENT PROJECT", "name": "Paris Disney Transfers", "description": "A transportation service for Disneyland Paris, offering private shuttles for families and groups.", "tags": ["Booking & reservations", "JavaScript", "Private project"], "contribution": "Engineered a custom booking and reservation system, reducing client operational costs by 20%."},
 {"label": "06 / TRANSPORT & BOOKINGS", "name": "EasyGoShuttle", "description": "An airport shuttle booking and management system.", "tags": ["Airport transfers", "Booking management"], "contribution": "A project focused on managing airport shuttle bookings and transport operations.", "url": "https://www.easygoshuttle.com"},
 {"label": "07 / PRIVATE IOT PROJECT", "name": "Smart Basketball Court Manager", "description": "An IoT solution for basketball court management and analytics.", "tags": ["IoT", "Court management", "Analytics", "Private project"], "contribution": "A project bringing connected technology to basketball court management and analytics."},
 {"label": "08 / MACHINERY & EQUIPMENT", "name": "Atoki Co", "description": "A website for machinery and equipment purchasing.", "tags": ["Machinery", "Equipment", "Web development"], "contribution": "Developed the Atoki Co machinery buying website."}
];
const projectDialog = $('#project-dialog');
document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => { const project = projects[Number(button.dataset.project)]; $('#dialog-label').textContent = project.label; $('#dialog-title').textContent = project.name; $('#dialog-description').textContent = project.description; $('#dialog-contribution').textContent = project.contribution; $('#dialog-tags').replaceChildren(...project.tags.map(tag => { const span = document.createElement('span'); span.textContent = tag; return span; })); const link = $('#dialog-link'); link.hidden = !project.url; link.style.display = project.url ? 'inline-flex' : 'none'; if (project.url) link.href = project.url; else link.removeAttribute('href'); projectDialog.showModal(); }));
document.querySelectorAll('dialog').forEach(dialog => { dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', e => { const rect = dialog.getBoundingClientRect(); if (e.target === dialog && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) dialog.close(); }); });
const commands = $('#commands');
$('#commands-button').addEventListener('click', () => commands.showModal());
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (commands.open) commands.close(); else { projectDialog.close(); commands.showModal(); } } });
document.querySelectorAll('.command-links a').forEach(a => a.addEventListener('click', () => { commands.close(); const section = document.querySelector(a.hash); section.setAttribute('tabindex', '-1'); section.focus({preventScroll:true}); }));
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3000); }
$('#copy-email').addEventListener('click', async () => { try { await navigator.clipboard.writeText('ishara@tuta.io'); toast('Email address copied.'); } catch { toast('Email: ishara@tuta.io'); } });
