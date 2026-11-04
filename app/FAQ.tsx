import {siteCopy} from '../lib/site-copy';
export default function FAQ({language='en'}:{language?:string}){
 const t=siteCopy(language);
 return <section className="faq" id="faq" aria-labelledby="faq-heading"><div className="faq-intro"><span className="number">{t.faqLabel}</span><h2 id="faq-heading">{t.faqTitle}</h2><p>{t.faqIntro}</p></div><div className="faq-list">{t.faq.map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>;
}
