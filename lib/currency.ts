export const currencies=[['MDL','Moldovan leu','לאו מולדובי'],['ILS','Israeli shekel','שקל ישראלי'],['EUR','Euro','אירו'],['USD','US dollar','דולר אמריקאי'],['PLN','Polish złoty','זלוטי פולני'],['CZK','Czech koruna','קורונה צ׳כית'],['SEK','Swedish krona','קרונה שוודית'],['DKK','Danish krone','קרונה דנית'],['NOK','Norwegian krone','קרונה נורווגית'],['GBP','British pound','ליש״ט'],['CHF','Swiss franc','פרנק שווייצרי'],['RON','Romanian leu','לאו רומני'],['HUF','Hungarian forint','פורינט הונגרי'],['UAH','Ukrainian hryvnia','הריבניה אוקראינית'],['CAD','Canadian dollar','דולר קנדי'],['AUD','Australian dollar','דולר אוסטרלי'],['JPY','Japanese yen','ין יפני'],['CNY','Chinese yuan','יואן סיני']] as const;
export const displayCurrencies=currencies.filter(([code])=>['USD','GBP','EUR','CNY','JPY'].includes(code));
export const isDisplayCurrency=(s:string):s is Currency=>displayCurrencies.some(([code])=>code===s);
export type Currency=typeof currencies[number][0];
export const isCurrency=(s:string):s is Currency=>currencies.some(([code])=>code===s);
export type ExchangeRates={date:string;rates:Record<string,number>;source:string}; // MDL per ONE unit of each currency
export const rateSource='https://www.bnm.md/en/content/official-exchange-rates';
export function detectMenuCurrency(texts:string[],url?:string):Currency|''{
 const codes=new Set(texts.flatMap(text=>text.toUpperCase().match(/\b(?:MDL|RON|EUR|USD|ILS|PLN|CZK|SEK|DKK|NOK|GBP|CHF|HUF|UAH|CAD|AUD|JPY|CNY)\b/g)||[]));
 for(const text of texts){const price=parseMenuPrice(text,'');if(price)codes.add(price.currency)}
 if(codes.size>1)return '';
 if(codes.size===1)return [...codes][0] as Currency;
 if(url){const host=new URL(url).hostname;if(host.endsWith('.md'))return 'MDL';if(host.endsWith('.ro'))return 'RON'}
 return '';
}
export function parsePriceNumber(raw:string):number|null{
 let s=raw.trim().replace(/[\u00a0\u202f]/g,' ');
 if(!/^\d[\d .,]*$/.test(s))return null;
 if(s.includes(' ')){if(!/^\d{1,3}(?: \d{3})+(?:[.,]\d{1,2})?$/.test(s))return null;s=s.replace(/ /g,'')}
 if(s.includes(',')&&s.includes('.')){
  const decimal=s.lastIndexOf(',')>s.lastIndexOf('.')?',':'.',group=decimal===','?'.':',';
  const parts=s.split(decimal);if(parts.length!==2||!/^\d{1,2}$/.test(parts[1])||!new RegExp('^\\d{1,3}(?:\\'+group+'\\d{3})+$').test(parts[0]))return null;
  s=parts[0].split(group).join('')+'.'+parts[1];
 }else if(/[.,]/.test(s)){
  if(/^\d+[.,]\d{1,2}$/.test(s))s=s.replace(',','.');
  else if(/^\d{1,3}(?:,\d{3})+$/.test(s)||/^\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/[.,]/g,'');
  else return null;
 }
 const value=Number(s);return Number.isFinite(value)&&value>=0?value:null;
}
export function parseMenuPrice(text:string,source:Currency|'',role?:string):{amount:number;currency:Currency}|null{
 const s=text.trim();
 const match=s.match(/^(?:(€|\$|£|₪)\s*)?(\d[\d\s.,]*?)\s*(MDL|RON|EUR|USD|ILS|PLN|CZK|SEK|DKK|NOK|GBP|CHF|HUF|UAH|CAD|AUD|JPY|CNY|lei|ley|l\.?|€|\$|£|₪)?$/iu);
 if(!match||match[1]&&match[3])return null;
 const amount=parsePriceNumber(match[2]);if(amount===null)return null;
 const unit=(match[1]||match[3]||'').toUpperCase();let currency:Currency|''='';
 if(isCurrency(unit))currency=unit;
 else if(unit==='€')currency='EUR';else if(unit==='₪')currency='ILS';else if(unit==='£')currency='GBP';
 else if(unit==='$')currency=['USD','CAD','AUD'].includes(source)?source:'';
 else if(unit==='LEI'||unit==='LEY')currency=source==='MDL'||source==='RON'?source:'';
 else if(unit==='L'||unit==='L.')currency=(source==='MDL'||source==='RON')&&amount>=10?source:'';
 else if(!unit&&role==='price')currency=source;
 return currency?{amount,currency}:null;
}
export function convertPrice(amount:number,source:string,target:string,rates:Record<string,number>){
 const from=rates[source],to=rates[target];
 if(!Number.isFinite(amount)||amount<0||!Number.isFinite(from)||!Number.isFinite(to)||from<=0||to<=0)return null;
 const result=amount*from/to;return Number.isFinite(result)?result:null;
}
export function formatConverted(amount:number,currency:Currency,language:string){
 return new Intl.NumberFormat(language==='auto'?'en':language,{style:'currency',currency,currencyDisplay:'symbol',minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
}
