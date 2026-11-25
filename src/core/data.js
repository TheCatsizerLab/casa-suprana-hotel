import {addDays,dayISO} from './dates.js';
import {seedServices} from './services.js';
export {TEST_GUESTS} from './profiles.js';
export const ROOMS=[
 {id:'garden',route:'garden',units:6,prefix:'J',area:28,adults:2,children:0,capacity:2,base:22000,image:'room-stone',features:['garden','shower','king']},
 {id:'sea',route:'sea',units:6,prefix:'M',area:32,adults:2,children:1,capacity:2,base:28500,image:'room-sea',features:['sea','balcony','king']},
 {id:'terrace',route:'terrace',units:4,prefix:'T',area:48,adults:3,children:1,capacity:3,base:42000,image:'room-wood',features:['terrace','lounge','bath']},
 {id:'pines',route:'pines',units:2,prefix:'P',area:62,adults:4,children:2,capacity:4,base:54000,image:'room-suite',features:['twoRooms','garden','bath']}
];
export const unitsFor=room=>Array.from({length:room.units},(_,i)=>room.prefix+String(i+1).padStart(2,'0'));
export const EXTRAS=[{id:'breakfast',price:2800,childPrice:1400,basis:'personNight'},{id:'spa',price:7500,basis:'adultStay'},{id:'transfer',price:9500,basis:'stay'}];
export function seedState(today=dayISO()){
 return {schema:1,services:seedServices(),revision:0,created:today,bookings:[],blocks:[
 {id:'seed-garden',roomId:'garden',from:addDays(today,6),to:addDays(today,8),units:['J01','J02','J03'],reason:'maintenance'},
 {id:'seed-sea',roomId:'sea',from:addDays(today,12),to:addDays(today,14),units:unitsFor(ROOMS[1]),reason:'privateEvent'},
 {id:'seed-terrace',roomId:'terrace',from:addDays(today,20),to:addDays(today,22),units:unitsFor(ROOMS[2]),reason:'maintenance'},
 {id:'seed-pines',roomId:'pines',from:addDays(today,25),to:addDays(today,27),units:unitsFor(ROOMS[3]),reason:'privateEvent'}
 ],rates:[],roomPrices:Object.fromEntries(ROOMS.map(r=>[r.id,r.base])),extras:EXTRAS.map(x=>({...x,active:true})),promotions:[{id:'avelune',code:'SUPRANA10',percent:10,minNights:3,active:true},{id:'week',code:'SEMAINE12',percent:12,minNights:7,active:true}],content:Object.fromEntries(['fr','en','it','es','de'].map(lang=>[lang,{welcome:'',restaurantHours:'',spaHours:''}]))};
}
