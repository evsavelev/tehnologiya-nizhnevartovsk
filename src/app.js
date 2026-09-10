const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#main-navigation');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.setAttribute('aria-expanded','false');nav.classList.remove('is-open');menu.focus()}});
const dialog=document.querySelector('.lightbox');let photos=[],position=0,opener;
function showPhoto(){const p=photos[position];if(!p)return;const img=dialog.querySelector('img');img.src=p.src;img.alt=p.alt;dialog.querySelector('figcaption').textContent=`${position+1} / ${photos.length} · ${p.alt}`;dialog.querySelector('.lightbox-prev').hidden=dialog.querySelector('.lightbox-next').hidden=photos.length<2}
document.querySelectorAll('[data-gallery]').forEach(el=>el.addEventListener('click',()=>{photos=JSON.parse(el.dataset.gallery);position=Number(el.dataset.index||0);opener=el;showPhoto();dialog.showModal()}));
dialog?.querySelector('.lightbox-close').addEventListener('click',()=>dialog.close());
dialog?.querySelector('.lightbox-prev').addEventListener('click',()=>{position=(position-1+photos.length)%photos.length;showPhoto()});
dialog?.querySelector('.lightbox-next').addEventListener('click',()=>{position=(position+1)%photos.length;showPhoto()});
dialog?.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();position=(position+(e.key==='ArrowRight'?1:-1)+photos.length)%photos.length;showPhoto()}});
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
dialog?.addEventListener('close',()=>opener?.focus());
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));let count=0;document.querySelectorAll('[data-tag]').forEach(card=>{card.hidden=button.dataset.filter!=='Все'&&card.dataset.tag!==button.dataset.filter;if(!card.hidden)count++});document.querySelector('.filter-count').textContent=`Показано проектов: ${count}`;document.querySelector('.empty-state').hidden=count>0}));
const form=document.querySelector('#request-form');
// Install keyboard clearance before awaiting the optional form configuration.
const updateInputState = () => document.body.classList.toggle('editing-field', /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName));
document.addEventListener('focusin', updateInputState);
document.addEventListener('focusout', () => setTimeout(updateInputState, 0));
updateInputState();
if (form) {
  const { formConfig } = await import('./form-config.js');
  const query = new URLSearchParams(location.search);
  form.elements.service.value = query.get('service')?.slice(0,180) || '';
  let sourceUrl = location.origin + location.pathname;
  try {
    const source = new URL(query.get('from'));
    if (source.origin === location.origin && source.pathname.startsWith('/tehnologiya-nizhnevartovsk/')) sourceUrl = source.origin + source.pathname;
    // Static local preview has a public canonical source: accept the site's public origin too.
    if (source.origin === 'https://evsavelev.github.io' && source.pathname.startsWith('/tehnologiya-nizhnevartovsk/')) sourceUrl = source.origin + source.pathname;
  } catch { /* Direct visits use the current page. */ }
  const submit = form.querySelector('[type=submit]');
  submit.disabled = false;
  form.dataset.ready = 'true';
  const status = document.querySelector('#form-status');
  const fallback = document.querySelector('#form-fallback');
  const preview = document.querySelector('#request-preview');
  const copy = document.querySelector('#copy-request');
  let pending = false;
  let lastBody = '', lastKey = '';
  if (formConfig.endpoint) {
    submit.textContent = 'Отправить заявку ↗';
    document.querySelector('#form-help').textContent = 'Передадим ваши данные и описание задачи специалисту для ответа.';
  }
  for (const input of form.querySelectorAll('[required]')) {
    input.addEventListener('input', () => input.setCustomValidity(''));
    input.addEventListener('blur', () => input.setCustomValidity(input.value.trim() ? '' : 'Заполните это поле.'));
  }
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(preview.value); copy.textContent = 'Текст скопирован'; }
    catch { preview.closest('details').open = true; preview.focus(); preview.select(); status.textContent = 'Выделили текст обращения. Скопируйте его и передайте специалисту.'; }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    for (const input of form.querySelectorAll('[required]')) input.setCustomValidity(input.value.trim() ? '' : 'Заполните это поле.');
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const payload = { name: data.get('name').trim(), contact: data.get('contact').trim(), service: data.get('service').trim(), comment: data.get('comment').trim(), sourceUrl };
    const body = `Имя: ${payload.name}\nСвязь: ${payload.contact}\nИзделие: ${payload.service}\n\n${payload.comment}\n\nСтраница: ${sourceUrl}`;
    preview.value = body;
    document.querySelector('#mail-fallback').href = `mailto:${form.dataset.email}?subject=${encodeURIComponent('Запрос расчёта: '+payload.service)}&body=${encodeURIComponent(body)}`;
    copy.textContent = 'Скопировать текст';
    if (!formConfig.endpoint) {
      fallback.hidden = false;
      status.textContent = 'Обращение подготовлено, но ещё не отправлено. Отправьте его по email или скопируйте текст для MAX. Также можно позвонить.';
      status.focus({preventScroll:true});
      status.scrollIntoView({block:'nearest'});
      return;
    }
    // Retry an identical submission with the same key. The server owns deduplication.
    if (lastBody !== body) { lastBody = body; lastKey = crypto.randomUUID(); }
    payload.requestId = lastKey;
    pending = true; submit.disabled = true; form.setAttribute('aria-busy','true');
    for (const field of form.querySelectorAll('input,textarea')) field.readOnly = true;
    fallback.hidden = true; submit.textContent = 'Отправляем…'; status.textContent = 'Отправляем заявку…';
    try {
      const { sendRequest } = await import('./form-adapter.js');
      await sendRequest(formConfig.endpoint, payload);
      status.textContent = 'Заявка отправлена. Специалист свяжется с вами указанным способом.';
      form.reset(); lastBody = ''; lastKey = '';
    } catch (error) {
      status.textContent = error.code === 'timeout'
        ? 'Не удалось подтвердить отправку. Данные сохранены в форме. Попробуйте снова или свяжитесь с нами по телефону, в MAX или по email.'
        : 'Не удалось отправить заявку. Данные сохранены в форме. Попробуйте снова или свяжитесь с нами по телефону, в MAX или по email.';
      fallback.hidden = false;
    } finally {
      pending = false; submit.disabled = false; form.removeAttribute('aria-busy');
      for (const field of form.querySelectorAll('input,textarea:not(#request-preview)')) field.readOnly = false;
      submit.textContent = 'Отправить заявку ↗';
      status.focus({preventScroll:true}); status.scrollIntoView({block:'nearest'});
    }
  });
}

