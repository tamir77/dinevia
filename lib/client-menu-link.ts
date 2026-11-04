export async function menuLink(id:string,origin:string){
 const url=new URL('/menu/'+encodeURIComponent(id),origin),loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(loopback)try{
  const r=await fetch('/api/phone-link?menu='+encodeURIComponent(id));
  if(r.ok){const d=await r.json() as {url?:string};if(typeof d.url==='string')return {url:d.url as string,note:'For this Wi-Fi test, keep your Mac awake and connect the phone to the same network. This preview link expires.'}}
 }catch{}
 return {url:url.href,note:loopback?'This local link works only on this computer. Enable the phone preview to test by QR code.':/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)?'Use the same Wi-Fi network as your Mac. Open the phone preview link first on each device.':'Each guest opens the menu in their browser language and can choose another language.'};
}
