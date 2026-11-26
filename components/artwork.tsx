import type { CSSProperties } from 'react';
import { assetSvg } from '@/lib/scenes/assets';
import { collectionFor } from '@/lib/scenes/catalog';
import { getTheme } from '@/lib/themes';
import type { Size, ThemeId } from '@/lib/types';

export function BannerArt({ id, standSize }: { id: ThemeId; standSize?: Size }) {
  const theme = getTheme(id);
  const collection=collectionFor(id);
  const palette = collection?.palettes[0] ?? theme.palettes[0];
  const style = {'--art-bg':palette.bg,'--art-ink':palette.ink,'--art-accent':palette.accent,'--art-soft':palette.soft} as CSSProperties;
  if (collection && (standSize || !['newspaper','gaming','cinematic'].includes(id))) {
    const ratio=standSize?standSize.width/standSize.height:1.85;
    const variant=collection.variants[0];
    const illustration=(asset:typeof variant.back)=>`data:image/svg+xml,${encodeURIComponent(assetSvg(asset,palette,18))}`;
    const artwork=<div className={`banner-art collection-art collection-${id} ${standSize?'art-stand':''}`}
      role="img" aria-label={standSize?`Contoh stand banner ${theme.name}`:`Contoh banner ${theme.name}`}
      style={{...style,aspectRatio:ratio,'--stand-ratio':ratio} as CSSProperties}>
      <img className="collection-art-bg" src={illustration(variant.back)} alt=""/>
      <img className="collection-art-scene" src={illustration(id==='adventure'?'ridge':variant.motif)} alt=""/>
      <span className="art-kicker">{theme.kicker}</span>
      <b className="art-title">{theme.demo}</b>
      <div className="collection-art-people">{['raka','nadia','tiara'].map(name=><span key={name}><img src={`/demo/${name}.webp`} alt=""/></span>)}</div>
      <img className="collection-art-sticker" src={illustration(variant.stickers[0])} alt=""/>
    </div>;
    return standSize?<div className="stand-art-preview">{artwork}</div>:artwork;
  }
  if (standSize) {
    const ratio = standSize.width/standSize.height;
    return <div className="stand-art-preview"><div className={`banner-art art-${id} art-stand`} role="img" aria-label={`Contoh stand banner ${theme.name}`} style={{...style,aspectRatio:ratio,'--stand-ratio':ratio} as CSSProperties}>
      <div className="art-border"/>
      <span className="art-kicker">{theme.kicker}</span>
      <b className="art-title">{theme.demo}</b>
      <div className="stand-art-portraits">
        {['raka','nadia','tiara'].map(name => <div key={name} className="art-person"><img src={`/demo/${name}.webp`} alt="" draggable={false}/><span>{name}</span></div>)}
      </div>
      <span className="art-bottom">SELAMAT WISUDA · CLASS OF ’26</span>
    </div></div>;
  }
  if (id === 'newspaper') return <div className="banner-art art-newspaper" style={style} role="img" aria-label="Contoh banner The Final Chapter bergaya koran vintage">
    <div className="paper-frame">
      <div className="paper-top"><span>EDISI SPESIAL</span><b>✦</b><span>ANGKATAN ’26</span></div>
      <div className="paper-name">THE GRADUATION TIMES</div>
      <div className="paper-line"><span>VOL. 01 &nbsp; NO. 26</span><span>THE COMMENCEMENT EDITION</span><span>INDONESIA</span></div>
      <div className="paper-content">
        <div className="paper-editorial"><b>THE<br/>FINAL<br/>CHAPTER.</b><span>FROM DEADLINES<br/>TO DEGREES.</span></div>
        <div className="paper-photo"><img src="/graduates.webp" alt="" draggable={false}/><div className="paper-stamp"><span>CLASS<br/>OF ’26</span></div></div>
      </div>
      <div className="paper-footer"><span>★ &nbsp; WE FINALLY MADE IT!</span><span>THE BEST IS YET TO COME &nbsp; ★</span></div>
    </div>
  </div>;
  return <div className={`banner-art art-${id}`} style={style} role="img" aria-label={`Contoh banner ${theme.name}`}>
    <div className="art-border"/>
    <span className="art-kicker">{theme.kicker}</span>
    <b className="art-title">{theme.demo}</b>
    <div className="art-portraits">{['raka','nadia','tiara','faris'].map((name,index) => <div key={name} className={`art-person portrait-${index}`}><img src={`/demo/${name}.webp`} alt="" draggable={false}/><span>{name}</span></div>)}</div>
    <span className="art-star">✦</span><span className="art-star art-star-two">✷</span><span className="art-bottom">SELAMAT WISUDA &nbsp; · &nbsp; CLASS OF ’26</span>
  </div>;
}
