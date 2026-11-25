import {asset,escapeHTML as e,pathFor} from './config.js';
import {ROOMS,TEST_GUESTS} from './core/data.js';
import {addDays,dayISO} from './core/dates.js';
export function makeUI(i18n){
 const {t,language,money,date,plural}=i18n,T=(key,values)=>e(t(key,values));
 const image=room=>`<img src="${asset('images/'+room.image+'-960.webp')}" width="960" height="720" alt="${T('image.'+room.image)}" loading="lazy">`;
 const guestSummary=input=>[plural('adult',input.adults),input.children?plural('child',input.children):''].filter(Boolean).join(' · ');
 const range=input=>date(input.arrival)+' — '+date(input.departure);
 const terms=plan=>`<p>${T('booking.'+(plan==='advance'?'advanceTerms':'flexibleTerms'))}</p>`;
 function summary(q){return `<aside class="booking-summary"><p class="eyebrow">CASA SUPRANA</p><h2>${T('booking.summary')}</h2><h3>${T('room.'+q.roomId+'.name')}</h3><p>${e(range(q))}<br>${e(plural('night',q.nightCount))} · ${e(guestSummary(q))}</p><p class="secondary">${T(q.plan==='advance'?'booking.advanceShort':'booking.flexibleShort')}</p><ul class="summary-lines"><li><span>${T('booking.accommodation')}</span><span>${e(money(q.subtotal))}</span></li>${q.discount?`<li><span>${T('booking.discount')}${q.promo?' · '+e(q.promo):''}</span><span>−${e(money(q.discount))}</span></li>`:''}${q.extras.map(x=>`<li><span>${T('extra.'+x.id)}</span><span>${e(money(x.total))}</span></li>`).join('')}<li><span>${T('booking.tax',{price:money(250)})}</span><span>${e(money(q.tax))}</span></li><li class="summary-total"><span>${T('booking.total')}</span><span data-total="${q.total}">${e(money(q.total))}</span></li></ul><p class="secondary">${T('booking.vat')}</p><details class="nightly-breakdown"><summary>${T('booking.nightlyDetails')}</summary><ul>${q.nights.map(n=>`<li><span>${e(date(n.date,{year:undefined}))}</span><span>${e(money(n.price))}</span></li>`).join('')}</ul></details></aside>`;}
 const errorMessage=error=>{try{return t('error.'+(error.code||'serviceUnavailable'),error.details||{});}catch{return t('error.serviceUnavailable');}};
 function showError(container,error){container.innerHTML=`<div class="form-error" role="alert">${e(errorMessage(error))}</div>`;container.querySelector('[role=alert]')?.scrollIntoView({block:'nearest',behavior:'smooth'});}
 function toast(message){const el=document.querySelector('#toast');el.textContent=message;clearTimeout(el._timer);el._timer=setTimeout(()=>el.textContent='',6000);}
 function initDates(form,input={}){
  const today=dayISO(),arrival=input.arrival||addDays(today,14),departure=input.departure||addDays(arrival,Math.min(21,Math.max(2,Number(input.nights)||(input.promo==='SEMAINE12'?7:3))));
  for(const [name,value] of Object.entries({arrival,departure,adults:input.adults??2,children:input.children??0,promo:input.promo||''}))if(form.elements[name])form.elements[name].value=String(value);
  form.elements.arrival.min=today;form.elements.arrival.max=addDays(today,365);form.elements.departure.min=addDays(arrival,1);form.elements.departure.max=addDays(today,366);
  form.elements.arrival.addEventListener('change',()=>{try{form.elements.departure.min=addDays(form.elements.arrival.value,1);if(form.elements.departure.value<=form.elements.arrival.value)form.elements.departure.value=addDays(form.elements.arrival.value,3);}catch{}});
 }
 const readStay=form=>({arrival:form.elements.arrival.value,departure:form.elements.departure.value,adults:Number(form.elements.adults.value),children:Number(form.elements.children.value),promo:form.elements.promo?.value.trim().toUpperCase()||''});
 const guestSelect=(id='camille')=>`<label>${T('booking.testIdentity')}<select name="guestId" required>${TEST_GUESTS.map(g=>`<option value="${g.id}"${g.id===id?' selected':''}>${e(g.name)}</option>`).join('')}</select></label>`;
 function enable(root=document){root.querySelectorAll('[data-js-fieldset]').forEach(el=>el.disabled=false);}
 function setQuery(input,extra={}){const query=new URLSearchParams();for(const [key,value] of Object.entries({...input,...extra})){if(value===undefined||value===null||value==='')continue;if(key==='extras')query.set(key,value.join(','));else if(['arrival','departure','adults','children','promo','room','plan','step','reference','guestId','extra','menu','activity','date','time','kind'].includes(key))query.set(key,String(value));}history.replaceState(null,'',location.pathname+(query.size?'?'+query:'')+location.hash);}
 function focusHeading(root){const h=root.querySelector('h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true});h.scrollIntoView({behavior:'smooth',block:'start'});}}
 return {T,image,guestSummary,range,terms,summary,errorMessage,showError,toast,initDates,readStay,guestSelect,enable,setQuery,focusHeading,e};
}
