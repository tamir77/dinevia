import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {currencies,displayCurrencies,isDisplayCurrency,detectMenuCurrency,parsePriceNumber,parseMenuPrice,convertPrice,formatConverted} from '../lib/currency.ts';
import {parseBnmRates,createRateLoader,chisinauDate} from '../lib/exchange-rates.ts';
const xml=await readFile(new URL('./fixtures/bnm-2026-11-04.xml',import.meta.url),'utf8'),table=parseBnmRates(xml),now=Date.parse('2026-11-04T12:00:00Z');
test('official BNM fixture normalizes nominal units and supports every offered currency',()=>{
 assert.equal(table.date,'2026-11-04');assert.equal(table.rates.MDL,1);assert.equal(table.rates.ILS,5.7137);
 assert.equal(table.rates.HUF,5.5405/100);assert.equal(table.rates.JPY,11.4144/100);
 for(const [code] of currencies)assert(table.rates[code]>0,code);
 assert.equal(formatConverted(convertPrice(120,'MDL','ILS',table.rates),'ILS','en'),'₪21.00');
 assert.equal(convertPrice(120,'MDL','EUR',table.rates).toFixed(2),'5.94');
 assert.equal(convertPrice(120,'MDL','USD',table.rates).toFixed(2),'6.64');
 assert.equal(convertPrice(120,'MDL','PLN',table.rates).toFixed(2),'26.27');
 assert.equal(convertPrice(100,'EUR','ILS',table.rates),(100*20.196)/5.7137);
 for(const [code] of currencies){const converted=convertPrice(270,'MDL',code,table.rates);assert(Math.abs(convertPrice(converted,code,'MDL',table.rates)-270)<1e-9)}
 for(const rates of [{},{MDL:1,ILS:0},{MDL:1,ILS:NaN},{MDL:-1,ILS:2}])assert.equal(convertPrice(120,'MDL','ILS',rates),null);
});
test('price parsing distinguishes currency amounts from portions, ranges and prose',()=>{
 for(const [text,amount] of [['120 Lei',120],['120 l.',120],['120 L',120],['120.50 MDL',120.5],['120,50 lei',120.5],['1 200,50 lei',1200.5],['1,200.50 MDL',1200.5],['1.200,50 MDL',1200.5]])assert.deepEqual(parseMenuPrice(text,'MDL','price'),{amount,currency:'MDL'},text);
 assert.deepEqual(parseMenuPrice('120 RON','MDL'),{amount:120,currency:'RON'});
 assert.deepEqual(parseMenuPrice('€20','MDL'),{amount:20,currency:'EUR'});
 assert.deepEqual(parseMenuPrice('₪45.5','MDL'),{amount:45.5,currency:'ILS'});
 assert.deepEqual(parseMenuPrice('120','MDL','price'),{amount:120,currency:'MDL'});
 for(const text of ['170 gr.','0.5 L','1 L','250 ml','2 kg','10%','120/180 Lei','120–180 Lei','120-180','Steak 120 Lei','€20 USD','1 20 MDL'])assert.equal(parseMenuPrice(text,'MDL','price'),null,text);
 assert.equal(parseMenuPrice('120','MDL'),null);assert.equal(parseMenuPrice('120 Lei',''),null);assert.equal(parseMenuPrice('$20','MDL'),null);
 for(const text of ['1 20','1,23,4','-10','NaN','Infinity'])assert.equal(parsePriceNumber(text),null);
});
test('source currency is inferred from source evidence, never language',()=>{
 assert.equal(detectMenuCurrency(['120 l.'],'https://divus.md/meniu/'),'MDL');
 assert.equal(detectMenuCurrency(['120 lei'],'https://example.ro/menu'),'RON');
 assert.equal(detectMenuCurrency(['120 lei']),'');assert.equal(detectMenuCurrency(['120 MDL']),'MDL');
 assert.equal(detectMenuCurrency(['10 EUR'],'https://example.md'),'EUR');
 assert.equal(detectMenuCurrency(['€20','€30']),'EUR');
 assert.equal(detectMenuCurrency(['₪45.5']),'ILS');
 assert.equal(detectMenuCurrency(['£12']),'GBP');
 assert.equal(detectMenuCurrency(['$20']),'');
 assert.equal(detectMenuCurrency(['20 EUR','400 MDL'],'https://example.md'),'');
});
test('rate loader deduplicates requests, caches for one hour and refreshes next day',async()=>{
 let calls=0,time=now;const load=createRateLoader(async()=>{calls++;return new Response(xml)},()=>time);
 await Promise.all([load(),load(),load()]);assert.equal(calls,1);await load();assert.equal(calls,1);
 time+=3600001;await load();assert.equal(calls,2);
 time=Date.parse('2026-11-04T22:30:00Z');assert.equal(chisinauDate(time),'2026-11-05');await load();assert.equal(calls,3);
});
test('unavailable, malformed, future and stale rates fail without using invented or old values',async()=>{
 assert.throws(()=>parseBnmRates('<html>Unavailable</html>'));
 assert.throws(()=>parseBnmRates(xml.replace('<Nominal>1</Nominal>','<Nominal>0</Nominal>')));
 assert.throws(()=>parseBnmRates(xml.replace('<Value>20.1960</Value>','<Value>-1</Value>')));
 for(const date of ['01.10.2026','05.11.2026'])await assert.rejects(createRateLoader(async()=>new Response(xml.replace('04.11.2026',date)),()=>now)());
 let fail=true,time=now,calls=0;const load=createRateLoader(async()=>{calls++;return fail?new Response('fail',{status:503}):new Response(xml)},()=>time);
 await assert.rejects(load());fail=false;await load();assert.equal(calls,2);
 time+=3600001;fail=true;await assert.rejects(load());assert.equal(calls,3);
});

test('guest currency choices stay compact without losing original currency recognition',()=>{
 assert.deepEqual(new Set(displayCurrencies.map(([c])=>c)),new Set(['USD','GBP','EUR','CNY','JPY']));
 assert.equal(isDisplayCurrency('PLN'),false);assert.equal(isDisplayCurrency('ILS'),false);assert.equal(detectMenuCurrency(['120 MDL']),'MDL');
 assert.deepEqual(parseMenuPrice('80 CNY',''),{amount:80,currency:'CNY'});
 assert.equal(convertPrice(120,'MDL','CNY',table.rates).toFixed(2),'44.32');
});
