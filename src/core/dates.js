const DAY=86400000;
export class HotelError extends Error{constructor(code,details={}){super(code);this.code=code;this.details=details;}}
export function parseDay(iso){if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw new HotelError('invalidDates');const date=new Date(iso+'T12:00:00Z');if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==iso)throw new HotelError('invalidDates');return date;}
export const dayISO=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function addDays(iso,count){const date=parseDay(iso);date.setUTCDate(date.getUTCDate()+count);return date.toISOString().slice(0,10);}
export const daysBetween=(from,to)=>Math.round((+parseDay(to)-parseDay(from))/DAY);
export function nightsBetween(from,to){const n=daysBetween(from,to);if(n<1||n>21)throw new HotelError('stayLength');return Array.from({length:n},(_,i)=>addDays(from,i));}
export const overlaps=(a,b,c,d)=>a<d&&c<b;
export function validateStay(input,today=dayISO()){
 const nights=nightsBetween(input.arrival,input.departure);
 if(input.arrival<today||input.departure>addDays(today,366))throw new HotelError('dateWindow');
 if(!Number.isInteger(input.adults)||input.adults<1||input.adults>4||!Number.isInteger(input.children)||input.children<0||input.children>3)throw new HotelError('invalidGuests');
 return nights;
}
