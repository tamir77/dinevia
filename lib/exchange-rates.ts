import {rateSource,type ExchangeRates} from './currency.ts';
export function parseBnmRates(xml:string):ExchangeRates{
 if(xml.length>100000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Invalid exchange-rate response');
 const date=xml.match(/<ValCurs\b[^>]*\bDate="(\d{2})\.(\d{2})\.(\d{4})"/);
 if(!date)throw Error('Missing rate date');
 const iso=`${date[3]}-${date[2]}-${date[1]}`;
 if(new Date(iso+'T00:00:00Z').toISOString().slice(0,10)!==iso)throw Error('Invalid rate date');
 const rates:Record<string,number>={MDL:1};
 for(const item of xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)){
  const code=item[1].match(/<CharCode>([A-Z]{3})<\/CharCode>/)?.[1];
  const nominal=Number(item[1].match(/<Nominal>([\d.]+)<\/Nominal>/)?.[1]);
  const value=Number(item[1].match(/<Value>([\d.,]+)<\/Value>/)?.[1]?.replace(',','.'));
  if(!code||code in rates||!Number.isFinite(nominal)||nominal<=0||!Number.isFinite(value)||value<=0)throw Error('Invalid exchange rate');
  rates[code]=value/nominal;
 }
 if(!rates.EUR||!rates.USD||!rates.ILS||!rates.PLN)throw Error('Incomplete exchange rates');
 return {date:iso,rates,source:rateSource};
}
export function chisinauDate(now:number){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Chisinau',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function createRateLoader(fetcher:typeof fetch=fetch,clock=Date.now){
 let saved:{data:ExchangeRates;at:number;day:string}|undefined,pending:Promise<ExchangeRates>|undefined;
 return function load():Promise<ExchangeRates>{
  const now=clock(),day=chisinauDate(now);
  if(saved&&saved.day===day&&now-saved.at<3600000)return Promise.resolve(saved.data);
  if(pending)return pending;
  pending=(async()=>{
   const [year,month,date]=day.split('-');
   const response=await fetcher(`https://www.bnm.md/en/official_exchange_rates?get_xml=1&date=${date}.${month}.${year}`,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/xml'}});
   if(!response.ok)throw Error('Exchange rates unavailable');
   const data=parseBnmRates(await response.text()),age=(Date.parse(day)-Date.parse(data.date))/86400000;
   if(age<0||age>7)throw Error('Exchange rates are out of date');
   saved={data,at:clock(),day};return data;
  })().finally(()=>{pending=undefined});
  return pending;
 }
}
export const loadExchangeRates=createRateLoader();
