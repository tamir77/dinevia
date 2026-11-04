import {headers} from 'next/headers';
import Dashboard from './ui';
import {browserLanguages,guestLocale} from '../lib/guest-locale';
export default async function Home({searchParams}:{searchParams:Promise<{lang?:string}>}){const [h,query]=await Promise.all([headers(),searchParams]);return <Dashboard initialLanguage={guestLocale(query?.lang,null,browserLanguages(h.get('accept-language')||''))}/>}
