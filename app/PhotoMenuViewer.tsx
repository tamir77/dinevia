'use client';
import {useState} from 'react';
import type {Translated} from '../lib/layout';
export default function PhotoMenuViewer({id,translation,compare}:{id:string;translation:Translated|null;compare:boolean}){
 const original='/api/menu/'+id+'/photo',translated='/api/menu/'+id+'/translated-photo?language='+translation?.language;
 const [failed,setFailed]=useState('');
 return <div className={'photomenu '+(compare?'photocompare':'')}>
 {failed&&<p role="alert" className="notice">{failed}</p>}
 {compare&&<figure><figcaption>Original photo</figcaption><img src={original} alt="Original menu photo"/></figure>}
 <figure><figcaption>{translation?'Translated photo · '+translation.language.toUpperCase():'Original photo'}</figcaption><img key={translation?.language||'original'} src={translation?translated:original} alt={translation?'Translated menu photo':'Menu photo'} onError={()=>setFailed('Could not load the image. Please refresh the page.')}/>{translation&&<a className="button secondary small" href={translated+'&download=1'} download>Download translated photo</a>}</figure>
 </div>;
}
