import { useCallback,useEffect,useRef,useState,type MutableRefObject } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { tr } from '../../i18n/runtime';
import { PushUpCounter,stableSample,validCalibration,type FaceSample } from './counter';
import './repTracking.css';
type Stage='off'|'loading'|'top'|'top-hold'|'bottom'|'bottom-hold'|'tracking';
type Props={value:number|null;onReps:(value:number)=>void;stopRef:MutableRefObject<(()=>void)|null>};
export function PushUpRepTracker({value,onReps,stopRef}:Props){
 const [stage,setStage]=useState<Stage>('off'),[message,setMessage]=useState(''),[visible,setVisible]=useState(false),[count,setCount]=useState(0);
 const video=useRef<HTMLVideoElement>(null),epoch=useRef(0),phase=useRef<Stage>('off');
 const resources=useRef<{stream?:MediaStream;model?:FaceLandmarker;frame?:number}>({});
 const latest=useRef({value,onReps});latest.current={value,onReps};
 const lastValue=useRef(value),lastEmitted=useRef<number|null>(null),repetitions=useRef(0);
 const top=useRef<FaceSample|undefined>(undefined),counter=useRef<PushUpCounter|undefined>(undefined),samples=useRef<{face:FaceSample;time:number}[]>([]),holdStart=useRef(0);
 const transition=useCallback((next:Stage)=>{phase.current=next;setStage(next);},[]);
 const release=useCallback(()=>{
  epoch.current++;
  const current=resources.current;resources.current={};
  if(current.frame!==undefined)cancelAnimationFrame(current.frame);
  current.stream?.getTracks().forEach(track=>track.stop());
  if(video.current){video.current.pause();video.current.srcObject=null;}
  try{current.model?.close();}catch{/* Camera tracks are already stopped. */}counter.current=undefined;samples.current=[];top.current=undefined;
 },[]);
 const stop=useCallback(()=>{release();transition('off');setVisible(false);setMessage('');},[release,transition]);
 useEffect(()=>{
  stopRef.current=stop;
  const hidden=()=>{if(document.visibilityState==='hidden')stop();};
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',stop);
  return()=>{if(stopRef.current===stop)stopRef.current=null;document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',stop);release();};
 },[release,stop,stopRef]);
 useEffect(()=>{
  if(value===lastValue.current)return;lastValue.current=value;
  if(phase.current!=='off'&&lastEmitted.current!==value){repetitions.current=value??0;setCount(repetitions.current);counter.current?.reset();}
  lastEmitted.current=null;
 },[value]);
 async function start(){
  if(phase.current!=='off')return;
  release();const token=epoch.current;
  transition('loading');setMessage('');repetitions.current=0;setCount(0);lastValue.current=latest.current.value;lastEmitted.current=null;
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera unavailable');
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'user'},width:{ideal:480},height:{ideal:640},frameRate:{ideal:15,max:24}}});
   if(epoch.current!==token){stream.getTracks().forEach(track=>track.stop());return;}
   resources.current.stream=stream;
   stream.getVideoTracks().forEach(track=>{track.onended=stop;});
   const element=video.current;if(!element)throw new Error('Video unavailable');
   element.muted=true;element.playsInline=true;element.srcObject=stream;await element.play();
   if(epoch.current!==token)return;
   const {createDetector,faceSample}=await import('./detector');
   if(epoch.current!==token)return;
   const model=await createDetector();
   if(epoch.current!==token){model.close();return;}
   resources.current.model=model;transition('top');
   let previousFrame=-1,lastTime=-100;
   const frame=(time:number)=>{
    if(epoch.current!==token)return;
    try{
     if(element.readyState>=2&&element.currentTime!==previousFrame&&time-lastTime>=100){
      previousFrame=element.currentTime;lastTime=time;
      const face=faceSample(model.detectForVideo(element,time),element.videoWidth/element.videoHeight);
      setVisible(!!face);
      if(phase.current==='top-hold'||phase.current==='bottom-hold'){
       if(!face)samples.current=[];else samples.current.push({face,time});
       samples.current=samples.current.filter(sample=>time-sample.time<=1100);
       if(time-holdStart.current>8000){samples.current=[];setMessage('Kalibrierung nicht stabil. Bitte erneut versuchen.');transition(phase.current==='top-hold'?'top':'bottom');}
       else if(samples.current.length>=8&&time-samples.current[0].time>=800){
        const stable=stableSample(samples.current.map(sample=>sample.face));
        if(stable&&phase.current==='top-hold'){top.current=stable;samples.current=[];transition('bottom');}
        else if(stable&&top.current&&validCalibration(top.current,stable)){counter.current=new PushUpCounter({top:top.current,bottom:stable});samples.current=[];transition('tracking');setMessage('');}
        else if(stable&&phase.current==='bottom-hold'){samples.current=[];transition('bottom');setMessage('Abstandsänderung zu klein oder Kopfposition verändert. Bitte neu ansetzen.');}
       }
      }else if(phase.current==='tracking'){
       if(document.activeElement?.matches('.numeric input')){counter.current?.reset();setMessage('Manuelle Eingabe · Erkennung pausiert');}
       else {
        setMessage('');
        if(counter.current?.sample(face,time)){
         const next=++repetitions.current;lastEmitted.current=next;setCount(next);latest.current.onReps(next);
        }
       }
      }
     }
     resources.current.frame=requestAnimationFrame(frame);
    }catch{stop();setMessage('Erkennung nicht verfügbar. Bitte Wiederholungen manuell eingeben.');}
   };
   resources.current.frame=requestAnimationFrame(frame);
  }catch(error){
   if(epoch.current!==token)return;
   stop();setMessage(typeof error==='object'&&error!==null&&'name' in error&&error.name==='NotAllowedError'?'Kein Kamerazugriff. Die manuelle Eingabe bleibt verfügbar.':'Erkennung nicht verfügbar. Bitte Wiederholungen manuell eingeben.');
  }
 }
 function calibrate(){samples.current=[];holdStart.current=performance.now();setMessage('');transition(phase.current==='top'?'top-hold':'bottom-hold');}
 return <div className="rep-tracker">
  <div className="rep-tracker-controls">
   {stage==='off'?<button onClick={()=>void start()}>{tr('Track Reps')}</button>:<button onClick={stop}>{tr('Tracking beenden')}</button>}
   {(stage==='top'||stage==='bottom')&&<button disabled={!visible} onClick={calibrate}>{tr(stage==='top'?'Oben kalibrieren':'Unten kalibrieren')}</button>}
   {stage==='tracking'&&<output aria-label={tr('Automatisch erkannte Wiederholungen')}>{count} {tr('Wdh.')}</output>}
  </div>
  <video ref={video} hidden={stage==='off'} autoPlay muted playsInline className="rep-tracker-video" aria-label={tr('Lokale Kameravorschau')}/>
  {stage==='loading'&&<small role="status">{tr('Kamera und lokales Modell werden vorbereitet …')}</small>}
  {(stage==='top'||stage==='bottom')&&<small>{tr(stage==='top'?'Kamera ruhig platzieren. Gesicht in der oberen Position zur Kamera ausrichten.':'Jetzt die untere Position halten und kalibrieren.')}</small>}
  {(stage==='top-hold'||stage==='bottom-hold')&&<small role="status">{tr('Position ruhig halten …')}</small>}
  {stage==='tracking'&&<small>{tr(visible?'Erkennung aktiv · nur vollständige Bewegungen':'Gesicht nicht vollständig sichtbar · Zählung pausiert')}</small>}
  {stage!=='off'&&<small>{tr('Abstandsschätzung, keine Prüfung der Übungsausführung.')}</small>}
  {stage!=='off'&&<small>{tr('Nur lokal. Keine Aufnahmen. Wiederholungen bleiben manuell korrigierbar.')}</small>}
  {message&&<small role="status">{tr(message)}</small>}
 </div>;
}
