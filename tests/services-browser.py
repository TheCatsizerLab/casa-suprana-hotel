from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,traceback,sys
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parents[1]/'outputs/hotel-qa';ORIGIN='http://127.0.0.1:8771';BASE='/casa-suprana-hotel/'
AXE=ROOT.parent/'municipal-tooling/node_modules/axe-core/axe.min.js'
result={'languages':{},'errors':[],'network_submissions':[],'layouts':[],'axe':[]}
if '--resume' in sys.argv and (OUT/'services-browser-results.json').exists():result=json.loads((OUT/'services-browser-results.json').read_text());result.pop('failure',None)
def save():(OUT/'services-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
def go(page,url):page.goto(url,wait_until='networkidle');page.wait_for_function('document.documentElement.dataset.ready==="true"||document.documentElement.dataset.failed==="true"');assert not page.locator('html').get_attribute('data-failed'),url
def ok(lang,text):result['languages'][lang].append(text);save();print('PASS',lang,text,flush=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 try:
  for lang in ['fr','en','it','es','de']:
   if 'Final monochrome accessibility and service layouts' in result['languages'].get(lang,[]):continue
   result['languages'][lang]=[];result['layouts']=[x for x in result['layouts'] if x['language']!=lang];result['axe']=[x for x in result['axe'] if x['language']!=lang]
   messages=json.loads((ROOT/f'assets/i18n/{lang}.json').read_text());base=ORIGIN+BASE+('' if lang=='fr' else lang+'/')
   context=browser.new_context(viewport={'width':1440,'height':1000},locale='en-GB',timezone_id='Europe/Paris')
   context.on('page',lambda p:p.on('pageerror',lambda e:result['errors'].append(str(e))))
   context.on('request',lambda r:result['network_submissions'].append(r.url) if r.method not in ['GET','HEAD'] else None)
   page=context.new_page();admin=context.new_page()
   go(page,base+'table/');expect(page.locator('[data-menu-card]')).to_have_count(3);expect(page.locator('#menus')).to_contain_text(messages['menu.maquis.name']);page.locator('[data-menu-card=lunch] a').click();page.wait_for_selector('#service-confirm');expect(page.locator('#service-search [name=menuId]')).to_have_value('lunch')
   form=page.locator('#service-search');form.locator('[name=children]').select_option('1');form.locator('[type=submit]').click();expect(page.locator('[data-service-total]')).to_have_attribute('data-service-total','12000')
   chosen=page.evaluate('window.aveluneDemo.store.read().then(s=>s.created)');date=page.locator('#service-search [name=date]').input_value();time=page.locator('#service-search [name=time]').input_value()
   page.locator('#service-confirm [name=accepted]').check();page.locator('#service-confirm [type=submit]').click();expect(page.locator('#service-reference')).to_be_visible();table_ref=page.locator('#service-reference').inner_text();assert table_ref.startswith('CS-T-')
   ok(lang,'Three translated menus and a real local table reservation')
   go(admin,base+'administration/#restaurant');expect(admin.locator('.admin-content')).to_contain_text(table_ref);f=admin.locator('[data-menu-admin=lunch]');f.locator('[name=adultPrice]').fill('55');f.locator('button').click();expect(admin.locator('[data-menu-admin=lunch] [name=adultPrice]')).to_have_value('55');go(page,base+'table/');expect(page.locator('[data-menu-card=lunch] [data-price-kind=adult]')).to_contain_text('55')
   assert page.evaluate('window.aveluneDemo.store.read().then(s=>s.services.tableBookings[0].price.total)')==12000
   go(page,base+'ma-reservation/?reference='+table_ref+'&guestId=camille');expect(page.locator('#booking-detail')).to_contain_text(table_ref);page.locator('#modify-service').click();f=page.locator('#change-service');f.locator('[name=children]').select_option('0');f.locator('[type=submit]').click();expect(page.locator('#confirm-service-change')).to_be_visible();page.locator('#confirm-service-change').click();expect(page.locator('#confirm-service-change')).not_to_be_visible();expect(page.locator('#booking-detail [data-service-total]')).to_have_attribute('data-service-total','11000');page.locator('#cancel-service').click();page.locator('#confirm-service-cancel').click();expect(page.locator('#booking-detail')).to_contain_text(messages['service.cancelled'])
   ok(lang,'Menu price update, fixed confirmed quote, table change and cancellation')
   go(admin,base+'administration/#restaurant');f=admin.locator('#table-block-form');f.locator('[name=date]').fill(date);f.locator('[name=service]').select_option('lunch');f.locator('[name=count]').fill('6');f.locator('button').click();expect(admin.locator('[data-remove-table-block]')).to_have_count(1);go(page,base+'reserver-une-table/?menu=lunch&date='+date+'&time='+time);expect(page.locator('#service-error')).to_contain_text(messages['error.tableUnavailable']);assert page.locator('#service-confirm').count()==0
   admin.locator('[data-remove-table-block]').click();expect(admin.locator('[data-remove-table-block]')).to_have_count(0);page.reload(wait_until='networkidle');expect(page.locator('#service-confirm')).to_be_visible()
   ok(lang,'Restaurant closure removes availability and reopening restores it')
   go(page,base+'experiences/');expect(page.locator('[data-activity-card]')).to_have_count(3);page.locator('[data-activity-card=sea] a').click();expect(page.locator('#service-confirm')).to_be_visible();f=page.locator('#service-search');service_date=f.locator('[name=date]').input_value();service_time=f.locator('[name=time]').input_value()
   switch='en' if lang!='en' else 'fr';page.locator('.language-picker summary').click();page.locator(f'[data-language={switch}]').click();expect(page.locator('#service-confirm')).to_be_visible();expect(page.locator('#service-search [name=activityId]')).to_have_value('sea');page.locator('.language-picker summary').click();page.locator(f'[data-language={lang}]').click();expect(page.locator('#service-confirm')).to_be_visible()
   page.locator('#service-confirm [name=payment][value=declined]').check();page.locator('#service-confirm [name=accepted]').check();page.locator('#service-confirm [type=submit]').click();expect(page.locator('#service-confirm-error')).to_contain_text(messages['error.paymentDeclined']);assert page.evaluate('window.aveluneDemo.store.read().then(s=>s.services.activityBookings.length)')==0
   page.locator('#service-confirm [name=payment][value=approved]').check();page.locator('#service-confirm [type=submit]').click();expect(page.locator('#service-reference')).to_be_visible();activity_ref=page.locator('#service-reference').inner_text();assert activity_ref.startswith('CS-A-')
   ok(lang,'Bookable excursions, preserved language selection and simulated payment decline/approval')
   go(admin,base+'administration/#activities');expect(admin.locator('.admin-content')).to_contain_text(activity_ref);f=admin.locator('#activity-limit-form');f.locator('[name=activityId]').select_option('sea');f.locator('[name=date]').fill(service_date);f.locator('[name=time]').select_option(service_time);f.locator('[name=capacity]').fill('1');f.locator('button').click();expect(admin.locator('#admin-feedback')).to_contain_text(messages['error.serviceCapacityConflict']);assert admin.locator('[data-remove-activity-limit]').count()==0
   f.locator('[name=capacity]').fill('2');f.locator('button').click();expect(admin.locator('[data-remove-activity-limit]')).to_have_count(1);go(page,base+'reserver-une-activite/?activity=sea&date='+service_date+'&time='+service_time);expect(page.locator('#service-error')).to_contain_text(messages['error.activityFull'])
   go(page,base+'ma-reservation/?reference='+activity_ref+'&guestId=camille');page.locator('#modify-service').click();f=page.locator('#change-service');f.locator('[name=adults]').select_option('1');f.locator('[type=submit]').click();page.locator('#confirm-service-change').click();expect(page.locator('#confirm-service-change')).not_to_be_visible();expect(page.locator('#booking-detail [data-service-total]')).to_have_attribute('data-service-total','8500');page.locator('#cancel-service').click();page.locator('#confirm-service-cancel').click();expect(page.locator('#booking-detail')).to_contain_text(messages['service.cancelled']);go(page,base+'reserver-une-activite/?activity=sea&date='+service_date+'&time='+service_time);expect(page.locator('#service-confirm')).to_be_visible()
   ok(lang,'Activity limits protect confirmed places; modification and cancellation release capacity')
   payload={'kind':'activity','activityId':'sea','date':service_date,'time':service_time,'adults':2,'children':0,'guestId':'alex','accepted':True,'payment':'approved'}
   outcomes=page.evaluate('async input=>{const {HotelStore}=await import("'+BASE+'src/core/store.js");const {LocalProvider}=await import("'+BASE+'src/providers/local.js");const s=await new HotelStore().open();const providers=[window.aveluneDemo.provider,new LocalProvider(s)];const q=await providers[0].serviceQuote(input);const r=await Promise.all(providers.map(p=>p.createServiceBooking({...input,expectedTotal:q.total}).then(()=>"confirmed",e=>e.code)));s.close();return r}',payload)
   assert sorted(outcomes)==['activityFull','confirmed'],outcomes
   ok(lang,'Atomic activity booking prevents selling the final places twice')
   for width,height in [(1440,1000),(390,844),(320,844),(844,390)]:
    page.set_viewport_size({'width':width,'height':height})
    for route in ['', 'reserver/','table/','experiences/','reserver-une-table/','reserver-une-activite/','administration/']:
     go(page,base+route);page.evaluate('document.fonts.ready');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(lang,route,width);result['layouts'].append({'language':lang,'route':route,'width':width,'height':height})
     if width in [1440,390]:
      page.add_script_tag(path=str(AXE));violations=page.evaluate('async()=>{const r=await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))}');result['axe'].append({'language':lang,'route':route,'width':width,'violations':violations});assert not violations,(lang,route,width,violations)
    for section in ['restaurant','activities']:
     page.locator(f'[data-admin-tab={section}]').click();expect(page.locator(f'[data-admin-tab={section}]')).to_have_attribute('aria-selected','true');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   ok(lang,'Final monochrome accessibility and service layouts')
   context.close()
 except Exception:
  result['failure']=traceback.format_exc();save();print(result['failure'],flush=True);raise
 finally:browser.close();save()
assert not result['errors'] and not result['network_submissions']
print('PASS',sum(map(len,result['languages'].values())),'service checks;',len(result['layouts']),'layouts;',len(result['axe']),'axe audits; no JS errors or form submissions')
