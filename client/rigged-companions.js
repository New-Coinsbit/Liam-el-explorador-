import {AnimationMixer,LoopRepeat,LoopOnce} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
// Production models are gated as one set. Never replace the approved artwork
// with a partially loaded model or a sprite labelled as a finished 3D character.
export async function loadRiggedCompanions({parent,signal}){
 const response=await fetch('/assets/models/manifest.json',{signal});if(!response.ok)return null;
 const manifest=await response.json();if(manifest.status!=='approved')return null;
 const loader=new GLTFLoader(),actors=[];let disposed=false;
 function dispose(){if(disposed)return;disposed=true;for(const actor of actors){actor.mixer.stopAllAction();actor.mixer.uncacheRoot(actor.model);parent.remove(actor.model);actor.model.traverse(o=>{o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}}
 try{
  for(const name of ['liam','owl','fox']){
   const spec=manifest.characters?.[name];if(!spec?.file?.startsWith('/assets/models/')||!spec.file.endsWith('.glb'))throw new Error('Modelo GLB de personaje no aprobado.');
   const gltf=await loader.loadAsync(spec.file),model=gltf.scene,mixer=new AnimationMixer(model),clips=new Map(gltf.animations.map(c=>[c.name,c]));
   const actor={name,model,mixer,clips,current:null,spec};actors.push(actor);
   for(const state of ['idle','walk','greet','explain','clap'])if(!clips.has(spec.animations?.[state]))throw new Error(`Falta la animación ${state} de ${name}.`);
   model.scale.setScalar(spec.scale||1);model.position.fromArray(spec.position||[0,0,0]);model.rotation.y=spec.rotationY||0;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  }
  if(signal?.aborted){dispose();return null;}
  actors.forEach(a=>parent.add(a.model));
  function play(state){for(const a of actors){const name=a.spec.animations[state]||a.spec.animations.idle;if(a.current?.getClip().name===name)continue;const next=a.mixer.clipAction(a.clips.get(name));next.reset().setLoop(['idle','walk'].includes(state)?LoopRepeat:LoopOnce,Infinity);next.clampWhenFinished=true;next.play();if(a.current)next.crossFadeFrom(a.current,.3,true);a.current=next;}}
  play('idle');return {actors,play,update:dt=>actors.forEach(a=>a.mixer.update(Math.min(dt,.06))),dispose};
 }catch(error){dispose();if(error.name==='AbortError')return null;throw error;}
}
