export async function preparePhoto(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)throw new Error('Choose a JPEG, PNG or WebP up to 15 MB. For HEIC, save your photo as JPEG first.');
 const bitmap=await createImageBitmap(file);try{
  const ratio=Math.min(1,2200/Math.max(bitmap.width,bitmap.height)),width=Math.round(bitmap.width*ratio),height=Math.round(bitmap.height*ratio);
  if(width<200||height<200)throw new Error('This photo is too small. Choose a clearer image.');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d')!;context.fillStyle='white';context.fillRect(0,0,width,height);context.drawImage(bitmap,0,0,width,height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not open this photo.')),'image/jpeg',.94));
  return {file:new File([blob],'menu-photo.jpg',{type:'image/jpeg'}),width,height};
 }finally{bitmap.close()}
}
