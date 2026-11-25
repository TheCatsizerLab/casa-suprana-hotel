from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import os
ROOT=Path(__file__).resolve().parents[1];PREFIX='/casa-suprana-hotel'
os.chdir(ROOT)
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  if urlsplit(self.path).path=='/':self.send_response(302);self.send_header('Location',PREFIX+'/');self.end_headers();return
  if not urlsplit(self.path).path.startswith(PREFIX+'/'):self.send_error(404);return
  self.path=self.path[len(PREFIX):];super().do_GET()
 def log_message(self,*args):pass
print('http://127.0.0.1:8771'+PREFIX+'/',flush=True)
ThreadingHTTPServer(('127.0.0.1',8771),Handler).serve_forever()
