'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

const measurementId = 'G-NB1E0EN32P';
const publicHost = 'dinevia-1opu.onrender.com';
type AnalyticsWindow = Window & {dataLayer?: unknown[]; dineviaAnalytics?: boolean; dineviaPage?: string};

export default function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (location.hostname !== publicHost || navigator.doNotTrack === '1') return;
    const win = window as AnalyticsWindow;
    // Never send menu IDs, imported URLs, query strings, titles or preferences.
    const path = ['/', '/translate', '/restaurants'].includes(pathname || '') ? pathname! : '/menu';
    const page = {page_location: `https://${publicHost}${path}`, page_title: `Dinevia ${path}`, page_referrer: ''};
    win.dataLayer ||= [];
    function gtag(..._args: unknown[]) { win.dataLayer!.push(arguments); }
    if (!win.dineviaAnalytics) {
      win.dineviaAnalytics = true;
      gtag('js', new Date());
      gtag('config', measurementId, {...page, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false});
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.referrerPolicy = 'no-referrer';
      document.head.appendChild(script);
    }
    if (win.dineviaPage !== path) {
      win.dineviaPage = path;
      gtag('set', page);
      gtag('event', 'page_view', page);
    }
  }, [pathname]);
  return null;
}
