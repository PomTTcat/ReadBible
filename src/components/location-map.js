import { el, link, svg } from '../dom.js';

// Geographic content stays in shared data; drawing uses a simplified local projection.
export function locationMap(config) {
  const host = el('section', 'location-map');
  host.append(el('h3', '', config.title), el('p', 'muted small', config.summary));
  const [west, south, east, north] = config.bounds;
  const x = lon => 25 + (lon - west) / (east - west) * 550;
  const y = lat => 25 + (north - lat) / (north - south) * 450;
  const path = points => points.map(([lon, lat], i) => `${i ? 'L' : 'M'}${x(lon)} ${y(lat)}`).join(' ');
  const map = svg('svg', {viewBox:'0 0 600 500', role:'img', 'aria-label':'迦南位于地中海东岸的位置示意图，标示西顿、迦萨、约旦河与死海'});
  map.append(svg('rect', {width:600,height:500,fill:'#e5f0f3'}));
  map.append(svg('path', {d:path([...config.coast,[east,south],[east,north]])+' Z',fill:'#f3f0e6'}));
  map.append(svg('path', {d:path(config.coast),fill:'none',stroke:'#92a9aa','stroke-width':1.5}));
  map.append(svg('path', {d:path(config.area)+' Z',fill:'#bd976c','fill-opacity':0.3,stroke:'#a17c50','stroke-dasharray':'5 5'}));
  map.append(svg('path', {d:path(config.river),fill:'none',stroke:'#6d9eaf','stroke-width':2}));
  for (const water of config.waters) {
    map.append(svg('ellipse',{cx:x(water.center[0]),cy:y(water.center[1]),rx:water.radius[0]*550/(east-west),ry:water.radius[1]*450/(north-south),fill:'#8eb8c7'}));
    map.append(svg('text',{x:x(water.center[0])+18,y:y(water.center[1])+5,class:'location-water-label'},water.name));
  }
  for (const place of config.places) {
    const [lon,lat] = place.coordinates;
    map.append(svg('circle',{cx:x(lon),cy:y(lat),r:4,fill:'#405f55'}));
    map.append(svg('text',{x:x(lon)-12,y:y(lat)-12,'text-anchor':'end',class:'location-place-label'},place.label));
  }
  map.append(svg('text',{x:110,y:190,class:'location-water-label'},'地中海'));
  map.append(svg('text',{x:x(35.8),y:y(32.25),class:'location-water-label'},'约旦河'));
  map.append(svg('text',{x:x(34.85),y:y(32.45),class:'location-area-label'},'迦南'));
  map.append(svg('text',{x:555,y:35,'text-anchor':'middle',class:'location-place-label'},'北 ↑'));
  host.append(map, el('p','muted small',config.disclaimer));
  const sources = el('div','location-sources');
  for (const source of config.sources) sources.append(link(source.title+' ↗',source.url,'text-link'));
  host.append(sources);
  return host;
}
