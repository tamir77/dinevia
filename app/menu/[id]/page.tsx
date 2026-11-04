import MenuView from './view';
import {languages} from '../../../lib/menu';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{lang?:string}>}){const [{id},query]=await Promise.all([params,searchParams]);const language=languages.some(([code])=>code===query?.lang)?query.lang!:'original';return <MenuView id={id} initialLanguage={language}/>}
