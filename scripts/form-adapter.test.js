import test from 'node:test';
import assert from 'node:assert/strict';
import {sendRequest} from '../src/form-adapter.js';
test('never send to missing/insecure/credential-bearing endpoint',async()=>{
 for(const endpoint of ['', 'invalid','http://example.test','https://user:secret@example.test']) await assert.rejects(sendRequest(endpoint,{}, {fetcher:()=>assert.fail('must not fetch')}));
});
test('JSON POST, explicit confirmation and no ambient credentials',async()=>{
 const payload={name:'A',contact:'B',service:'C',comment:'D',sourceUrl:'https://site.test/'};
 await sendRequest('https://forms.example.test',payload,{fetcher:async(url,options)=>{
  assert.equal(options.method,'POST');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.deepEqual(JSON.parse(options.body),payload);
  return new Response('{"success":true}',{status:200});
 }});
 for(const body of ['{}','{"success":false}','OK'])await assert.rejects(sendRequest('https://forms.example.test',payload,{fetcher:async()=>new Response(body)}));
});
test('timeout aborts stalled requests; network failures are classified',async()=>{
 await assert.rejects(sendRequest('https://forms.example.test',{}, {timeout:15,fetcher:(_url,{signal})=>new Promise((_ok,fail)=>signal.addEventListener('abort',()=>fail(new Error('aborted'))))}),e=>e.code==='timeout');
 await assert.rejects(sendRequest('https://forms.example.test',{}, {fetcher:async()=>{throw new TypeError('offline')}}),e=>e.code==='network');
});
