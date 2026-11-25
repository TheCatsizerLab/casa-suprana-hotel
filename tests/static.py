from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit,unquote
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parents[1]/'outputs/hotel-qa';BASE='/casa-suprana-hotel/';ORIGIN='https://thecatsizerlab.github.io'
routes=json.loads((ROOT/'routes.json').read_text());result={'pages':0,'metadata_errors':[],'broken_links':[],'catalogs':{},'legacy_checksums':{}}
langs=['fr','en','it','es','de']
for lang in langs:
 messages=json.loads((ROOT/f'assets/i18n/{lang}.json').read_text());assert all(v.strip() and '\ufffd' not in v for v in messages.values());result['catalogs'][lang]=len(messages)
for item in routes:
 file=ROOT/item['path'][len(BASE):]/'index.html';s=BeautifulSoup(file.read_text(encoding='utf8'),'html.parser');lang=item['language'];result['pages']+=1
 if s.html.get('lang')!=lang or len(s.select('h1'))!=1 or not s.select_one('meta[name=description]'):result['metadata_errors'].append(item['path'])
 canonical=s.select_one('link[rel=canonical]');assert canonical['href']==ORIGIN+item['path']
 alternates=s.select('link[rel=alternate][hreflang]');assert {a['hreflang'] for a in alternates}==set(langs+['x-default'])
 for a in alternates:
  code='fr' if a['hreflang']=='x-default' else a['hreflang'];match=next(r for r in routes if r['route']==item['route'] and r['language']==code);assert a['href']==ORIGIN+match['path']
 assert len(s.select('.language-picker'))==1
 for node in s.select('[href],[src],[srcset]'):
  values=[node.get(a) for a in ['href','src'] if node.get(a)]
  if node.get('srcset'):values.extend(x.strip().split(' ')[0] for x in node['srcset'].split(','))
  for raw in values:
   value=raw
   if value.startswith(ORIGIN+BASE):value=value[len(ORIGIN):]
   split=urlsplit(value)
   if split.scheme or value.startswith('//') or not split.path:continue
   if split.path.startswith(BASE):target=ROOT/unquote(split.path[len(BASE):])
   elif split.path.startswith('/'):continue # external portfolio root on the same public host
   else:target=file.parent/unquote(split.path)
   if target.is_dir():target/='index.html'
   if not target.exists():result['broken_links'].append({'page':item['path'],'link':raw})
original=ROOT.parent/'ortu-beds24'
for p in (ROOT/'integrations/wordpress-existing').glob('*.php'):
 digest=hashlib.sha256(p.read_bytes()).hexdigest();assert digest==hashlib.sha256((original/p.name).read_bytes()).hexdigest();result['legacy_checksums'][p.name]=digest
(OUT/'static-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print('Checked',result['pages'],'pages;',len(result['broken_links']),'broken links;',len(result['metadata_errors']),'metadata errors; 5 complete catalogs; 3 unchanged legacy PHP files')
assert not result['broken_links'],result['broken_links'][:10]
assert not result['metadata_errors']
