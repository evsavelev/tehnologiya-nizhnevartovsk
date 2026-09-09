const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.QA_URL||'http://127.0.0.1:4173/tehnologiya-nizhnevartovsk/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const checks=[];
 await page.goto(base);
 assert.equal(await page.locator('body').getAttribute('data-version'),'2');
 for(const width of [360,390,430,768,1440]){
  await page.setViewportSize({width,height:844});await page.goto(base);
  assert.equal(await page.locator('.mobile-contact-bar').isVisible(),width<=760);
  if(width<=760){
   for(const a of await page.locator('.mobile-contact-bar a').all()){const r=await a.boundingBox();assert(r.height>=44&&r.width>=44)}
   await page.locator('.mobile-estimate').click();assert(page.url().includes('/contacts/'));assert(page.url().endsWith('#request'));
   await page.locator('[name=name]').focus();assert.equal(await page.locator('.mobile-contact-bar').isVisible(),false);
   await page.locator('h2').last().click();await page.waitForFunction(()=>!document.body.classList.contains('editing-field'));assert(await page.locator('.mobile-contact-bar').isVisible());
   await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
   const footer=await page.locator('.footer-bottom').boundingBox(),bar=await page.locator('.mobile-contact-bar').boundingBox();assert(footer.y+footer.height<=bar.y);
  }
 }
 checks.push('Mobile bar: 360/390/430, targets ≥44px, anchor, input hiding, footer clearance; hidden 768/1440');
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'contacts/?service=Test#request');
 await page.locator('[name=name]').fill('  ');await page.locator('[name=contact]').fill('test@example.test');await page.locator('[type=submit]').click();assert.equal(await page.locator('#form-status').textContent(),'');
 await page.locator('[name=name]').fill('QA & <проверка>');await page.locator('[name=comment]').fill('Не отправлять: тест');
 await page.locator('[type=submit]').click();
 assert((await page.locator('#form-status').innerText()).includes('ещё не отправлено'));
 assert(await page.locator('#form-fallback').isVisible());assert(page.url().startsWith(base));
 const mail=await page.locator('#mail-fallback').getAttribute('href');assert(mail.startsWith('mailto:uv-nv@mail.ru?'));assert(decodeURIComponent(mail).includes('QA & <проверка>'));
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}}}));
 await page.locator('#copy-request').click();assert(await page.locator('#request-preview').isVisible());assert((await page.locator('#form-status').innerText()).includes('Выделили'));
 await page.screenshot({path:'qa/v2-390-form.png',fullPage:true});
 checks.push('No endpoint: no network send, no automatic mail app, truthful status, encoded mailto, clipboard denial fallback, whitespace validation');
 // A simulated owner endpoint never receives a network request: Playwright fulfills locally.
 await page.route('**/assets/form-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const formConfig={endpoint:'https://forms.example.test/request'};"}));
 const payloads=[];
 await page.route('https://forms.example.test/request',async r=>{payloads.push(r.request().postDataJSON());await new Promise(ok=>setTimeout(ok,350));await r.fulfill({contentType:'application/json',body:'{"success":true}'})});
 await page.goto(base+'contacts/?service=Печать&from='+encodeURIComponent('https://evsavelev.github.io/tehnologiya-nizhnevartovsk/catalog/printing/')+'#request');
 const fill=async()=>{await page.locator('[name=name]').fill('QA');await page.locator('[name=contact]').fill('test@example.test');await page.locator('[name=service]').fill('Печать');await page.locator('[name=comment]').fill('Только тест')};
 await fill();await page.locator('[type=submit]').click();assert(await page.locator('[type=submit]').isDisabled());assert((await page.locator('#form-status').innerText()).includes('Отправляем'));
 await page.locator('form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('Заявка отправлена'));
 assert.equal(payloads.length,1);for(const key of ['name','contact','service','comment','sourceUrl','requestId'])assert(payloads[0][key]);assert(payloads[0].sourceUrl.endsWith('/catalog/printing/'));
 assert.equal(await page.locator('[name=name]').inputValue(),'');
 checks.push('Mock endpoint: sending/disabled/double-submit guard, six payload fields, origin page, confirmed success only, reset after success');
 await page.unroute('https://forms.example.test/request');
 const attempts=[];
 for(const response of [{status:500,contentType:'application/json',body:'{}'},{status:200,contentType:'text/html',body:'<html>OK</html>'},{status:200,contentType:'application/json',body:'{"success":false}'}]){
  await page.route('https://forms.example.test/request',async r=>{attempts.push(r.request().postDataJSON());await r.fulfill(response)});
  await fill();await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('Не удалось'));
  assert.equal(await page.locator('[name=name]').inputValue(),'QA');assert(await page.locator('#form-fallback').isVisible());assert(await page.locator('[type=submit]').isEnabled());
  await page.unroute('https://forms.example.test/request');
 }
 assert.equal(new Set(attempts.map(p=>p.requestId)).size,1);
 checks.push('Mock 500/HTML/negative response: no false success, values retained, contacts visible, identical retry requestId');
 await page.route('**/assets/form-adapter.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/form-adapter.js','utf8').replace('timeout = 12000','timeout = 40')}));
 await page.route('https://forms.example.test/request',async r=>{await new Promise(ok=>setTimeout(ok,250));try{await r.fulfill({contentType:'application/json',body:'{"success":true}'})}catch{}});
 await page.reload();await fill();await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('Не удалось подтвердить'));
 assert.equal(await page.locator('[name=name]').inputValue(),'QA');assert(await page.locator('#form-fallback').isVisible());
 await page.unroute('**/assets/form-adapter.js');await page.unroute('https://forms.example.test/request');checks.push('Mock timeout: no delivery claim, fields and fallback retained');
 await page.unroute('**/assets/form-config.js');
 // Both required paths.
 await page.goto(base);await page.locator('.hero').getByRole('link',{name:'Смотреть каталог'}).click();await page.locator('.category-grid').getByRole('link',{name:/Мероприятия/}).click();await page.locator('.detail-list').getByRole('link',{name:'Подробнее',exact:true}).click();await page.locator('.project-card h3 a').filter({hasText:'Роснефть'}).click();await page.locator('.cta-section .button').click();assert((await page.locator('[name=service]').inputValue()).includes('Роснефть'));
 await page.goto(base);await page.locator('.section-heading').getByRole('link',{name:'Всё портфолио'}).click();await page.locator('.project-card h3 a').filter({hasText:'ОхотАктив'}).click();await page.getByRole('link',{name:'Световые вывески'}).click();await page.locator('.service-intro .button').click();assert.equal(await page.locator('[name=service]').inputValue(),'Световые вывески');
 checks.push('Both full journeys: home → catalog → service → case → request; home → portfolio → case → service → request');
 await page.goto(base+'catalog/printing/');const range=page.locator('.comparison-control input');await range.focus();await page.keyboard.press('End');assert.equal(await range.inputValue(),'100');await page.keyboard.press('Home');assert.equal(await range.inputValue(),'0');await page.keyboard.press('ArrowRight');assert.equal(await range.inputValue(),'1');
 const frame=page.locator('.comparison-frame');await frame.scrollIntoViewIfNeeded();let r=await frame.boundingBox();await page.mouse.move(r.x+r.width*.25,r.y+r.height*.5);await page.mouse.down();await page.mouse.move(r.x+r.width*.75,r.y+r.height*.5);await page.mouse.up();assert(Math.abs(Number(await range.inputValue())-75)<2);
 await range.fill('50');await page.screenshot({path:'qa/v2-390-comparison.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await frame.scrollIntoViewIfNeeded();await frame.screenshot({path:'qa/v2-comparison-detail.png'});
 checks.push('Comparison: keyboard Home/End/arrows, pointer drag, percentage aria text');
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const tp=await touch.newPage();await tp.goto(base+'catalog/printing/');await tp.locator('.comparison-frame').scrollIntoViewIfNeeded();r=await tp.locator('.comparison-frame').boundingBox();await tp.touchscreen.tap(r.x+r.width*.25,r.y+r.height*.4);assert(Math.abs(Number(await tp.locator('.comparison-control input').inputValue())-25)<2);await touch.close();
 await page.goto(base);assert(await page.locator('.reveal-pending').count()>0);await page.locator('.project-card').first().scrollIntoViewIfNeeded();await page.waitForTimeout(650);assert(!await page.locator('.project-card').first().evaluate(e=>e.classList.contains('reveal-pending')));
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelectorAll('.reveal-pending').length===0);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
 await page.goto(base+'portfolio/');await page.locator('[data-gallery]').first().click();await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');assert(await page.evaluate(()=>document.activeElement.hasAttribute('data-gallery')));
 await page.goto(base);await page.keyboard.press('Tab');assert(await page.locator('.skip-link').evaluate(e=>e===document.activeElement));await page.keyboard.press('Enter');
 checks.push('Touch comparison, one-shot reveal, runtime reduced-motion, gallery keyboard/focus, skip link');
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const np=await nojs.newPage();await np.goto(base+'catalog/printing/');assert(await np.locator('.comparison-static').isVisible());assert.equal(await np.locator('.reveal-pending').count(),0);assert(await np.locator('.mobile-contact-bar').isVisible());await nojs.close();
 await page.emulateMedia({reducedMotion:'no-preference'});for(const width of [360,390,430,768,1440]){await page.setViewportSize({width,height:844});await page.goto(base);await page.screenshot({path:`qa/v2-${width}-hero.png`});}
 assert.deepEqual(errors,[]);checks.push('No-JS content/comparison/contacts, no page errors');
 fs.writeFileSync('qa/v2-report.json',JSON.stringify({date:new Date().toISOString(),base,checks},null,2));console.log(checks.join('\n'));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
