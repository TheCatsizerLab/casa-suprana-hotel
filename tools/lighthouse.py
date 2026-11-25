"""Sequential, reproducible production measurements; raw reports stay outside Git."""
from pathlib import Path
import subprocess,json,os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parents[1]/'outputs/hotel-qa';RAW=OUT/'lighthouse';RAW.mkdir(exist_ok=True)
CLI=ROOT.parent/'municipal-tooling/node_modules/lighthouse/cli/index.js'
chrome=Path.home()/'AppData/Local/ms-playwright/chromium-1255/chrome-win64/chrome.exe'
targets=[('Casa Suprana',lang,'/casa-suprana-hotel/'+('' if lang=='fr' else lang+'/')) for lang in ['fr','en','it','es','de']]
targets += [('Portfolio','fr','/fr/'),('Fiche Casa Suprana','fr','/fr/projects/wordpress-pms.html')]
results=[]
for site,lang,path in targets:
 for device in ['mobile','desktop']:
  url='https://thecatsizerlab.github.io'+path
  report=RAW/(('hotel' if site=='Casa Suprana' else 'portfolio' if site=='Portfolio' else 'case')+'-'+lang+'-'+device+'.json')
  if not report.exists():
   cmd=['node',str(CLI),url,'--chrome-flags=--headless --no-sandbox','--output=json','--output-path='+str(report),'--only-categories=performance,accessibility,best-practices,seo','--quiet']
   if device=='desktop':cmd.append('--preset=desktop')
   subprocess.run(cmd,cwd=ROOT,env={**os.environ,'CHROME_PATH':str(chrome)},check=True,timeout=180)
  r=json.loads(report.read_text(encoding='utf8'));assert not r.get('runtimeError'),r.get('runtimeError')
  assert r['finalDisplayedUrl'].rstrip('/')==url.rstrip('/'),r['finalDisplayedUrl']
  scores={k:round(v['score']*100) for k,v in r['categories'].items()}
  results.append({'site':site,'language':lang,'device':device,'url':url,'fetchTime':r['fetchTime'],'lighthouseVersion':r['lighthouseVersion'],'scores':scores,'metrics':{k:{'value':r['audits'][k]['numericValue'],'unit':r['audits'][k]['numericUnit']} for k in ['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index']},'config':{k:r['configSettings'].get(k) for k in ['formFactor','throttlingMethod','screenEmulation','throttling']}})
  (OUT/'lighthouse-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
  print(site,lang,device,scores,flush=True)
print('Completed',len(results),'production measurements',flush=True)
