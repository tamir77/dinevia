// Keep standalone prices and quantities verbatim, including local abbreviations.
export function isMenuAmount(text:string){
 return /^\s*(?:[€$£₪]\s*)?\d[\d\s.,/–-]*(?:(?:mdl|lei|ron|eur|usd|gbp|ils|cny|jpy|gr|kg|ml|cl|g|l|oz)\.?|[€$£₪%])?\s*$/iu.test(text);
}

// Only expand the ambiguous L abbreviation when the source supplies price context.
// Decimal/small L quantities remain liters; source data is never modified.
export function formatMenuAmount(text:string,{localCurrency=false,previousText=''}:{localCurrency?:boolean;previousText?:string}={}){
 const match=text.match(/^\s*(\d[\d ]*)\s+l\.?\s*$/iu);
 if(!match)return text;
 const amount=Number(match[1].replace(/ /g,''));
 const followsPortion=/^\s*\d[\d\s.,/–-]*(?:gr|kg|ml|g|oz)\.?\s*$/iu.test(previousText);
 return (localCurrency||followsPortion)&&amount>=10?`${match[1].trim()} Lei`:text;
}
