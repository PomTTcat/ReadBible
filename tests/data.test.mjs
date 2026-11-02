import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { selectFamilies } from '../src/selectors.js';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const [catalog,people,families,places,events,chapters,figures,maps,objects,assets,sequences] = await Promise.all(['data/catalog.json','data/people.json','data/families.json','data/places.json','data/events.json','data/chapters.json','presentation/figures.json','presentation/maps.json','data/objects.json','data/assets.json','data/sequences.json'].map(read));
const index = records => { const ids=new Set(records.map(r=>r.id));assert.equal(ids.size, records.length, 'ID must be unique');return ids; };
const books = new Map(catalog.map(b=>[b.id,b]));
const personIds=index(people), familyIds=index(families), placeIds=index(places), eventIds=index(events), figureIds=index(figures), sceneIds=index(maps);
for(const f of families){assert.ok(f.references.length);assert.ok(f.parents.length);assert.ok(f.children.length);for(const id of [...f.parents,...f.children])assert.ok(personIds.has(id),`Unknown person ${id}`);assert.ok(!f.children.some(id=>f.parents.includes(id)), 'Self-parent relation');}
// Catch cycles before recursive display receives any data.
function visit(id, path=new Set()){assert.ok(!path.has(id),`Cycle at ${id}`);for(const family of families.filter(f=>f.parents.includes(id)))for(const child of family.children)visit(child,new Set([...path,id]));}
for(const p of people)visit(p.id);
const chapterKeys=new Set();
for(const c of chapters){const b=books.get(c.bookId);assert.ok(b);assert.ok(c.number>=1&&c.number<=b.chapters);const key=`${c.bookId}/${c.number}`;assert.ok(!chapterKeys.has(key));chapterKeys.add(key);c.personIds.forEach(id=>assert.ok(personIds.has(id)));c.figureIds.forEach(id=>assert.ok(figureIds.has(id)));if(c.eventId)assert.ok(eventIds.has(c.eventId));}
for(const e of events){assert.ok(e.references.length);e.placeIds.forEach(id=>assert.ok(placeIds.has(id)));assert.ok(chapterKeys.has(`${e.chapter.bookId}/${e.chapter.number}`));}
for(const f of figures){if(f.kind==='genealogy'){assert.ok(personIds.has(f.rootId));f.initialExpanded.forEach(id=>assert.ok(familyIds.has(id)));}else if(f.kind==='object-dimensions'){assert.ok(objects.some(o=>o.id===f.objectId));assert.ok(assets.some(a=>a.id===f.assetId));}else if(f.kind==='illustrated-sequence'){assert.ok(sequences.some(s=>s.id===f.sequenceId));}else{assert.equal(f.kind,'event-map');assert.ok(sceneIds.has(f.sceneId));const s=maps.find(s=>s.id===f.sceneId);assert.deepEqual(f.eventIds,s.states.map(s=>s.eventId));for(const id of f.eventIds)assert.ok(eventIds.has(id));}}
for(const s of maps){for(const p of s.places){assert.ok(placeIds.has(p.placeId));assert.ok(p.x>=0&&p.x<=s.width&&p.y>=0&&p.y<=s.height);}for(const state of s.states){const e=events.find(e=>e.id===state.eventId);assert.ok(e);assert.ok(e.placeIds.includes(state.focusPlaceId));assert.ok(s.places.some(p=>p.placeId===state.focusPlaceId));for(const id of state.fallen)assert.ok(s.regions.some(r=>r.id===id));}}
for (const chapter of chapters) {
  assert.ok(['prototype','reviewed'].includes(chapter.processing.status));
  assert.match(chapter.processing.updated, /^\d{4}-\d{2}-\d{2}$/);
}
for (const figure of figures.filter(f=>f.kind==='genealogy')) {
  figure.familyIds.forEach(id=>assert.ok(familyIds.has(id)));
  figure.personIds.forEach(id=>assert.ok(personIds.has(id)));
  figure.initialExpanded.forEach(id=>assert.ok(figure.familyIds.includes(id)));
}
const four=selectFamilies({families}, figures.find(f=>f.id==='genesis-4-family'));
const five=selectFamilies({families}, figures.find(f=>f.id==='genesis-5-family'));
assert.ok(!four.some(f=>f.children.includes('kenan')), 'Chapter 5 relations must not leak into chapter 4');
assert.deepEqual(five.find(f=>f.id==='adam-eve').children, ['seth']);
assert.deepEqual(five.find(f=>f.id==='adam-eve').parents, ['adam']);
assert.equal(five.find(f=>f.id==='adam-eve').relationship, undefined);
assert.ok(!five.some(f=>[...f.parents,...f.children].includes('enoch-cain')));
assert.ok(five.some(f=>f.children.includes('enoch-seth')));
assert.deepEqual(five.find(f=>f.id==='noah-children').children,['shem','ham','japheth']);
assert.equal(selectFamilies({families}, figures[0], true).length, families.length);
// Static deployment keeps all relative URLs valid beneath a repository subpath.
await stat('index.html');
console.log(`资料校验通过：${catalog.length} 书卷、${chapters.length} 章节样本、${people.length} 人物、${families.length} 家庭关系、${events.length} 地图节点。`);

const ark=objects.find(o=>o.id==='noah-ark');
assert.deepEqual(ark.dimensions,{length:300,width:50,height:30,unit:'cubit'});
assert.equal(ark.decks,3);
for(const asset of assets){assert.ok(asset.license);assert.ok(asset.sourceUrl.startsWith('https://'));await stat(asset.path);}
const six=chapters.find(c=>c.bookId==='genesis'&&c.number===6);
assert.deepEqual(six.figureIds,['noah-ark-dimensions']);

const creation=sequences.find(s=>s.id==='creation-seven-days');
assert.deepEqual(creation.steps.map(s=>s.number),[1,2,3,4,5,6,7]);
for(const step of creation.steps){assert.ok(assets.some(a=>a.id===step.assetId));assert.equal(step.reference.bookId,'genesis');assert.equal(step.reference.chapter,step.number===7?2:1);assert.ok(step.reference.verseStart<=step.reference.verseEnd);}
assert.deepEqual(creation.steps[6].reference,{bookId:'genesis',chapter:2,verseStart:1,verseEnd:3});
assert.ok(!chapters.some(c=>c.bookId==='genesis'&&c.number===2),'Context excerpt must not mark chapter 2 as processed');
assert.equal(creation.defaultVariant,'sweet');
assert.deepEqual(creation.variants.map(v=>v.id),['sweet','york']);
for(const variant of creation.variants){
  assert.deepEqual(Object.keys(variant.assetsByStep),creation.steps.map(step=>step.id));
  for(const ids of Object.values(variant.assetsByStep)){
    assert.ok(ids.length>0);
    for(const id of ids)assert.ok(assets.some(asset=>asset.id===id));
  }
}
