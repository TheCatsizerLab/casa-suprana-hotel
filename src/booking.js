import {pathFor,escapeHTML as e} from './config.js';
import {ROOMS,TEST_GUESTS} from './core/data.js';
export async function mountBooking({i18n,ui,store,provider}){
 const {t,language,money,plural}=i18n,{T,image,summary,terms}=ui,root=document.querySelector('#booking-app'),formTemplate=root.querySelector('#stay-search').outerHTML;
 const params=new URLSearchParams(location.search),state={input:{},selection:null,quote:null,guestId:params.get('guestId')||'camille'};
 const steps=n=>`<ol class="booking-steps">${[1,2,3,4].map(i=>`<li${i===n?' aria-current="step"':''}>${T('booking.step'+i)}</li>`).join('')}</ol><p class="simulation-note">${T('booking.demo')}</p>`;
 const errorSlot=()=>root.querySelector('#booking-error');
 const remember=step=>ui.setQuery(state.input,{room:state.selection?.roomId,plan:state.selection?.plan,extras:state.selection?.extras,step});
 const inputForQuote=()=>({...state.input,...state.selection});
 async function getQuote(){state.quote=await provider.quote(inputForQuote());return state.quote;}
 function searchView(input){
  root.innerHTML=steps(1)+formTemplate+'<div id="booking-error"></div><div id="booking-results" aria-live="polite"></div>';
  const form=root.querySelector('#stay-search');ui.enable(root);ui.initDates(form,input);
  form.addEventListener('submit',async event=>{event.preventDefault();state.input=ui.readStay(form);await runSearch();});
  state.input=ui.readStay(form);
 }
 async function runSearch(){
  const form=root.querySelector('#stay-search'),button=form.querySelector('button[type=submit]');button.disabled=true;errorSlot().innerHTML='';
  try{
   const results=await provider.search(state.input);const preferred=params.get('room');if(preferred)results.sort((a,b)=>Number(b.roomId===preferred)-Number(a.roomId===preferred));ui.setQuery(state.input,{room:preferred||undefined,extra:params.get('extra')||undefined});
   root.querySelector('#booking-results').innerHTML=`<div class="section-heading" style="margin-top:3rem"><div><p class="eyebrow">${e(ui.range(state.input))}</p><h2>${T('booking.results')}</h2></div><p>${e(ui.guestSummary(state.input))}</p></div>`+results.map(result=>{
    const room=ROOMS.find(r=>r.id===result.roomId);
    return `<article class="booking-result" data-room="${room.id}"><figure>${image(room)}</figure><div><h3>${T('room.'+room.id+'.name')}</h3><div class="room-meta"><span>${T('room.area',{area:room.area})}</span><span>${T('room.capacity',{count:room.capacity})}</span></div><p>${T('room.'+room.id+'.intro')}</p>${result.available?`<p class="secondary" style="margin-top:1rem">${T('booking.available')} · ${e(plural('night',result.offers[0].nightCount))}</p><div class="rate-options">${result.offers.map(q=>`<section class="rate-option"><h4>${T('booking.'+(q.plan==='advance'?'advance':'flexible'))}</h4><p>${T(q.plan==='advance'?'booking.advanceShort':'booking.flexibleShort')}</p>${terms(q.plan)}<strong class="rate-price">${e(money(q.total))}</strong><p>${T('booking.total')} · ${T('booking.tax',{price:money(250)})}</p><button class="button${q.plan==='advance'?' outline':''}" data-select-room="${room.id}" data-select-plan="${q.plan}">${T('booking.selectRate')}</button></section>`).join('')}</div>`:`<div class="alert-panel" style="margin-top:1.5rem"><p><strong>${T('booking.unavailable')}</strong></p><p>${e(ui.errorMessage({code:result.reason,details:result.details}))}</p><p>${T('booking.chooseOther')}</p></div>`}</div></article>`;
   }).join('');
   root.querySelectorAll('[data-select-room]').forEach(b=>b.addEventListener('click',async()=>{state.selection={roomId:b.dataset.selectRoom,plan:b.dataset.selectPlan,promo:b.dataset.selectPlan==='advance'?'':state.input.promo,extras:params.get('extra')==='spa'?['spa']:[]};await extrasView();}));
  }catch(error){root.querySelector('#booking-results').innerHTML='';ui.showError(errorSlot(),error);}finally{button.disabled=false;}
 }
 async function extrasView(){
  try{
   const local=await store.read();state.selection.extras=state.selection.extras.filter(id=>local.extras.some(x=>x.id===id&&x.active));await getQuote();remember('extras');
   root.innerHTML=steps(2)+`<div id="booking-error"></div><div class="booking-columns"><section><p class="eyebrow">${T('booking.step2')}</p><h2>${T('booking.optionsTitle')}</h2><p>${T('booking.optionsIntro')}</p><form id="extras-form"><div>${local.extras.filter(x=>x.active).map(x=>{
    const price=x.basis==='personNight'?(state.input.adults*x.price+state.input.children*x.childPrice)*state.quote.nightCount:x.basis==='adultStay'?state.input.adults*x.price:x.price;
    return `<label class="extra-option"><input type="checkbox" name="extra" value="${x.id}"${state.selection.extras.includes(x.id)?' checked':''}><span><h3>${T('extra.'+x.id)}</h3><p>${T('extra.'+x.id+'Body')}</p></span><strong>${e(money(price))}</strong></label>`;
   }).join('')}</div><div class="form-actions"><button class="button" type="submit">${T('ui.continue')}</button><button class="text-link" type="button" id="back-to-search">${T('ui.back')}</button></div></form></section><div id="summary-slot">${summary(state.quote)}</div></div>`;
   root.querySelector('#back-to-search').addEventListener('click',()=>{searchView(state.input);runSearch();});
   const form=root.querySelector('#extras-form');form.addEventListener('change',async()=>{state.selection.extras=[...form.querySelectorAll('input:checked')].map(x=>x.value);remember('extras');try{await getQuote();root.querySelector('#summary-slot').innerHTML=summary(state.quote);errorSlot().innerHTML='';}catch(error){ui.showError(errorSlot(),error);}});
   form.addEventListener('submit',async event=>{event.preventDefault();await guestsView();});ui.focusHeading(root);
  }catch(error){if(!errorSlot())searchView(state.input);ui.showError(errorSlot(),error);}
 }
 async function guestsView(){
  try{await getQuote();remember('guests');
   root.innerHTML=steps(3)+`<div class="booking-columns"><section><p class="eyebrow">${T('booking.step3')}</p><h2>${T('booking.guestTitle')}</h2><form id="guest-form"><div class="identity-section"><h3>${T('booking.testIdentity')}</h3>${ui.guestSelect(state.guestId)}<label>${T('booking.testEmail')}<input name="email" type="email" readonly value="${e((TEST_GUESTS.find(g=>g.id===state.guestId)||TEST_GUESTS[0]).email)}"></label><p class="secondary">${T('booking.identityHelp')}</p></div><div class="payment-section"><h3>${T('booking.paymentTitle')}</h3><p>${T('booking.paymentHelp')}</p><fieldset><legend class="secondary">${T('booking.paymentTitle')}</legend><label class="check-label"><input type="radio" name="payment" value="approved" checked required><span>${T('booking.paymentApproved')}</span></label><label class="check-label"><input type="radio" name="payment" value="declined"><span>${T('booking.paymentDeclined')}</span></label></fieldset></div><div class="identity-section"><h3>${T(state.selection.plan==='advance'?'booking.advance':'booking.flexible')}</h3>${terms(state.selection.plan)}<label class="check-label" style="margin-top:1.5rem"><input type="checkbox" name="accepted" required><span>${T('booking.accept')}</span></label></div><div id="booking-error"></div><div class="form-actions"><button class="button" type="submit">${T('booking.confirm')}</button><button class="text-link" type="button" id="back-to-extras">${T('ui.back')}</button></div></form></section>${summary(state.quote)}</div>`;
   const form=root.querySelector('#guest-form');form.elements.guestId.addEventListener('change',()=>{state.guestId=form.elements.guestId.value;form.elements.email.value=TEST_GUESTS.find(g=>g.id===state.guestId).email;remember('guests');});
   root.querySelector('#back-to-extras').addEventListener('click',extrasView);
   form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;errorSlot().innerHTML='';
    try{const booking=await provider.createBooking({...inputForQuote(),guestId:form.elements.guestId.value,payment:form.elements.payment.value,accepted:form.elements.accepted.checked,expectedTotal:state.quote.total});confirmation(booking);}
    catch(error){ui.showError(errorSlot(),error);if(error.code==='priceChanged'||error.code==='invalidExtra'){const retry=document.createElement('button');retry.className='button outline';retry.type='button';retry.textContent=t('manage.changeQuote');retry.addEventListener('click',extrasView);errorSlot().append(retry);}}
    finally{if(button.isConnected)button.disabled=false;}
   });ui.focusHeading(root);
  }catch(error){ui.showError(errorSlot(),error);}
 }
 function confirmation(booking){
  const guest=TEST_GUESTS.find(g=>g.id===booking.guestId);ui.setQuery({},{reference:booking.reference,guestId:guest.id});
  root.innerHTML=steps(4)+`<section class="booking-confirmed"><p class="eyebrow">CASA SUPRANA</p><h2>${T('booking.confirmedTitle')}</h2><p>${T('booking.confirmedBody')}</p><div class="reference-box"><span>${T('booking.reference')}</span><strong id="confirmed-reference">${e(booking.reference)}</strong><span>${e(guest.name)} · ${e(guest.email)}</span></div>${summary(booking.price)}<div class="actions"><a class="button" href="${pathFor('manage',language)}?reference=${encodeURIComponent(booking.reference)}&guestId=${guest.id}">${T('booking.manage')}</a><button class="button outline" id="print-confirmation">${T('booking.print')}</button><a class="text-link" href="${pathFor('booking',language)}">${T('booking.startAgain')}</a></div></section>`;
  root.querySelector('#print-confirmation').addEventListener('click',()=>window.print());ui.focusHeading(root);
 }
 if(params.get('reference')){try{const guest=TEST_GUESTS.find(g=>g.id===state.guestId)||TEST_GUESTS[0];confirmation(await provider.findBooking(params.get('reference'),guest.email));return;}catch{}}
 searchView(Object.fromEntries(['arrival','departure','adults','children','promo','nights'].filter(k=>params.has(k)).map(k=>[k,params.get(k)])));
 if(['extras','guests'].includes(params.get('step'))&&ROOMS.some(r=>r.id===params.get('room'))){state.selection={roomId:params.get('room'),plan:params.get('plan')==='advance'?'advance':'flexible',promo:params.get('plan')==='advance'?'':state.input.promo,extras:(params.get('extras')||'').split(',').filter(Boolean)};await (params.get('step')==='guests'?guestsView():extrasView());}
 else await runSearch();
}
