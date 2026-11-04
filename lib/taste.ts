import {z} from 'zod';
export const tasteKinds=['love','avoid','never'] as const;
export type TasteKind=typeof tasteKinds[number];
const terms=z.array(z.string().trim().min(1).max(50)).max(8);
export const preferencesSchema=z.object({love:terms,avoid:terms,never:terms}).strict();
export type Preferences=z.infer<typeof preferencesSchema>;
export const emptyPreferences=():Preferences=>({love:[],avoid:[],never:[]});
export function preferenceEntries(p:Preferences){return tasteKinds.flatMap(kind=>p[kind].map((term,index)=>({id:`${kind}:${index}`,kind,term})))}
export const hasPreferences=(p:Preferences)=>preferenceEntries(p).length>0;
const normalize=(s:string)=>s.trim().toLocaleLowerCase();
export function addPreference(p:Preferences,kind:TasteKind,value:string):Preferences{
 const term=value.trim().replace(/\s+/g,' ');if(!term||term.length>50)throw Error('Use 1–50 characters for each preference.');
 const next={love:p.love.filter(t=>normalize(t)!==normalize(term)),avoid:p.avoid.filter(t=>normalize(t)!==normalize(term)),never:p.never.filter(t=>normalize(t)!==normalize(term))};
 if(next[kind].length>=8)throw Error('Add up to 8 items in each group.');next[kind].push(term);return next;
}
const evidenceSchema=z.object({preferenceId:z.string(),blockId:z.string(),quote:z.string().min(1).max(500),reason:z.string().trim().min(1).max(300)}).strict();
const matchSchema=evidenceSchema.extend({basis:z.enum(['explicit','category','recipe'])}).strict();
export const suggestionsSchema=z.object({preferenceLabels:z.record(z.string().trim().min(1).max(100)).default({}),dishes:z.array(z.object({name:z.string().min(1).max(200),nameBlock:z.string(),contextIds:z.array(z.string()).min(1).max(12),matches:z.array(matchSchema).max(24),uncertainties:z.array(evidenceSchema).max(24)}).strict()).max(600)}).strict();
export type SuggestedDish=z.infer<typeof suggestionsSchema>['dishes'][number];
export type MatchLabel='Great match'|'Worth a look'|'Not for you'|'Ask your host';
export function validateSuggestions(value:unknown,blocks:{id:string;text:string}[],preferences:Preferences){
 const parsed=suggestionsSchema.parse(value),source=new Map(blocks.map(b=>[b.id,b.text])),entries=new Map(preferenceEntries(preferences).map(p=>[p.id,p]));
 if(Object.keys(parsed.preferenceLabels).some(id=>!entries.has(id)))throw Error('Some preference labels could not be verified. Please try again.');
 const seen=new Set<string>();
 for(const dish of parsed.dishes){
  const key=dish.nameBlock+':'+dish.name;
  if(seen.has(key)||!source.get(dish.nameBlock)?.includes(dish.name)||!dish.contextIds.includes(dish.nameBlock)||dish.contextIds.some(id=>!source.has(id)))throw Error('Some suggestions could not be verified against the menu. Please try again.');
  seen.add(key);
  const evidence=[...dish.matches,...dish.uncertainties];
  if(evidence.some(m=>!entries.has(m.preferenceId)||!dish.contextIds.includes(m.blockId)||!source.get(m.blockId)?.includes(m.quote))||dish.uncertainties.some(m=>entries.get(m.preferenceId)?.kind==='love'))throw Error('Some ingredient matches could not be verified. Please try again.');
  // A supported positive match supersedes uncertainty about the same ingredient.
  const matched=new Set(dish.matches.map(m=>m.preferenceId));dish.uncertainties=dish.uncertainties.filter(m=>!matched.has(m.preferenceId));
 }
 return parsed;
}
export function rateDish(dish:SuggestedDish,p:Preferences){
 const entries=preferenceEntries(p),matched=new Set(dish.matches.map(m=>m.preferenceId)),uncertain=new Map((dish.uncertainties||[]).map(m=>[m.preferenceId,m]));
 const love=entries.filter(e=>e.kind==='love'&&matched.has(e.id)),avoid=entries.filter(e=>e.kind==='avoid'&&matched.has(e.id)),never=entries.filter(e=>e.kind==='never'&&matched.has(e.id));
 // Hard exclusions always outrank likes. Unclear restrictions never become positive matches.
 const needsCheck=entries.filter(e=>e.kind!=='love'&&!matched.has(e.id)&&uncertain.has(e.id)).map(e=>({...e,reason:uncertain.get(e.id)!.reason}));
 const label:MatchLabel=never.length?'Not for you':needsCheck.length?'Ask your host':avoid.length?'Worth a look':love.length?'Great match':'Worth a look';
 const rank=label==='Great match'?0:label==='Worth a look'?(avoid.length?2:1):label==='Ask your host'?3:4;
 return {label,rank,love,avoid,never,needsCheck};
}
