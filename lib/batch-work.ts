export async function runBatches<T>(batches:T[],concurrency:number,run:(batch:T)=>Promise<void>){
 let next=0,failed=false;
 const workers=Array.from({length:Math.min(concurrency,batches.length)},async()=>{
  while(!failed&&next<batches.length){const batch=batches[next++];try{await run(batch)}catch(e){failed=true;throw e}}
 });
 // Await every in-flight call, even after failure, before releasing the job lease.
 const results=await Promise.allSettled(workers),failure=results.find(r=>r.status==='rejected');
 if(failure?.status==='rejected')throw failure.reason;
}