// The bar stays still while scrolling, and makes room for the virtual keyboard.

const comparison = document.querySelector('.comparison-interactive');
if (comparison) {
  comparison.hidden = false;
  document.querySelector('.comparison-static').hidden = true;
  const range = comparison.querySelector('input');
  const frame = comparison.querySelector('.comparison-frame');
  const update = value => {
    range.value = Math.round(Math.max(0, Math.min(100, value)));
    frame.style.setProperty('--position',range.value+'%');
    range.setAttribute('aria-valuetext',`После: ${range.value} процентов`);
  };
  range.addEventListener('input', () => update(range.value));
  const drag = event => { const r = frame.getBoundingClientRect(); update((event.clientX-r.left)/r.width*100); };
  frame.addEventListener('pointerdown', event => { if(event.button!==0)return; frame.setPointerCapture(event.pointerId); drag(event); });
  frame.addEventListener('pointermove', event => { if(frame.hasPointerCapture(event.pointerId))drag(event); });
  frame.addEventListener('pointerup', event => { if(frame.hasPointerCapture(event.pointerId))frame.releasePointerCapture(event.pointerId); });
}

// Progressive enhancement: no hidden content without a functioning observer.
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let revealObserver;
function initReveals() {
  revealObserver?.disconnect();
  document.querySelectorAll('.reveal-pending').forEach(el => el.classList.remove('reveal-pending'));
  if (motionPreference.matches || !('IntersectionObserver' in window)) return;
  const targets = document.querySelectorAll('.section-heading, .project-card, .feature-split > figure, .gallery-item');
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('reveal-pending'); revealObserver.unobserve(entry.target); } });
  }, {rootMargin:'0px 0px 32px 0px',threshold:0.01});
  targets.forEach(el => {
    if (el.getBoundingClientRect().top < innerHeight) return;
    el.classList.add('reveal-item','reveal-pending');
    if (el.matches('.project-card,.gallery-item')) el.style.setProperty('--reveal-delay',Math.min([...el.parentElement.children].indexOf(el)%3*60,120)+'ms');
    revealObserver.observe(el);
  });
}
document.addEventListener('focusin', event => { const target=event.target.closest('.reveal-pending'); if(target){ target.classList.remove('reveal-pending'); revealObserver?.unobserve(target); } });
motionPreference.addEventListener('change',initReveals);
initReveals();
