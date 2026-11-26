import config from '../../../rep-tracker.config.json';
import type { FaceSample } from './counter';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
export async function createDetector(){
 const {FaceLandmarker,FilesetResolver}=await import('@mediapipe/tasks-vision');
 const files=await FilesetResolver.forVisionTasks(config.publicPath+'/wasm');
 return FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:config.publicPath+'/face_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:2,minFaceDetectionConfidence:.7,minFacePresenceConfidence:.7,minTrackingConfidence:.7,outputFacialTransformationMatrixes:true});
}
export function faceSample(result:FaceLandmarkerResult,aspect:number):FaceSample|undefined{
 if(result.faceLandmarks.length!==1)return;
 const points=result.faceLandmarks[0],left=points[33],right=points[263],top=points[10],bottom=points[152];
 const matrix=result.facialTransformationMatrixes[0]?.data;
 if(!left||!right||!top||!bottom||!matrix||matrix.length!==16||matrix.some(value=>!Number.isFinite(value)))return;
 if([left,right,top,bottom].some(p=>p.x<.025||p.x>.975||p.y<.025||p.y>.975))return;
 const distance=(a:typeof left,b:typeof left)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);
 const scale=Math.sqrt(distance(left,right)*distance(top,bottom));
 if(!Number.isFinite(scale)||scale<.045)return;
 return {scale,x:(left.x+right.x)/2,y:(top.y+bottom.y)/2,yaw:Math.atan2(-matrix[2],Math.hypot(matrix[0],matrix[1])),pitch:Math.atan2(matrix[6],matrix[10]),roll:Math.atan2(matrix[1],matrix[0])};
}
