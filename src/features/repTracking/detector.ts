import config from '../../../rep-tracker.config.json';
import type { FaceSample } from './counter';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
export async function createDetector(){
 const {FaceLandmarker,FilesetResolver}=await import('@mediapipe/tasks-vision');
 const files=await FilesetResolver.forVisionTasks(config.publicPath+'/wasm');
 return FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:config.publicPath+'/face_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:2,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5,outputFacialTransformationMatrixes:true});
}
export function faceSample(result:FaceLandmarkerResult,aspect:number):FaceSample|undefined{
 if(result.faceLandmarks.length!==1)return;
 const points=result.faceLandmarks[0],left=points[33],right=points[263],top=points[10],bottom=points[152],nose=points[1];
 const matrix=result.facialTransformationMatrixes[0]?.data;
 if(!Number.isFinite(aspect)||aspect<=0||!left||!right||!top||!bottom||!nose||!matrix||matrix.length!==16||matrix.some(value=>!Number.isFinite(value)))return;
 // Hairline/chin may touch the frame while the central face is still usable.
 // Require visible eyes/nose and bounded, finite outer landmarks instead.
 if([left,right,top,bottom,nose].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return;
 if([left,right,nose].some(p=>p.x<=0||p.x>=1||p.y<=0||p.y>=1))return;
 if([top,bottom].some(p=>p.x<-.1||p.x>1.1||p.y<-.1||p.y>1.1))return;
 const distance=(a:typeof left,b:typeof left)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);
 const scale=Math.sqrt(distance(left,right)*distance(top,bottom));
 if(!Number.isFinite(scale)||scale<.045)return;
 return {scale,x:(left.x+right.x)/2,y:(top.y+bottom.y)/2,yaw:Math.atan2(-matrix[2],Math.hypot(matrix[0],matrix[1])),pitch:Math.atan2(matrix[6],matrix[10]),roll:Math.atan2(matrix[1],matrix[0])};
}
