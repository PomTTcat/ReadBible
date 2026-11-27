import {el,button,link,svg} from '../dom.js';
const refText=r=>`出 ${r.chapter}:${r.verseStart}${r.verseStart===r.verseEnd?'':'–'+r.verseEnd}`;
const refLink=r=>link(refText(r)+' · 阅读经文 ↗',`https://www.bible.com/bible/48/EXO.${r.chapter}.${r.verseStart}${r.verseStart===r.verseEnd?'':'-'+r.verseEnd}`,'text-link');

export function topicIndex(data){
  const grid=el('div','book-grid');
  for(const topic of data.topics){const card=link('','#/topics/'+topic.id,'book-card');card.append(el('span','eyebrow',topic.scope),el('h2','',topic.title),el('p','muted',topic.subtitle));grid.append(card);}
  return grid;
}
export function topicView(data,topic,sectionId){
  const host=el('div','topic-view');
  host.append(el('p','muted',topic.intro));
  const nav=el('nav','topic-nav');nav.setAttribute('aria-label','选择主题分组');
  const section=topic.sections.find(s=>s.id===sectionId)||topic.sections[0];
  for(const s of topic.sections){const a=link(s.title,`#/topics/${topic.id}?section=${s.id}`,'button');if(s===section)a.setAttribute('aria-current','page');nav.append(a);}
  host.append(nav,el('h2','',section.title),el('p','muted',section.description));
  const choices=el('div','topic-choices'),body=el('section','topic-detail');body.setAttribute('aria-live','polite');
  const controls=section.blocks.map((b,i)=>{const control=button(b.title,()=>render(i),'button');choices.append(control);return control;});
  function render(index){
    const item=section.blocks[index];controls.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    body.replaceChildren(el('h3','',item.title),el('p','',item.summary),refLink(item.reference));
    const visuals=el('div','topic-visuals');const diagram=el('div','topic-diagram');diagram.append(el('span','eyebrow','结构示意 · 非施工图'),topicDiagram(item.diagram));visuals.append(diagram);
    visuals.append(referencePhoto(data.assetsById.get(item.assetId||section.assetId)));body.append(visuals);
    const list=el('ul','topic-facts');for(const text of item.details)list.append(el('li','',text));body.append(list);
    if(item.note)body.append(el('p','muted small',item.note));
  }
  host.append(choices,body);render(0);
  const related=el('section','topic-related');related.append(el('h2','','关联主题资料'));
  for(const item of topic.related)related.append(link(item.title+' →',item.href,'text-link'),el('p','muted small',item.summary));
  const sources=el('section','chapter-sources');sources.append(el('h2','','阅读说明与来源'));
  topic.notes.forEach(note=>sources.append(el('p','muted small',note)));
  for(const n of [26,27,28])sources.append(link('Bible.com · 出埃及记'+n+'章 ↗','https://www.bible.com/bible/48/EXO.'+n,'text-link'));
  for(const source of topic.sources)sources.append(link(source.title+' ↗',source.url,'text-link'));
  sources.append(el('p','muted small','经文核对：和合本与World English Bible；图片署名与许可见每张图片下方。'));
  sources.append(el('p','muted small','已做原型 · '+topic.processing.review));
  host.append(related,sources);return host;
}
function referencePhoto(asset){
  const figure=el('figure','topic-photo');figure.append(el('span','eyebrow','网图参考 · 现代模型'));
  const image=el('img');image.src=asset.remoteUrl;image.alt=asset.alt;image.loading='lazy';
  const open=link('',asset.remoteUrl);open.target='_blank';open.rel='noopener noreferrer';open.setAttribute('aria-label','查看'+asset.title+'大图');open.append(image);
  const failure=el('p','muted small','图片暂时无法加载，可通过下方来源链接查看。');failure.hidden=true;
  image.addEventListener('error',()=>{open.hidden=true;failure.hidden=false;});
  const caption=el('figcaption');caption.append(el('strong','',asset.title),el('p','muted small',asset.creator+' · '+asset.changes),link('来源 ↗',asset.sourceUrl,'text-link'),link(asset.license,asset.licenseUrl,'text-link'));
  figure.append(open,failure,caption);return figure;
}
function topicDiagram(kind){
  const drawing=svg('svg',{viewBox:'0 0 560 400',role:'img','aria-label':({layers:'帐幕四层覆盖示意',frame:'竖板银座与闩的局部示意',interior:'圣所与至圣所相对位置示意',altar:'铜坛结构与肘数示意',court:'院子与东门位置示意',priest:'亚伦式祭司服饰位置示意',breastplate:'胸牌四行十二块石示意'})[kind]});
  const rect=(x,y,w,h,fill='#eee0b8',stroke='#997334')=>drawing.append(svg('rect',{x,y,width:w,height:h,fill,stroke,'stroke-width':2,rx:3}));
  const text=(x,y,value,size=16)=>drawing.append(svg('text',{x,y,'text-anchor':'middle',fill:'#344f45','font-size':size},value));
  const path=(d,color='#997334',width=4)=>drawing.append(svg('path',{d,stroke:color,'stroke-width':width,fill:'none','stroke-linejoin':'round'}));
  if(kind==='layers'){
    const layers=[['最外层皮盖 · 动物译名有分歧','#b6a592'],['染红公羊皮盖','#b67464'],['山羊毛罩棚 · 十一幅','#b8afa2'],['细麻彩线内幔 · 十幅，绣基路伯','#bdb0ce']];
    layers.forEach(([label,color],i)=>{rect(65+i*13,45+i*77,430-i*26,53,color);text(280,78+i*77,label);});
    text(280,380,'分层展开示意；间距与颜色并非制作规定',14);
  }else if(kind==='frame'){
    for(let i=0;i<6;i++){rect(75+i*66,70,60,225);rect(77+i*66,301,23,23,'#c9d0d0');rect(108+i*66,301,23,23,'#c9d0d0');}
    for(const y of [110,155,200,245,280])path(`M70 ${y} H478`);
    text(280,40,'局部：竖板包金 · 每块两榫、两银座');text(280,360,'板高10肘，宽1.5肘；每面五闩',17);
  }else if(kind==='interior'){
    rect(45,90,465,235,'#faf8f0');path('M215 90 V325','#a788b4',7);
    rect(85,177,83,46);text(126,205,'约柜');text(126,135,'至圣所');text(360,220,'圣所');
    rect(325,113,110,40);text(380,139,'桌子 · 北');rect(325,263,110,40);text(380,289,'灯台 · 南');
    text(215,65,'内幔');text(505,65,'门帘');text(36,355,'西');text(520,355,'东');text(280,382,'位置示意，不按比例；图上方为北',14);
  }else if(kind==='court'){
    rect(45,72,465,235,'#f3ead6');rect(70,143,150,95,'#d5c7ac');text(145,196,'帐幕位置');
    path('M510 143 V237','#b18bad',10);text(450,195,'东门');text(280,52,'院长100肘');text(465,339,'院宽50肘');text(280,376,'院帷高5肘；东门20肘 · 非精确定位图',15);
    for(let i=0;i<20;i++){rect(52+i*23,66,4,9,'#997334');rect(52+i*23,304,4,9,'#997334');}
  }else if(kind==='altar'){
    rect(130,120,300,180,'#c7946c','#8d5d3f');path('M130 120 V95 H150 V120 M410 120 V95 H430 V120','#8d5d3f',5);
    rect(158,205,244,62,'#d5ad8d','#8d5d3f');for(let i=0;i<9;i++)path(`M${160+i*27} 207 V265`,'#8d5d3f',1);
    for(const y of [220,235,250])path(`M158 ${y} H402`,'#8d5d3f',1);
    path('M70 278 H490','#8d5d3f',8);text(280,65,'木胎包铜 · 中空 · 四角有角');text(280,340,'长5肘 × 宽5肘 × 高3肘');text(280,375,'正面简图，仅显示前侧两角',14);
  }else if(kind==='breastplate'){
    rect(138,45,285,285,'#cbb78e');for(let row=0;row<4;row++)for(let col=0;col<3;col++){rect(165+col*80,63+row*65,64,49,['#b8796a','#8ca58d','#9da7bd'][col]);text(197+col*80,94+row*65,String(row*3+col+1));}
    text(280,365,'四行 × 每行三块；数字仅计数',16);text(280,390,'不补造石头与支派的逐一配对',14);
  }else{
    rect(230,46,100,40,'#f1eddd');rect(237,61,86,16);text(280,38,'冠冕与金牌',15);
    path('M245 97 L192 122 L168 218 L205 231 L225 174 L206 331 L354 331 L335 174 L355 231 L392 218 L368 122 L315 97 Z','#577999',6);
    rect(224,117,112,128,'#ccb78a');rect(247,143,66,78,'#c5b081');
    for(let row=0;row<4;row++)for(let col=0;col<3;col++)rect(251+col*20,148+row*17,15,12,['#b8796a','#8ca58d','#9da7bd'][col]);
    rect(220,242,120,16,'#c8a35d');text(280,286,'蓝袍');text(413,154,'以弗得',15);text(423,191,'胸牌',15);path('M337 152 H375');path('M316 184 H390');
    for(let i=0;i<10;i++)drawing.append(svg('circle',{cx:215+i*14.5,cy:333,r:5,fill:i%2?'#b37e76':'#c59b43'}));
    text(280,376,'亚伦服饰位置示意；非所有祭司的统一服装',14);
  }
  return drawing;
}
