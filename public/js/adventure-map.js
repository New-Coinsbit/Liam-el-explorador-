// The approved portrait artwork is a flat scene. Keep interaction in HTML and
// align markers to native image coordinates; never stretch it or imply 360°.
export function mountAdventureMap(container,{activities=[],level=1,onLevel=()=>{},onUnavailable=()=>{}}={}){
  const image=container.querySelector('.adventure-art');
  const layer=container.querySelector('.trail-levels');
  const anchors=[{x:716,y:819},{x:635,y:650},{x:625,y:500}];
  const first=Math.max(0,Math.min(level-2,activities.length-1));
  const nodes=anchors.map((point,n)=>{
    const index=first+n,activity=activities[index],unlocked=!!activity&&index<level;
    const button=document.createElement('button');button.type='button';
    button.className='trail-node '+(activity?.stars>=2?'completed':unlocked?'current':'locked');
    button.dataset.level=String(index+1);
    button.setAttribute('aria-label',activity?`Nivel ${index+1}${unlocked?' disponible':' bloqueado'}: ${activity.title}`:'Próximas actividades');
    if(index===level-1&&activity)button.setAttribute('aria-current','step');
    button.innerHTML=`<span class="level-medallion">${activity?index+1:'✦'}</span>`;
    button.addEventListener('click',()=>unlocked?onLevel(activity):onUnavailable(activity?'Consigue dos estrellas en el nivel anterior para avanzar.':'Tu profesor añadirá las próximas actividades.'));
    layer.append(button);return {button,point};
  });
  const resize=()=>{
    if(!image.naturalWidth)return;
    const w=container.clientWidth,h=container.clientHeight;
    const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight);
    const left=(w-image.naturalWidth*scale)/2,extra=h-image.naturalHeight*scale;
    // Keep the original feet above the start button on short phone displays.
    const top=Math.max(extra,Math.min(extra/2,h-70-1460*scale));
    image.style.objectPosition=`50% ${extra?top/extra*100:50}%`;
    container.classList.toggle('map-compact',h/w<1.85);
    const origin=container.getBoundingClientRect();
    const protectedAreas=[...container.querySelectorAll('.scene-topbar,.scene-mission,.map-discovery')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.getBoundingClientRect());
    for(const {button,point} of nodes){
      const x=left+point.x*scale,y=top+point.y*scale;
      button.style.left=x+'px';button.style.top=y+'px';
      button.hidden=x<24||x>w-24||y<25||y>h-80||protectedAreas.some(r=>origin.left+x+24>r.left&&origin.left+x-24<r.right&&origin.top+y+25>r.top&&origin.top+y-25<r.bottom);
    }
    container.dataset.ready='true';container.dataset.assetsReady='true';
    container.dataset.imageScale=String(scale);container.dataset.imageOffset=JSON.stringify({left,top});
  };
  image.addEventListener('load',resize);image.addEventListener('error',()=>container.dataset.assetsReady='false',{once:true});
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  return()=>{observer.disconnect();image.removeEventListener('load',resize);};
}
