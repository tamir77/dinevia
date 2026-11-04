import urllib.request,urllib.error,http.cookiejar,json,secrets,time
base='http://127.0.0.1:5178/api/'
def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(c,path,data=None,raw=None,ctype='application/json',method=None):
 payload=raw if raw is not None else json.dumps(data).encode() if data is not None else None
 req=urllib.request.Request(base+path,data=payload,method=method,headers={'Origin':'http://127.0.0.1:5178','Content-Type':ctype})
 try:
  with c.open(req,timeout=90) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  try:d=json.load(e)
  except:d={}
  return e.code,d
layout={'kind':'html','language':'ro','sourceUrl':'https://example.com/menu','blocks':[{'id':'t0','text':'Meniu de test'}],'warnings':[]}
def upload(c,audience='restaurant',replace=''):
 boundary='TestBoundary'+secrets.token_hex(8);body=bytearray()
 fields={'name':'QA menu ownership','audience':audience,'layout':json.dumps(layout),'replaceId':replace}
 for k,v in fields.items():body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
 body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="menu.html"\r\nContent-Type: text/html\r\n\r\n<!doctype html><html><body><h1><!--mp-text:t0-->Meniu de test</h1></body></html>\r\n--{boundary}--\r\n'.encode())
 return call(c,'menus',raw=bytes(body),ctype='multipart/form-data; boundary='+boundary)
a,b,g,anonymous=client(),client(),client(),client();password=secrets.token_urlsafe(24);tag=secrets.token_hex(5)
for c,suffix in [(a,'a'),(b,'b')]:
 status,data=call(c,'account/register',{'name':'QA restaurant '+suffix,'email':f'qa-{tag}-{suffix}@example.test','password':password});assert status==200,(status,data)
status,m=upload(a);assert status==201,(status,m);mid=m['id']
assert call(b,'menu/'+mid)[0]==404
assert call(anonymous,'menu/'+mid)[0]==404
assert call(b,'menu/'+mid+'/publish',{'version':1,'published':True})[0]==404
assert call(a,'menu/'+mid+'/publish',{'version':1,'published':True})[0]==200
assert call(anonymous,'menu/'+mid)[0]==200
status,replacement=upload(a,replace=mid);assert status==201 and replacement['id']==mid,(status,replacement)
status,current=call(a,'menu/'+mid);assert current['version']==2 and not current['published']
assert call(anonymous,'menu/'+mid)[0]==404
assert call(g,'guest-session',{})[0]==200
status,personal=upload(g,'personal');assert status==201,(status,personal)
assert call(g,'menu/'+personal['id'])[1]['personal'] is True
assert call(g,'menu/'+personal['id']+'/publish',{'version':1,'published':True})[0]==403
assert call(anonymous,'menu/'+personal['id']+'/recommend',{'version':1,'preferences':{'love':['tomatoes'],'avoid':[],'never':[]}})[0]==404
assert call(g,'menu/'+personal['id']+'/recommend',{'version':1,'preferences':{'love':[],'avoid':[],'never':[]}})[0]==400
assert call(g,'menu/'+personal['id']+'/recommend',{'version':99,'preferences':{'love':['tomatoes'],'avoid':[],'never':[]}})[0]==409

assert call(anonymous,'menu/'+personal['id'])[0]==404
assert call(anonymous,'menu/'+personal['id']+'/translation?language=en')[0]==404
assert call(g,'menu/'+personal['id']+'/translation?language=en')[1]['state']=='failed'
assert call(a,'account/logout',{})[0]==200
assert call(a,'menu/'+mid)[0]==404
assert call(a,'account/login',{'email':f'qa-{tag}-a@example.test','password':'wrong-password'})[0]==401
assert call(a,'account/login',{'email':f'qa-{tag}-a@example.test','password':password})[0]==200
assert call(a,'menu/'+mid)[0]==200
print('PASS: registration, login/logout, restaurant isolation, private guest menus, publication, stable URL replacement, revision invalidation',flush=True)
