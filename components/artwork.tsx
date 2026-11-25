import type { CSSProperties } from 'react';
import { getTheme } from '@/lib/themes';
import type { ThemeId } from '@/lib/types';

export function BannerArt({ id }: { id: ThemeId }) {
  const theme = getTheme(id);
  const palette = theme.palettes[0];
  const style = {'--art-bg':palette.bg,'--art-ink':palette.ink,'--art-accent':palette.accent,'--art-soft':palette.soft} as CSSProperties;
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
