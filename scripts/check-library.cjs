const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4181', '--strictPort'], {stdio:'ignore'});
const origin='http://127.0.0.1:4181';
(async()=>{
 let ready=false;for(let n=0;n<50;n++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready);
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:393,height:852}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(origin+'/library');await page.getByText('Mehr Übungen & Geräte',{exact:true}).click();await page.getByRole('button',{name:'Übungsbibliothek erweitern'}).click();await page.getByText(/Übungen ergänzt/).waitFor();assert.equal(await page.locator('main > article').count(),169);
  await page.getByPlaceholder('Übung suchen',{exact:true}).fill('smith bench');await page.getByRole('heading',{name:'Bankdrücken an der Multipresse',exact:true}).waitFor();assert.equal(await page.locator('main > article').count(),1);
  await page.getByPlaceholder('Übung suchen',{exact:true}).fill('');await page.getByLabel('Gerät filtern').selectOption('Kettlebell');assert.equal(await page.locator('main > article').count(),4);
  await page.getByLabel('Gerät filtern').selectOption('');
  await page.goto(origin+'/settings');const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'JSON-Backup exportieren'}).click();const download=await downloadPromise;const fs=require('node:fs');const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));const exercise=backup.exercises.find(e=>e.name==='Bankdrücken an der Multipresse');
  function workout(id,status,date,started,weight,reps,completed){return {id,status,date,started,name:'Vergleichstest',duration:null,exercises:[{id:id+'-item',exerciseId:exercise.id,name:exercise.name,sets:[{id:id+'-set',weight,reps,completed}]}]};}
  backup.workouts=[workout('prior','completed','2026-11-15',100,52.5,8,true),workout('active','active','2026-11-16',200,null,null,false)];
  await page.locator('input[type=file]').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForTimeout(250);
  await page.goto(origin+'/workout/active');await page.getByText(/52,5 kg × 8/).waitFor();assert.equal(await page.getByLabel('Gewicht',{exact:true}).inputValue(),'');await page.getByRole('button',{name:'Letzte Satzwerte übernehmen'}).click();await page.getByText('Gespeichert',{exact:true}).waitFor();await page.reload();assert.equal(await page.getByLabel('Gewicht',{exact:true}).inputValue(),'52.5');assert.equal(await page.getByLabel('Wiederholungen',{exact:true}).inputValue(),'8');assert.equal(await page.getByLabel('Satz abgeschlossen').isChecked(),false);
  const editor=await context.newPage();await editor.goto(origin+'/workout/prior');await editor.getByLabel('Gewicht',{exact:true}).fill('60');await editor.getByLabel('Gewicht',{exact:true}).blur();await editor.getByText('Gespeichert',{exact:true}).waitFor();await page.getByText(/60 kg × 8/).waitFor();assert.equal(await page.getByLabel('Gewicht',{exact:true}).inputValue(),'52.5');
  for(const width of [320,393,402,820]){await page.setViewportSize({width,height:852});const bounds=await page.locator('main').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.equal(bounds.width,bounds.scroll,JSON.stringify(bounds));}
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await editor.close();await context.setOffline(true);await page.reload();await page.getByText(/60 kg × 8/).waitFor();await page.getByRole('link',{name:'Training',exact:true}).click();await page.getByRole('link',{name:/Übungsbibliothek/}).click();await page.getByPlaceholder('Übung suchen',{exact:true}).fill('smith bench');await page.getByRole('heading',{name:'Bankdrücken an der Multipresse',exact:true}).waitFor();assert.deepEqual(errors,[]);
  console.log('PASS: 169 exercises, English search, device filters, backup, previous values, explicit copy, autosave/reload, live historical edits, mobile widths and offline library/history.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
