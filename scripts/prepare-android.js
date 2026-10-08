import {cp,readFile,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const source=process.env.LIAM_API_ORIGIN;
let origin;if(source){origin=new URL(source);if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw new Error('LIAM_API_ORIGIN debe ser el origen HTTPS publicado de Liam.');}
if(!source&&!process.argv.includes('--preview'))throw new Error('Configura LIAM_API_ORIGIN con el servidor HTTPS publicado. --preview permite preparar una copia visual sin cuentas.');
await rm('mobile-dist',{recursive:true,force:true});await cp('public','mobile-dist',{recursive:true});
await writeFile('mobile-dist/native-config.js',`globalThis.LIAM_NATIVE_CONFIG=${JSON.stringify({apiOrigin:origin?.origin||null,preview:!source})};`);
const html=await readFile('mobile-dist/index.html','utf8');await writeFile('mobile-dist/index.html',html.replace('<script type="module"','<script src="/native-config.js"></script><script type="module"'));
execFileSync('npx',['cap','sync','android'],{stdio:'inherit'});
console.log(source?'Proyecto Android sincronizado con el servidor indicado.':'Proyecto Android preparado en modo visual: sin servidor ni cuentas.');
