import { el, link } from '../dom.js';

export function chapterRecords(data, config) {
  const record=data.chapterRecordsById.get(config.recordId);
  const host=el('section','chapter-records');
  host.append(el('h2','',record.title));
  const notes=el('section','record-notes');notes.append(el('h3','','先分清这些名字与关系'));
  for(const note of record.notes){
    const detail=el('details');detail.append(el('summary','',note.title),el('p','',note.text),el('span','muted small',note.reference));
    notes.append(detail);
  }
  host.append(notes);
  const kings=el('section');kings.append(el('h3','','以东诸王 · 继位顺序'),el('p','muted small','以下序号只表示本段记载的继位先后，不代表父子关系，也不据此计算在位年数。'));
  const scroll=el('div','record-table-scroll'),table=el('table','record-table'),head=el('thead'),tr=el('tr');
  for(const title of ['顺序','王','父亲','来自地 / 京城','经文']){
    const th=el('th','',title);th.scope='col';tr.append(th);
  }
  head.append(tr);const body=el('tbody');
  for(const king of record.kingRows){
    const person=data.peopleById.get(king.personId),row=el('tr');
    const name=el('th','',person.name);name.scope='row';
    if(king.note)name.append(el('small','muted',king.note));
    row.append(el('td','',king.order),name,el('td','',king.father),el('td','',king.place),el('td','',king.reference));body.append(row);
  }
  table.append(head,body);scroll.append(table);kings.append(scroll,link('创36:31–39 · 阅读经文 ↗','https://www.bible.com/bible/48/GEN.36.31-39','text-link'));host.append(kings);
  const chiefs=el('section');
  chiefs.append(el('h3','','按宗族与住处列出的族长'),el('p','muted small','本段为名单，不将同名条目自动与前面的人物合并，也不画继承或父子连线。'));
  const list=el('ol','record-chief-list');record.chiefNames.forEach(name=>list.append(el('li','',name)));
  chiefs.append(list,link(record.chiefReference+' · 阅读经文 ↗','https://www.bible.com/bible/48/GEN.36.40-43','text-link'));host.append(chiefs);
  return host;
}
