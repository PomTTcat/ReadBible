import { el, button, link } from '../dom.js';

export function mapLibrary(data, focusId) {
  const host=el('section','map-library');
  const filters=el('div','map-library-filters');
  const search=el('input'); search.type='search';search.placeholder='搜索地图、地区或时期';
  search.setAttribute('aria-label','搜索地图资料');
  const language=el('select');language.setAttribute('aria-label','地图语言');
  for(const label of ['全部语言','中文','英文']) {
    const option=el('option','',label);option.value=label;language.append(option);
  }
  filters.append(search,language);
  const count=el('p','muted small');count.setAttribute('aria-live','polite');
  const cards=el('div','map-library-grid');
  const dialog=el('dialog','map-original-dialog');
  const title=el('h2');title.id='map-original-title';
  dialog.setAttribute('aria-labelledby',title.id);
  const toolbar=el('div','map-original-toolbar');
  const stage=el('div','map-original-stage');stage.tabIndex=0;
  stage.setAttribute('aria-label','地图原图，可滚动查看');
  const image=el('img');stage.append(image);
  let zoom=100,baseWidth=800;
  const scale=el('span','small');scale.setAttribute('aria-live','polite');
  const minus=button('−',()=>setZoom(zoom-25),'arrow-button');minus.setAttribute('aria-label','缩小地图');
  const plus=button('＋',()=>setZoom(zoom+25),'arrow-button');plus.setAttribute('aria-label','放大地图');
  toolbar.append(title,minus,scale,plus,button('适应宽度',()=>setZoom(100)),button('关闭',()=>dialog.close()));
  const credit=el('div','map-original-attribution');
  dialog.append(toolbar,stage,credit);
  function setZoom(value) {
    zoom=Math.max(50,Math.min(400,value));image.style.width=baseWidth*zoom/100+'px';
    scale.textContent=zoom+'%';minus.disabled=zoom===50;plus.disabled=zoom===400;
  }
  function open(record) {
    title.textContent=record.title;image.alt=record.title;
    image.src=new URL('../../'+record.originalPath,import.meta.url).href;
    credit.replaceChildren(el('p','muted small',record.creator),link('来源 ↗',record.sourceUrl,'text-link'),link(record.license,record.licenseUrl,'text-link'));
    dialog.showModal();baseWidth=Math.max(200,stage.clientWidth-24);setZoom(100);
    stage.scrollTop=0;stage.scrollLeft=0;
  }
  function render() {
    const query=search.value.trim().toLowerCase();
    const records=data.mapLibrary.filter(record=>[record.title,record.period,record.description].join(' ').toLowerCase().includes(query)&&(language.value==='全部语言'||record.language===language.value));
    count.textContent='共 '+records.length+' 张地图';
    cards.replaceChildren();
    if(!records.length)cards.append(el('p','muted','没有找到匹配的地图。'));
    for(const record of records) {
      const card=el('article','map-resource-card');
      card.id='map-'+record.id;
      if(record.originalPath) {
        const preview=button('',()=>open(record),'map-resource-preview');
        preview.setAttribute('aria-label','放大查看：'+record.title);
        const img=el('img');img.src=new URL('../../'+record.originalPath,import.meta.url).href;
        img.alt=record.title;img.loading='lazy';preview.append(img);
        card.append(preview);
      }
      const info=el('div','map-resource-info');
      const tags=el('div','map-resource-tags');tags.append(el('span','tag',record.language),el('span','tag',record.period));
      info.append(tags,el('h2','',record.title),el('p','',record.description),el('p','muted small',record.scopeNote));
      const actions=el('div','map-resource-actions');
      const original=link('在原网站查看地图 ↗',record.originalUrl,'text-link');
      original.target='_blank';original.rel='noopener noreferrer';
      if(record.originalPath)actions.append(button('放大查看',()=>open(record)));
      actions.append(original);
      info.append(actions,el('p','muted small','高清原图：'+record.originalSize));
      const credit=el('div','creation-credit');
      credit.append(el('span','muted small','署名：'+record.creator),link('来源 ↗',record.sourceUrl,'text-link'),link(record.license,record.licenseUrl,'text-link'),el('p','muted small',record.licenseNote));
      info.append(credit);
      if(record.chapters.length) {
        const related=el('div','map-related-chapters');
        related.append(el('span','muted small','相关章节'));
        for(const chapter of record.chapters) {
          const book=data.catalog.find(b=>b.id===chapter.bookId);
          related.append(link(book.name+' '+chapter.number+'章',`#/book/${book.id}/${chapter.number}`,'text-link'));
        }
        info.append(related);
      }
      card.append(info);cards.append(card);
    }
  }
  search.addEventListener('input',render);language.addEventListener('change',render);
  host.append(filters,count,cards,dialog);render();
  if(data.mapLibrary.some(r=>r.id===focusId))requestAnimationFrame(()=>host.querySelector('#map-'+focusId)?.scrollIntoView({block:'start'}));
  return host;
}
