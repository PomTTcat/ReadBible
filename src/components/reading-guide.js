import { el, button, link, svg } from '../dom.js';

const referenceBooks = { genesis: {label:'创',code:'GEN'}, daniel: {label:'但',code:'DAN'} };
const referenceText = r => `${referenceBooks[r.bookId].label} ${r.chapter}:${r.verseStart}${r.verseStart === r.verseEnd ? '' : '–'+r.verseEnd}`;
const referenceLink = r => link(referenceText(r)+' · 阅读经文 ↗', `https://www.bible.com/bible/48/${referenceBooks[r.bookId].code}.${r.chapter}.${r.verseStart}${r.verseStart === r.verseEnd ? '' : '-'+r.verseEnd}`, 'text-link');

export function readingGuide(data, config) {
  const guide = data.readingGuidesById.get(config.guideId);
  const host = el('section','reading-guide');
  const heading = el('div','figure-heading');heading.append(el('h2','',guide.title),el('span','tag','阅读辅助'));
  host.append(heading);
  if (guide.nameTableIds) {
    const section = el('section','guide-names');
    section.append(el('h3','','四个人，两套名字'));
    const scroller=el('div','guide-table-scroll');
    const table=el('table','guide-name-table');
    const caption=el('caption','muted small','原名与巴比伦名字对应同一个人 · 但1:6–7');
    const head=el('thead'),row=el('tr');
    for(const text of ['原名','巴比伦名字']){const th=el('th','',text);th.scope='col';row.append(th);}
    head.append(row);const body=el('tbody');
    for(const id of guide.nameTableIds){
      const person=data.peopleById.get(id),tr=el('tr');
      const th=el('th','',person.name);th.scope='row';
      tr.append(th,el('td','',person.aliases[0]));body.append(tr);
    }
    table.append(caption,head,body);scroller.append(table);
    section.append(scroller,referenceLink(guide.nameTableReference));host.append(section);
  }
  if (!guide.hidePeoplePicker) {
  const people=el('section','guide-people');
  people.append(el('h3','','本章人物'));
  const badges=el('div','guide-person-buttons');
  const personInfo=el('div','guide-person-info muted small');personInfo.setAttribute('aria-live','polite');
  let selectedPerson=guide.personIds[0];
  function drawPeople(){
    badges.replaceChildren();
    for(const id of guide.personIds){
      const p=data.peopleById.get(id),name=guide.displayAliases&&p.aliases?.length?p.aliases[0]:p.name;
      const control=button(name,()=>{selectedPerson=id;drawPeople();badges.querySelector(`[data-guide-person="${id}"]`).focus({preventScroll:true});},'button guide-person');
      control.dataset.guidePerson=id;control.setAttribute('aria-pressed',String(id===selectedPerson));badges.append(control);
    }
    const p=data.peopleById.get(selectedPerson);
    personInfo.replaceChildren(el('strong','',p.name+(p.aliases?.length?' / '+p.aliases.join('、'):'')),el('p','',p.note));
  }
  people.append(badges,personInfo);host.append(people);drawPeople();
  }
  if (guide.portraits) host.append(personPortraits(data, guide));
  if(guide.facts?.length){
    const facts=el('div','guide-facts');
    for(const fact of guide.facts){
      const card=el('section','guide-fact');
      card.append(el('strong','',fact.label),el('p','',fact.text),referenceLink(fact.reference));facts.append(card);
    }
    host.append(facts);
  }
  if(guide.contrasts?.length){
    const grid=el('div','guide-contrasts');
    for(const item of guide.contrasts){
      const card=el('section','guide-contrast');
      card.append(el('h3','',item.title),el('p','',item.text),referenceLink(item.reference));grid.append(card);
    }
    host.append(grid);
  }
  if(guide.dreams) host.append(dreamComparison(guide.dreams));
  if(guide.parallels) {
    const section=el('section','guide-parallels');
    section.append(el('h3','',guide.parallels.title));
    const scroller=el('div','guide-table-scroll'),table=el('table','guide-name-table guide-parallel-table');
    const head=el('thead'),header=el('tr');
    for(const text of ['观察点',...guide.parallels.columns]) {const th=el('th','',text);th.scope='col';header.append(th);}
    head.append(header);const body=el('tbody');
    for(const row of guide.parallels.rows){
      const tr=el('tr'),label=el('th','',row.label);label.scope='row';tr.append(label);
      for(const cell of row.cells){const td=el('td');td.append(el('p','',cell.text),referenceLink(cell.reference));tr.append(td);}
      body.append(tr);
    }
    table.append(head,body);scroller.append(table);section.append(scroller);host.append(section);
  }
  if(guide.routeStops){
    const route=el('section','guide-route');
    route.append(el('h3','','地点顺序'));
    const stops=el('ol');guide.routeStops.forEach(name=>stops.append(el('li','',name)));
    route.append(stops,el('p','muted small','仅表示叙事中的地点顺序，不是实际道路或距离；不指定埃及城邑。'),referenceLink(guide.routeReference));
    host.append(route);
  }
  if(guide.statue) host.append(statueGuide(guide.statue));
  const sequence=el('section','guide-sequence');sequence.append(el('h3','','按顺序读这一章'));
  const stops=el('div','guide-stops');
  const stageInfo=el('div','guide-stage-info');stageInfo.setAttribute('aria-live','polite');
  const actions=el('div','guide-step-actions');
  let index=0;
  const previous=button('← 上一段',()=>change(index-1)),next=button('下一段 →',()=>change(index+1));
  const count=el('span','muted small');
  actions.append(previous,count,next);
  const controls=guide.stages.map((step,i)=>{
    const b=button(String(i+1).padStart(2,'0')+' '+step.title,()=>change(i),'button guide-stop');
    stops.append(b);return b;
  });
  function change(value){
    index=Math.max(0,Math.min(guide.stages.length-1,value));
    const step=guide.stages[index];
    stageInfo.replaceChildren(el('span','eyebrow','阅读节点 '+String(index+1).padStart(2,'0')),el('h3','',step.title),el('p','',step.summary));
    if(step.period)stageInfo.append(el('span','tag',step.period));
    stageInfo.append(referenceLink(step.reference));
    controls.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    previous.disabled=index===0;next.disabled=index===guide.stages.length-1;
    count.textContent=(index+1)+' / '+guide.stages.length;
  }
  sequence.append(stops,stageInfo,actions);host.append(sequence);change(0);
  const questions=el('section','guide-questions');questions.append(el('h3','','带着问题读'));
  for(const question of guide.questions){
    const details=el('details');details.append(el('summary','',question.prompt),el('p','',question.observation),referenceLink(question.reference));questions.append(details);
  }
  host.append(questions);
  if(guide.crossChapterLinks?.length){
    const section=el('section','guide-cross-chapters');section.append(el('h3','','跨章观察：物件与辨认'));
    const cards=el('div','guide-cross-grid');
    for(const item of guide.crossChapterLinks){
      const card=el('article');card.append(link(item.title,item.href,'text-link'),el('p','muted small',item.summary));cards.append(card);
    }
    section.append(el('p','muted small','留意人物凭什么作判断；以下是可对照阅读的线索。'),cards);host.append(section);
  }
  return host;
}

