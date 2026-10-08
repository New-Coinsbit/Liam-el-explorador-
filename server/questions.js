const text=(v,max=800)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const list=(v,min=2,max=6)=>Array.isArray(v)&&v.length>=min&&v.length<=max&&v.every(x=>text(x,300));
const permutation=(v,n)=>Array.isArray(v)&&v.length===n&&new Set(v).size===n&&v.every(x=>Number.isInteger(x)&&x>=0&&x<n);
export function validQuestion(q){
 if(!q||!text(q.prompt)||!text(q.explanation,1200))return false;
 switch(q.type||'choice'){
  case 'choice':return list(q.options,4,4)&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4;
  case 'listening':return text(q.spokenText,300)&&list(q.options,4,4)&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4;
  case 'ordering':return list(q.items)&&permutation(q.answer,q.items.length);
  case 'matching':return list(q.left)&&list(q.right)&&q.left.length===q.right.length&&permutation(q.answer,q.left.length);
  case 'number':return typeof q.answer==='number'&&Number.isFinite(q.answer)&&Math.abs(q.answer)<=1e9;
  default:return false;
 }
}
export const validateQuestions=q=>Array.isArray(q)&&q.length>=3&&q.length<=12&&q.every(validQuestion);
export function publicQuestion(q){const {answer,explanation,...safe}=q;return safe;}
export function validAnswer(q,a){switch(q.type||'choice'){case 'matching':return permutation(a,q.left.length);case 'ordering':return permutation(a,q.items.length);case 'number':return typeof a==='number'&&Number.isFinite(a)&&Math.abs(a)<=1e9;default:return Number.isInteger(a)&&a>=0&&a<q.options.length;}}
export const isCorrect=(q,a)=>JSON.stringify(q.answer)===JSON.stringify(a);
