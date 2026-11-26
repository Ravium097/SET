// Build-time only. Camera frames never reach this script or any remote service.
import { mkdir,readFile,writeFile,copyFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(await readFile(join(root,'rep-tracker.config.json'),'utf8'));
const destination=join(root,'public',config.publicPath.slice(1));
await mkdir(destination,{recursive:true});
const digest=data=>createHash('sha256').update(data).digest('hex');
const target=join(destination,'face_landmarker.task');
let model;try{model=await readFile(target);}catch{}
if(!model||digest(model)!==config.modelSha256){
 const response=await fetch(config.modelUrl,{signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error('Rep model download failed: '+response.status);
 model=Buffer.from(await response.arrayBuffer());
 if(digest(model)!==config.modelSha256)throw new Error('Rep model integrity mismatch');
 await writeFile(target,model);
}
const wasm=join(dirname(fileURLToPath(import.meta.resolve('@mediapipe/tasks-vision'))),'wasm');
await mkdir(join(destination,'wasm'),{recursive:true});
for(const name of await readdir(wasm))if(/\.(js|wasm)$/.test(name))await copyFile(join(wasm,name),join(destination,'wasm',name));
console.log('Local rep-tracking assets prepared (on-demand only).');
