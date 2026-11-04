import {metaRequest} from './meta-request.ts';
import {env} from 'cloudflare:workers';
import {runBatches} from './batch-work';
import {tasteBatches,type TasteBlock} from './taste-batches';
import {tasteInstructions} from './taste-instructions';
import {documentBlocks,type MenuDocument} from './menu-document';
import {preferenceEntries,validateSuggestions,type Preferences} from './taste';
async function recommendBatch(blocks:TasteBlock[],preferences:Preferences,language:string){
 const key=(env as unknown as Record<string,string>).MODEL_API_KEY?.trim();if(!key)throw Error('Connect Meta to get personalized suggestions. Your original menu is still available.');

 const response=await metaRequest(key,{model:'muse-spark-1.3',reasoning:{effort:'low'},max_output_tokens:16000,input:[{role:'system',content:[{type:'input_text',text:tasteInstructions+`\nResponse language: ${language}. Write every reason in this language, including recipe qualifiers. Also return a top-level preferenceLabels object mapping EVERY supplied preference ID to its short translated food/preparation label in this language (e.g. fish becomes דגים in Hebrew). Preserve qualifiers and meaning. Keep dish names, quotes, source IDs and preference IDs unchanged; translate only reasons and preferenceLabels. In Hebrew, use Hebrew script for normal food names rather than leaving English terms.`}]},{role:'user',content:[{type:'input_text',text:JSON.stringify({preferences:preferenceEntries(preferences),blocks})}]}]},AbortSignal.timeout(120000));
 if(!response.ok)throw Error(`Meta could not prepare suggestions (${response.status}). Please try again.`);
 const result:any=await response.json();if(result.status!=='completed')throw Error('The suggestions did not finish. Please try again.');
 const raw=result.output?.flatMap((o:any)=>o.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text||'').join('')||'';
 let value:unknown;try{value=JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''))}catch{throw Error('Could not read the suggestions. Please try again.');}
 const validated=validateSuggestions(value,blocks,preferences);
 if(preferenceEntries(preferences).some(p=>!validated.preferenceLabels[p.id]))throw Error('Some preference labels were missing. Please try again.');
 return {...validated,language};
}

export async function recommendMenu(document:MenuDocument,preferences:Preferences,language='en'){
 const blocks=documentBlocks(document),batches=tasteBatches(blocks),results:Awaited<ReturnType<typeof recommendBatch>>[]=[];
 await runBatches(batches.map((blocks,index)=>({blocks,index})),3,async({blocks,index})=>{results[index]=await recommendBatch(blocks,preferences,language)});
 const combined={preferenceLabels:results[0]?.preferenceLabels||{},dishes:results.flatMap(r=>r.dishes)};
 return {...validateSuggestions(combined,blocks,preferences),language};
}
