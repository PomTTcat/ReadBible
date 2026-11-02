import { el, button, link } from '../dom.js';
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
  const tree = el('div', 'family-tree');
  function alignBranchLines() {
    if (!host.isConnected) return;
    for (const children of tree.querySelectorAll('.children:not(.only-child)')) {
      const branches = [...children.children];
      const bounds = children.getBoundingClientRect();
      const first = branches[0].getBoundingClientRect();
      const last = branches[branches.length - 1].getBoundingClientRect();
      children.style.setProperty('--branch-left', `${first.left + first.width / 2 - bounds.left}px`);
      children.style.setProperty('--branch-right', `${bounds.right - last.left - last.width / 2}px`);
    }
  }
  const layoutObserver = new ResizeObserver(() => {
    if (!host.isConnected) { layoutObserver.disconnect(); return; }
    alignBranchLines();
  });
  const detail = el('div', 'person-detail');
  detail.setAttribute('aria-live', 'polite');
  const note = el('p', 'muted small', `${global ? '＋ / − 控制后代分支；' : ''}人物名字查看出处。多配偶分支中重复出现的同一人物共用资料。${global ? '当前收录创世记第4、5章样本。' : config.scopeNote || ''}`);
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
