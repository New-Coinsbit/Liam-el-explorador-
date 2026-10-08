import {randomBytes,scrypt as cbScrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(cbScrypt);
export const token=()=>randomBytes(32).toString('hex');
export const digest=s=>createHash('sha256').update(s).digest('hex');
export async function hash(value){const salt=randomBytes(16).toString('hex');return `${salt}:${(await scrypt(value,salt,64)).toString('hex')}`;}
export async function verify(value,encoded){if(!encoded)return false;const [salt,expected]=encoded.split(':');const actual=await scrypt(value,salt,64);const b=Buffer.from(expected,'hex');return actual.length===b.length&&timingSafeEqual(actual,b);}
export function clean(value,max=120){return String(value??'').trim().slice(0,max);}
export function ageOn(date,now=new Date()){const d=new Date(`${date}T12:00:00Z`);if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==date)return NaN;let age=now.getUTCFullYear()-d.getUTCFullYear();if(now.getUTCMonth()<d.getUTCMonth()||(now.getUTCMonth()===d.getUTCMonth()&&now.getUTCDate()<d.getUTCDate()))age--;return age;}
export function imageValid(data){if(typeof data!=='string'||data.length>4500000)return false;const m=data.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);if(!m)return false;const b=Buffer.from(m[2],'base64');return m[1]==='png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?b[0]===255&&b[1]===216:b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP';}
export function rating(correct,total){const pct=Math.round(correct/total*100);return {score:pct,stars:pct>=90?3:pct>=60?2:1};}
export {validateQuestions} from './questions.js';
