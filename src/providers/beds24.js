import {HotelError} from '../core/dates.js';
// Browser adapter: talks only to the owner's authenticated server, never to Beds24.
export class Beds24Provider{
 constructor(endpoint){const parsed=new URL(endpoint,location.origin);if(parsed.origin!==location.origin||parsed.protocol!=='https:')throw new HotelError('serviceUnavailable');this.endpoint=parsed.href.replace(/\/$/,'');this.kind='beds24';}
 async request(operation,payload){try{const response=await fetch(this.endpoint+'/'+operation,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});const result=await response.json();if(!response.ok||result.success!==true)throw new HotelError(result.code||'serviceUnavailable');return result.data;}catch(error){if(error instanceof HotelError)throw error;throw new HotelError('serviceUnavailable');}}
 listRooms(){return this.request('rooms',{});}
 search(input){return this.request('search',input);}
 quote(input,options={}){return this.request('quote',{input,options});}
 createBooking(input){return this.request('bookings/create',input);}
 findBooking(reference,email){return this.request('bookings/find',{reference,email});}
 changeBooking(reference,changes,options){return this.request('bookings/change',{reference,changes,options});}
 cancelBooking(reference,options){return this.request('bookings/cancel',{reference,options});}
}
