// Isolated browser profile: current BASE themes, safe areas and offline persistence.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const origin=process.env.SET_TEST_ORIGIN||'http://127.0.0.1:4183';
const server=process.env.SET_TEST_ORIGIN?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4183','--strictPort'],{stdio:'ignore'});
(async()=>{let browser;try{
 for(let n=0;n<50;n++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [theme,color] of [['swiss','rgb(245, 245, 247)'],['midnight','rgb(16, 17, 19)']]){
  await page.goto(origin+'/settings');await page.getByLabel('Design',{exact:true}).selectOption(theme);
  await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);
  await page.reload();await page.getByLabel('Design',{exact:true}).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
  const backgrounds=await page.evaluate(()=>['html','body','#root'].map(selector=>getComputedStyle(document.querySelector(selector)).backgroundColor));
  assert(backgrounds.every(value=>value===color),JSON.stringify(backgrounds));
  for(const width of [320,393,820]){
   await page.setViewportSize({width,height:852});
   for(const route of ['/','/training','/progress','/progress/muscles','/settings']){
    await page.goto(origin+route);await page.locator('.app-dock nav').waitFor();await page.getByRole('status').filter({hasText:'Laden …'}).waitFor({state:'hidden'}).catch(()=>{});
    const layout=await page.evaluate(()=>{const main=document.querySelector('main'),dock=document.querySelector('.app-dock'),m=main.getBoundingClientRect(),d=dock.getBoundingClientRect();return {overflow:main.scrollWidth>main.clientWidth+1,overlap:m.bottom>d.top+1,bar:getComputedStyle(main).scrollbarWidth};});
    assert(!layout.overflow,`${theme} ${width} ${route} horizontal overflow`);assert(!layout.overlap,'Dock overlaps content');
   }
  }
  await page.goto(origin+'/');await page.screenshot({path:`/tmp/base31-${theme}.png`,fullPage:false});
 }
 await page.goto(origin+'/settings');await page.getByLabel('Design',{exact:true}).selectOption('system');await page.emulateMedia({colorScheme:'light'});
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='swiss');await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='midnight');
 await page.goto(origin+'/training');await page.getByRole('button',{name:'Freies Training starten',exact:true}).click();await page.getByRole('heading',{name:'Im Training'}).waitFor();
 const url=page.url();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);await page.reload();await page.getByRole('heading',{name:'Im Training'}).waitFor();assert.equal(page.url(),url);
 await page.getByLabel('Name',{exact:true}).fill('Offline QA');await page.getByText('Gespeichert',{exact:true}).waitFor();await page.reload();assert.equal(await page.getByLabel('Name',{exact:true}).inputValue(),'Offline QA');
 assert.deepEqual(errors,[]);console.log('PASS: light/dark/system, 320/393/820px, safe viewport, dock, screenshots, offline active-workout restore/save.');
 }finally{await browser?.close();server?.kill();}})().catch(error=>{console.error(error);process.exitCode=1;});