function statueGuide(config){
  const host=el('section','statue-guide');host.append(el('h3','','梦中的大像：逐层查看'),el('p','muted small',config.note));
  const layout=el('div','statue-guide-layout');
  const canvas=el('div','statue-guide-canvas');
  const drawing=svg('svg',{viewBox:'0 0 340 590',role:'img'});
  canvas.append(drawing);
  const sidebar=el('div','statue-guide-sidebar'),tabs=el('div','statue-guide-tabs');
  tabs.setAttribute('role','group');tabs.setAttribute('aria-label','选择大像材料');
  const info=el('div','statue-guide-info');info.setAttribute('aria-live','polite');
  let index=0;
  const buttons=config.parts.map((part,i)=>{
    const control=button(part.label,()=>{index=i;render();},'button');
    tabs.append(control);return control;
  });
  sidebar.append(tabs,info);layout.append(canvas,sidebar);host.append(layout);
  const boundary=el('details','guide-interpretation');
  boundary.append(el('summary','','经文与解释的边界'),el('p','',config.interpretationNote));host.append(boundary);
  function render(){
    const selected=config.parts[index],stone=selected.id==='stone';
    drawing.setAttribute('aria-label',stone?'石头击脚、全像粉碎、成为大山的象征示意':'大像材料分层示意，当前选择：'+selected.label);
    drawing.replaceChildren(svg('title',{},selected.label+' · 示意图，非实际比例'));
    const defs=svg('defs');
    const mixture=svg('pattern',{id:'daniel-mixed-material',width:14,height:14,patternUnits:'userSpaceOnUse'});
    mixture.append(svg('rect',{width:14,height:14,fill:'#bba38d'}),svg('path',{d:'M0 0 H7 V7 H0 Z M7 7 H14 V14 H7 Z',fill:'#73828a'}));
    defs.append(mixture);drawing.append(defs);
    if(stone){
      drawing.append(svg('path',{d:'M 20 555 L 155 315 L 320 555 Z',fill:'#c7d2bb',stroke:'#708663','stroke-width':2}));
      drawing.append(svg('text',{x:170,y:577,'text-anchor':'middle',class:'statue-label'},'石头成为大山 · 但2:35'));
    }
    const shapes=[
      [{tag:'ellipse',cx:165,cy:72,rx:37,ry:45}],
      [{tag:'path',d:'M 118 124 L 212 124 L 235 235 L 209 243 L 192 169 L 190 242 L 140 242 L 138 169 L 120 243 L 95 235 Z'}],
      [{tag:'path',d:'M 140 247 L 190 247 L 199 324 L 131 324 Z'}],
      [{tag:'path',d:'M 132 330 L 162 330 L 158 452 L 128 452 Z M 168 330 L 198 330 L 202 452 L 172 452 Z'}],
      [{tag:'path',d:'M 127 459 L 158 459 L 158 493 L 107 493 L 107 478 Z M 172 459 L 203 459 L 224 478 L 224 493 L 172 493 Z'}]
    ];
    const colors=['#d4ad49','#c7d1d7','#b98254','#73828a','#bba38d'];
    shapes.forEach((parts,i)=>{
      const group=svg('g',{opacity:stone?0.2:1,'data-material':config.parts[i].id});
      for(const part of parts){
        const {tag,...attrs}=part;
        group.append(svg(tag,{...attrs,fill:i===4?'url(#daniel-mixed-material)':colors[i],stroke:i===index?'#224e42':'#fff','stroke-width':i===index?4:2}));
      }
      drawing.append(group);
    });
    const positions=[72,196,285,385,485];
    config.parts.slice(0,5).forEach((part,i)=>drawing.append(svg('text',{x:245,y:positions[i],class:'statue-label',opacity:stone?0.35:1},part.material)));
    if(!stone){
      drawing.append(svg('text',{x:170,y:545,'text-anchor':'middle',class:'statue-label'},'点击右侧或下方材料按钮'));
    }else{
      drawing.append(svg('path',{d:'M 40 462 L 54 440 L 82 443 L 95 466 L 76 487 L 48 484 Z',fill:'#8d9991',stroke:'#4a5b52','stroke-width':2}));
      drawing.append(svg('path',{d:'M 95 467 L 123 476',fill:'none',stroke:'#4a5b52','stroke-width':3,'stroke-dasharray':'4 3'}));
    }
    info.replaceChildren(el('h4','',selected.label));
    for(const [label,text,reference] of [['梦中的描述',selected.dream,selected.dreamReference],['本章给出的解释',selected.explanation,selected.explanationReference]]){
      const block=el('section','statue-reading-block');
      block.append(el('span','eyebrow',label),el('p','',text),referenceLink(reference));info.append(block);
    }
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  }
  render();return host;
}

