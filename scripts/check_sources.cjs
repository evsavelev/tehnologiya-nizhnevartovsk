const { chromium } = require('@playwright/test');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'ru-RU'});
 for(const [name,url] of [['2gis','https://2gis.ru/nizhnevartovsk/firm/1689379141646209'],['vk','https://vk.com/technologynv']]) {
  try {
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(4000);
   const phone=page.getByText('Показать телефоны',{exact:true});if(await phone.count()) await phone.first().click();
   fs.writeFileSync('source-media/'+name+'-visible.txt',await page.locator('body').innerText());
   fs.writeFileSync('source-media/'+name+'-links.json',JSON.stringify(await page.locator('a[href]').evaluateAll(a=>a.map(x=>({text:x.textContent,url:x.href}))),null,2));
   await page.screenshot({path:'source-media/'+name+'.png'});
   console.log(name,(await page.locator('body').innerText()).slice(0,9000));
  }catch(e){console.log(name,e.message)}
 }
 await browser.close();
})();
