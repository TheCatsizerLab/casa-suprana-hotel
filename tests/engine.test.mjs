import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState,ROOMS,unitsFor} from '../src/core/data.js';
import {parseDay,addDays} from '../src/core/dates.js';
import {availableUnits,quote,search,createBooking,changeBooking,cancelBooking,cancellationTerms,updateRate,addBlock,statistics} from '../src/core/engine.js';
const today='2026-11-25';
const request=(overrides={})=>({arrival:'2026-12-01',departure:'2026-12-04',adults:2,children:0,roomId:'garden',plan:'flexible',extras:[],promo:'',guestId:'camille',payment:'approved',accepted:true,...overrides});
const reserve=(state,input=request(),index=1)=>createBooking(state,{...input,expectedTotal:quote(state,input,{today}).total},{today,reference:'AV-'+String(index).padStart(8,'0')});
test('ISO dates reject rollover, invalid inputs and out-of-window stays',()=>{
 assert.throws(()=>parseDay('2026-02-30'),{code:'invalidDates'});assert.equal(addDays('2028-02-28',1),'2028-02-29');
 for(const patch of [{arrival:'2026-11-24'},{departure:'2026-12-01'},{departure:'2027-12-05'},{adults:0},{children:1.5}])assert.throws(()=>quote(seedState(today),request(patch),{today}));
});
test('prices use integer cents, seasonal/nightly rules, 8% advance and localized-independent totals',()=>{
 const state=seedState(today),q=quote(state,request(),{today});assert.equal(q.roomTotal,66000);assert.equal(q.tax,1500);assert.equal(q.total,67500);
 const advance=quote(state,request({plan:'advance'}),{today});assert.equal(advance.roomTotal,60720);
 assert.throws(()=>quote(state,request({arrival:'2027-07-01',departure:'2027-07-03'}),{today}),{code:'minimumStay'});
 const summer=quote(state,request({arrival:'2027-07-05',departure:'2027-07-08'}),{today});assert.equal(summer.roomTotal,99000);
});
test('room capacities respect adults, children and total guests together',()=>{
 const state=seedState(today);assert.throws(()=>quote(state,request({children:1}),{today}),{code:'capacity'});
 assert.equal(quote(state,request({roomId:'pines',adults:2,children:2}),{today}).roomId,'pines');
 assert.throws(()=>quote(state,request({roomId:'pines',adults:4,children:1}),{today}),{code:'capacity'});
 assert.equal(search(state,request({adults:4,children:0}),{today}).filter(r=>r.available).length,1);
});
test('extras and promotions are explicit, deduplicated and cannot stack with advance',()=>{
 const state=seedState(today),q=quote(state,request({promo:'avelune10',extras:['breakfast','spa','transfer','spa']}),{today});
 assert.equal(q.discount,6600);assert.equal(q.extrasTotal,16800+15000+9500);assert.equal(q.total,102200);
 assert.throws(()=>quote(state,request({promo:'SEMAINE12'}),{today}),{code:'promoMinimum'});
 assert.throws(()=>quote(state,request({promo:'SUPRANA10',plan:'advance'}),{today}),{code:'promoPlan'});
 assert.throws(()=>quote(state,request({extras:['unknown']}),{today}),{code:'invalidExtra'});
});
test('availability is assigned to a physical unit for the whole stay, not nightly aggregate stock',()=>{
 const state=seedState(today);state.blocks=unitsFor(ROOMS[0]).flatMap((unit,i)=>[{id:unit,roomId:'garden',from:i<3?'2026-12-01':'2026-12-02',to:i<3?'2026-12-02':'2026-12-03',units:[unit]}]);
 assert.equal(availableUnits(state,'garden','2026-12-01','2026-12-03').length,0);
 assert.throws(()=>quote(state,request(),{today}),{code:'unavailable'});
});
test('six units sell exactly once; half-open checkout allows the next arrival',()=>{
 const state=seedState(today);state.blocks=[];
 for(let i=1;i<=6;i++)reserve(state,request(),i);
 assert.equal(new Set(state.bookings.map(b=>b.unit)).size,6);assert.equal(availableUnits(state,'garden','2026-12-01','2026-12-04').length,0);
 assert.throws(()=>reserve(state,request(),7),{code:'unavailable'});
 assert.equal(availableUnits(state,'garden','2026-12-04','2026-12-06').length,6);
});
test('declined payment, missing consent and stale prices never consume inventory',()=>{
 const state=seedState(today);for(const patch of [{payment:'declined'},{accepted:false},{guestId:'real-person'}])assert.throws(()=>reserve(state,request(patch)));
 assert.equal(state.bookings.length,0);const input=request(),price=quote(state,input,{today});
 updateRate(state,{id:'new-price',roomId:'garden',from:'2026-12-01',to:'2026-12-05',price:25000,minNights:2});
 assert.throws(()=>createBooking(state,{...input,expectedTotal:price.total},{today,reference:'AV-12345678'}),{code:'priceChanged'});assert.equal(state.bookings.length,0);
});
test('confirmed quotes stay fixed when administration changes later prices',()=>{
 const state=seedState(today),booking=reserve(state),total=booking.price.total;
 updateRate(state,{id:'rate',roomId:'garden',from:'2026-12-01',to:'2026-12-04',price:40000,minNights:2});
 assert.equal(booking.price.total,total);assert.notEqual(quote(state,request(),{today}).total,total);
});
test('flexible modification rechecks inventory excluding itself, then updates dates and price',()=>{
 const state=seedState(today),booking=reserve(state),changes={arrival:'2026-12-02',departure:'2026-12-05'};
 const next=quote(state,{...booking,...changes},{today,exclude:booking.reference});
 const result=changeBooking(state,booking.reference,changes,{today,expectedTotal:next.total});assert.equal(result.booking.arrival,changes.arrival);assert.equal(result.booking.history.length,1);assert.equal(result.booking.unit,'J04');
});
test('cancellation discloses free, late and non-refundable conditions and releases availability',()=>{
 const state=seedState(today),booking=reserve(state);assert.equal(cancellationTerms(booking,today).fee,0);
 assert.equal(cancellationTerms(booking,'2026-11-30').fee,22000);
 cancelBooking(state,booking.reference,{today,expectedFee:0});assert.equal(booking.status,'cancelled');assert.equal(availableUnits(state,'garden',booking.arrival,booking.departure).length,3);
 assert.throws(()=>cancelBooking(state,booking.reference,{today,expectedFee:0}),{code:'alreadyCancelled'});
 const advance=reserve(state,request({plan:'advance'}),2);assert.equal(cancellationTerms(advance,today).fee,advance.price.total);
 assert.throws(()=>changeBooking(state,advance.reference,{}, {today,expectedTotal:advance.price.total}),{code:'changeClosed'});
});
test('admin closures cannot hide an existing reservation; valid closures and rates affect search',()=>{
 const state=seedState(today);reserve(state);
 assert.throws(()=>addBlock(state,{id:'block',roomId:'garden',from:'2026-12-01',to:'2026-12-04',count:4}),{code:'blockConflict'});
 addBlock(state,{id:'block',roomId:'sea',from:'2026-12-01',to:'2026-12-04',count:6});assert.equal(search(state,request(),{today}).find(x=>x.roomId==='sea').reason,'unavailable');
 assert.throws(()=>updateRate(state,{roomId:'sea',from:'2026-12-01',to:'2026-12-04',price:-1,minNights:2}),{code:'invalidRate'});
 assert.equal(statistics(state,today,'2026-12-09').confirmed,1);
});
