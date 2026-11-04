import type {Metadata} from 'next';
import './globals.css';
import Analytics from './Analytics';
export const metadata:Metadata={title:'Dinevia — Menus Without Borders',description:'Dinevia — Menus Without Borders. Translate a menu link or photo, discover dishes for your taste, and see prices in your currency.',icons:{icon:'/favicon.svg'}};
// Keep errors originating solely in browser extensions out of the local dev
// overlay. Application errors still reach the normal error reporting handlers.
const extensionErrorFilter = `window.addEventListener('unhandledrejection', function(event) {
  var stack = event.reason && typeof event.reason.stack === 'string' ? event.reason.stack : '';
  if (stack.includes('chrome-extension://') && !stack.includes(window.location.origin)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
}, true);`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head>{process.env.NODE_ENV === 'development' && <script dangerouslySetInnerHTML={{__html:extensionErrorFilter}}/>}</head><body>{children}<Analytics/></body></html>}
