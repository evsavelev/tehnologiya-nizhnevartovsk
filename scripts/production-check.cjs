// Read-only verification of the deployed Pages artifact against the local build.
const fs=require('node:fs');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const base='https://evsavelev.github.io/tehnologiya-nizhnevartovsk/';
const normalized=b=>b.toString('utf8').replaceAll('\r\n','\n');
(async()=>{
 const routes=JSON.parse(fs.readFileSync('data/routes.json'));const checks=[];
 for(const route of routes){
  const r=await fetch(base+route);assert.equal(r.status,200,route);const html=await r.text();
  assert.equal(normalized(html),normalized(fs.readFileSync('dist/'+route+'index.html')),`Public HTML differs: ${route}`);
  assert(html.includes('data-version="2"'));
  assert.equal((html.match(/<h1>/g)||[]).length,1);assert(html.includes(`rel="canonical" href="${base+route}"`));
  JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  if(route)assert(html.includes('aria-label="Хлебные крошки"'));
  checks.push({url:base+route,status:r.status,htmlAndSEOExact:true});
 }
 for(const file of ['assets/app.js','assets/styles.css','assets/form-adapter.js','assets/form-config.js','sitemap.xml','robots.txt','assets/images/vk-497-comparison.jpg']){
  const r=await fetch(base+file);assert.equal(r.status,200,file);const bytes=Buffer.from(await r.arrayBuffer()),local=fs.readFileSync('dist/'+file);
  if(file.endsWith('.jpg'))assert.deepEqual(bytes,local);else assert.equal(normalized(bytes),normalized(local),file);
  if(file.endsWith('form-config.js'))assert(/endpoint:\s*''/.test(bytes.toString()));
  checks.push({url:base+file,status:r.status,exact:true,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
 assert.equal((await fetch(base+'missing-production-check/')).status,404);
 fs.writeFileSync('qa/production-artifact.json',JSON.stringify({date:new Date().toISOString(),base,checks,notFound:404,endpointEmpty:true},null,2));
 console.log('Public artifact: 21 HTML pages + SEO match local build; CSS/JS/config/comparison/sitemap/robots exact; endpoint empty; actual 404.');
})().catch(e=>{console.error(e);process.exit(1)});
