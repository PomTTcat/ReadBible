import { el, button, link, svg } from '../dom.js';
import { selectFamilies } from '../selectors.js';

export function genealogy(data, config, { global = false, focusId, returnHash } = {}) {
  const host = el('section', 'family-view');
  const expanded = new Set(config.initialExpanded);
  const visibleFamilies = selectFamilies(data, config, global);
  if (!global) visibleFamilies.forEach(family => expanded.add(family.id));
  const focused = data.peopleById.has(focusId) ? focusId : config.rootId;
  let selected = focused;
  // Expand only the ancestor paths to a deep-linked person.
  function reveal(id, visited = new Set()) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const family of visibleFamilies.filter(f => f.parents.slice(1).includes(id))) {
      expanded.add(family.id);
      reveal(family.parents[0], visited);
    }
    for (const family of visibleFamilies.filter(f => f.children.includes(id))) {
      expanded.add(family.id);
      family.parents.forEach(parent => reveal(parent, visited));
    }
  }
  if (global) reveal(focused);
  const title = el('div', 'figure-heading');
  title.append(el('h2', '', global ? '全局人物图' : config.title), el('span', 'tag', '人物关系节选'));
  if (global) {
    const expandAll = button('全部展开', () => {
      visibleFamilies.forEach(family => expanded.add(family.id));
      render();
      expandAll.focus({ preventScroll: true });
    });
    title.append(expandAll);
  }
  const tree = el('div', 'family-tree');
  function alignBranchLines() {
    if (!host.isConnected) return;
    for (const branch of tree.querySelectorAll('.person-branch')) {
      const shared = branch.querySelector(':scope > .multi-family > .shared-person');
      branch.style.setProperty('--person-anchor', shared ? `${shared.getBoundingClientRect().left + shared.offsetWidth / 2 - branch.getBoundingClientRect().left}px` : '50%');
    }
    const anchor = branch => {
      const shared = branch.querySelector(':scope > .multi-family > .shared-person');
      const rect = (shared || branch).getBoundingClientRect();
      return rect.left + rect.width / 2;
    };
    for (const children of tree.querySelectorAll('.children:not(.only-child)')) {
      const branches = [...children.children];
      const bounds = children.getBoundingClientRect();
      children.style.setProperty('--branch-left', `${anchor(branches[0]) - bounds.left}px`);
      children.style.setProperty('--branch-right', `${bounds.right - anchor(branches[branches.length - 1])}px`);
    }
    for (const multi of tree.querySelectorAll('.multi-family')) {
      const bounds = multi.getBoundingClientRect();
      const primary = multi.querySelector(':scope > .shared-person').getBoundingClientRect();
      const sx = primary.left + primary.width / 2 - bounds.left;
      const drawing = multi.querySelector(':scope > .multi-connections');
      drawing.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      drawing.replaceChildren();
      multi.querySelectorAll(':scope > .multi-spouse').forEach((group, i) => {
        const spouse = group.querySelector(':scope > .person').getBoundingClientRect();
        const x = spouse.left + spouse.width / 2 - bounds.left;
        const top = spouse.top - bounds.top;
        const two = multi.classList.contains('two-spouses');
        const track = two ? top + spouse.height / 2 : 16 + i * 25;
        const unionX = (sx + x) / 2;
        const unionY = track;
        for (const part of group.querySelectorAll(':scope > .multi-descent-space, :scope > .children')) {
          part.style.transform = two ? `translateX(${unionX-x}px)` : '';
        }
        const primaryEdge = x < sx ? primary.left-bounds.left : primary.right-bounds.left;
        const spouseEdge = x < sx ? spouse.right-bounds.left : spouse.left-bounds.left;
        drawing.append(svg('path', {d:two ? `M ${primaryEdge} ${track} H ${spouseEdge}` : `M ${sx} ${primary.top-bounds.top} V ${track} H ${x} V ${top}`, class:'multi-relation-line'}));
        drawing.append(svg('text', {x:unionX,y:track-10,'text-anchor':'middle',class:'multi-relation-label'},group.dataset.relationship));
        drawing.append(svg('circle',{cx:unionX,cy:unionY,r:2.5,class:'multi-union-dot'}));
        const target = group.querySelector('.junction') || group.querySelector(':scope > .children');
        if (target) {
          const dest = target.getBoundingClientRect();
          const tx = dest.left + dest.width/2 - bounds.left;
          const ty = dest.top - bounds.top;
          const side = spouse.right-bounds.left+14;
          drawing.append(svg('path',{d:two ? `M ${unionX} ${unionY} V ${ty}` : `M ${unionX} ${unionY} H ${x} V ${top-10} H ${side} V ${ty-10} H ${tx} V ${ty}`,class:'multi-relation-line'}));
        }
      });
    }
  }
  const layoutObserver = new ResizeObserver(() => {
    if (!host.isConnected) { layoutObserver.disconnect(); return; }
    alignBranchLines();
  });
  const detail = el('div', 'person-detail');
  detail.setAttribute('aria-live', 'polite');
  const note = el('p', 'muted small', `${global ? '＋ / − 控制后代分支；' : ''}人物名字查看出处。多配偶共用一个人物节点，各关系点连接对应子女。${global ? '当前收录创世记第4、5章样本。' : config.scopeNote || ''}`);
  const legend = el('div', 'gender-legend');
  for (const [gender, label] of [['male', '男'], ['female', '女'], ['unknown', '未标注']]) {
    const item = el('span', `gender-key ${gender}`, label);
    legend.append(item);
  }
  host.append(title, note, legend, tree, detail);
  function person(id) {
    const record = data.peopleById.get(id);
    const node = button(record.name, () => { selected = id; render(undefined, id); }, 'person');
    const gender = record.gender || 'unknown';
    node.dataset.gender = gender;
    node.setAttribute('aria-label', `${record.name}，${gender === 'male' ? '男' : gender === 'female' ? '女' : '性别未标注'}`);
    node.dataset.person = id;
    node.setAttribute('aria-pressed', String(selected === id));
    return node;
  }
  function renderPerson(id, ancestors = new Set()) {
    const branch = el('div', 'person-branch');
    if (ancestors.has(id)) { branch.append(person(id)); return branch; }
    const visited = new Set([...ancestors, id]);
    const families = visibleFamilies.filter(f => f.parents[0] === id);
    if (!families.length) { branch.append(person(id)); return branch; }
    if (families.length > 1 && families.every(f => f.parents.length === 2)) {
      const multi = el('div', 'multi-family');
      const headroom = families.length === 2 ? 0 : families.length * 25 + 28;
      if (families.length === 2) multi.classList.add('two-spouses');
      multi.style.paddingTop = `${headroom}px`;
      branch.style.setProperty('--anchor-depth', `${headroom}px`);
      const columns = families.length + 1 + families.length % 2;
      const primaryColumn = Math.floor(columns / 2) + 1;
      multi.style.gridTemplateColumns = `repeat(${columns}, minmax(max-content, 1fr))`;
      const primary = person(id);primary.classList.add('shared-person');
      primary.style.gridColumn = primaryColumn;
      multi.append(primary);
      families.forEach((family, i) => {
        const group = el('div', 'multi-spouse');
        group.style.gridColumn = i + 1 >= primaryColumn ? i + 2 : i + 1;
        group.dataset.relationship = family.relationship || '父母组合';
        group.append(person(family.parents[1]));
        const space = el('div', 'multi-descent-space');
        if (global) {
          const open = expanded.has(family.id);
          const toggle = button(open ? '−' : `＋ ${family.children.length}`, () => {
            open ? expanded.delete(family.id) : expanded.add(family.id);render(family.id);
          }, 'junction');
          toggle.dataset.family=family.id;
          toggle.setAttribute('aria-expanded',String(open));
          toggle.setAttribute('aria-label',`${open?'收起':'展开'}${family.parents.map(p=>data.peopleById.get(p).name).join('与')}的子女`);
          space.append(toggle);
        }
        group.append(space);
        if (expanded.has(family.id)) {
          const children=el('div',family.children.length===1?'children only-child':'children');
          family.children.forEach(child=>children.append(renderPerson(child,visited)));
          group.append(children);
        }
        multi.append(group);
      });
      multi.append(svg('svg',{class:'multi-connections','aria-hidden':'true'}));
      branch.append(multi);
      return branch;
    }
    const groups = el('div', 'family-groups');
    for (const family of families) {
      const group = el('div', 'family-group');
      const couple = el('div', 'couple-row');
      couple.append(person(id));
      const partners = el('div', 'partners');
      if (family.parents.length > 1) {
        couple.classList.add('couple-pair');
        const connection = el('span', 'couple-link');
        connection.append(el('span', 'relationship relation-label', family.relationship || '父母组合'), el('span', 'connection-dot'));
        couple.append(connection);
        family.parents.slice(1).forEach(other => couple.append(person(other)));
      } else if (family.relationship) partners.append(el('span', 'muted small', family.relationship));
      group.append(couple);
      const open = expanded.has(family.id);
      const toggle = button(open ? '−' : `＋ ${family.children.length}`, () => {
        open ? expanded.delete(family.id) : expanded.add(family.id);
        render(family.id);
      }, 'junction');
      toggle.dataset.family = family.id;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', `${open ? '收起' : '展开'}${family.parents.map(p => data.peopleById.get(p).name).join('与')}的子女`);
      if (global) partners.append(toggle);
      else partners.classList.add('expanded-connection');
      group.append(partners);
      if (open) {
        const children = el('div', family.children.length === 1 ? 'children only-child' : 'children');
        family.children.forEach(child => children.append(renderPerson(child, visited)));
        group.append(children);
      }
      groups.append(group);
    }
    branch.append(groups);
    return branch;
  }
  function render(restoreFamily, restorePerson) {
    layoutObserver.disconnect();
    tree.replaceChildren(renderPerson(config.rootId));
    layoutObserver.observe(tree);
    tree.querySelectorAll('.children').forEach(children => layoutObserver.observe(children));
    requestAnimationFrame(alignBranchLines);
    const record = data.peopleById.get(selected);
    detail.replaceChildren(el('strong', '', record.name), el('span', 'muted', record.references.join('；')));
    if (record.note) detail.append(el('p', 'person-note muted small', record.note));
    if (!global) detail.append(link('在全局图中定位 ↗', `#/people?focus=${encodeURIComponent(selected)}&from=${encodeURIComponent(location.hash)}`, 'text-link'));
    else if (returnHash?.startsWith('#/book/')) detail.append(link('← 返回原章节', returnHash, 'text-link'));
    if (restoreFamily) tree.querySelector(`[data-family="${restoreFamily}"]`)?.focus({ preventScroll: true });
    if (restorePerson) tree.querySelector(`[data-person="${restorePerson}"]`)?.focus({ preventScroll: true });
  }
  render();
  if (global && focusId) requestAnimationFrame(() => tree.querySelector(`[data-person="${focused}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' }));
  return host;
}
