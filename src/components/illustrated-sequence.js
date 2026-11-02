import {el,link} from '../dom.js';

export function illustratedSequence(data,config){
  const sequence=data.sequencesById.get(config.sequenceId);
  const host=el('section','illustrated-sequence');
  const title=el('div','figure-heading');
  title.append(el('h2','',config.title),el('span','tag','创 1:3–2:3'));
  const grid=el('div','creation-grid');
  for(const step of sequence.steps){
    const asset=data.assetsById.get(step.assetId);
    const card=el('article','creation-day');
    const art=el('figure','creation-art');
    const image=el('img');image.src=new URL(`../../${asset.path}`,import.meta.url).href;image.alt=asset.alt;image.loading=step.number<3?'eager':'lazy';image.width=960;image.height=960;
    art.append(image);
    const info=el('div','creation-info');
    const day=el('div','creation-day-label');day.append(el('span','eyebrow',`DAY ${String(step.number).padStart(2,'0')}`));
    if(step.context)day.append(el('span','tag',step.context));
    const ref=step.reference;
    const href=`https://www.bible.com/bible/48/GEN.${ref.chapter}.${ref.verseStart}-${ref.verseEnd}`;
    info.append(day,el('h3','',`第${step.number}日 · ${step.title}`),el('p','',step.summary),link(step.referenceLabel+' · 阅读经文 ↗',href,'text-link'));
    const credit=el('div','creation-credit');credit.append(link('图片来源 · Commons',asset.sourceUrl,'text-link'),el('span','muted small',`${asset.creator} · ${asset.license}`));
    info.append(credit);card.append(art,info);grid.append(card);
  }
  host.append(title,el('p','muted small',sequence.note),grid);
  return host;
}
