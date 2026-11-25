"""Capture real localized interfaces. Only WebP encoding follows the screenshot."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from PIL import Image
import shutil,sys
checkout_only="--checkout-only" in sys.argv
details="--details" in sys.argv or checkout_only
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/captures'
PORTFOLIO=ROOT.parent/'municipal-portal/assets/media/hotel'
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 for lang in ['fr','en','it','es','de']:
  dest=OUT/lang;dest.mkdir(parents=True,exist_ok=True);(PORTFOLIO/lang).mkdir(parents=True,exist_ok=True)
  context=browser.new_context(viewport={'width':1440,'height':1000},locale={'fr':'fr-FR','en':'en-GB','it':'it-IT','es':'es-ES','de':'de-DE'}[lang],timezone_id='Europe/Paris')
  page=context.new_page();base='http://127.0.0.1:8771/casa-suprana-hotel/'+('' if lang=='fr' else lang+'/')
  def go(route):
   page.goto(base+route,wait_until='networkidle');page.wait_for_function('document.documentElement.dataset.ready==="true"');page.evaluate('document.fonts.ready')
  def shot(name):
   if name=='calendar':page.locator('.admin-content').evaluate('(e)=>e.scrollIntoView({behavior:"instant",block:"start"})')
   if name=='mobile-checkout':page.locator('#guest-form').locator('..').evaluate('(e)=>e.scrollIntoView({behavior:"instant",block:"start"})')
   page.evaluate('async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}')
   page.locator('img[src]').evaluate_all('(images)=>Promise.all(images.filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>i.decode().catch(()=>{})))')
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(lang,name)
   png=dest/(name+'.png');page.screenshot(path=str(png));
   with Image.open(png) as im:im.convert('RGB').save(dest/(name+'.webp'),'WEBP',quality=87,method=6)
   png.unlink();shutil.copyfile(dest/(name+'.webp'),PORTFOLIO/lang/(name+'.webp'))
  if not details:
   for name,route in [('home',''),('booking','reserver/'),('administration','administration/'),('room','chambres/chambre-mer/')]:
    go(route)
    if name=='booking':page.locator('#booking-results h2').evaluate('(e)=>e.scrollIntoView({behavior:"instant",block:"start"})')
    shot(name)
   go('table/');page.locator('#menus').evaluate('(e)=>e.scrollIntoView({behavior:"instant",block:"start"})');shot('restaurant')
   go('reserver-une-table/');page.locator('#service-preview').evaluate('(e)=>e.scrollIntoView({behavior:"instant",block:"start"})');shot('table-booking')
   go('experiences/');page.locator('.experience-list').evaluate('(e)=>e.scrollIntoView({behavior:"instant",block:"start"})');shot('activities')
  if not checkout_only:
   go('administration/');page.locator('[data-admin-tab=calendar]').click();expect(page.locator('.availability-table')).to_be_visible();shot('calendar')
  page.set_viewport_size({'width':390,'height':844})
  if not details:go('');shot('mobile')
  go('reserver/');
  if not details:shot('mobile-booking')
  page.locator('[data-room=garden] [data-select-plan=flexible]').click();expect(page.locator('#extras-form')).to_be_visible();page.locator('input[value=breakfast]').check();page.locator('#extras-form [type=submit]').click();expect(page.locator('#guest-form')).to_be_visible();shot('mobile-checkout')
  context.close();print('Captured',lang,('1 mobile checkout screenshot' if checkout_only else '2 detail screenshots' if details else '11 genuine hotel screenshots'),flush=True)
 browser.close()
