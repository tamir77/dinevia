import {headers} from 'next/headers';
import Restaurants from './view';
import {browserLanguages,guestLocale} from '../../lib/guest-locale';
export default async function Page({searchParams}:{searchParams:Promise<{lang?:string}>}){const [h,q]=await Promise.all([headers(),searchParams]);return <Restaurants initialLanguage={guestLocale(q?.lang,null,browserLanguages(h.get('accept-language')||''))}/>}
