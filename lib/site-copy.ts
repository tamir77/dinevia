import copy from './site-locales.json' with {type:'json'};
export function siteCopy(language:string):typeof copy.en{return copy[language as keyof typeof copy]||copy.en}
