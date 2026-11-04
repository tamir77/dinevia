import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Menu Passport — меню без границ',description:'Загрузите меню ресторана в PDF. Гости прочитают его на своём языке.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}
