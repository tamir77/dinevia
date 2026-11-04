type MetaRequest = {model:string; [key:string]:unknown};

export async function metaRequest(key:string, payload:MetaRequest, signal:AbortSignal) {
 const send=(body:MetaRequest)=>fetch('https://api.meta.ai/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal,body:JSON.stringify(body)});
 const response=await send(payload);
 // Keep the same provider and privacy mode. Only a missing-model response
 // permits a single compatibility retry with the original Spark version.
 if(response.status===404&&payload.model==='muse-spark-1.3'){
  const error=await response.clone().json().catch(()=>null) as {error?:{code?:string}}|null;
  if(error?.error?.code==='model_not_found'){
   console.info('[meta-model] Spark 1.3 unavailable; trying Spark 1.1');
   return send({...payload,model:'muse-spark-1.1'});
  }
 }
 return response;
}
