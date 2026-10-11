import {imageValid} from './security.js';

export function reinforcementImages(body){
 const fail=message=>{throw Object.assign(new Error(message),{status:400});};
 // The previous Android build still posts a single image.
 const images=body.images===undefined?(body.image===undefined?[]:[body.image]):body.images;
 if(!Array.isArray(images)||images.length<1||images.length>20)fail('Selecciona entre 1 y 20 imágenes por actividad.');
 if(images.some(image=>!imageValid(image)))fail('Cada imagen debe ser una foto JPG, PNG o WebP de hasta 3 MB.');
 if(images.reduce((total,image)=>total+image.length,0)>28_000_000)fail('El conjunto supera 20 MB. Quita alguna imagen o utiliza fotos más pequeñas.');
 return images;
}
