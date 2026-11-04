import {languages} from './menu.ts';
export function preferredLanguage(preferences:readonly string[]){for(const language of preferences){const short=language.toLowerCase().split('-')[0];if(languages.some(([code])=>code===short))return short}return 'en'}
