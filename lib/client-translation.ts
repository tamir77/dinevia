export async function requestTranslation(id:string,language:string){
 const response=await fetch('/api/menu/'+encodeURIComponent(id)+'/translate',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({language})});
 const result:any=await response.json();if(response.ok)return result;
 if(response.status!==409)throw new Error(result.error||'Could not translate this menu. Please try again.');
 // Another visitor (or a page reload) may already have started this language.
 // Poll the read-only status route so duplicate requests never create extra AI jobs.
 const deadline=Date.now()+10*60000;
 while(Date.now()<deadline){
  await new Promise(resolve=>setTimeout(resolve,2000));
  const poll=await fetch('/api/menu/'+encodeURIComponent(id)+'/translation?language='+encodeURIComponent(language));
  const data:any=await poll.json();if(!poll.ok)throw new Error(data.error||'Could not check the translation status.');
  if(data.state==='ready')return {data:data.data,cached:true};
  if(data.state==='failed')throw new Error('The translation did not finish. Select the language again to retry.');
 }
 throw new Error('This translation is taking longer than usual. Try opening this language again later.');
}
