// Remove webpage chrome before it can enter translation batches. Preserve culinary
// notes (allergens, service charges, portions), even when they contain no price.
export function isPageChrome(text:string){
 const t=text.trim().replace(/\s+/g,' ');
 return /^(?:ro|ru|en|he|fr|de|it|es|pl)$/i.test(t)
 || /^(?:(?:mun\.|municipiul)\s+[^,]+,\s*)?(?:str\.|strada|street|ул\.|улица)\s+.{1,100}\d/iu.test(t)
 || /\bMD-\d{4}\b/.test(t)&&/(?:str\.|strada|street|Puskin|Pushkin|Пушкин)/iu.test(t)
 || /^(?:home|about(?: us)?|contact(?: us)?|contacts|gallery|careers|privacy policy|terms(?: and conditions)?|cookie(?: policy| settings)?|accept (?:all )?cookies|reject (?:all )?cookies|book (?:a )?table|reserve (?:a )?table|make a reservation|follow us|subscribe(?: to (?:our )?newsletter)?|sign (?:in|up)|log ?in|view cart|shopping cart|checkout|back to top|skip to content|read more|learn more|download (?:the )?menu|despre noi|contacte|rezerv[aă] (?:o )?mas[aă]|rezervări|galerie|acas[aă]|главная|о нас|контакты|забронировать столик|подписаться|политика конфиденциальности|דף הבית|צור קשר|אודות|הזמנת שולחן)[.!→»\s]*$/iu.test(t)
 || /^(?:copyright\b|©|all rights reserved\b|toate drepturile rezervate\b|powered by\b|website (?:by|created|designed)\b|this (?:site|website) uses cookies\b|we use cookies\b)/iu.test(t)
 || /^(?:https?:\/\/|www\.)\S+$/i.test(t)
 || /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(t)
 || /^(?:(?:tel(?:ephone)?|phone|telefon|телефон)\s*:?\s*)?\+\d[\d ()-]{7,}$/iu.test(t)
 || /^(?:opening hours|working hours|program de lucru|ore de lucru|часы работы)\s*:/iu.test(t);
}
export function isChromeContainer(name:string){
 return /(?:^|\s)(?:header|footer)(?:$|\s)/i.test(name)||/(?:^|[\s_-])(?:language|languages|lang|cookie|cookies|consent|newsletter|booking|reservation|reservations|contact|contacts|social|breadcrumb|breadcrumbs|login|signup|cart|checkout|popup|modal|subscribe|opening-hours|working-hours|site-footer|site-header|about-us|our-story)(?:$|[\s_-])/i.test(name);
}
