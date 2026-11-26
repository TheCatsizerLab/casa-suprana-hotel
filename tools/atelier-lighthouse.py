"""Measure the published editorial redesign sequentially, without reusing older builds."""
from pathlib import Path
import hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parents[1]/'outputs/hotel-atelier-20261126';RAW=OUT/'lighthouse';RAW.mkdir(parents=True,exist_ok=True)
files=[ROOT/'assets/site.css',ROOT/'assets/atelier.css',*sorted((ROOT/'src').rglob('*.js')),*sorted((ROOT/'content').glob('*.tsv'))]
digest=hashlib.sha256(b''.join(p.read_bytes() for p in files)).hexdigest()[:12]
cli=ROOT.parent/'municipal-tooling/node_modules/lighthouse/cli/index.js'
chrome=Path.home()/'AppData/Local/ms-playwright/chromium-1255/chrome-win64/chrome.exe'
results=[]
for lang in ['fr','en','it','es','de']:
 url='https://thecatsizerlab.github.io/casa-suprana-hotel/'+('' if lang=='fr' else lang+'/')
 for device in ['mobile','desktop']:
  report=RAW/(digest+'-'+lang+'-'+device+'.json')
  if not report.exists():
   command=['node',str(cli),url,'--chrome-flags=--headless --no-sandbox','--output=json','--output-path='+str(report),'--only-categories=performance,accessibility,best-practices,seo','--quiet']
   if device=='desktop':command.append('--preset=desktop')
   subprocess.run(command,cwd=ROOT,env={**os.environ,'CHROME_PATH':str(chrome)},check=True,timeout=180)
  r=json.loads(report.read_text(encoding='utf8'));assert not r.get('runtimeError'),r.get('runtimeError')
  assert r['finalDisplayedUrl'].rstrip('/')==url.rstrip('/'),r['finalDisplayedUrl']
  scores={key:round(value['score']*100) for key,value in r['categories'].items()}
  results.append({'language':lang,'device':device,'url':url,'fetchTime':r['fetchTime'],'lighthouseVersion':r['lighthouseVersion'],'sourceDigest':digest,'scores':scores,'metrics':{key:{'value':r['audits'][key]['numericValue'],'unit':r['audits'][key]['numericUnit']} for key in ['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index']},'config':{key:r['configSettings'].get(key) for key in ['formFactor','throttlingMethod','screenEmulation','throttling']}})
  (OUT/'lighthouse-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
  print(lang,device,scores,flush=True)
print('Completed',len(results),'real production measurements.',flush=True)
