'use client';
import {useRef} from 'react';
import {Play,X} from 'lucide-react';
const copy:Record<string,[string,string,string]>={en:['Watch demo','Dinevia in action','English narration · 2 min 34 sec'],de:['Demo ansehen','Dinevia in Aktion','Englische Erzählung · 2 Min. 34 Sek.'],es:['Ver demo','Dinevia en acción','Narración en inglés · 2 min 34 s'],it:['Guarda la demo','Dinevia in azione','Voce narrante in inglese · 2 min 34 s'],fr:['Voir la démo','Dinevia en action','Narration en anglais · 2 min 34 s'],zh:['观看演示','体验 Dinevia','英语旁白 · 2 分 34 秒'],ja:['デモを見る','Dinevia の使い方','英語ナレーション · 2分34秒']};
export default function WatchDemo({language='en'}:{language?:string}){
 const closeLabel:Record<string,string>={en:'Close video',de:'Video schließen',es:'Cerrar vídeo',it:'Chiudi video',fr:'Fermer la vidéo',zh:'关闭视频',ja:'動画を閉じる'};
 const dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null),t=copy[language]||copy.en;
 function close(){video.current?.pause();dialog.current?.close()}
 return <><button type="button" className="button demo-trigger" onClick={()=>dialog.current?.showModal()}><Play size={18} fill="currentColor"/>{t[0]}</button><dialog ref={dialog} className="demo-dialog" aria-labelledby="demo-title" onCancel={close} onClick={event=>{if(event.target===event.currentTarget)close()}}><header><div><h2 id="demo-title">{t[1]}</h2><p>{t[2]}</p></div><button type="button" className="demo-close" aria-label={closeLabel[language]||closeLabel.en} onClick={close}><X/></button></header><video ref={video} controls playsInline preload="none" poster="/demo/dinevia-poster.jpg"><source src="/demo/dinevia-demo.mp4" type="video/mp4"/><track kind="captions" src="/demo/dinevia-en.vtt" srcLang="en" label="English" default/></video></dialog></>
}
