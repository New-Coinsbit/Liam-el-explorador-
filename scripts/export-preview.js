import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {build} from 'esbuild';
const out=process.argv[2]||'../Liam_El_Explorador_v0.1.html';
let css=await readFile('public/styles.css','utf8');css=css.replace("@import url('/fonts.css');",'');
const assets={};
for(const name of ['welcome-art','adventure-approved','avatar-reference','celebration-reference','forest-panorama','companions-atlas','forest-props']){
 const bytes=await readFile(`public/assets/${name}.webp`);assets[name]=`data:image/webp;base64,${bytes.toString('base64')}`;
 css=css.replaceAll(`/assets/${name}.webp`,assets[name]);
}
const apiSource=await readFile('public/js/api.js','utf8');
const imageReader='export async function readImage'+apiSource.split('export async function readImage')[1];
const stub=`export async function api(url){if(url==='/config')return {database:false,ai:false,subjects:['Matemáticas','Español','Inglés','Ciencias Naturales','Ciencias Sociales','Tecnología','Arte']};throw new Error('Esta copia es una vista previa sin servidor. Ejecuta el proyecto completo para guardar cuentas.');}export const post=(url,body)=>api(url);`;
const result=await build({entryPoints:['public/js/app.js'],bundle:true,write:false,format:'iife',target:'es2022',minify:true,legalComments:'inline',plugins:[{name:'offline-preview-api',setup(builder){builder.onLoad({filter:/\/js\/api\.js$/},()=>({contents:stub+'\n'+imageReader,loader:'js',resolveDir:resolve('public/js')}));}}]});
const script=`globalThis.LIAM_ASSETS=${JSON.stringify({'welcome-art':assets['welcome-art'],'adventure-approved':assets['adventure-approved'],'forest-panorama':assets['forest-panorama'],'companions-atlas':assets['companions-atlas'],'forest-props':assets['forest-props']})};\n`+result.outputFiles[0].text;
const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#143c2d"><title>Liam El Explorador · Aventura móvil</title><style>${css}</style></head><body><div id="app"></div><div id="toast" role="status" aria-live="polite"></div><script>${script.replaceAll('</script','<\\/script')}</script></body></html>`;
await mkdir(dirname(out),{recursive:true});await writeFile(out,html);console.log(`${out}: 3D, imágenes y sonido incluidos sin conexión`);
