import {expect,it} from 'vitest';
import type {FaceLandmarkerResult} from '@mediapipe/tasks-vision';
import {faceSample} from '../features/repTracking/detector';
function result():FaceLandmarkerResult{
 const points=Array.from({length:478},()=>({x:.5,y:.5,z:0,visibility:1}));
 points[33]={x:.3,y:.45,z:0,visibility:1};points[263]={x:.7,y:.45,z:0,visibility:1};points[10]={x:.5,y:.1,z:0,visibility:1};points[152]={x:.5,y:.9,z:0,visibility:1};
 return {faceLandmarks:[points],faceBlendshapes:[],facialTransformationMatrixes:[{rows:4,columns:4,data:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}]};
}
it('accepts a tracked face with visible eyes/nose when the hairline touches the frame',()=>{
 const input=result();input.faceLandmarks[0][10].y=.01;
 expect(faceSample(input,.75)).toBeDefined();
 input.faceLandmarks[0][10].y=-.04;
 expect(faceSample(input,.75)).toBeDefined();
});
it('rejects missing/multiple faces, invisible eyes, invalid geometry and missing pose',()=>{
 const input=result();expect(faceSample(input,.75)).toBeDefined();
 input.faceLandmarks.push(input.faceLandmarks[0]);expect(faceSample(input,.75)).toBeUndefined();input.faceLandmarks.pop();
 input.faceLandmarks[0][33].x=-.01;expect(faceSample(input,.75)).toBeUndefined();
 input.faceLandmarks[0][33].x=.3;input.faceLandmarks[0][10].y=NaN;expect(faceSample(input,.75)).toBeUndefined();
 expect(faceSample(result(),NaN)).toBeUndefined();
 const noPose=result();noPose.facialTransformationMatrixes=[];expect(faceSample(noPose,.75)).toBeUndefined();
 expect(faceSample({...result(),faceLandmarks:[]},.75)).toBeUndefined();
});
