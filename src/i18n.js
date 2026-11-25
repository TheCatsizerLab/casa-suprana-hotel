import {LOCALES,LANGUAGES} from './config.js';
export function createI18n(language,messages){
 if(!LANGUAGES.includes(language))throw Error('Unsupported language');
 const locale=LOCALES[language],rules=new Intl.PluralRules(locale);
 const t=(key,values={})=>{if(!(key in messages))throw Error('Missing translation: '+language+':'+key);return messages[key].replace(/\{(\w+)\}/g,(_,name)=>{if(!(name in values))throw Error('Missing interpolation '+name+' in '+key);return String(values[name]);});};
 return {language,locale,t,money:cents=>new Intl.NumberFormat(locale,{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:2}).format(cents/100),number:value=>new Intl.NumberFormat(locale).format(value),percent:value=>new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:1}).format(value),date:(iso,options={})=>new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris',...options}).format(new Date(iso+'T12:00:00Z')),plural:(key,count)=>t(key+'.'+rules.select(count),{count})};
}
