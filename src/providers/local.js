import {quote,search,createBooking,findBooking,changeBooking,cancelBooking,addBlock,updateRate} from '../core/engine.js';
import {ROOMS} from '../core/data.js';
import {quoteTable,quoteActivity,createServiceBooking,findServiceBooking,changeServiceBooking,cancelServiceBooking,addTableBlock,setActivityLimit,ensureServices} from '../core/services.js';
import {HotelError} from '../core/dates.js';
export class LocalProvider{
 constructor(store){this.store=store;this.kind='local';}
 async listRooms(){return ROOMS;}
 async search(input){return search(await this.store.read(),input);}
 async quote(input,options={}){return quote(await this.store.read(),input,options);}
 async createBooking(input){const reference='CS-'+crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();return this.store.mutate(s=>createBooking(s,input,{reference}));}
 async findBooking(reference,email){return findBooking(await this.store.read(),reference,email);}
 async changeBooking(reference,changes,options){return this.store.mutate(s=>changeBooking(s,reference,changes,options));}
 async cancelBooking(reference,options){return this.store.mutate(s=>cancelBooking(s,reference,options));}
 async addBlock(input){return this.store.mutate(s=>addBlock(s,{...input,id:crypto.randomUUID()}));}
 async removeBlock(id){return this.store.mutate(s=>{s.blocks=s.blocks.filter(b=>b.id!==id);return s;});}
 async updateRate(input){return this.store.mutate(s=>updateRate(s,{...input,id:crypto.randomUUID()}));}
 async removeRate(id){return this.store.mutate(s=>{s.rates=s.rates.filter(r=>r.id!==id);return s;});}
 async updateExtra(input){return this.store.mutate(s=>{const extra=s.extras.find(x=>x.id===input.id);if(!extra||!Number.isInteger(input.price)||input.price<0||input.price>100000||!Number.isInteger(input.childPrice)||input.childPrice<0||input.childPrice>100000)throw new HotelError('invalidExtra');Object.assign(extra,{price:input.price,childPrice:input.childPrice,active:input.active===true});return extra;});}
 async updatePromotion(input){return this.store.mutate(s=>{const promo=s.promotions.find(x=>x.id===input.id);if(!promo||!Number.isInteger(input.percent)||input.percent<0||input.percent>30||!Number.isInteger(input.minNights)||input.minNights<2||input.minNights>21)throw new HotelError('invalidPromo');Object.assign(promo,{percent:input.percent,minNights:input.minNights,active:input.active===true});return promo;});}
 async updateContent(input){return this.store.mutate(s=>{if(!['fr','en','it','es','de'].includes(input.language))throw new HotelError('serviceUnavailable');for(const key of ['welcome','restaurantHours','spaHours'])if(typeof input[key]==='string')s.content[input.language][key]=input[key].trim().slice(0,500);return s.content[input.language];});}
 async reset(){return this.store.reset();}

 async serviceQuote(input,options={}){const state=await this.store.read();return input.kind==='table'?quoteTable(state,input,options):quoteActivity(state,input,options);}
 async createServiceBooking(input){const reference='CS-'+(input.kind==='table'?'T':'A')+'-'+crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();return this.store.mutate(s=>createServiceBooking(s,input,{reference}));}
 async findServiceBooking(reference,email){return findServiceBooking(await this.store.read(),reference,email);}
 async changeServiceBooking(reference,changes,options){return this.store.mutate(s=>changeServiceBooking(s,reference,changes,options));}
 async cancelServiceBooking(reference){return this.store.mutate(s=>cancelServiceBooking(s,reference));}
 async addTableBlock(input){return this.store.mutate(s=>addTableBlock(s,{...input,id:crypto.randomUUID()}));}
 async removeTableBlock(id){return this.store.mutate(s=>{const data=ensureServices(s);data.tableBlocks=data.tableBlocks.filter(b=>b.id!==id);return data;});}
 async setActivityLimit(input){return this.store.mutate(s=>setActivityLimit(s,{...input,id:crypto.randomUUID()}));}
 async removeActivityLimit(id){return this.store.mutate(s=>{const data=ensureServices(s);data.activityLimits=data.activityLimits.filter(b=>b.id!==id);return data;});}
 async updateMenu(input){return this.store.mutate(s=>{const menu=ensureServices(s).menus.find(m=>m.id===input.id);if(!menu||!Number.isInteger(input.adultPrice)||input.adultPrice<1000||input.adultPrice>30000||!Number.isInteger(input.childPrice)||input.childPrice<0||input.childPrice>input.adultPrice)throw new HotelError('invalidServicePrice');Object.assign(menu,{adultPrice:input.adultPrice,childPrice:input.childPrice,active:input.active===true});return menu;});}
 async updateActivity(input){return this.store.mutate(s=>{const data=ensureServices(s),activity=data.activities.find(a=>a.id===input.id);if(!activity||!Number.isInteger(input.adultPrice)||input.adultPrice<0||input.adultPrice>50000||!Number.isInteger(input.childPrice)||input.childPrice<0||input.childPrice>50000||!Number.isInteger(input.capacity)||input.capacity<1||input.capacity>30)throw new HotelError('invalidServicePrice');const groups={};for(const b of data.activityBookings.filter(b=>b.status==='confirmed'&&b.activityId===input.id)){const key=b.date+' '+b.time;groups[key]=(groups[key]||0)+b.adults+b.children;}if(Object.values(groups).some(n=>n>input.capacity))throw new HotelError('serviceCapacityConflict');Object.assign(activity,{adultPrice:input.adultPrice,childPrice:input.childPrice,capacity:input.capacity,active:input.active===true});return activity;});}

}
