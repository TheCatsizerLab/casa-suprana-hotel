/** Server-only API V2 transport. Never import this file into the browser bundle. */
import {HotelError,validateStay} from '../src/core/dates.js';
const API='https://beds24.com/api/v2/';
const positiveId=id=>Number.isInteger(Number(id))&&Number(id)>0;
export class Beds24Client{
 #refreshToken;#token='';#expires=0;#refreshing=null;#cooldown=0;#fetch;#now;#writes;
 constructor({refreshToken,propertyId,roomIds,allowWrites=false,fetchImpl=fetch,now=()=>Date.now()}){
  if(!refreshToken||!positiveId(propertyId)||!Array.isArray(roomIds)||!roomIds.length||roomIds.some(id=>!positiveId(id)))throw new HotelError('serviceUnavailable');
  this.#refreshToken=refreshToken;this.propertyId=Number(propertyId);this.roomIds=roomIds.map(Number);this.#writes=allowWrites===true;this.#fetch=fetchImpl;this.#now=now;
 }
 async #accessToken(force=false){
  if(!force&&this.#token&&this.#now()<this.#expires)return this.#token;
  if(this.#refreshing)return this.#refreshing;
  this.#refreshing=(async()=>{let response;try{response=await this.#fetch(API+'authentication/token',{method:'GET',headers:{Accept:'application/json',refreshToken:this.#refreshToken},signal:AbortSignal.timeout(8000)});}catch{throw new HotelError('serviceUnavailable');}
   if(response.status===429){this.#limit(response);throw new HotelError('serviceUnavailable');}if(!response.ok)throw new HotelError('serviceUnavailable');
   let body;try{body=await response.json();}catch{throw new HotelError('serviceUnavailable');}if(typeof body.token!=='string'||!body.token||!Number.isFinite(body.expiresIn)||body.expiresIn<=30)throw new HotelError('serviceUnavailable');
   this.#token=body.token;this.#expires=this.#now()+(body.expiresIn-30)*1000;return this.#token;
  })();try{return await this.#refreshing;}finally{this.#refreshing=null;}
 }
 #limit(response){const seconds=Number(response.headers.get('x-fivemincreditlimit-resetsin')||response.headers.get('x-five-min-limit-resets-in')||60);this.#cooldown=this.#now()+Math.max(30,Math.min(Number.isFinite(seconds)?seconds:60,300))*1000;}
 async #request(endpoint,{method='GET',query={},body,retried=false}={}){
  if(this.#now()<this.#cooldown)throw new HotelError('serviceUnavailable');
  const url=new URL(endpoint,API);for(const [key,value] of Object.entries(query))if(value!==undefined)url.searchParams.set(key,String(value));
  const token=await this.#accessToken();let response;
  try{response=await this.#fetch(url.href,{method,headers:{Accept:'application/json',token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});}catch{throw new HotelError(method==='GET'?'serviceUnavailable':'bookingOutcomeUnknown');}
  if(response.status===401&&method==='GET'&&!retried){await this.#accessToken(true);return this.#request(endpoint,{method,query,body,retried:true});}
  if(response.status===429){this.#limit(response);throw new HotelError('serviceUnavailable');}
  if(!response.ok)throw new HotelError('serviceUnavailable');let result;try{result=await response.json();}catch{throw new HotelError(method==='GET'?'serviceUnavailable':'bookingOutcomeUnknown');}
  if(result.success!==true||!Array.isArray(result.data))throw new HotelError('serviceUnavailable');return result.data;
 }
 #canWrite(context){if(!this.#writes||context?.authorized!==true)throw new HotelError('writeNotAuthorized');}
 #room(roomId){if(!this.roomIds.includes(Number(roomId)))throw new HotelError('unknownRoom');return Number(roomId);}
 listProperties(){return this.#request('properties',{query:{id:this.propertyId,includeAllRooms:true,includeUnitDetails:true}}).then(rows=>rows.filter(p=>p.id===this.propertyId));}
 async offers(input){validateStay(input);return this.#request('inventory/rooms/offers',{query:{propertyId:this.propertyId,...(input.roomId?{roomId:this.#room(input.roomId)}:{}),arrival:input.arrival,departure:input.departure,numAdults:input.adults,numChildren:input.children,includeTexts:true}}).then(rows=>rows.filter(r=>r.propertyId===this.propertyId&&this.roomIds.includes(r.roomId)));}
 async getBooking(id){if(!positiveId(id))throw new HotelError('bookingNotFound');const rows=await this.#request('bookings',{query:{propertyId:this.propertyId,id:Number(id)}});const booking=rows.find(b=>b.id===Number(id)&&b.propertyId===this.propertyId&&this.roomIds.includes(b.roomId));if(!booking)throw new HotelError('bookingNotFound');return booking;}
 listBookings(query={}){const allowed=Object.fromEntries(['arrivalFrom','arrivalTo','departureFrom','departureTo','apiReference','status'].filter(k=>query[k]!==undefined).map(k=>[k,query[k]]));return this.#request('bookings',{query:{...allowed,propertyId:this.propertyId}}).then(rows=>rows.filter(b=>b.propertyId===this.propertyId&&this.roomIds.includes(b.roomId)));}
 async createBooking(input,context){
  this.#canWrite(context);validateStay(input);const roomId=this.#room(input.roomId);
  if(typeof input.apiReference!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(input.apiReference))throw new HotelError('referenceConflict');
  // A preflight lookup is not a multi-channel transaction. Reconciliation is mandatory after an ambiguous response.
  const rows=await this.offers({...input,roomId}),offers=rows.find(r=>r.roomId===roomId)?.offers||[];
  const selected=offers.find(o=>o.offerId===Number(input.offerId)&&Number.isInteger(o.unitsAvailable)&&o.unitsAvailable>0&&Number.isFinite(o.price));
  if(!selected)throw new HotelError('unavailable');if(Math.round(selected.price*100)!==input.expectedAccommodation)throw new HotelError('priceChanged');
  const customer=context.customer||{};
  const body={roomId,arrival:input.arrival,departure:input.departure,numAdult:input.adults,numChild:input.children,status:'confirmed',apiReference:input.apiReference,price:selected.price};
  for(const key of ['firstName','lastName','email'])if(typeof customer[key]==='string')body[key]=customer[key].slice(0,100);
  return this.#request('bookings',{method:'POST',body:[body]});
 }
 async changeBooking(id,changes,context){this.#canWrite(context);const booking=await this.getBooking(id);const input={roomId:booking.roomId,arrival:changes.arrival||booking.arrival,departure:changes.departure||booking.departure,adults:changes.adults??booking.numAdult,children:changes.children??booking.numChild};validateStay(input);return this.#request('bookings',{method:'POST',body:[{id:booking.id,roomId:booking.roomId,arrival:input.arrival,departure:input.departure,numAdult:input.adults,numChild:input.children}]});}
 async cancelBooking(id,context){this.#canWrite(context);const booking=await this.getBooking(id);return this.#request('bookings',{method:'POST',body:[{id:booking.id,status:'cancelled'}]});}
}
