import test from 'node:test';
import assert from 'node:assert/strict';
import {formatMenuAmount} from '../lib/menu-amount.ts';
test('local menu prices expand L to Lei without changing their number',()=>{
 assert.equal(formatMenuAmount('270 l.',{localCurrency:true}),'270 Lei');
 assert.equal(formatMenuAmount('1 200 L',{localCurrency:true}),'1 200 Lei');
 assert.equal(formatMenuAmount('80 l.',{previousText:'250 gr.'}),'80 Lei');
});
test('volume, weight, explicit currencies and unknown L context stay intact',()=>{
 for(const s of ['0.5 L','1 L','2 l.','170 gr.','300 ml','250 MDL','20 EUR','100 lei'])assert.equal(formatMenuAmount(s,{localCurrency:true}),s);
 assert.equal(formatMenuAmount('270 l.'),'270 l.');
});
