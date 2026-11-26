import {expect,it} from 'vitest';
import {PushUpCounter,isPushUp,stableSample,validCalibration,type FaceSample} from '../features/repTracking/counter';
const face=(scale:number,patch:Partial<FaceSample>={}):FaceSample=>({scale,x:.5,y:.5,yaw:0,pitch:0,roll:0,...patch});
const calibration={top:face(.1),bottom:face(.2)};
function run(counter:PushUpCounter,values:(FaceSample|undefined)[],start=0){let reps=0;values.forEach((value,i)=>{if(counter.sample(value,start+i*100))reps++;});return reps;}
const hold=<T extends FaceSample|undefined>(value:T,n=12)=>Array.from({length:n},()=>value);
it('shows the entry only for basic push-up names',()=>{
 for(const name of ['Push-ups','Push Ups','Push Up','Pushup','Liegestütze','Liegestuetze'])expect(isPushUp(name)).toBe(true);
 for(const name of ['Bench Press','Wide Push Up','Incline Push Up','Breite Liegestütze',''])expect(isPushUp(name)).toBe(false);
});
it('requires stable, sufficiently different calibration endpoints',()=>{
 expect(validCalibration(calibration.top,calibration.bottom)).toBe(true);
 expect(validCalibration(face(.1),face(.11))).toBe(false);expect(validCalibration(face(.1),face(.2,{yaw:.7}))).toBe(false);
 expect(stableSample([face(.1)])).toBeUndefined();expect(stableSample([...hold(face(.1)),face(.2)])).toBeUndefined();
});
it('counts top-bottom-top cycles once and ignores stationary or bottom jitter',()=>{
 expect(run(new PushUpCounter(calibration),[...hold(face(.1)),...hold(face(.2)),...hold(face(.1)),...hold(face(.2)),...hold(face(.1))])).toBe(2);
 expect(run(new PushUpCounter(calibration),Array.from({length:80},(_,i)=>face(.1+(i%2)*.005)))).toBe(0);
 expect(run(new PushUpCounter(calibration),[...hold(face(.1)),...Array.from({length:60},(_,i)=>face(.18+(i%2)*.015))])).toBe(0);
});
it('never bridges face loss, large pose shifts, partial motions or frame gaps',()=>{
 for(const breakFrame of [undefined,face(.2,{yaw:.8}),face(.2,{x:.9})])expect(run(new PushUpCounter(calibration),[...hold(face(.1)),...hold(face(.2)),...hold(breakFrame,3),...hold(face(.1))])).toBe(0);
 expect(run(new PushUpCounter(calibration),[...hold(face(.2)),...hold(face(.1))])).toBe(0);
 expect(run(new PushUpCounter(calibration),[...hold(face(.1)),...hold(face(.145)),...hold(face(.1))])).toBe(0);
 const counter=new PushUpCounter(calibration);run(counter,[...hold(face(.1)),...hold(face(.2))]);expect(run(counter,hold(face(.1)),5000)).toBe(0);
});
