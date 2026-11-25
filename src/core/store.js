import {seedState} from './data.js';
import {ensureServices} from './services.js';
export class HotelStore{
 constructor(){this.database=null;this.memory=null;this.persistent=true;this.listeners=new Set();this.queue=Promise.resolve();this.channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('avelune-hotel-updates'):null;this.channel?.addEventListener('message',()=>this.notify());}
 async open(){if(this.database||this.memory)return this;try{this.database=await new Promise((resolve,reject)=>{const r=indexedDB.open('avelune-hotel-demo',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('blocked'));});await this.mutate(s=>{ensureServices(s);return s;});}catch{this.database=null;this.memory=seedState();this.persistent=false;}return this;}
 async read(){if(!this.database)return structuredClone(this.memory||seedState());return new Promise((resolve,reject)=>{const tx=this.database.transaction('state','readonly'),r=tx.objectStore('state').get('hotel');r.onsuccess=()=>resolve(r.result||seedState());r.onerror=()=>reject(r.error);});}
 async mutate(fn){
  if(!this.database){const operation=this.queue.then(()=>{const state=structuredClone(this.memory||seedState());const result=fn(state);state.revision++;this.memory=state;this.notify();return structuredClone(result);});this.queue=operation.catch(()=>{});return operation;}
  const value=await new Promise((resolve,reject)=>{const tx=this.database.transaction('state','readwrite'),store=tx.objectStore('state'),request=store.get('hotel');let result,error;request.onsuccess=()=>{try{const state=request.result||seedState();if(state.schema!==1)throw Error('storageVersion');result=fn(state);state.revision++;store.put(state,'hotel');}catch(e){error=e;tx.abort();}};tx.oncomplete=()=>resolve(structuredClone(result));tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error||Error('storageUnavailable'));});
  this.channel?.postMessage('changed');this.notify();return value;
 }
 async reset(){return this.mutate(state=>{const fresh=seedState();for(const key of Object.keys(state))delete state[key];Object.assign(state,fresh);return state;});}
 subscribe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 notify(){for(const fn of this.listeners)fn();}
 close(){this.channel?.close();this.database?.close();}
}
