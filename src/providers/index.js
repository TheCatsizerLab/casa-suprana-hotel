import {LocalProvider} from './local.js';
export async function createProvider({mode='local',store,endpoint}={}){if(mode==='local')return new LocalProvider(store);if(mode==='beds24'){const {Beds24Provider}=await import('./beds24.js');return new Beds24Provider(endpoint);}throw Error('Unsupported hotel provider');}
