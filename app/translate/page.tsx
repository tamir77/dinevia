import {headers} from 'next/headers';
import Translate from './view';
import {browserLanguages,guestLocale} from '../../lib/guest-locale';
export default async function Page({searchParams}:{searchParams:Promise<{lang?:string}>}){const [h,query]=await Promise.all([headers(),searchParams]);return <Translate initialLanguage={guestLocale(query?.lang,null,browserLanguages(h.get('accept-language')||''))}/>}
