import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState} from '../src/core/data.js';
import {quoteTable,quoteActivity,createServiceBooking,changeServiceBooking,cancelServiceBooking,addTableBlock,setActivityLimit} from '../src/core/services.js';
const now=new Date('2026-11-25T08:00:00Z'),state=()=>seedState('2026-11-25');
const table=(patch={})=>({kind:'table',date:'2026-12-01',time:'19:30',menuId:'maquis',adults:2,children:0,guestId:'camille',accepted:true,...patch});
const activity=(patch={})=>({kind:'activity',date:'2026-12-01',time:'09:30',activityId:'sea',adults:2,children:0,guestId:'alex',accepted:true,payment:'approved',...patch});
function create(s,input,index=1){const q=input.kind==='table'?quoteTable(s,input,{now}):quoteActivity(s,input,{now});return createServiceBooking(s,{...input,expectedTotal:q.total},{reference:'CS-'+(input.kind==='table'?'T':'A')+'-'+String(index).padStart(8,'0'),now});}
test('table and activity bookings reject closed Mondays, past times, mismatched menus and excessive parties',()=>{
 for(const input of [table({date:'2026-11-30'}),table({time:'12:00'}),table({adults:6,children:1}),table({date:'2026-11-25',time:'08:00'})])assert.throws(()=>quoteTable(state(),input,{now}));
 assert.throws(()=>quoteActivity(state(),activity({date:'2026-11-30'}),{now}),{code:'serviceClosed'});
 assert.equal(quoteTable(state(),table({adults:2,children:2}),{now}).total,18400);
 assert.equal(quoteActivity(state(),activity({adults:2,children:1}),{now}).total,21500);
});
test('restaurant allocates a real suitable table and protects overlapping ninety-minute sittings',()=>{
 const s=state(),first=create(s,table({adults:6}),1),second=create(s,table({adults:6,time:'20:00'}),2);assert.notEqual(first.tableId,second.tableId);
 assert.throws(()=>quoteTable(s,table({adults:6,time:'20:30'}),{now}),{code:'tableUnavailable'});
 assert.equal(quoteTable(s,table({adults:6,time:'12:00',menuId:'lunch'}),{now}).available,2);
 cancelServiceBooking(s,first.reference,{now});assert.equal(quoteTable(s,table({adults:6}),{now}).available,1);
});
test('stale menu prices and declined activity payment create no reservation',()=>{
 const s=state(),input=table(),q=quoteTable(s,input,{now});s.services.menus.find(m=>m.id==='maquis').adultPrice=7500;
 assert.throws(()=>createServiceBooking(s,{...input,expectedTotal:q.total},{reference:'CS-T-12345678',now}),{code:'priceChanged'});assert.equal(s.services.tableBookings.length,0);
 assert.throws(()=>create(s,activity({payment:'declined'})),{code:'paymentDeclined'});assert.equal(s.services.activityBookings.length,0);
});
test('activity capacity is reduced by participants and cannot be oversold',()=>{
 const s=state();create(s,activity({adults:6}),1);create(s,activity({adults:2}),2);
 assert.throws(()=>quoteActivity(s,activity({adults:1}),{now}),{code:'activityFull'});
 assert.equal(s.services.activityBookings.reduce((n,b)=>n+b.adults,0),8);
});
test('service changes exclude their own booking and retain an immutable confirmed price snapshot',()=>{
 const s=state(),b=create(s,activity({adults:6}));create(s,activity({adults:2}),2);const changes={...activity({adults:5})};const q=quoteActivity(s,changes,{exclude:b.reference,now});const old=b.price.total;
 const result=changeServiceBooking(s,b.reference,changes,{now,expectedTotal:q.total});assert.equal(result.booking.adults,5);assert.equal(result.difference,-8500);assert.equal(result.booking.history.length,1);assert.notEqual(result.booking.price.total,old);
 s.services.activities.find(a=>a.id==='sea').adultPrice=9000;assert.equal(b.price.total,q.total);
});
test('restaurant closures and activity limits refuse conflicts with confirmed reservations',()=>{
 const s=state();create(s,table({adults:6}));assert.throws(()=>addTableBlock(s,{id:'closure',date:'2026-12-01',service:'dinner',count:5}),{code:'serviceCapacityConflict'});
 addTableBlock(s,{id:'lunch-close',date:'2026-12-01',service:'lunch',count:6});assert.throws(()=>quoteTable(s,table({time:'12:00',menuId:'lunch'}),{now}),{code:'tableUnavailable'});
 create(s,activity());assert.throws(()=>setActivityLimit(s,{id:'limit',activityId:'sea',date:'2026-12-01',time:'09:30',capacity:1}),{code:'serviceCapacityConflict'});
 setActivityLimit(s,{id:'close',activityId:'sea',date:'2026-12-01',time:'16:00',capacity:0});assert.throws(()=>quoteActivity(s,activity({time:'16:00'}),{now}),{code:'activityFull'});
});
test('service cancellation releases capacity, returns only simulated activity payment and cannot repeat',()=>{
 const s=state(),a=create(s,activity());cancelServiceBooking(s,a.reference,{now});assert.equal(a.cancellation.refund,17000);assert.equal(quoteActivity(s,activity(),{now}).available,8);assert.throws(()=>cancelServiceBooking(s,a.reference,{now}),{code:'alreadyCancelled'});
 const b=create(s,table());cancelServiceBooking(s,b.reference,{now});assert.equal(b.cancellation.refund,0);
});
