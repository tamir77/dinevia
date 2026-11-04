// Personal imports are always text-only. The client cannot opt into image generation.
export const menuPresentation=(owner:string):'text'|'design'=>owner.startsWith('guest:')?'text':'design';
export const needsTranslatedImage=(owner:string,kind:string)=>kind==='photo'&&menuPresentation(owner)==='design';
