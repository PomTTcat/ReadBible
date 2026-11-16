import { el, button, link, svg } from '../dom.js';
import { collectMinorGenerations } from '../genealogy-summary.js';
import { locationMap } from './location-map.js';
import { selectFamilies } from '../selectors.js';

export function genealogy(data, config, { global = false, focusId, returnHash } = {}) {
  const host = el('section', 'family-view');
  const nameOf = id => (!global && config.nameOverrides?.[id]) || data.peopleById.get(id).name;
  const branchIds = global ? [] : (config.branchIds || []);
  const collapsible = global || branchIds.length > 0;
  const expanded = new Set(config.initialExpanded);
  const visibleFamilies = selectFamilies(data, config, global, focusId);
  if (!collapsible) visibleFamilies.forEach(family => expanded.add(family.id));
  let root = config.rootId;
  const focused = data.peopleById.has(focusId) ? focusId : config.rootId;
  if (global) {
    const reachable = new Set();
    const visit = id => {
      if (reachable.has(id)) return;
      reachable.add(id);
      for (const family of visibleFamilies.filter(f => f.parents[0] === id)) {
        family.children.forEach(visit);
        family.parents.slice(1).forEach(parent => reachable.add(parent));
      }
    };
    visit(root);
    if (!reachable.has(focused)) {
      root = focused;
      const seen = new Set();
      while (!seen.has(root)) {
        seen.add(root);
        const family = visibleFamilies.find(f => f.children.includes(root));
        if (!family || seen.has(family.parents[0])) break;
        root = family.parents[0];
      }
    }
  }
  let selected = focused;
  let simplified = global;
  const importantIds = new Set([...(data.genealogyOverview?.importantIds || []), focused]);
  const revealedGenerations = new Set();
  let modeButton;
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
  if (global) importantIds.forEach(id => reveal(id));
  const title = el('div', 'figure-heading');
  title.append(el('h2', '', global ? '全局人物图' : config.title), el('span', 'tag', branchIds.length ? '人物与族群' : '人物关系节选'));
  if (global && root !== config.rootId) title.append(el('span', 'tag', '当前支系：' + nameOf(root)));
  if (global) {
    modeButton = button('查看完整族谱', () => {
      simplified = !simplified;
      expanded.clear();
      if (simplified) importantIds.forEach(id => reveal(id));
      else visibleFamilies.forEach(f => expanded.add(f.id));
      render();
      modeButton.focus({preventScroll:true});
    });
    const expandAll = button('全部展开', () => {
      simplified = false;
      visibleFamilies.forEach(family => expanded.add(family.id));
      render();
      expandAll.focus({ preventScroll: true });
    });
    title.append(modeButton, expandAll);
  }
  const tree = el('div', 'family-tree');
  function alignBranchLines() {
    if (!host.isConnected) return;
    // Translation to a couple's midpoint must also reserve layout space.
    // Resolve nested groups first so their parent measures the final subtree width.
    for (const multi of [...tree.querySelectorAll('.multi-family.two-spouses')].reverse()) {
      const groups = [...multi.querySelectorAll(':scope > .multi-spouse')];
      const primary = multi.querySelector(':scope > .shared-person');
      if (groups.every(group => group.querySelector(':scope > .children'))) {
        const centerWidth = Math.max(primary.offsetWidth, groups.reduce((sum, group) => sum + group.getBoundingClientRect().width, 0) / 2);
        multi.style.gridTemplateColumns = `max-content ${centerWidth}px max-content`;
      } else {
        multi.style.gridTemplateColumns = 'repeat(3, max-content)';
      }
    }
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
        const spouse = group.querySelector(':scope > .person, :scope > .family-parent-label').getBoundingClientRect();
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
  const note = el('p', 'muted small', branchIds.length
    ? `${config.scopeNote} 点名字看出处，＋ / − 展开或收起后裔；较宽的分支可左右滑动。`
    : `${global ? '默认简化连续次要世代，悬停或点击 ⋯ 查看名字与说明；＋ / − 控制后代分支；' : ''}点名字查看出处。多配偶共用一个人物节点，各关系点连接对应子女。${global ? '当前收录创世记第4、5、10、11、25、28–30章样本。' : config.scopeNote || ''}`);
  const controls = el('div', 'family-branch-controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', '切换谱系分支');
  for (const id of branchIds) {
    const control = button(data.peopleById.get(id).name, () => {
      if (id === root) return;
      root = selected = id;
      render();
      tree.scrollLeft = 0;
    }, 'button version-button');
    control.dataset.branch = id;
    controls.append(control);
  }
  const legend = el('div', 'gender-legend');
  const keys = branchIds.length ? [['male', '人物'], ['clan', '族群']] : [['male', '男'], ['female', '女'], ['unknown', '未标注']];
  if (global) keys.push(['clan', '族群']);
  for (const [gender, label] of keys) {
    const item = el('span', `gender-key ${gender}`, label);
    legend.append(item);
  }
  host.append(title, note);
  if (branchIds.length) host.append(controls);
  host.append(legend, tree, detail);
  function person(id) {
    const record = data.peopleById.get(id);
    const node = button(nameOf(id), () => { selected = id; render(undefined, id); }, 'person');
    const gender = record.gender || 'unknown';
    node.dataset.gender = gender;
    if (record.kind === 'clan') node.dataset.kind = record.kind;
    node.setAttribute('aria-label', `${nameOf(id)}，${record.kind === 'clan' ? '族群' : gender === 'male' ? '男' : gender === 'female' ? '女' : '性别未标注'}`);
    const ages = record.genealogyAges;
    if (!global && ages && ages.chapter === config.ageChapter) {
      const child = data.peopleById.get(ages.childId);
      node.append(el('span', 'person-age', `${ages.ageAtBirth}岁生${child.name} · 此后${ages.yearsAfter}年`));
    }
    const badge = !global ? config.nodeBadges?.[id] : record.roles?.[0]?.title;
    if (badge) node.append(el('span', 'person-role-badge', badge));
    node.dataset.person = id;
    node.setAttribute('aria-pressed', String(selected === id));
    return node;
  }
  function summaryNode(segment) {
    const wrapper = el('div', 'generation-summary');
    let pinned = false;
    const trigger = button('⋯', () => {
      pinned = !pinned;
      if (pinned) show();
      else panel.hidePopover();
    }, 'person generation-trigger');
    const names = segment.hiddenIds.map(nameOf);
    trigger.append(el('span', 'small', segment.hiddenIds.length + '代'));
    trigger.setAttribute('aria-label', '省略' + segment.hiddenIds.length + '代：' + names.join('、'));
    trigger.setAttribute('aria-expanded', 'false');
    const panel = el('div', 'generation-popover');
    panel.setAttribute('popover', 'manual');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', '省略世代的名字与说明');
    panel.append(el('strong', '', '中间' + segment.hiddenIds.length + '代'));
    const list = el('ol');
    for (const id of segment.hiddenIds) {
      const record = data.peopleById.get(id);
      const item = el('li');
      const childFamily = visibleFamilies.find(f => f.parents[0] === id);
      const relationship = childFamily ? nameOf(id) + ' → ' + childFamily.children.map(nameOf).join('、') : '';
      item.append(el('strong', '', nameOf(id)), el('p', 'muted small', record.note || relationship), el('p', 'muted small', record.references.join('；')));
      list.append(item);
    }
    panel.append(list, button('展开这几代', () => {
      segment.hiddenIds.forEach(id => revealedGenerations.add(id));
      render(undefined, segment.hiddenIds[0]);
    }));
    panel.append(button('关闭说明', () => { pinned = false; panel.hidePopover(); }));
    wrapper.addEventListener('keydown', event => {
      if (event.key === 'Escape') { pinned = false; panel.hidePopover(); event.preventDefault(); }
    });
    let timer;
    function show() {
      clearTimeout(timer);
      for (const other of host.querySelectorAll('.generation-popover:popover-open')) {
        if (other !== panel) other.hidePopover();
      }
      if (!panel.matches(':popover-open')) panel.showPopover();
      trigger.setAttribute('aria-expanded', 'true');
      const rect = trigger.getBoundingClientRect();
      panel.style.left = Math.max(8, Math.min(rect.left, innerWidth - panel.offsetWidth - 8)) + 'px';
      const below = innerHeight - rect.bottom;
      panel.style.top = (below >= panel.offsetHeight + 6 ? rect.bottom + 6 : Math.max(8, rect.top - panel.offsetHeight - 6)) + 'px';
    }
    function scheduleHide() {
      timer = setTimeout(() => {
        if (pinned || panel.contains(document.activeElement)) return;
        if (panel.isConnected) panel.hidePopover();
        trigger.setAttribute('aria-expanded', 'false');
      }, 180);
    }
    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('focus', show);
    trigger.addEventListener('mouseleave', scheduleHide);
    trigger.addEventListener('blur', scheduleHide);
    panel.addEventListener('mouseenter', () => clearTimeout(timer));
    panel.addEventListener('mouseleave', scheduleHide);
    panel.addEventListener('focusout', scheduleHide);
    panel.addEventListener('toggle', () => {
      const open = panel.matches(':popover-open');
      trigger.setAttribute('aria-expanded', String(open));
      if (!open) pinned = false;
    });
    wrapper.append(trigger, panel);
    return wrapper;
  }
  function renderPerson(id, ancestors = new Set()) {
    const branch = el('div', 'person-branch');
    if (ancestors.has(id)) { branch.append(person(id)); return branch; }
    if (simplified) {
      const protectedIds = new Set([...importantIds, ...revealedGenerations, selected, ...ancestors]);
      const segment = collectMinorGenerations(id, visibleFamilies, protectedIds);
      if (segment) {
        branch.append(summaryNode(segment));
        const connection = el('div', 'partners expanded-connection');
        const children = el('div', 'children only-child');
        children.append(renderPerson(segment.nextId, new Set([...ancestors, ...segment.hiddenIds])));
        branch.append(connection, children);
        return branch;
      }
    }
    const visited = new Set([...ancestors, id]);
    const families = visibleFamilies.filter(f => f.parents[0] === id);
    if (!families.length) { branch.append(person(id)); return branch; }
    if (families.length > 1) {
      const multi = el('div', 'multi-family');
      const twoSpouses = families.length === 2 && families.every(f => f.parents.length === 2);
      const headroom = twoSpouses ? 0 : families.length * 25 + 28;
      if (twoSpouses) multi.classList.add('two-spouses');
      multi.style.paddingTop = `${headroom}px`;
      branch.style.setProperty('--anchor-depth', `${headroom}px`);
      const columns = families.length + 1;
      const primaryColumn = Math.floor(columns / 2) + 1;
      multi.style.gridTemplateColumns = `repeat(${columns}, max-content)`;
      const primary = person(id);primary.classList.add('shared-person');
      primary.style.gridColumn = primaryColumn;
      multi.append(primary);
      families.forEach((family, i) => {
        const group = el('div', 'multi-spouse');
        group.style.gridColumn = i + 1 >= primaryColumn ? i + 2 : i + 1;
        group.dataset.relationship = family.parents.length > 1 ? family.relationship || '父母组合' : '子女';
        group.append(family.parents.length > 1 ? person(family.parents[1]) : el('span', 'family-parent-label', '另一亲本未记载'));
        const space = el('div', 'multi-descent-space');
        if (collapsible && family.children.length) {
          const open = expanded.has(family.id);
          const toggle = button(open ? '−' : `＋ ${family.children.length}`, () => {
            open ? expanded.delete(family.id) : expanded.add(family.id);render(family.id);
          }, 'junction');
          toggle.dataset.family=family.id;
          toggle.setAttribute('aria-expanded',String(open));
          toggle.setAttribute('aria-label',`${open?'收起':'展开'}${family.parents.map(p=>nameOf(p)).join('与')}的子女`);
          space.append(toggle);
        }
        if (family.children.length) group.append(space);
        if (family.children.length && expanded.has(family.id)) {
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
      const hasChildren = family.children.length > 0;
      if (family.parents.length > 1) {
        couple.classList.add('couple-pair');
        const connection = el('span', 'couple-link');
        connection.append(el('span', 'relationship relation-label', family.relationship || '父母组合'), el('span', 'connection-dot'));
        if (!hasChildren) connection.classList.add('no-descent');
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
      toggle.setAttribute('aria-label', `${open ? '收起' : '展开'}${family.parents.map(p => nameOf(p)).join('与')}的子女`);
      if (collapsible && hasChildren) partners.append(toggle);
      else partners.classList.add('expanded-connection');
      if (hasChildren) group.append(partners);
      if (open && hasChildren) {
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
    if (modeButton) {
      modeButton.textContent = simplified ? '查看完整族谱' : '切换简化显示';
      modeButton.setAttribute('aria-label', simplified ? '当前简化显示，查看完整族谱' : '当前完整显示，切换简化显示');
    }
    for (const control of controls.children) control.setAttribute('aria-pressed', String(control.dataset.branch === root));
    tree.replaceChildren(renderPerson(root));
    layoutObserver.observe(tree);
    tree.querySelectorAll('.children').forEach(children => layoutObserver.observe(children));
    requestAnimationFrame(alignBranchLines);
    if (!tree.querySelector(`[data-person="${selected}"]`)) {
      selected = root;
      tree.querySelector(`[data-person="${root}"]`).setAttribute('aria-pressed', 'true');
    }
    const record = data.peopleById.get(selected);
    detail.replaceChildren(el('strong', '', nameOf(selected)), el('span', 'muted', record.references.join('；')));
    if (record.kind === 'clan') detail.append(el('span', 'tag', '族群'));
    if (record.note) detail.append(el('p', 'person-note muted small', record.note));
    const geography = data.geography.find(item => item.personId === selected);
    if (geography) detail.append(locationMap(geography));
    if (!global) detail.append(link('在全局图中定位 ↗', `#/people?focus=${encodeURIComponent(selected)}&from=${encodeURIComponent(location.hash)}`, 'text-link'));
    else if (returnHash?.startsWith('#/book/')) detail.append(link('← 返回原章节', returnHash, 'text-link'));
    if (restoreFamily) tree.querySelector(`[data-family="${restoreFamily}"]`)?.focus({ preventScroll: true });
    if (restorePerson) tree.querySelector(`[data-person="${restorePerson}"]`)?.focus({ preventScroll: true });
  }
  render();
  if (!global && config.centerRoot) requestAnimationFrame(() => {
    const node = tree.querySelector(`[data-person="${root}"]`);
    if (node) {
      const rect = node.getBoundingClientRect(), bounds = tree.getBoundingClientRect();
      tree.scrollLeft += rect.left + rect.width / 2 - bounds.left - tree.clientWidth / 2;
    }
  });
  if (global) requestAnimationFrame(() => tree.querySelector(`[data-person="${focused}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' }));
  return host;
}
