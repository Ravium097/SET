export type FaceSample={scale:number;x:number;y:number;yaw:number;pitch:number;roll:number};
export type Calibration={top:FaceSample;bottom:FaceSample};
export const isPushUp=(name:string)=>/^(push[ -]?ups?|liegest(?:ü|ue|u)tze)$/i.test(name.trim());
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
export function stableSample(samples:FaceSample[]):FaceSample|undefined{
 if(samples.length<8)return;
 const scale=median(samples.map(s=>s.scale));
 if(samples.some(s=>Math.abs(s.scale-scale)>scale*.06))return;
 const result={scale,x:median(samples.map(s=>s.x)),y:median(samples.map(s=>s.y)),yaw:median(samples.map(s=>s.yaw)),pitch:median(samples.map(s=>s.pitch)),roll:median(samples.map(s=>s.roll))};
 if(samples.some(s=>!samePose(s,result)))return;
 return result;
}
const angleDistance=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
export function samePose(sample:FaceSample,reference:FaceSample):boolean{
 return Math.abs(sample.x-reference.x)<.18&&Math.abs(sample.y-reference.y)<.18&&['yaw','pitch','roll'].every(key=>angleDistance(sample[key as 'yaw'],reference[key as 'yaw'])<.32);
}
export function validCalibration(top:FaceSample,bottom:FaceSample):boolean{
 return bottom.scale>=top.scale*1.2&&bottom.scale<=top.scale*3&&samePose(top,bottom);
}
/** Full top → bottom → top cycles; no counting during calibration or face loss. */
export class PushUpCounter{
 private phase:'seek-top'|'top'|'bottom'='seek-top';
 private smooth:number|undefined;
 private dwellStart:number|undefined;private dwellFrames=0;
 private last:number|undefined;private cycleStart=0;private bottomAt=0;
 guidance:'seek-top'|'top'|'bottom'|'alignment'|'face'='seek-top';
 constructor(private calibration:Calibration){}
 reset(){this.phase='seek-top';this.smooth=undefined;this.clearDwell();this.last=undefined;this.guidance='seek-top';}
 private clearDwell(){this.dwellStart=undefined;this.dwellFrames=0;}
 private endpoint(matches:boolean,time:number){
  if(!matches){this.clearDwell();return false;}
  this.dwellStart??=time;this.dwellFrames++;
  return this.dwellFrames>=2&&time-this.dwellStart>=60;
 }
 sample(face:FaceSample|undefined,time:number):boolean{
  const {top,bottom}=this.calibration;
  if(!face){this.reset();this.guidance='face';return false;}
  if(!samePose(face,top)||face.scale<top.scale*.65||face.scale>bottom.scale*1.35){this.reset();this.guidance='alignment';return false;}
  if(this.last!==undefined&&(time-this.last>350||time<=this.last))this.reset();
  const dt=this.last===undefined?100:time-this.last;this.last=time;
  // Time-based smoothing avoids the old multi-frame lag at natural cadence.
  const alpha=1-Math.exp(-dt/70);
  this.smooth=this.smooth===undefined?face.scale:this.smooth+(face.scale-this.smooth)*alpha;
  const progress=(this.smooth-top.scale)/(bottom.scale-top.scale);
  const upper=progress<=.2,lower=progress>=.8;
  this.guidance=this.phase;
  if(this.phase==='seek-top'){
   if(this.endpoint(upper,time)){this.phase='top';this.cycleStart=time;this.clearDwell();this.guidance='top';}
   return false;
  }
  // Time out movement, not an intentional pause in the upper position.
  if(upper&&this.phase==='top')this.cycleStart=time;
  if(time-this.cycleStart>12000){this.reset();return false;}
  if(this.phase==='top'){
   if(this.endpoint(lower,time)&&time-this.cycleStart>=250){this.phase='bottom';this.bottomAt=time;this.clearDwell();this.guidance='bottom';}
   return false;
  }
  if(this.endpoint(upper,time)&&time-this.bottomAt>=250&&time-this.cycleStart>=650){
   // This confirmed upper endpoint also arms the next cycle. Do not discard it.
   this.phase='top';this.cycleStart=time;this.clearDwell();this.guidance='top';return true;
  }
  return false;
 }
}
