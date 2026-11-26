import {sprig,horizon,compass} from './atelier-art.js';

export function atelierHeader({route,T,link,picker,mark,home}){
 return `<a class="skip" href="#main">${T('ui.skip')}</a>
 <header class="hotel-header atelier-header"><div class="header-inner">
  <div class="header-leading"><button class="menu-toggle" aria-label="${T('ui.menu')}" aria-expanded="false" aria-controls="hotel-menu"><span class="menu-lines" aria-hidden="true"></span><span>${T('ui.menu')}</span></button><nav class="desktop-nav" aria-label="${T('nav.rooms')}">${link('rooms','nav.rooms')}${link('restaurant','nav.restaurant')}</nav></div>
  <a class="wordmark" href="${home}" aria-label="Casa Suprana · ${T('nav.home')}">${mark}<span>CASA</span><strong>SUPRANA</strong></a>
  <div class="header-actions">${link('contact','nav.contact','header-contact')}${picker(route)}${link('booking','ui.book','button compact')}</div>
 </div></header>
 <dialog id="hotel-menu" class="menu-dialog atelier-menu" aria-label="${T('ui.menu')}">
  <div class="menu-top"><a class="wordmark" href="${home}"><span>CASA</span><strong>SUPRANA</strong></a><button class="close-button" data-close-dialog>${T('ui.close')} <span aria-hidden="true">×</span></button></div>
  <div class="menu-columns"><nav>${['house','rooms','restaurant','spa','experiences','offers'].map(r=>link(r,'nav.'+r)).join('')}</nav><nav>${['tableBooking','activityBooking','gallery','region','information','contact','manage'].map(r=>link(r,'nav.'+r)).join('')}${link('booking','nav.booking','button')}</nav></div>
  <div class="menu-herbarium" aria-hidden="true">${sprig}${horizon}</div><p class="menu-location">${T('site.subtitle')}</p>
 </dialog>`;
}

export function atelierHome({T,image,link,rooms,roomCard,searchForm,mark}){
 return `<section class="carnet-hero home-hero" aria-labelledby="carnet-title">
  <div class="carnet-running"><span>CAP CORSE</span><span>${T('atelier.eyebrow')}</span><span>${T('atelier.mediterranean')}</span></div>
  <div class="carnet-scene">
   <a class="carnet-frame scene-coast" href="#ile">${image('corsica-beach','',true,'(max-width:700px) 57vw, 34vw')}<span class="frame-caption">${T('atelier.coast')}</span></a>
   <a class="carnet-frame scene-room" href="#collection">${image('room-stone','','','(max-width:700px) 35vw, 21vw')}<span class="frame-caption">${T('atelier.room')}</span></a>
   <div class="carnet-paper"><div class="paper-emblem">${mark}</div><p class="eyebrow">CASA SUPRANA</p><div class="hero-content"><h1 id="carnet-title"><span>${T('atelier.title.first')}</span><em>${T('atelier.title.second')}</em></h1><p>${T('atelier.intro')}</p><div class="paper-actions">${link('booking','ui.book','button')}<a class="journal-link" href="#carnet"><span class="tiny-cross" aria-hidden="true"></span>${T('atelier.explore')}</a></div></div><p class="paper-footnote">${T('atelier.seal')}</p></div>
   <div class="carnet-botanical" aria-hidden="true">${sprig}</div>
   <a class="carnet-frame scene-table" href="#table-story">${image('restaurant-dish','','','(max-width:700px) 35vw, 19vw')}<span class="frame-caption">${T('atelier.table')}</span></a>
   <a class="carnet-frame scene-maquis" href="#ile">${image('corsica-maquis','','','(max-width:700px) 47vw, 24vw')}<span class="frame-caption">${T('atelier.maquis')}</span></a>
   <span class="scene-compass" aria-hidden="true">${compass}</span><span class="scene-horizon" aria-hidden="true">${horizon}</span>
  </div>
  <div class="carnet-running scene-bottom"><span>CASA SUPRANA</span><span>${T('home.caption')}</span><a href="#collection">${T('nav.rooms')}</a></div>
 </section>
 <section class="wrap hero-reservation atelier-reservation" aria-labelledby="reservation-title"><p class="eyebrow" id="reservation-title">${T('atelier.reservation')}</p>${searchForm({compact:true})}</section>
 <section class="wrap editorial-split house-introduction" id="carnet" data-reveal>
  <div class="editorial-copy"><p class="eyebrow">${T('nav.house')}</p><h2>${T('home.houseTitle')}</h2><p class="body-copy" data-content="welcome">${T('home.houseBody')}</p>${link('house','ui.discover')}</div>
  <figure class="house-portrait carnet-frame">${image('room-wood')}<figcaption class="frame-caption">${T('atelier.room')}</figcaption></figure><span class="house-herb" aria-hidden="true">${sprig}</span>
 </section>
 <section class="room-section atelier-collection" id="collection"><div class="wrap"><div class="section-heading" data-reveal><div><p class="eyebrow">${T('atelier.collection')}</p><h2>${T('atelier.collectionNote')}</h2></div><p>${T('home.roomsIntro')}</p></div><div class="rooms-grid">${rooms.map(roomCard).join('')}</div><p class="secondary rate-note">${T('ui.ratePerNight')}</p></div></section>
 <section class="maquis-interlude" data-reveal><div aria-hidden="true">${horizon}</div><p class="eyebrow">${T('atelier.quoteLabel')}</p><p class="island-quote">${T('atelier.quote')}</p><div class="interlude-line" aria-hidden="true"></div></section>
 <section class="wrap dining-story atelier-dining" id="table-story" data-reveal><figure class="carnet-frame">${image('restaurant-terrace')}<figcaption class="frame-caption">LA TABLE · CASA SUPRANA</figcaption></figure><div><p class="eyebrow">${T('atelier.tableInvitation')}</p><h2>${T('home.tableTitle')}</h2><p>${T('home.tableBody')}</p><div class="actions">${link('restaurant','ui.readMenu')}${link('tableBooking','nav.tableBooking','button outline')}</div></div></section>
 <section class="wrap editorial-split spa-story atelier-spa" data-reveal><figure class="carnet-frame">${image('spa-sauna')}<figcaption class="frame-caption">SOUS LES PINS</figcaption></figure><div><p class="eyebrow">SOUS LES PINS</p><h2>${T('home.spaTitle')}</h2><p>${T('home.spaBody')}</p>${link('spa','ui.spa')}</div><span class="spa-herb" aria-hidden="true">${sprig}</span></section>
 <section class="atelier-island" id="ile"><div class="wrap island-heading" data-reveal><p class="eyebrow">${T('atelier.regionInvitation')}</p><h2>${T('home.regionTitle')}</h2><p>${T('home.regionBody')}</p></div><div class="island-gallery" data-reveal><figure class="island-photo">${image('corsica-beach')}<figcaption>${T('atelier.beachNote')}</figcaption></figure><figure class="carnet-frame island-inset">${image('cap-corse-village')}<figcaption class="frame-caption">CAP CORSE</figcaption></figure><div class="island-postcard">${compass}<p>${T('atelier.coast')}</p>${link('experiences','nav.experiences','button outline')}${link('region','ui.region')}</div></div></section>`;
}
