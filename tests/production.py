"""Read-only production smoke checks in isolated browser contexts."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parents[1]/'outputs/hotel-qa'
results={'pages':[],'errors':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 for lang in ['fr','en','it','es','de']:
  ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page()
  page.on('pageerror',lambda e:results['errors'].append(str(e)))
  base='https://thecatsizerlab.github.io/casa-suprana-hotel/'+('' if lang=='fr' else lang+'/')
  for route in ['', 'reserver/','table/','reserver-une-table/','experiences/','reserver-une-activite/','administration/']:
   url=base+route;response=page.goto(url,wait_until='networkidle');assert response.status==200,(url,response.status)
   page.wait_for_function('document.documentElement.dataset.ready==="true"')
   assert page.locator('html').get_attribute('lang')==lang
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),url
   assert 'Casa Suprana' in page.title(),page.title()
   results['pages'].append({'url':url,'status':200,'language':lang,'overflow':False})
  prefix='' if lang=='en' else lang+'/'
  for path in [prefix,prefix+'projects/wordpress-pms.html']:
   url='https://thecatsizerlab.github.io/'+path;response=page.goto(url,wait_until='networkidle');assert response.status==200
   assert page.locator('html').get_attribute('lang')==lang
   hotel=page.locator('a[href*="casa-suprana-hotel"]').first
   if path.endswith('.html'):assert hotel.get_attribute('href').startswith(base),(lang,hotel.get_attribute('href'))
   images=page.locator('img[src*="/media/hotel/"]');assert images.count()>0
   for img in images.all():assert '/hotel/'+lang+'/' in img.get_attribute('src'),img.get_attribute('src')
   results['pages'].append({'url':url,'status':200,'language':lang,'localizedMedia':images.count()})
  ctx.close();print('Production',lang,'9 pages passed',flush=True)
 browser.close()
assert not results['errors'],results['errors']
(OUT/'production-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
