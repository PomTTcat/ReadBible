import { loadData } from './data.js';
import { el, button, link } from './dom.js';
import { genealogy } from './components/genealogy.js';
import { eventMap } from './components/event-map.js';
import { objectDimensions } from './components/object-dimensions.js';
import { illustratedSequence } from './components/illustrated-sequence.js';

const app = document.getElementById('app');
try {
  const data = await loadData();
  const header = el('header', 'site-header');
  const brand = link('ReadBible', '#/', 'brand');
  brand.append(el('span', '', '经文与脉络'));
  const nav = el('nav', 'main-nav'); nav.setAttribute('aria-label', '主导航');
  nav.append(link('书卷目录', '#/'), link('人物关系', '#/people'), link('历史地图', '#/atlas'));
  header.append(brand, nav, el('span', 'prototype-label', '探索原型 · 01'));
  const main = el('main'); main.id = 'main';
  const footer = el('footer', '', 'ReadBible / 阅读经文，看见脉络。资料与图表仍在整理，示意内容以标注为准。');
  app.replaceChildren(header, main, footer);
  const familyConfig = data.figuresById.get('genesis-4-family');
  const mapConfig = data.figuresById.get('kingdoms-map');
  function intro(kicker, title, description) {
    const block = el('div', 'page-intro');
    block.append(el('p', 'eyebrow', kicker), el('h1', '', title), el('p', 'intro-description', description));
    return block;
  }
  function home() {
    main.append(intro('READ / CONNECT / EXPLORE', '从一章开始，看见更大的脉络。', '沿着书卷阅读，在人物关系、地点与事件之间自由切换。'));
    const samples = el('div', 'sample-links');
    samples.append(link('01   创世记 4章 · 展开人物关系 →', '#/book/genesis/4', 'sample-card'), link('02   列王纪上 12章 · 沿时间看地图 →', '#/book/1-kings/12', 'sample-card'));
    main.append(samples);
    const heading = el('div', 'section-heading');heading.append(el('h2', '', '书卷目录'), el('span', 'muted small', '首批 4 卷样本 · 其余书卷待录入'));
    main.append(heading);
    const books = el('div', 'book-grid');
    for (const book of data.catalog) {
      const item = link('', `#/book/${book.id}`, 'book-card');
      item.append(el('span', 'eyebrow', book.section), el('h3', '', book.name), el('span', 'muted', `${book.chapters} 章`));
      const ready = data.chapters.filter(c => c.bookId === book.id).map(c => c.number);
      item.append(el('span', 'small book-status', ready.length ? `示例：第 ${ready.join('、')} 章` : '目录已建 · 内容待整理'));
      books.append(item);
    }
    main.append(books);
  }
  function bookPage(book) {
    main.append(link('← 书卷目录', '#/', 'breadcrumb'), intro(book.section, book.name, '选择章节。带圆点的章节已有图表样本，其余章节保留整理入口。'));
    const grid = el('div', 'chapter-grid');
    for (let number = 1; number <= book.chapters; number++) {
      const ready = data.chapters.some(c => c.bookId === book.id && c.number === number);
      const a = link(`${number}${ready ? ' ·' : ''}`, `#/book/${book.id}/${number}`, `chapter-tile${ready ? ' ready' : ''}`);
      a.setAttribute('aria-label', `第${number}章${ready ? '，已有图表样本' : '，待整理'}`);
      grid.append(a);
    }
    main.append(grid);
  }
  function chapterPage(book, number) {
    const content = data.chapters.find(c => c.bookId === book.id && c.number === number);
    main.append(link(`← ${book.name}目录`, `#/book/${book.id}`, 'breadcrumb'));
    const shell = el('div', 'chapter-layout');
    const sidebar = el('aside', 'chapter-sidebar');
    const label = el('label', '', '切换章节');label.htmlFor = 'chapter-picker';
    const select = el('select');select.id = 'chapter-picker';
    for (let n = 1; n <= book.chapters; n++) { const option = el('option', '', `第 ${n} 章`);option.value=n;option.selected=n===number;select.append(option); }
    select.onchange = () => { location.hash = `#/book/${book.id}/${select.value}`; };
    sidebar.append(el('h2', '', book.name), label, select, el('p', 'muted small', '图表引用共用资料，同一人物可以跨章节查看。'));
    const article = el('article');
    article.append(intro(`CHAPTER ${String(number).padStart(2, '0')}`, content?.title || `${book.name} 第${number}章`, content?.summary || '这一章的资料尚未整理。可以继续浏览目录，或先查看已有的交互样本。'));
    if (content) {
      for (const id of content.figureIds) {
        const config = data.figuresById.get(id);
        if (config.kind === 'genealogy') article.append(genealogy(data, config));
        else if (config.kind === 'event-map') article.append(eventMap(data, config, content.eventId));
        else if (config.kind === 'object-dimensions') article.append(objectDimensions(data, config));
        else if (config.kind === 'illustrated-sequence') article.append(illustratedSequence(data, config));
        else throw new Error(`未知图表类型：${config.kind}`);
      }
      if (content.sections?.length) {
        const outline = el('section', 'chapter-outline');
        outline.append(el('h2', '', '本章结构'));
        for (const section of content.sections) {
          const block = el('div', 'outline-section');
          block.append(el('h3', '', section.title), el('p', 'muted', section.text));
          outline.append(block);
        }
        article.append(outline);
      }
      if (content.notes?.length || content.sources?.length) {
        const sources = el('section', 'chapter-sources');
        sources.append(el('h2', '', '阅读说明与来源'));
        for (const note of content.notes || []) sources.append(el('p', 'muted small', note));
        for (const source of content.sources || []) sources.append(link(source.title + ' ↗', source.url, 'text-link'));
        if (content.processing) sources.append(el('p', 'muted small', `处理状态：已做原型 · ${content.processing.review}`));
        article.append(sources);
      }
    } else {
      const empty = el('div', 'empty-state');
      empty.append(el('h2', '', '等待加入经文脉络'), el('p', 'muted', '这里会放入本章的人物关系、地图与文本结构。'), link('先看创世记 4章 →', '#/book/genesis/4', 'text-link'), link('或看历史地图 →', '#/atlas', 'text-link'));
      article.append(empty);
    }
    const pager = el('nav', 'chapter-pager');pager.setAttribute('aria-label', '前后章节');
    if (number > 1) pager.append(link('← 上一章', `#/book/${book.id}/${number-1}`, 'button'));
    if (number < book.chapters) pager.append(link('下一章 →', `#/book/${book.id}/${number+1}`, 'button'));
    article.append(pager);shell.append(sidebar, article);main.append(shell);
  }
  function render() {
    main.replaceChildren();
    const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
    const params = new URLSearchParams(query);
    const parts = path.split('/').filter(Boolean);
    if (!parts.length) home();
    else if (parts[0] === 'book') {
      const book = data.catalog.find(b => b.id === parts[1]);
      const number = Number(parts[2]);
      if (book && parts.length === 2) bookPage(book);
      else if (book && parts.length === 3 && Number.isInteger(number) && number >= 1 && number <= book.chapters) chapterPage(book, number);
      else main.append(intro('404', '没有找到这个章节', '请从书卷目录重新选择。'), link('返回目录', '#/', 'text-link'));
    } else if (parts[0] === 'people') {
      main.append(intro('PEOPLE & RELATIONSHIPS', '人物可以跨越章节，资料只维护一份。', '全局视图目前接入创世记第4、5章样本。展开连接处，沿家族分支继续阅读。'), genealogy(data, familyConfig, { global:true, focusId:params.get('focus'), returnHash:params.get('from') }));
    } else if (parts[0] === 'atlas') {
      main.append(intro('PLACES & EVENTS', '拖动时间，看叙事向前推进。', '每一个节点同步更新区域状态、地点与事件说明，也能回到对应章节。'), eventMap(data, mapConfig));
    } else main.append(intro('404', '页面尚不存在', '请返回书卷目录。'), link('返回目录', '#/', 'text-link'));
    nav.querySelectorAll('a').forEach(a => { const active = a.hash === '#/' ? !parts.length || parts[0] === 'book' : a.hash === `#/${parts[0]}`; if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current'); });
    const heading = main.querySelector('h1');
    document.title = `${heading?.textContent || '经文与脉络'} · ReadBible`;
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);render();
} catch (error) {
  app.replaceChildren(el('div', 'loading', `资料加载失败：${error.message}。请通过 npm run dev 打开项目。`));
}
