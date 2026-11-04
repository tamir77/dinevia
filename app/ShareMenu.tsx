'use client';

import {guestCopy} from '../lib/guest-copy';
import {menuLink} from '../lib/client-menu-link';
import {useRef, useState} from 'react';
import {Check, Copy, Link2, X} from 'lucide-react';

export default function ShareMenu({id,language='en'}: {id: string;language?:string}) {
  const t=guestCopy(language);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);

  async function open() {
    const link=await menuLink(id,window.location.origin);setUrl(link.url);setNote(link.note);
    setStatus('');
    setCopied(false);
    dialog.current?.showModal();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setStatus(t.linkCopied);
    } catch {
      setCopied(false);
      input.current?.focus();
      input.current?.select();
      setStatus(t.copyManually);
    }
  }

  return <>
    <button className="button secondary small" onClick={open}><Link2 size={17}/> {t.share}</button>
    <dialog ref={dialog} className="sharemodal" aria-labelledby="share-menu-title" onClick={e => {if (e.target === e.currentTarget) dialog.current?.close();}}>
      <div className="sharecontent">
        <button className="modalclose textbutton" aria-label={t.closeShare} onClick={() => dialog.current?.close()}><X size={20}/></button>
        <span className="shareicon"><Link2 size={24}/></span>
        <h2 id="share-menu-title">{t.menuLink}</h2>
        <p>{t.openMenu}</p>
        <label>{t.address}<input ref={input} value={url} readOnly onFocus={e => e.target.select()} aria-label={t.menuLink}/></label>
        <button className="button full" onClick={copy}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? t.copied : t.copyLink}</button>
        <p className="sharestatus" role="status">{status}</p>
        <p className="localnotice">{language==='en'?note:t.openMenu}</p>
      </div>
    </dialog>
  </>;
}
