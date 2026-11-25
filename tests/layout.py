from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,traceback
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parents[1]/'outputs/hotel-qa';routes=json.loads((ROOT/'routes.json').read_text());result={'pages':[],'admin_tabs':[],'checkout':[],'errors':[],'overflow':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True);page=browser.new_page();page.on('pageerror',lambda error:result['errors'].append(str(error)))
 for width,height in [(390,844),(320,844)]:
  page.set_viewport_size({'width':width,'height':height})
  for item in routes:
   page.goto('http://127.0.0.1:8771'+item['path'],wait_until='domcontentloaded');page.wait_for_function('document.documentElement.dataset.ready==="true"||document.documentElement.dataset.failed==="true"');assert page.locator('html').get_attribute('data-failed') is None,item
   page.evaluate('document.fonts.ready');overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth')
   if overflow:result['overflow'].append({'path':item['path'],'width':width})
   result['pages'].append({'path':item['path'],'width':width,'overflow':overflow})
   if item['route']=='admin':
    for tab in ['calendar','arrivals','bookings','availability','rates','extras','promotions','restaurant','activities','content','integration']:
     page.locator(f'[data-admin-tab={tab}]').click();expect(page.locator(f'[data-admin-tab={tab}]')).to_have_attribute('aria-selected','true');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(item,tab,width);result['admin_tabs'].append({'language':item['language'],'tab':tab,'width':width})
   if item['route']=='booking':
    page.locator('[data-room=garden] [data-select-plan=flexible]').click();expect(page.locator('#extras-form')).to_be_visible();assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.locator('#extras-form [type=submit]').click();expect(page.locator('#guest-form')).to_be_visible();assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');result['checkout'].append({'language':item['language'],'width':width})
  print('Checked all',len(routes),'hotel routes at',width,'px',flush=True)
 browser.close()
(OUT/'layout-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print('PASS',len(result['pages']),'page layouts,',len(result['admin_tabs']),'admin section layouts,',len(result['checkout']),'checkout layouts;',len(result['errors']),'JS errors;',len(result['overflow']),'overflows')
assert not result['errors'] and not result['overflow'],result['overflow']
