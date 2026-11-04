'use client';
import {useEffect,useRef,useState} from 'react';
import {Heart,Ban,ThumbsDown,Coins,Camera,Link2,Globe2,ChevronLeft,ChevronRight} from 'lucide-react';
import {tasteCopy} from '../lib/taste-copy';
import {guestCopy} from '../lib/guest-copy';
import {importCopy} from '../lib/import-copy';
import {homeCopy} from '../lib/home-copy';
export default function LoadingTips({language}:{language:string}){
 const t=tasteCopy(language),g=guestCopy(language),i=importCopy(language),h=homeCopy(language);
 const tips=[{icon:Heart,title:t.love,body:t.loveHint},{icon:ThumbsDown,title:t.avoid,body:t.avoidHint},{icon:Ban,title:t.never,body:t.neverHint},{icon:Coins,title:g.alsoCurrency,body:g.approximate+' · '+g.preserved},{icon:Camera,title:i.takePhoto,body:i.photoHint},{icon:Link2,title:i.link,body:i.linkHint},{icon:Globe2,title:h.step2,body:h.step2Body}];
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focus,setFocus]=useState(false),[reduced,setReduced]=useState(true);const touch=useRef<number|null>(null),rtl=['he','ar'].includes(language);
 useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(q.matches);update();q.addEventListener('change',update);return()=>q.removeEventListener('change',update)},[]);
 useEffect(()=>{if(paused||hover||focus||reduced)return;const timer=setInterval(()=>setIndex(n=>(n+1)%tips.length),6500);return()=>clearInterval(timer)},[paused,hover,focus,reduced,tips.length]);
 const current=tips[index],Icon=current.icon,previous=(index+tips.length-1)%tips.length,next=(index+1)%tips.length;
 function choose(n:number){setIndex(n);setPaused(true)}
 return <section className="loading-tips" aria-label={h.step3} dir={rtl?'rtl':'ltr'} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocus={()=>setFocus(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocus(false)}} onTouchStart={e=>{touch.current=e.touches[0].clientX}} onTouchEnd={e=>{if(touch.current===null)return;const dx=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>45)choose((dx<0)!==rtl?next:previous)}}>
 <div className="tip-copy" aria-live={paused?'polite':'off'} aria-atomic="true"><span className="tip-icon"><Icon size={23}/></span><h3>{current.title}</h3><p>{current.body}</p></div>
 <div className="tip-controls"><button type="button" aria-label={tips[previous].title} onClick={()=>choose(previous)}>{rtl?<ChevronRight size={18}/>:<ChevronLeft size={18}/>}</button><div className="tip-dots">{tips.map((tip,n)=><button type="button" key={n} aria-label={tip.title} aria-current={index===n?'true':undefined} onClick={()=>choose(n)}><span/></button>)}</div><button type="button" aria-label={tips[next].title} onClick={()=>choose(next)}>{rtl?<ChevronLeft size={18}/>:<ChevronRight size={18}/>}</button></div>
 </section>;
}