function dreamComparison(dreams){
  const host=el('section','dream-comparison');
  host.append(el('h3','','两个梦，并排看'));
  const grid=el('div','dream-comparison-grid');
  for(const dream of dreams){
    const card=el('article','dream-card');
    const drawing=svg('svg',{viewBox:'0 0 300 210',role:'img','aria-label':dream.title+'，象征示意'});
    drawing.append(svg('title',{},dream.title+'；示意，不确定具体人物外形'));
    if(dream.kind==='sheaves'){
      function sheaf(x,y,angle,color){
        const g=svg('g',{transform:`translate(${x} ${y}) rotate(${angle})`,stroke:color,'stroke-width':2.5,fill:color});
        for(const offset of [-10,0,10]){
          g.append(svg('path',{d:`M0 55 Q${offset} 30 ${offset} 0`,fill:'none'}));
          g.append(svg('ellipse',{cx:offset,cy:3,rx:4,ry:11,stroke:'none'}));
        }
        g.append(svg('path',{d:'M-13 34 Q0 28 13 34',fill:'none'}));drawing.append(g);
      }
      sheaf(150,65,0,'#ac7b28');
      for(const [x,y,angle] of [[48,115,40],[80,145,55],[220,145,-55],[252,115,-40]])sheaf(x,y,angle,'#c4b28d');
      drawing.append(svg('text',{x:150,y:190,'text-anchor':'middle',class:'dream-label'},'周围的禾捆向站立的禾捆下拜'));
    }else{
      drawing.append(svg('circle',{cx:55,cy:42,r:19,fill:'#d7ad4c'}));
      drawing.append(svg('path',{d:'M246 21 A21 21 0 1 0 246 63 A16 20 0 0 1 246 21',fill:'#abbcc7'}));
      for(let i=0;i<11;i++){
        const angle=Math.PI+(i/10)*Math.PI,x=150+Math.cos(angle)*110,y=150+Math.sin(angle)*55;
        const points=Array.from({length:10},(_,j)=>{const a=-Math.PI/2+j*Math.PI/5,r=j%2?3:7;return (x+Math.cos(a)*r)+','+(y+Math.sin(a)*r);}).join(' ');
        drawing.append(svg('polygon',{points,fill:'#b78c3b'}));
      }
      drawing.append(svg('circle',{cx:150,cy:128,r:11,fill:'#658678'}),svg('path',{d:'M150 140 V164 M134 148 H166',fill:'none',stroke:'#658678','stroke-width':3}));
      drawing.append(svg('text',{x:150,y:190,'text-anchor':'middle',class:'dream-label'},'日、月、十一颗星 → 约瑟'));
    }
    card.append(drawing,el('h4','',dream.title),el('p','',dream.summary),referenceLink(dream.reference));grid.append(card);
  }
  host.append(grid);return host;
}

