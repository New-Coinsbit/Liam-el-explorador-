import {esc,button} from './components.js';
export function questionInput(q,value){
 switch(q.type||'choice'){
  case 'ordering':{const order=Array.isArray(value)?value:[];return `<p class="muted">Toca las partes en el orden correcto.</p><div class="ordered-answer">${order.map((n,i)=>`<span>${i+1}. ${esc(q.items[n])}</span>`).join('')||'Tu oración aparecerá aquí'}</div>${q.items.map((x,i)=>`<button class="answer" data-order="${i}" ${order.includes(i)?'disabled':''}>${esc(x)}</button>`).join('')}<button class="text-link" data-action="clear-order">Empezar de nuevo</button>`;}
  case 'matching':return `<p class="muted">Elige una pareja distinta para cada elemento.</p>${q.left.map((x,i)=>`<label class="field"><span>${esc(x)}</span><select data-match="${i}" aria-label="Pareja para ${esc(x)}"><option value="">Selecciona</option>${q.right.map((r,n)=>`<option value="${n}" ${value?.[i]===n?'selected':''}>${esc(r)}</option>`).join('')}</select></label>`).join('')}`;
  case 'number':return `<label class="field"><span>Tu respuesta</span><input id="number-answer" inputmode="decimal" type="number" step="any" min="-1000000000" max="1000000000" value="${value??''}" autocomplete="off"></label>`;
  default:return `${q.type==='listening'?'<button class="secondary" data-action="listen-question">♫ Escuchar en inglés</button><details><summary>Leer la frase</summary><p>'+esc(q.spokenText)+'</p></details>':''}${q.options.map((x,i)=>`<button class="answer ${value===i?'selected':''}" data-answer="${i}"><strong>${'ABCD'[i]}.</strong> ${esc(x)}</button>`).join('')}`;
 }
}
export function completeAnswer(q,value){if(q.type==='matching'||q.type==='ordering'){const n=q.type==='matching'?q.left.length:q.items.length;return Array.isArray(value)&&value.length===n&&value.every(x=>Number.isInteger(x)&&x>=0&&x<n)&&new Set(value).size===n;}return typeof value==='number'&&Number.isFinite(value);}
export function bindQuestion(root,q,state,render){
 const update=()=>{const b=root.querySelector('[data-action="next-question"]');if(b)b.disabled=!completeAnswer(q,state.answers[state.question]);};
 root.querySelectorAll('[data-match]').forEach(el=>el.addEventListener('change',()=>{let a=state.answers[state.question]||Array(q.left.length).fill(null);a[Number(el.dataset.match)]=el.value===''?null:Number(el.value);state.answers[state.question]=a;update();}));
 root.querySelector('#number-answer')?.addEventListener('input',e=>{state.answers[state.question]=e.target.value===''?undefined:Number(e.target.value);update();});
 root.querySelectorAll('[data-order]').forEach(el=>el.addEventListener('click',()=>{const a=state.answers[state.question]||[];if(!a.includes(Number(el.dataset.order)))a.push(Number(el.dataset.order));state.answers[state.question]=a;render();}));
 root.querySelector('[data-action="clear-order"]')?.addEventListener('click',()=>{state.answers[state.question]=[];render();});
 root.querySelector('[data-action="listen-question"]')?.addEventListener('click',()=>{if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(q.spokenText);u.lang='en-US';u.rate=.8;window.speechSynthesis.speak(u);});
}
