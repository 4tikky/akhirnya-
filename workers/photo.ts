const scope = self;

scope.addEventListener('message', async (event: MessageEvent<{id:string;image:ImageBitmap;mask:ImageBitmap}>) => {
  const {id,image,mask} = event.data;
  try {
    const {width,height} = image;
    const canvas = new OffscreenCanvas(width,height);
    const ctx = canvas.getContext('2d',{willReadFrequently:true});
    if (!ctx) throw new Error('Kanvas pemrosesan tidak tersedia.');
    ctx.drawImage(mask,0,0,width,height);
    const maskData = ctx.getImageData(0,0,width,height);
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(image,0,0,width,height);
    const photo = ctx.getImageData(0,0,width,height);
    let foreground = 0;
    for (let i=3;i<maskData.data.length;i+=4) {
      const value = Math.max(0,Math.min(1,(maskData.data[i]/255-.10)/.78));
      foreground += value;
      photo.data[i] *= value;
    }
    if (foreground/(width*height) < .012 || foreground/(width*height) > .998) throw new Error('Subjek tidak terdeteksi dengan cukup jelas.');
    ctx.putImageData(photo,0,0);
    scope.postMessage({id,blob:await canvas.convertToBlob({type:'image/png'}),width,height});
  } catch (error) {
    scope.postMessage({id,error:error instanceof Error ? error.message : 'Latar tidak dapat dihapus.'});
  } finally {image.close();mask.close();}
});
