// @vitest-environment jsdom
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import {PushUpRepTracker} from '../features/repTracking/PushUpRepTracker';
const {create,close,detect,sample}=vi.hoisted(()=>({create:vi.fn(),close:vi.fn(),detect:vi.fn(),sample:vi.fn()}));
vi.mock('../features/repTracking/detector',()=>({createDetector:create,faceSample:sample}));
const stop=vi.fn();const stream={getTracks:()=>[{stop}],getVideoTracks:()=>[{stop,onended:null}]};
let frame:FrameRequestCallback|undefined,time=0;
const stopRef={current:null as (()=>void)|null};
const face=(scale:number)=>({scale,x:.5,y:.5,yaw:0,pitch:0,roll:0});
async function frames(scale:number,count=12){for(let i=0;i<count;i++){time+=100;sample.mockReturnValue(face(scale));await act(async()=>{frame?.(time);});}}
beforeEach(()=>{
 create.mockResolvedValue({detectForVideo:detect,close});sample.mockReturnValue(face(.1));time=0;frame=undefined;stopRef.current=null;
 vi.spyOn(performance,'now').mockImplementation(()=>time);
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frame=callback;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{frame=undefined;});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn().mockResolvedValue(stream)}});
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
 Object.defineProperty(HTMLMediaElement.prototype,'readyState',{configurable:true,get:()=>2});Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{configurable:true,get:()=>time/1000});
 Object.defineProperty(HTMLVideoElement.prototype,'videoWidth',{configurable:true,get:()=>640});Object.defineProperty(HTMLVideoElement.prototype,'videoHeight',{configurable:true,get:()=>480});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.clearAllMocks();});
it('does not request camera or load the model until the button is tapped',async()=>{
 const view=render(<PushUpRepTracker value={12} onReps={vi.fn()} stopRef={stopRef}/>);
 expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Track Reps'}));await waitFor(()=>expect(create).toHaveBeenCalledTimes(1));
 expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({audio:false}));
 view.unmount();expect(stop).toHaveBeenCalled();expect(close).toHaveBeenCalledTimes(1);
});
it('keeps manual input available after denied permission and never loads the model',async()=>{
 vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(new DOMException('Denied','NotAllowedError'));
 render(<PushUpRepTracker value={8} onReps={vi.fn()} stopRef={stopRef}/>);fireEvent.click(screen.getByText('Track Reps'));
 await screen.findByText('Kein Kamerazugriff. Die manuelle Eingabe bleibt verfügbar.');expect(create).not.toHaveBeenCalled();
});
it('calibrates, counts from zero instead of a carried-over target, and accepts manual corrections',async()=>{
 const update=vi.fn();const view=render(<PushUpRepTracker value={12} onReps={update} stopRef={stopRef}/>);
 fireEvent.click(screen.getByText('Track Reps'));await waitFor(()=>expect(create).toHaveBeenCalled());await frames(.1,1);
 fireEvent.click(screen.getByText('Oben kalibrieren'));await frames(.1,12);
 fireEvent.click(screen.getByText('Unten kalibrieren'));await frames(.2,12);await screen.findByLabelText('Automatisch erkannte Wiederholungen');
 await frames(.1);expect(update).not.toHaveBeenCalled();expect(screen.getByText('Obere Position erkannt · jetzt absenken.')).toBeTruthy();await frames(.2);expect(screen.getByText('Untere Position erkannt · jetzt nach oben.')).toBeTruthy();await frames(.1);expect(update).toHaveBeenLastCalledWith(1);
 view.rerender(<PushUpRepTracker value={1} onReps={update} stopRef={stopRef}/>);
 view.rerender(<PushUpRepTracker value={7} onReps={update} stopRef={stopRef}/>);await frames(.1);await frames(.2);await frames(.1);expect(update).toHaveBeenLastCalledWith(8);
 view.rerender(<PushUpRepTracker value={8} onReps={update} stopRef={stopRef}/>);
 view.rerender(<PushUpRepTracker value={1} onReps={update} stopRef={stopRef}/>);await frames(.1);await frames(.2);await frames(.1);expect(update).toHaveBeenLastCalledWith(2);
 act(()=>stopRef.current?.());expect(stop).toHaveBeenCalled();expect(close).toHaveBeenCalled();
});
it('stops a permission request that resolves after cancellation',async()=>{
 let grant:(value:MediaStream)=>void=()=>{};vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValueOnce(new Promise(resolve=>{grant=resolve;}));
 render(<PushUpRepTracker value={null} onReps={vi.fn()} stopRef={stopRef}/>);fireEvent.click(screen.getByText('Track Reps'));fireEvent.click(screen.getByText('Tracking beenden'));
 await act(async()=>{grant(stream as unknown as MediaStream);});expect(stop).toHaveBeenCalled();expect(create).not.toHaveBeenCalled();
});
it('closes the camera when the page becomes hidden',async()=>{
 render(<PushUpRepTracker value={null} onReps={vi.fn()} stopRef={stopRef}/>);fireEvent.click(screen.getByText('Track Reps'));await waitFor(()=>expect(create).toHaveBeenCalled());
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});fireEvent(document,new Event('visibilitychange'));expect(stop).toHaveBeenCalled();expect(screen.getByText('Track Reps')).toBeTruthy();
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
});
it('releases a model that finishes loading after tracking has been stopped',async()=>{
 let ready:(model:unknown)=>void=()=>{};create.mockReturnValueOnce(new Promise(resolve=>{ready=resolve;}));
 render(<PushUpRepTracker value={null} onReps={vi.fn()} stopRef={stopRef}/>);fireEvent.click(screen.getByText('Track Reps'));await waitFor(()=>expect(create).toHaveBeenCalled());
 fireEvent.click(screen.getByText('Tracking beenden'));await act(async()=>{ready({detectForVideo:detect,close});});
 expect(close).toHaveBeenCalledTimes(1);expect(stop).toHaveBeenCalled();expect(screen.getByText('Track Reps')).toBeTruthy();
});
it('stops the camera if the model cannot initialize',async()=>{
 create.mockRejectedValueOnce(new Error('WASM unavailable'));
 render(<PushUpRepTracker value={9} onReps={vi.fn()} stopRef={stopRef}/>);fireEvent.click(screen.getByText('Track Reps'));
 await screen.findByText('Erkennung nicht verfügbar. Bitte Wiederholungen manuell eingeben.');expect(stop).toHaveBeenCalled();expect(screen.getByText('Track Reps')).toBeTruthy();
});
