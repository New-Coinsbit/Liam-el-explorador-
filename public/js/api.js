export async function api(url,{method='GET',body}={}){
 const epoch=globalThis.LIAM_ACCOUNT_EPOCH||0;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),url==='/reinforcement'?70000:25000);
 let response;
 try{
  response=await fetch((globalThis.LIAM_NATIVE_CONFIG?.apiOrigin||'')+'/api'+url,{method,signal:controller.signal,credentials:globalThis.LIAM_NATIVE_CONFIG?.apiOrigin?'include':'same-origin',headers:body!==undefined?{'Content-Type':'application/json'}:{},body:body!==undefined?JSON.stringify(body):undefined});
 }catch(error){throw Object.assign(new Error(error.name==='AbortError'?'La conexión tardó demasiado. Tus respuestas no se han borrado; vuelve a intentarlo.':'No pudimos conectar con Liam. Revisa internet y vuelve a intentarlo.'),{code:'NETWORK'});}
 finally{clearTimeout(timeout);}
 if(epoch!==(globalThis.LIAM_ACCOUNT_EPOCH||0))throw Object.assign(new Error('La cuenta activa cambió.'),{code:'STALE_VIEW'});
 let data;try{data=await response.json();}catch{throw Object.assign(new Error('El servicio no respondió correctamente. Vuelve a intentarlo en un momento.'),{status:response.status>=400?response.status:502,code:'INVALID_RESPONSE'});}
 if(epoch!==(globalThis.LIAM_ACCOUNT_EPOCH||0))throw Object.assign(new Error('La cuenta activa cambió.'),{code:'STALE_VIEW'});
 if(!response.ok){const error=Object.assign(new Error(data.error||'No se pudo completar la operación. Vuelve a intentarlo.'),{status:response.status,code:data.code});
  if(['SESSION_REQUIRED','SESSION_EXPIRED','PARENT_REQUIRED'].includes(error.code))window.dispatchEvent(new CustomEvent('liam-access-error',{detail:{code:error.code,message:error.message,epoch}}));
  throw error;
 }
 return data;
}
export const post=(url,body)=>api(url,{method:'POST',body});
export async function readImage(file){
 if(!file)throw new Error('Selecciona una foto para continuar.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Elige una foto JPG, PNG o WebP.');
 if(file.size>20*1024*1024)throw new Error('La foto supera 20 MB. Elige una imagen más pequeña.');
 let image;
 try{
  if(typeof createImageBitmap==='function')image=await createImageBitmap(file,{imageOrientation:'from-image'});
  else image=await new Promise((resolve,reject)=>{const el=new Image(),url=URL.createObjectURL(file);el.onload=()=>{URL.revokeObjectURL(url);resolve(el);};el.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('image'));};el.src=url;});
  if(!image.width||!image.height||image.width*image.height>80000000)throw new Error('dimensions');
  const ratio=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const normalized=canvas.toDataURL('image/webp',.9);
  if(normalized.length>4200000)throw new Error('size');
  return normalized;
 }catch{throw new Error('No se pudo leer la foto. Prueba otra imagen o toma una nueva.');}
 finally{image?.close?.();}
}
