import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LANGUAGES,ROUTES,BASE,pathFor} from '../src/config.js';
import {createI18n} from '../src/i18n.js';
import {makeViews,mark} from '../src/views.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogs=Object.fromEntries(LANGUAGES.map(l=>[l,{}]));
for(const file of (await fs.readdir(path.join(root,'content'))).filter(f=>f.endsWith('.tsv'))){
 const rows=(await fs.readFile(path.join(root,'content',file),'utf8')).split(/\r?\n/);
 for(const [index,row] of rows.entries()){
  if(!row.trim())continue;const [key,...values]=row.split('\t');if(values.length!==5||values.some(v=>!v.trim()))throw Error(file+':'+(index+1)+' requires five translations');
  const placeholders=[...values[0].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
  LANGUAGES.forEach((lang,i)=>{if(key in catalogs[lang])throw Error('Duplicate translation '+key);if([...values[i].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',')!==placeholders)throw Error('Placeholder mismatch '+key+':'+lang);catalogs[lang][key]=values[i];});
 }
}
await fs.mkdir(path.join(root,'assets/i18n'),{recursive:true});
const manifest=JSON.parse(await fs.readFile(path.join(root,'assets/images/manifest.json'),'utf8'));
for(const item of manifest.assets)for(const lang of LANGUAGES)catalogs[lang]['image.'+item.id]=item.alt_by_language[lang];
const routes=[];
for(const lang of LANGUAGES){
 await fs.writeFile(path.join(root,'assets/i18n',lang+'.json'),JSON.stringify(catalogs[lang])+'\n');
 const views=makeViews(createI18n(lang,catalogs[lang]),manifest);
 for(const route of Object.keys(ROUTES)){
  const pathname=pathFor(route,lang),target=path.join(root,pathname.slice(BASE.length),'index.html');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,views.document(route));routes.push({language:lang,route,path:pathname});
 }
}
await fs.writeFile(path.join(root,'assets/mark.svg'),mark.replace('aria-hidden="true"','xmlns="http://www.w3.org/2000/svg"').replace('currentColor','#171717'));
await fs.writeFile(path.join(root,'routes.json'),JSON.stringify(routes,null,2)+'\n');
console.log('Built',routes.length,'static pages;',Object.keys(catalogs.fr).length,'centralized messages per language.');
