import {HotelError,addDays,dayISO,nightsBetween,overlaps,parseDay,validateStay} from './dates.js';
import {ROOMS,TEST_GUESTS,unitsFor} from './data.js';
export const getRoom=id=>{const room=ROOMS.find(r=>r.id===id);if(!room)throw new HotelError('unknownRoom');return room;};
export const fits=(room,{adults,children})=>adults<=room.adults&&children<=room.children&&adults+children<=room.capacity;
export const seasonFactor=iso=>{const month=parseDay(iso).getUTCMonth()+1;return month===7||month===8?15000:month===6?13000:[4,5,9,10].includes(month)?11800:10000;};
export const minimumStay=iso=>[7,8].includes(parseDay(iso).getUTCMonth()+1)?3:2;
export function availableUnits(state,roomId,arrival,departure,exclude=''){
 const room=getRoom(roomId);
 return unitsFor(room).filter(unit=>!state.blocks.some(b=>b.roomId===roomId&&b.units.includes(unit)&&overlaps(arrival,departure,b.from,b.to))&&!state.bookings.some(b=>b.reference!==exclude&&b.status!=='cancelled'&&b.roomId===roomId&&b.unit===unit&&overlaps(arrival,departure,b.arrival,b.departure)));
}
export function nightlyPrice(state,room,iso,adults,children){
 const rule=[...state.rates].reverse().find(r=>r.roomId===room.id&&iso>=r.from&&iso<r.to);
 const base=rule?rule.price:Math.round((state.roomPrices[room.id]??room.base)*seasonFactor(iso)/10000);
 const weekend=[5,6].includes(parseDay(iso).getUTCDay())?10700:10000;
 return {date:iso,price:Math.round(base*(rule?10000:weekend)/10000)+Math.max(0,adults-2)*5500+children*2500,minNights:rule?.minNights??minimumStay(iso)};
}
export function quote(state,input,{today=dayISO(),exclude=''}={}){
 const dates=validateStay(input,today),room=getRoom(input.roomId);
 if(!fits(room,input))throw new HotelError('capacity');
 if(!['flexible','advance'].includes(input.plan))throw new HotelError('invalidPlan');
 const nights=dates.map(d=>nightlyPrice(state,room,d,input.adults,input.children));
 const min=Math.max(...nights.map(x=>x.minNights));if(nights.length<min)throw new HotelError('minimumStay',{minimum:min});
 const available=availableUnits(state,room.id,input.arrival,input.departure,exclude);if(!available.length)throw new HotelError('unavailable');
 const promoCode=String(input.promo||'').trim().toUpperCase().replace(/^AVELUNE10$/,'SUPRANA10');let promotion=null;
 if(promoCode){promotion=state.promotions.find(p=>p.code===promoCode&&p.active);if(!promotion)throw new HotelError('invalidPromo');if(input.plan!=='flexible')throw new HotelError('promoPlan');if(dates.length<promotion.minNights)throw new HotelError('promoMinimum',{minimum:promotion.minNights});}
 const subtotal=nights.reduce((sum,n)=>sum+n.price,0),discount=Math.round(subtotal*(promotion?promotion.percent:input.plan==='advance'?8:0)/100),roomTotal=subtotal-discount;
 const selected=[...new Set(input.extras||[])];if(selected.some(id=>!state.extras.some(e=>e.id===id&&e.active)))throw new HotelError('invalidExtra');
 const extras=selected.map(id=>{const e=state.extras.find(x=>x.id===id);return {id,total:e.basis==='personNight'?(input.adults*e.price+input.children*e.childPrice)*dates.length:e.basis==='adultStay'?input.adults*e.price:e.price};});
 const extrasTotal=extras.reduce((a,e)=>a+e.total,0),tax=input.adults*dates.length*250;
 return {roomId:room.id,arrival:input.arrival,departure:input.departure,adults:input.adults,children:input.children,plan:input.plan,promo:promoCode,nights,nightCount:dates.length,availableUnits:available.length,subtotal,discount,roomTotal,extras,extrasTotal,tax,total:roomTotal+extrasTotal+tax,currency:'EUR',freeCancellationUntil:addDays(input.arrival,-3)};
}
export function search(state,input,options={}){
 validateStay(input,options.today);
 return ROOMS.map(room=>{if(!fits(room,input))return {roomId:room.id,available:false,reason:'capacity'};try{return {roomId:room.id,available:true,offers:['flexible','advance'].map(plan=>quote(state,{...input,roomId:room.id,plan,promo:plan==='flexible'?input.promo:'',extras:[]},options))};}catch(e){if(!(e instanceof HotelError))throw e;return {roomId:room.id,available:false,reason:e.code,details:e.details};}});
}
export function createBooking(state,input,{today=dayISO(),reference,now=new Date().toISOString()}={}){
 const guest=TEST_GUESTS.find(g=>g.id===input.guestId);if(!guest)throw new HotelError('fictionalGuest');
 if(input.payment!=='approved')throw new HotelError('paymentDeclined');
 if(input.accepted!==true)throw new HotelError('acceptTerms');
 if(typeof reference!=='string'||!/^(?:AV|CS)-[A-Z0-9]{8}$/.test(reference)||state.bookings.some(b=>b.reference===reference))throw new HotelError('referenceConflict');
 const price=quote(state,input,{today});
 if(!Number.isInteger(input.expectedTotal)||input.expectedTotal!==price.total)throw new HotelError('priceChanged');
 const booking={reference,roomId:input.roomId,unit:availableUnits(state,input.roomId,input.arrival,input.departure)[0],arrival:input.arrival,departure:input.departure,adults:input.adults,children:input.children,plan:input.plan,promo:price.promo,extras:price.extras.map(x=>x.id),guestId:guest.id,price,status:'confirmed',created:now,updated:now,payment:'simulated',history:[]};
 state.bookings.push(booking);return booking;
}
export function findBooking(state,reference,email){const b=state.bookings.find(x=>x.reference===String(reference).trim().toUpperCase());if(!b||TEST_GUESTS.find(g=>g.id===b.guestId)?.email!==String(email).trim().toLowerCase())throw new HotelError('bookingNotFound');return b;}
export function changeBooking(state,reference,changes,{today=dayISO(),expectedTotal,admin=false}={}){
 const booking=state.bookings.find(x=>x.reference===reference);if(!booking)throw new HotelError('bookingNotFound');if(booking.status==='cancelled')throw new HotelError('alreadyCancelled');
 if(booking.plan!=='flexible'||today>addDays(booking.arrival,-3))throw new HotelError('changeClosed');
 const input={...booking,...changes,roomId:booking.roomId,plan:booking.plan,extras:changes.extras||booking.extras,promo:changes.promo??booking.promo};
 const price=quote(state,input,{today,exclude:reference});if(expectedTotal!==price.total)throw new HotelError('priceChanged');
 const difference=price.total-booking.price.total;
 const history=[...booking.history,{action:'changed',from:booking.arrival,to:input.arrival,difference,at:new Date().toISOString()}];
 Object.assign(booking,{arrival:input.arrival,departure:input.departure,adults:input.adults,children:input.children,extras:price.extras.map(x=>x.id),promo:price.promo,unit:availableUnits(state,booking.roomId,input.arrival,input.departure,reference)[0],price,updated:new Date().toISOString(),history});return {booking,difference};
}
export function cancellationTerms(booking,today=dayISO()){
 const fee=booking.plan==='advance'?booking.price.total:today<=booking.price.freeCancellationUntil?0:booking.price.nights[0].price;
 return {fee,refund:Math.max(0,booking.price.total-fee),free:fee===0};
}
export function cancelBooking(state,reference,{today=dayISO(),expectedFee}={}){
 const b=state.bookings.find(x=>x.reference===reference);if(!b)throw new HotelError('bookingNotFound');if(b.status==='cancelled')throw new HotelError('alreadyCancelled');if(b.arrival<today)throw new HotelError('cancelClosed');
 const terms=cancellationTerms(b,today);if(expectedFee!==terms.fee)throw new HotelError('priceChanged');b.status='cancelled';b.cancelled=new Date().toISOString();b.cancellation=terms;b.updated=b.cancelled;return b;
}
export function addBlock(state,input){
 const room=getRoom(input.roomId);parseDay(input.from);parseDay(input.to);if(input.from>=input.to||!Number.isInteger(input.count)||input.count<1||input.count>room.units)throw new HotelError('invalidBlock');
 const units=unitsFor(room).slice(0,input.count);if(state.bookings.some(b=>b.status!=='cancelled'&&b.roomId===room.id&&units.includes(b.unit)&&overlaps(input.from,input.to,b.arrival,b.departure)))throw new HotelError('blockConflict');
 const block={id:input.id,roomId:room.id,from:input.from,to:input.to,units,reason:'maintenance'};state.blocks.push(block);return block;
}
export function updateRate(state,input){
 getRoom(input.roomId);parseDay(input.from);parseDay(input.to);if(input.from>=input.to||!Number.isInteger(input.price)||input.price<5000||input.price>500000||!Number.isInteger(input.minNights)||input.minNights<1||input.minNights>21)throw new HotelError('invalidRate');
 const rate={id:input.id,roomId:input.roomId,from:input.from,to:input.to,price:input.price,minNights:input.minNights};state.rates.push(rate);return rate;
}
export function statistics(state,from=dayISO(),to=addDays(from,14)){
 const days=nightsBetween(from,to),occupied=state.bookings.filter(b=>b.status!=='cancelled').reduce((sum,b)=>sum+days.filter(d=>d>=b.arrival&&d<b.departure).length,0),revenue=state.bookings.filter(b=>b.status!=='cancelled'&&b.arrival>=from&&b.arrival<to).reduce((sum,b)=>sum+b.price.total,0);
 return {occupancy:occupied/(18*days.length),revenue,confirmed:state.bookings.filter(b=>b.status!=='cancelled').length,cancelled:state.bookings.filter(b=>b.status==='cancelled').length,arrivals:state.bookings.filter(b=>b.status!=='cancelled'&&b.arrival===from),departures:state.bookings.filter(b=>b.status!=='cancelled'&&b.departure===from)};
}
