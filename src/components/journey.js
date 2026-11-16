import { el, button, link, svg } from '../dom.js';

export function journey(data, config) {
  const story = data.journeysById.get(config.journeyId);
  const host = el('section', 'journey-view');
  const heading = el('div', 'figure-heading');
  heading.append(el('h2', '', story.title), el('span', 'tag', '地图 · 事件时间轴'));
  const companions = el('div', 'journey-companions');
  companions.append(el('span', 'muted small', '同行人物'));
  for (const id of story.personIds) {
    const person = data.peopleById.get(id);
    companions.append(link(person.name, `#/people?focus=${id}&from=${encodeURIComponent(location.hash)}`, 'button'));
  }
  const layout = el('div', 'journey-layout');
  const mapPanel = el('div', 'journey-map-panel');
  const map = svg('svg', {viewBox:'0 0 620 450',role:'img'});
  const mapCaption = el('p', 'muted small');
  mapPanel.append(map,mapCaption);
  const info = el('div', 'journey-info');
  info.setAttribute('aria-live', 'polite');
  layout.append(mapPanel, info);
  const timeline = el('div', 'timeline');
  const row = el('div', 'timeline-row');
  let index = 0;
  const previous = button('←',()=>change(index-1),'arrow-button');
  previous.setAttribute('aria-label','上一个事件');
  const next = button('→',()=>change(index+1),'arrow-button');
  next.setAttribute('aria-label','下一个事件');
  const slider = el('input');
  slider.type='range'; slider.min=0; slider.max=story.steps.length-1; slider.step=1;
  slider.setAttribute('aria-label','旅程事件时间轴');
  slider.addEventListener('input',()=>change(Number(slider.value)));
  const count = el('span','timeline-count');
  row.append(previous,slider,next,count);
  const stops = el('div','journey-stops');
  const buttons = story.steps.map((step,i)=>{
    const control=button(step.label,()=>change(i),'timeline-stop');
    stops.append(control);return control;
  });
  timeline.append(row,stops);
  host.append(heading,companions,layout,timeline,el('p','muted small map-note',story.note));
  function change(value) {
    index=Math.max(0,Math.min(story.steps.length-1,value));
    render();
  }
  function drawMap(step) {
    const base=data.journeyMapsById.get(step.local ? 'canaan-closeup' : 'near-east');
    const [west,south,east,north]=base.bounds;
    const x=lon=>30+(lon-west)/(east-west)*560;
    const y=lat=>25+(north-lat)/(north-south)*390;
    const point=id=>data.placesById.get(id).coordinates;
    const path=points=>points.map(([lon,lat],i)=>`${i?'L':'M'}${x(lon)} ${y(lat)}`).join(' ');
    map.setAttribute('aria-label',`${base.title}，当前事件：${step.label}。行程连线为示意。`);
    map.replaceChildren(svg('title',{},`${base.title} · ${step.label}`));
    map.append(svg('rect',{width:620,height:450,fill:'#f3f0e6'}));
    map.append(svg('path',{d:path(base.sea)+' Z',fill:'#dcebf0'}));
    for (const label of base.labels) map.append(svg('text',{x:x(label.coordinates[0]),y:y(label.coordinates[1]),class:'journey-region-label'},label.name));
    for (const water of base.waters||[]) {
      map.append(svg('ellipse',{cx:x(water.coordinates[0]),cy:y(water.coordinates[1]),rx:6,ry:water.name==='死海'?24:10,fill:'#8eb8c7'}));
      map.append(svg('text',{x:x(water.coordinates[0])+12,y:y(water.coordinates[1])+5,class:'journey-water-label'},water.name));
    }
    const visible = id => {
      const [lon,lat]=point(id); return lon>=west&&lon<=east&&lat>=south&&lat<=north;
    };
    // Clip long overview segments at the edges when showing the Canaan closeup.
    if(step.visitedPlaceIds.length>1) map.append(svg('path',{d:path(step.visitedPlaceIds.map(point)),class:'journey-route'}));
    const last=step.visitedPlaceIds.at(-1);
    if(last&&step.destinationId) map.append(svg('path',{d:path([point(last),point(step.destinationId)]),class:'journey-destination'}));
    const ids=new Set([...(step.local ? base.placeIds : story.overviewPlaceIds),step.placeId,step.destinationId].filter(Boolean));
    for (const id of ids) {
      if (!visible(id)) continue;
      const place=data.placesById.get(id);
      const [lon,lat]=point(id),cx=x(lon),cy=y(lat);
      const active=id===step.placeId;
      if(active) map.append(svg('circle',{cx,cy,r:19,class:'focus-halo'}));
      if(place.kind==='region') map.append(svg('ellipse',{cx,cy,rx:25,ry:17,fill:'#b3894d25',stroke:'#a58355','stroke-dasharray':'4 3'}));
      else map.append(svg('circle',{cx,cy,r:5,fill:active?'#92642d':'#405f55'}));
      const label=base.placeLabels?.[id]||place.name;
      map.append(svg('text',{x:cx+12,y:cy-12,class:'journey-place-label'},label));
    }
    map.append(svg('text',{x:565,y:27,class:'journey-place-label'},'北 ↑'));
    mapCaption.textContent=base.title+' · ● 地点　浅色虚线区域为区域标记；连线仅表示行程关系';
  }
  function render() {
    const step=story.steps[index],ref=step.reference;
    drawMap(step);
    info.replaceChildren(el('span','eyebrow',`事件 ${String(index+1).padStart(2,'0')}`),el('h3','',step.label),el('p','',step.summary));
    info.append(link(`创 ${ref.chapter}:${ref.verseStart}${ref.verseEnd===ref.verseStart?'':'–'+ref.verseEnd} · 阅读经文 ↗`,`https://www.bible.com/bible/48/GEN.${ref.chapter}.${ref.verseStart}${ref.verseStart===ref.verseEnd?'':'-'+ref.verseEnd}`,'text-link'));
    const asset=data.assetsById.get(step.assetId);
    const art=el('figure','journey-art');
    const image=el('img');image.src=new URL(`../../${asset.path}`,import.meta.url).href;image.alt=asset.alt;
    art.append(image);
    const credit=el('figcaption','creation-credit');
    credit.append(el('span','muted small',asset.creator),link('图片来源 · Sweet Publishing / FreeBibleimages ↗',asset.sourceUrl,'text-link'),link(asset.license,asset.licenseUrl,'text-link'));
    art.append(credit);info.append(art);
    slider.value=index;slider.setAttribute('aria-valuetext',step.label);
    previous.disabled=index===0;next.disabled=index===story.steps.length-1;
    count.textContent=`${index+1} / ${story.steps.length}`;
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  }
  render();return host;
}
