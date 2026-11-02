import {el, svg, link} from '../dom.js';

export function objectDimensions(data, config) {
  const object = data.objectsById.get(config.objectId);
  const asset = data.assetsById.get(config.assetId);
  const host = el('section','object-figure');
  const heading = el('div','figure-heading');
  heading.append(el('h2','',config.title),el('span','tag','尺寸依据 · 创 6:15–16'));
  const drawing = svg('svg',{viewBox:'0 0 760 320',role:'img','aria-label':`${object.name}尺寸示意：长${object.dimensions.length}肘、宽${object.dimensions.width}肘、高${object.dimensions.height}肘，三层。外形仅为示意。`,class:'ark-dimensions'});
  drawing.append(svg('title',{},'方舟尺寸与三层示意，非外观复原'));
  const {length,width,height}=object.dimensions;
  const scale=480/length,L=length*scale,W=width*scale,H=height*scale;
  const x=80,y=170,dx=W*.8,dy=-W*.55;
  drawing.append(svg('path',{d:`M${x} ${y} h${L} l${dx} ${dy} h${-L} Z`,class:'ark-top'}));
  drawing.append(svg('path',{d:`M${x} ${y} h${L} v${H} h${-L} Z`,class:'ark-front'}));
  drawing.append(svg('path',{d:`M${x+L} ${y} l${dx} ${dy} v${H} l${-dx} ${-dy} Z`,class:'ark-side'}));
  for(let deck=1;deck<object.decks;deck++)drawing.append(svg('path',{d:`M${x} ${y+H*deck/object.decks} h${L}`,class:'ark-deck'}));
  function dimension(x1,y1,x2,y2,label,tx,ty){
    drawing.append(svg('path',{d:`M${x1} ${y1} L${x2} ${y2}`,class:'dimension-line'}));
    for(const [px,py] of [[x1,y1],[x2,y2]])drawing.append(svg('path',{d:`M${px-4} ${py-5} l8 10`,class:'dimension-line'}));
    drawing.append(svg('text',{x:tx,y:ty,'text-anchor':'middle',class:'dimension-label'},label));
  }
  dimension(x,y+H+32,x+L,y+H+32,`长 ${length} 肘`,x+L/2,y+H+59);
  dimension(x+L+15,y-15,x+L+dx+15,y+dy-15,`宽 ${width} 肘`,x+L+dx/2+20,y+dy/2-32);
  dimension(x+L+dx+35,y+dy,x+L+dx+35,y+dy+H,`高 ${height} 肘`,x+L+dx+76,y+dy+H/2+5);
  drawing.append(svg('text',{x:x+L/2,y:y-16,'text-anchor':'middle',class:'ark-caption'},'三层 · 虚线仅示意分层'));
  const values=el('div','dimension-values');
  for(const [label,value] of [['长',length],['宽',width],['高',height]]){
    const item=el('div');item.append(el('span','muted small',label),el('strong','',`${value} 肘`));
    if(object.conversion) item.append(el('span','muted small',`约 ${Number((value*object.conversion.metersPerCubit).toFixed(2))} 米`));
    values.append(item);
  }
  host.append(heading,el('p','muted small','按经文肘数绘制的尺寸比例示意；长方体外形及层高并非考古复原。'),drawing,values);
  if(object.conversion){
    const conversion=el('div','unit-note');
    conversion.append(el('strong','',object.conversion.label),el('p','muted small',object.conversion.note),link('单位换算参考 · 圣经翻译资料',object.conversion.sourceUrl,'text-link'));
    host.append(conversion);
  }
  const reference=el('figure','ark-art');
  const image=el('img');image.src=new URL(`../../${asset.path}`,import.meta.url).href;image.alt=asset.alt;image.width=1280;image.height=717;image.loading='lazy';
  const caption=el('figcaption');
  caption.append(el('strong','',`${asset.title} · ${asset.creator}，${asset.date}`),el('p','muted small',asset.note),link('图片来源：'+asset.institution,asset.sourceUrl,'text-link'),link(asset.license,asset.licenseUrl,'text-link'));
  reference.append(image,caption);host.append(reference);
  return host;
}
