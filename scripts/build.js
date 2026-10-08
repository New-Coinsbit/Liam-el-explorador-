import {build} from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('public/vendor', {recursive:true});
for (const name of ['three.module.js','three.core.js']) await copyFile(`node_modules/three/build/${name}`,`public/vendor/${name}`);
await copyFile('node_modules/three/LICENSE','public/vendor/THREE-LICENSE.txt');
const pkg=JSON.parse(await readFile('package.json','utf8'));
await writeFile('public/version.json',JSON.stringify({version:pkg.version,builtAt:new Date().toISOString()}));
console.log(`Liam ${pkg.version}: assets ready`);

await build({entryPoints:['client/rigged-companions.js'],bundle:true,format:'esm',outfile:'public/js/rigged-companions.js',plugins:[{name:'shared-three',setup(builder){builder.onResolve({filter:/^three$/},()=>({path:'../vendor/three.module.js',external:true}));}}]});
