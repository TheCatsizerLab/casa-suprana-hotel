import {HotelError,dayISO,addDays,parseDay} from './dates.js';
import {TEST_GUESTS} from './profiles.js';
export const MENUS=[{id:'lunch',adultPrice:4800,childPrice:2400,service:'lunch',items:3},{id:'maquis',adultPrice:6800,childPrice:2400,service:'dinner',items:3},{id:'garden',adultPrice:5800,childPrice:2400,service:'both',items:3}];
export const TABLES=[{id:'R1',capacity:2},{id:'R2',capacity:2},{id:'R3',capacity:4},{id:'R4',capacity:4},{id:'R5',capacity:6},{id:'R6',capacity:6}];
export const TABLE_TIMES=['12:00','12:30','13:00','19:30','20:00','20:30'];
export const ACTIVITIES=[{id:'walk',adultPrice:4500,childPrice:2200,capacity:10,duration:120,times:['08:30','17:00'],image:'coast'},{id:'sea',adultPrice:8500,childPrice:4500,capacity:8,duration:150,times:['09:30','16:00'],image:'cap-corse-sunset'},{id:'flavours',adultPrice:3500,childPrice:1800,capacity:12,duration:90,times:['18:00'],image:'restaurant-chef'}];
export const serviceOf=time=>time<'16:00'?'lunch':'dinner';
const minute=time=>{if(!/^\d\d:\d\d$/.test(time))throw new HotelError('invalidService');const [h,m]=time.split(':').map(Number);if(h>23||m>59)throw new HotelError('invalidService');return h*60+m;};
export function seedServices(){return {version:1,tableBookings:[],activityBookings:[],tableBlocks:[],activityLimits:[],menus:MENUS.map(m=>({...m,active:true})),activities:ACTIVITIES.map(a=>({...a,active:true}))};}
export function ensureServices(state){if(!state.services)state.services=seedServices();for(const p of state.promotions||[])if(p.code==='AVELUNE10')p.code='SUPRANA10';return state.services;}
function validateParty(input){if(!Number.isInteger(input.adults)||input.adults<1||input.adults>6||!Number.isInteger(input.children)||input.children<0||input.children>4||input.adults+input.children>6)throw new HotelError('serviceParty');}
function validateSlot(input,times,now=new Date()){
 parseDay(input.date);if(input.date<dayISO(now)||input.date>addDays(dayISO(now),365)||!times.includes(input.time))throw new HotelError('invalidServiceDate');
 if(parseDay(input.date).getUTCDay()===1)throw new HotelError('serviceClosed');
 if(input.date===dayISO(now)){const parts=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Paris'}).formatToParts(now),h=Number(parts.find(x=>x.type==='hour').value),m=Number(parts.find(x=>x.type==='minute').value);if(minute(input.time)<=h*60+m)throw new HotelError('servicePast');}
 validateParty(input);
}
export function availableTables(state,input,exclude=''){
 const data=ensureServices(state),start=minute(input.time);
 return TABLES.filter(table=>table.capacity>=input.adults+input.children&&!data.tableBlocks.some(b=>b.date===input.date&&b.tables.includes(table.id)&&(b.service==='all'||b.service===serviceOf(input.time)))&&!data.tableBookings.some(b=>b.reference!==exclude&&b.status==='confirmed'&&b.date===input.date&&b.tableId===table.id&&start<minute(b.time)+90&&minute(b.time)<start+90));
}
export function quoteTable(state,input,{exclude='',now=new Date()}={}){
 const data=ensureServices(state),menu=data.menus.find(m=>m.id===input.menuId&&m.active);if(!menu)throw new HotelError('invalidMenu');
 const times=TABLE_TIMES.filter(time=>menu.service==='both'||serviceOf(time)===menu.service);validateSlot(input,times,now);
 const tables=availableTables(state,input,exclude);if(!tables.length)throw new HotelError('tableUnavailable');
 return {kind:'table',menuId:menu.id,date:input.date,time:input.time,adults:input.adults,children:input.children,adultPrice:menu.adultPrice,childPrice:menu.childPrice,total:input.adults*menu.adultPrice+input.children*menu.childPrice,available:tables.length,duration:90,currency:'EUR'};
}
export function quoteActivity(state,input,{exclude='',now=new Date()}={}){
 const data=ensureServices(state),activity=data.activities.find(a=>a.id===input.activityId&&a.active);if(!activity)throw new HotelError('invalidActivity');validateSlot(input,activity.times,now);
 const limit=[...data.activityLimits].reverse().find(l=>l.activityId===activity.id&&l.date===input.date&&(l.time===input.time||l.time==='all'));
 const capacity=limit?.capacity??activity.capacity,used=data.activityBookings.filter(b=>b.reference!==exclude&&b.status==='confirmed'&&b.activityId===activity.id&&b.date===input.date&&b.time===input.time).reduce((n,b)=>n+b.adults+b.children,0),remaining=capacity-used;
 if(remaining<input.adults+input.children)throw new HotelError('activityFull');
 return {kind:'activity',activityId:activity.id,date:input.date,time:input.time,adults:input.adults,children:input.children,adultPrice:activity.adultPrice,childPrice:activity.childPrice,total:input.adults*activity.adultPrice+input.children*activity.childPrice,available:remaining,duration:activity.duration,currency:'EUR'};
}
export function createServiceBooking(state,input,{reference,now=new Date()}={}){
 const data=ensureServices(state);if(!TEST_GUESTS.some(g=>g.id===input.guestId))throw new HotelError('fictionalGuest');if(input.accepted!==true)throw new HotelError('acceptTerms');if(input.kind==='activity'&&input.payment!=='approved')throw new HotelError('paymentDeclined');
 if(!/^CS-[TA]-[A-Z0-9]{8}$/.test(reference)||!String(reference).startsWith(input.kind==='table'?'CS-T-':'CS-A-')||[...data.tableBookings,...data.activityBookings].some(b=>b.reference===reference))throw new HotelError('referenceConflict');
 const price=input.kind==='table'?quoteTable(state,input,{now}):input.kind==='activity'?quoteActivity(state,input,{now}):null;if(!price)throw new HotelError('invalidService');if(price.total!==input.expectedTotal)throw new HotelError('priceChanged');
 const booking={...price,reference,guestId:input.guestId,status:'confirmed',price,created:now.toISOString(),updated:now.toISOString(),history:[],...(input.kind==='table'?{tableId:availableTables(state,input)[0].id,payment:'onSiteSimulation'}:{payment:'simulated'})};
 data[input.kind==='table'?'tableBookings':'activityBookings'].push(booking);return booking;
}
export function findServiceBooking(state,reference,email){const data=ensureServices(state),booking=[...data.tableBookings,...data.activityBookings].find(b=>b.reference===String(reference).trim().toUpperCase());if(!booking||TEST_GUESTS.find(g=>g.id===booking.guestId)?.email!==String(email).trim().toLowerCase())throw new HotelError('bookingNotFound');return booking;}
export function changeServiceBooking(state,reference,changes,{expectedTotal,now=new Date()}={}){
 const data=ensureServices(state),booking=[...data.tableBookings,...data.activityBookings].find(b=>b.reference===reference);if(!booking)throw new HotelError('bookingNotFound');if(booking.status==='cancelled')throw new HotelError('alreadyCancelled');validateSlot(booking,booking.kind==='table'?TABLE_TIMES:ACTIVITIES.find(a=>a.id===booking.activityId).times,now);
 const input={...booking,...changes,kind:booking.kind},price=booking.kind==='table'?quoteTable(state,input,{exclude:reference,now}):quoteActivity(state,input,{exclude:reference,now});if(expectedTotal!==price.total)throw new HotelError('priceChanged');
 const difference=price.total-booking.price.total;booking.history.push({action:'changed',from:booking.date,to:price.date,difference,at:now.toISOString()});Object.assign(booking,price,{price,updated:now.toISOString(),...(booking.kind==='table'?{tableId:availableTables(state,input,reference)[0].id}:{})});return {booking,difference};
}
export function cancelServiceBooking(state,reference,{now=new Date()}={}){
 const data=ensureServices(state),b=[...data.tableBookings,...data.activityBookings].find(b=>b.reference===reference);if(!b)throw new HotelError('bookingNotFound');if(b.status==='cancelled')throw new HotelError('alreadyCancelled');validateSlot(b,b.kind==='table'?TABLE_TIMES:ACTIVITIES.find(a=>a.id===b.activityId).times,now);b.status='cancelled';b.updated=now.toISOString();b.cancellation={fee:0,refund:b.kind==='activity'?b.price.total:0};return b;
}
export function addTableBlock(state,input){const data=ensureServices(state);parseDay(input.date);if(!['all','lunch','dinner'].includes(input.service)||!Number.isInteger(input.count)||input.count<1||input.count>TABLES.length)throw new HotelError('invalidServiceCapacity');const tables=TABLES.slice(0,input.count).map(t=>t.id);if(data.tableBookings.some(b=>b.status==='confirmed'&&b.date===input.date&&tables.includes(b.tableId)&&(input.service==='all'||serviceOf(b.time)===input.service)))throw new HotelError('serviceCapacityConflict');const block={id:input.id,date:input.date,service:input.service,tables};data.tableBlocks.push(block);return block;}
export function setActivityLimit(state,input){const data=ensureServices(state),activity=data.activities.find(a=>a.id===input.activityId);parseDay(input.date);if(!activity||!['all',...activity.times].includes(input.time)||!Number.isInteger(input.capacity)||input.capacity<0||input.capacity>30)throw new HotelError('invalidServiceCapacity');for(const time of input.time==='all'?activity.times:[input.time]){const used=data.activityBookings.filter(b=>b.status==='confirmed'&&b.activityId===activity.id&&b.date===input.date&&b.time===time).reduce((n,b)=>n+b.adults+b.children,0);if(input.capacity<used)throw new HotelError('serviceCapacityConflict');}const limit={id:input.id,activityId:activity.id,date:input.date,time:input.time,capacity:input.capacity};data.activityLimits.push(limit);return limit;}
