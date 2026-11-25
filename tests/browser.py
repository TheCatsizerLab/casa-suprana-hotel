"""Isolated five-language browser checks. Never uses a visitor's browser session."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,datetime,traceback,sys
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parents[1]/'outputs/hotel-qa';OUT.mkdir(exist_ok=True)
ORIGIN='http://127.0.0.1:8771';BASE='/casa-suprana-hotel/'
AXE=ROOT.parent/'municipal-tooling/node_modules/axe-core/axe.min.js'
result={'languages':{},'errors':[],'network_submissions':[],'layouts':[],'axe':[]}
if '--resume' in sys.argv and (OUT/'browser-results.json').exists():result=json.loads((OUT/'browser-results.json').read_text());result.pop('failure',None)
def ready(page):page.wait_for_function('document.documentElement.dataset.ready==="true"||document.documentElement.dataset.failed==="true"');assert page.locator('html').get_attribute('data-failed') is None
def go(page,url):page.goto(url,wait_until='networkidle');ready(page)
def save(): (OUT/'browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
def ok(lang,message):result['languages'][lang].append(message);print('PASS',lang,message,flush=True);save()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 try:
  for lang in ['fr','en','it','es','de']:
   if 'Reset and language-specific content isolation' in result['languages'].get(lang,[]):continue
   result['languages'][lang]=[];result['layouts']=[x for x in result['layouts'] if x['language']!=lang];result['axe']=[x for x in result['axe'] if x['language']!=lang]
   messages=json.loads((ROOT/f'assets/i18n/{lang}.json').read_text());base=ORIGIN+BASE+('' if lang=='fr' else lang+'/')
   context=browser.new_context(viewport={'width':1440,'height':1000},locale='en-GB',timezone_id='Europe/Paris')
   context.on('page',lambda p:p.on('pageerror',lambda error:result['errors'].append(str(error))))
   context.on('request',lambda r:result['network_submissions'].append(r.url) if r.method not in ['GET','HEAD'] else None)
   page=context.new_page();admin=context.new_page()
   go(page,base+'reserver/');form=page.locator('#stay-search')
   dates=page.evaluate('()=>{const d=new Date();d.setUTCDate(d.getUTCDate()+35);const a=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+3);return {arrival:a,departure:d.toISOString().slice(0,10)}}')
   form.locator('[name=arrival]').fill(dates['arrival']);form.locator('[name=departure]').fill(dates['departure']);form.locator('[type=submit]').click()
   expect(page.locator('[data-room=garden] [data-select-plan=flexible]')).to_be_visible()
   form.locator('[name=adults]').select_option('4');form.locator('[type=submit]').click();expect(page.locator('[data-room=garden] [data-select-plan]')).to_have_count(0);expect(page.locator('[data-room=pines] [data-select-plan]')).to_have_count(2)
   form.locator('[name=adults]').select_option('2');form.locator('[name=promo]').fill('INVALID');form.locator('[type=submit]').click();expect(page.locator('[data-room=garden]')).to_contain_text(messages['error.invalidPromo'])
   form.locator('[name=promo]').fill('SUPRANA10');form.locator('[type=submit]').click();expect(page.locator('[data-room=garden] [data-select-plan]')).to_have_count(2)
   ok(lang,'Availability, room capacities, invalid and valid promotions')
   page.locator('[data-room=garden] [data-select-plan=flexible]').click();expect(page.locator('#extras-form')).to_be_visible();old_total=page.locator('[data-total]').get_attribute('data-total');page.locator('input[value=breakfast]').check();expect(page.locator('[data-total]')).not_to_have_attribute('data-total',old_total)
   total=page.locator('[data-total]').get_attribute('data-total')
   switch='en' if lang!='en' else 'fr';page.locator('.language-picker summary').click();page.locator(f'[data-language={switch}]').click();ready(page);expect(page.locator('#extras-form')).to_be_visible();expect(page.locator('input[value=breakfast]')).to_be_checked();assert page.locator('[data-total]').get_attribute('data-total')==total
   page.locator('.language-picker summary').click();page.locator(f'[data-language={lang}]').click();ready(page);expect(page.locator('input[value=breakfast]')).to_be_checked()
   ok(lang,'Language switch preserves dates, room, rate, extras and quote')
   page.locator('#extras-form [type=submit]').click();expect(page.locator('#guest-form')).to_be_visible();page.locator('[name=payment][value=declined]').check();page.locator('[name=accepted]').check();page.locator('#guest-form [type=submit]').click();expect(page.locator('#booking-error')).to_contain_text(messages['error.paymentDeclined']);assert page.evaluate('window.aveluneDemo.store.read().then(s=>s.bookings.length)')==0
   page.locator('[name=payment][value=approved]').check();page.locator('#guest-form [type=submit]').click();expect(page.locator('#confirmed-reference')).to_be_visible();reference=page.locator('#confirmed-reference').inner_text()
   assert len(reference)==11;assert page.evaluate('window.aveluneDemo.store.read().then(s=>s.bookings.length)')==1
   ok(lang,'Extras, declined payment without inventory loss, accepted fictional booking')
   go(admin,base+'administration/');admin.locator('[data-admin-tab=bookings]').click();expect(admin.locator('.admin-content')).to_contain_text(reference)
   admin.locator('[data-admin-tab=rates]').click();f=admin.locator('#rate-form');f.locator('[name=from]').fill(dates['arrival']);f.locator('[name=to]').fill(dates['departure']);f.locator('[name=price]').fill('333');f.locator('button').click();expect(admin.locator('[data-remove-rate]')).to_have_count(1)
   old=page.evaluate('window.aveluneDemo.store.read().then(s=>s.bookings[0].price.total)');go(page,base+'reserver/?arrival='+dates['arrival']+'&departure='+dates['departure']+'&adults=2&children=0');expect(page.locator('[data-room=garden]')).to_contain_text(i18n_price:=page.evaluate('window.aveluneDemo.i18n.money(99900+1500)'))
   assert page.evaluate('window.aveluneDemo.store.read().then(s=>s.bookings[0].price.total)')==old
   ok(lang,'Administration rate changes update public quotes, not confirmed bookings')
   go(page,base+'ma-reservation/?reference='+reference+'&guestId=camille');expect(page.locator('#booking-detail')).to_contain_text(reference);page.locator('#modify-booking').click();change=page.locator('#change-booking');change.locator('[name=adults]').select_option('1');change.locator('[type=submit]').click();expect(page.locator('#confirm-change')).to_be_visible();page.locator('#confirm-change').click();expect(page.locator('#booking-detail')).to_contain_text(messages['adult.one'].replace('{count}','1'))
   page.locator('#cancel-booking').click();expect(page.locator('dialog[open]')).to_be_visible();page.locator('#confirm-cancel').click();expect(page.locator('#booking-detail')).to_contain_text(messages['manage.cancelled']);assert page.evaluate('window.aveluneDemo.store.read().then(s=>s.bookings[0].status)')=='cancelled'
   ok(lang,'Persisted lookup, modification, price recalculation and cancellation')
   admin.locator('[data-admin-tab=availability]').click();f=admin.locator('#block-form');f.locator('[name=roomId]').select_option('pines');f.locator('[name=count]').fill('1');f.locator('[name=from]').fill(dates['arrival']);f.locator('[name=to]').fill(dates['departure']);f.locator('button').click();expect(admin.locator('[data-remove-block]')).to_have_count(5)
   go(page,base+'reserver/?arrival='+dates['arrival']+'&departure='+dates['departure']+'&adults=2&children=0')
   payload={**dates,'adults':2,'children':0,'roomId':'pines','plan':'flexible','promo':'','extras':[],'guestId':'alex','accepted':True,'payment':'approved'}
   code='async input=>{try{const p=window.aveluneDemo.provider;const q=await p.quote(input);await p.createBooking({...input,expectedTotal:q.total});return "confirmed"}catch(e){return e.code}}'
   # Both pages use separate connections. IndexedDB read/write transactions serialize stock checks.
   import concurrent.futures
   results=page.evaluate('async input=>{const {HotelStore}=await import("'+BASE+'src/core/store.js");const {LocalProvider}=await import("'+BASE+'src/providers/local.js");const s=await new HotelStore().open();const p=new LocalProvider(s);const a=window.aveluneDemo.provider;const q=await a.quote(input);const create=provider=>provider.createBooking({...input,expectedTotal:q.total}).then(()=>"confirmed",e=>e.code);const r=await Promise.all([create(a),create(p)]);s.close();return r}',payload)
   assert sorted(results)==['confirmed','unavailable'],results
   ok(lang,'Cross-connection atomic booking prevents selling the final room twice')
   admin.locator('[data-admin-tab=calendar]').click();expect(admin.locator('.availability-table')).to_be_visible();admin.locator('[data-calendar="14"]').click();admin.locator('[data-calendar=today]').click()
   admin.locator('[data-admin-tab=arrivals]').click();admin.locator('#arrivals-date').fill(dates['arrival']);expect(admin.locator('.admin-content')).to_contain_text('Alex Voyage')
   admin.locator('[data-admin-tab=extras]').click();f=admin.locator('[data-extra-form=breakfast]');f.locator('[name=price]').fill('31');f.locator('button').click();expect(admin.locator('[data-extra-form=breakfast] [name=price]')).to_have_value('31')
   admin.locator('[data-admin-tab=promotions]').click();f=admin.locator('[data-promotion-form=avelune]');f.locator('[name=percent]').fill('12');f.locator('button').click();expect(admin.locator('[data-promotion-form=avelune] [name=percent]')).to_have_value('12');go(page,base+'offres/');expect(page.locator('#offers-list')).to_contain_text('12')
   ok(lang,'Calendar, arrivals, extra prices and promotion management')
   go(page,base+'galerie/');page.locator('[data-photo-filter=rooms]').click();assert page.locator('[data-photo-category]:visible').count()==4;page.locator('[data-photo]:visible').first.click();expect(page.locator('#photo-viewer')).to_be_visible();page.keyboard.press('Escape');expect(page.locator('#photo-viewer')).not_to_be_visible()
   go(page,base+'contact/');page.locator('#contact-form button').click();expect(page.locator('#contact-feedback')).to_have_text(messages['contact.success'])
   ok(lang,'Gallery filters and modal, fictional contact with no network submission')
   for width,height in [(1440,1000),(768,1024),(390,844),(320,844),(844,390)]:
    page.set_viewport_size({'width':width,'height':height})
    for route in ['', 'reserver/','ma-reservation/','administration/','galerie/']:
     go(page,base+route);page.evaluate('document.fonts.ready');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(lang,route,width)
     result['layouts'].append({'language':lang,'route':route,'width':width,'height':height,'overflow':False})
     if width in [1440,390] and route in ['', 'reserver/','administration/']:
      page.add_script_tag(path=str(AXE));violations=page.evaluate('async()=>{const r=await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}});return r.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))}');result['axe'].append({'language':lang,'route':route,'width':width,'violations':violations});assert not violations,(lang,route,width,violations)
    page.locator('.menu-toggle').click();expect(page.locator('#hotel-menu')).to_be_visible();page.keyboard.press('Escape');expect(page.locator('#hotel-menu')).not_to_be_visible()
    page.locator('.language-picker summary').click();r=page.locator('.language-picker nav').bounding_box();assert r['x']>=0 and r['x']+r['width']<=width,(lang,width,r);page.keyboard.press('Escape')
   ok(lang,'Five viewport sizes, landscape, keyboard navigation, language control and axe')
   admin.locator('[data-admin-tab=content]').click();injection='<img src=x onerror="window.unsafe=true">';admin.locator('[name=welcome]').fill(injection);admin.locator('#content-form button').click();expect(admin.locator('[name=welcome]')).to_have_value(injection);go(page,base);expect(page.locator('[data-content=welcome]')).to_have_text(injection);assert page.evaluate('window.unsafe!==true')
   other=ORIGIN+BASE+('en/' if lang!='en' else '');go(page,other);assert injection not in page.locator('[data-content=welcome]').inner_text()
   admin.locator('#reset-demo').click();admin.locator('#confirm-reset').click();expect(admin.locator('[data-admin-tab=dashboard]')).to_have_attribute('aria-selected','true');assert admin.evaluate('window.aveluneDemo.store.read().then(s=>s.bookings.length)')==0
   ok(lang,'Reset and language-specific content isolation')
   context.close()
 except Exception:
  result['failure']=traceback.format_exc();save();print(result['failure'],flush=True);raise
 finally:
  browser.close();save()
assert not result['errors'],result['errors']
assert not result['network_submissions'],result['network_submissions']
print('PASS:',sum(map(len,result['languages'].values())),'journey checks;',len(result['layouts']),'layouts;',len(result['axe']),'axe runs; 0 JS errors; 0 form submissions')
