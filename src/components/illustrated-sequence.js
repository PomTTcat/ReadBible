import {el,link,button} from '../dom.js';

export function illustratedSequence(data,config){
  const sequence=data.sequencesById.get(config.sequenceId);
  const variants=sequence.variants||[];
  let selected=sequence.defaultVariant||variants[0]?.id;
  const host=el('section','illustrated-sequence');
  if(sequence.stepType==='scene')host.classList.add('scene-sequence');
  const title=el('div','figure-heading');
  title.append(el('h2','',config.title),el('span','tag',sequence.referenceLabel||'创 1:3–2:3'));
  const grid=el('div','creation-grid');
  const controls=el('div','image-version-controls');
  controls.setAttribute('role','group');controls.setAttribute('aria-label','配图版本');
  const buttons=variants.map(variant=>{
    const control=button(variant.label,()=>{selected=variant.id;render();},'button version-button');
    control.dataset.version=variant.id;controls.append(control);return control;
  });
  const status=el('span','muted small');status.setAttribute('aria-live','polite');controls.append(status);
  function render(){
    grid.replaceChildren();
    const variant=variants.find(v=>v.id===selected);
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.version===selected)));
    status.textContent=variant?.description||'';
    for(const step of sequence.steps){
      const assetIds=variant?.assetsByStep[step.id]||step.assetIds||[step.assetId];
      const assets=assetIds.map(id=>data.assetsById.get(id));
      const card=el('article','creation-day');
      const art=el('figure','creation-art');
      if(assets.length>1)art.classList.add('multiple-images');
      for(const asset of assets){
        const image=el('img');image.src=new URL(`../../${asset.path}`,import.meta.url).href;image.alt=asset.alt;image.loading=step.number<3?'eager':'lazy';
        art.append(image);
      }
      const info=el('div','creation-info');
      const day=el('div','creation-day-label');day.append(el('span','eyebrow',`${sequence.stepType==='scene'?'SCENE':'DAY'} ${String(step.number).padStart(2,'0')}`));
      if(step.context)day.append(el('span','tag',step.context));
      const ref=step.reference;
      const href=`https://www.bible.com/bible/48/GEN.${ref.chapter}.${ref.verseStart}-${ref.verseEnd}`;
      info.append(day,el('h3','',sequence.stepType==='scene'?step.title:`第${step.number}日 · ${step.title}`),el('p','',step.summary),link(step.referenceLabel+' · 阅读经文 ↗',href,'text-link'));
      const asset=assets[0];
      const credit=el('div','creation-credit');
      credit.append(link(asset.sourceUrl.includes('freebibleimages.org')?'图片来源 · Sweet Publishing / FreeBibleimages':'图片来源 · Commons',asset.sourceUrl,'text-link'),el('span','muted small',asset.creator),link(asset.license,asset.licenseUrl,'text-link'));
      info.append(credit);card.append(art,info);grid.append(card);
    }
  }
  host.append(title,el('p','muted small',sequence.note),grid);
  // Keep the selector immediately before the chapter outline, as requested.
  if(variants.length)host.versionControls=controls;
  render();
  return host;
}