function personPortraits(data, guide){
  const host=el('section','person-portraits');
  host.append(el('h3','','十二子：各人的特点与父亲的话'),el('p','muted small',guide.portraitIntro));
  const search=el('input');search.type='search';search.placeholder='搜索名字、比喻或关键词';
  search.setAttribute('aria-label','搜索十二子特点');
  const count=el('p','muted small');count.setAttribute('aria-live','polite');
  const grid=el('div','portrait-grid');
  function render(){
    const query=search.value.trim().toLowerCase();
    const matches=guide.portraits.filter(p=>[data.peopleById.get(p.personId).name,...p.keywords,p.imagery,p.summary,p.message].join(' ').toLowerCase().includes(query));
    count.textContent='显示 '+matches.length+' / '+guide.portraits.length+' 人 · 按经文次序';
    grid.replaceChildren();
    if(!matches.length)grid.append(el('p','muted','没有找到匹配的人物或意象。'));
    for(const portrait of matches){
      const person=data.peopleById.get(portrait.personId);
      const card=el('article','portrait-card');card.dataset.portrait=person.id;
      const heading=el('div','portrait-heading');heading.append(el('span','eyebrow',String(portrait.order).padStart(2,'0')),el('h4','',person.name));
      const keywords=el('div','portrait-keywords');portrait.keywords.forEach(word=>keywords.append(el('span','tag',word)));
      card.append(heading,keywords,el('p','portrait-summary',portrait.summary));
      const content=el('dl');
      for(const [title,text] of [['经文意象',portrait.imagery],['父亲的话',portrait.message]]){
        content.append(el('dt','',title),el('dd','',text));
      }
      card.append(content,referenceLink(portrait.reference));
      const note=el('details');note.append(el('summary','','阅读提醒'),el('p','muted small',portrait.note));card.append(note);
      grid.append(card);
    }
  }
  search.addEventListener('input',render);host.append(search,count,grid);render();return host;
}
