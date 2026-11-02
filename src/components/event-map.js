import { el, button, svg, link } from '../dom.js';

export function eventMap(data, config, initialEventId) {
  const scene = data.mapsById.get(config.sceneId);
  const events = config.eventIds.map(id => data.eventsById.get(id));
  let index = Math.max(0, config.eventIds.indexOf(initialEventId));
  const host = el('section', 'event-map');
  const heading = el('div', 'figure-heading');
  heading.append(el('h2', '', config.title), el('span', 'tag', '可拖动时间轴'));
  const layout = el('div', 'map-layout');
  const canvas = el('div', 'map-canvas');
  const visual = svg('svg', { viewBox: `0 0 ${scene.width} ${scene.height}`, role: 'img', 'aria-label': '南北王国叙事关系示意图' });
  canvas.append(visual);
  const info = el('div', 'event-info');
  info.setAttribute('aria-live', 'polite');
  layout.append(canvas, info);
  const controls = el('div', 'timeline');
  const row = el('div', 'timeline-row');
  const previous = button('←', () => change(index - 1), 'arrow-button');
  previous.setAttribute('aria-label', '上一个事件');
  const next = button('→', () => change(index + 1), 'arrow-button');
  next.setAttribute('aria-label', '下一个事件');
  const input = el('input');
  input.type = 'range'; input.min = 0; input.max = events.length - 1; input.step = 1;
  input.setAttribute('aria-label', '地图事件时间轴');
  input.addEventListener('input', () => change(Number(input.value)));
  const progress = el('span', 'timeline-count');
  row.append(previous, input, next, progress);
  const stops = el('div', 'timeline-stops');
  const buttons = events.map((event, i) => {
    const b = button(event.label, () => change(i), 'timeline-stop');
    stops.append(b); return b;
  });
  controls.append(row, stops);
  host.append(heading, layout, controls, el('p', 'muted small map-note', scene.disclaimer));
  function change(value) {
    index = Math.max(0, Math.min(events.length - 1, value));
    draw();
  }
  function draw() {
    const event = events[index];
    const state = scene.states.find(s => s.eventId === event.id);
    visual.replaceChildren(svg('title', {}, `${event.label}：${scene.disclaimer}`));
    const defs = svg('defs');
    const pattern = svg('pattern', { id: 'fallen-hatch', width: 9, height: 9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' });
    pattern.append(svg('rect', { width: 9, height: 9, class: 'hatch-base' }), svg('line', { x1: 0, y1: 0, x2: 0, y2: 9, class: 'hatch-line' }));
    defs.append(pattern); visual.append(defs);
    visual.append(svg('text', { x: 46, y: 240, class: 'sea-label' }, '西侧'));
    for (const region of scene.regions) {
      const fallen = state.fallen.includes(region.id);
      const shape = svg('path', { d: region.path, class: `region ${region.id}${fallen ? ' fallen' : ''}` });
      shape.append(svg('title', {}, `${region.label}${fallen ? '：已发生陷落事件' : ''}`));
      visual.append(shape, svg('text', { x: region.labelX, y: region.labelY, class: 'region-label', 'text-anchor': 'middle' }, region.label));
    }
    for (const place of scene.places.filter(p => event.placeIds.includes(p.placeId))) {
      const active = place.placeId === state.focusPlaceId;
      if (active) visual.append(svg('circle', { cx: place.x, cy: place.y, r: 16, class: 'focus-halo' }));
      visual.append(svg('circle', { cx: place.x, cy: place.y, r: 5, class: 'city-dot' }), svg('text', { x: place.x + 15, y: place.y + 5, class: 'city-label' }, data.placesById.get(place.placeId).name));
    }
    const focus = scene.places.find(p => p.placeId === state.focusPlaceId);
    visual.append(svg('path', { d: `M${focus.x + 17} ${focus.y - 10} L${state.annotationX - 12} ${state.annotationY - 7}`, class: 'event-pointer' }), svg('text', { x: state.annotationX, y: state.annotationY, class: 'event-annotation' }, state.annotation));
    visual.append(svg('text', { x: 28, y: 432, class: 'map-key' }, '● 当前事件地点   ▨ 已发生陷落事件'));
    info.replaceChildren(el('span', 'eyebrow', `叙事节点 0${index + 1}`), el('h3', '', event.label), el('p', 'event-period', event.period), el('p', 'event-summary', event.summary), el('p', 'muted small', `经文依据：${event.references.join('；')}`), link('查看对应章节 ↗', `#/book/${event.chapter.bookId}/${event.chapter.number}`, 'text-link'));
    input.value = index;
    input.setAttribute('aria-valuetext', `${event.label}，${event.period}`);
    previous.disabled = index === 0; next.disabled = index === events.length - 1;
    progress.textContent = `${index + 1} / ${events.length}`;
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
  }
  draw();
  return host;
}
