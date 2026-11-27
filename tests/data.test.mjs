import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { selectFamilies } from '../src/selectors.js';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const [catalog,people,families,places,events,chapters,figures,maps,objects,assets,sequences] = await Promise.all(['data/catalog.json','data/people.json','data/families.json','data/places.json','data/events.json','data/chapters.json','presentation/figures.json','presentation/maps.json','data/objects.json','data/assets.json','data/sequences.json'].map(read));
const chapterRecords = await read('data/chapter-records.json');
const readingGuides = await read('data/reading-guides.json');
const journeys = await read('data/journeys.json');
const journeyMaps = await read('presentation/journey-maps.json');
const index = records => { const ids=new Set(records.map(r=>r.id));assert.equal(ids.size, records.length, 'ID must be unique');return ids; };
const books = new Map(catalog.map(b=>[b.id,b]));
const personIds=index(people), familyIds=index(families), placeIds=index(places), eventIds=index(events), figureIds=index(figures), sceneIds=index(maps);
for(const f of families){assert.ok(f.references.length);assert.ok(f.parents.length);assert.ok(f.children.length || f.parents.length > 1);for(const id of [...f.parents,...f.children])assert.ok(personIds.has(id),`Unknown person ${id}`);assert.ok(!f.children.some(id=>f.parents.includes(id)), 'Self-parent relation');}
// Catch cycles before recursive display receives any data.
function visit(id, path=new Set()){assert.ok(!path.has(id),`Cycle at ${id}`);for(const family of families.filter(f=>f.parents.includes(id)))for(const child of family.children)visit(child,new Set([...path,id]));}
for(const p of people)visit(p.id);
const chapterKeys=new Set();
for(const c of chapters){const b=books.get(c.bookId);assert.ok(b);assert.ok(c.number>=1&&c.number<=b.chapters);const key=`${c.bookId}/${c.number}`;assert.ok(!chapterKeys.has(key));chapterKeys.add(key);c.personIds.forEach(id=>assert.ok(personIds.has(id)));c.figureIds.forEach(id=>assert.ok(figureIds.has(id)));if(c.eventId)assert.ok(eventIds.has(c.eventId));}
for(const e of events){assert.ok(e.references.length);e.placeIds.forEach(id=>assert.ok(placeIds.has(id)));assert.ok(chapterKeys.has(`${e.chapter.bookId}/${e.chapter.number}`));}
for(const f of figures){if(f.kind==='genealogy'){assert.ok(personIds.has(f.rootId));f.initialExpanded.forEach(id=>assert.ok(familyIds.has(id)));}else if(f.kind==='chapter-records'){assert.ok(chapterRecords.some(r=>r.id===f.recordId));}else if(f.kind==='reading-guide'){assert.ok(readingGuides.some(g=>g.id===f.guideId));}else if(f.kind==='journey'){assert.ok(journeys.some(j=>j.id===f.journeyId));}else if(f.kind==='object-dimensions'){assert.ok(objects.some(o=>o.id===f.objectId));assert.ok(assets.some(a=>a.id===f.assetId));}else if(f.kind==='illustrated-sequence'){assert.ok(sequences.some(s=>s.id===f.sequenceId));}else{assert.equal(f.kind,'event-map');assert.ok(sceneIds.has(f.sceneId));const s=maps.find(s=>s.id===f.sceneId);assert.deepEqual(f.eventIds,s.states.map(s=>s.eventId));for(const id of f.eventIds)assert.ok(eventIds.has(id));}}
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
assert.equal(selectFamilies({families}, figures[0], true).length, families.filter(f=>!f.overviewAlternativeTo).length);
// Static deployment keeps all relative URLs valid beneath a repository subpath.
await stat('index.html');
console.log(`资料校验通过：${catalog.length} 书卷、${chapters.length} 章节样本、${people.length} 人物、${families.length} 家庭关系、${events.length} 地图节点。`);

const ark=objects.find(o=>o.id==='noah-ark');
assert.deepEqual(ark.dimensions,{length:300,width:50,height:30,unit:'cubit'});
assert.equal(ark.decks,3);
for(const asset of assets){assert.ok(asset.license);assert.ok(asset.sourceUrl.startsWith('https://'));if(asset.remoteUrl){assert.ok(asset.remoteUrl.startsWith('https://'));assert.ok(asset.creator && asset.licenseUrl);}else await stat(asset.path);}
const six=chapters.find(c=>c.bookId==='genesis'&&c.number===6);
assert.deepEqual(six.figureIds,['noah-ark-dimensions']);

const creation=sequences.find(s=>s.id==='creation-seven-days');
assert.deepEqual(creation.steps.map(s=>s.number),[1,2,3,4,5,6,7]);
for(const step of creation.steps){assert.ok(assets.some(a=>a.id===step.assetId));assert.equal(step.reference.bookId,'genesis');assert.equal(step.reference.chapter,step.number===7?2:1);assert.ok(step.reference.verseStart<=step.reference.verseEnd);}
assert.deepEqual(creation.steps[6].reference,{bookId:'genesis',chapter:2,verseStart:1,verseEnd:3});
assert.ok(chapters.some(c=>c.bookId==='genesis'&&c.number===2&&c.figureIds.includes('eden-chapter-two')));
assert.equal(creation.defaultVariant,'sweet');
assert.deepEqual(creation.variants.map(v=>v.id),['sweet','york']);
for(const variant of creation.variants){
  assert.deepEqual(Object.keys(variant.assetsByStep),creation.steps.map(step=>step.id));
  for(const ids of Object.values(variant.assetsByStep)){
    assert.ok(ids.length>0);
    for(const id of ids)assert.ok(assets.some(asset=>asset.id===id));
  }
}

const eden=sequences.find(s=>s.id==='eden-chapter-two');
assert.equal(eden.steps.length,8);
for(const step of eden.steps){assert.equal(step.reference.chapter,2);for(const id of step.assetIds){const asset=assets.find(a=>a.id===id);assert.ok(asset);assert.equal(asset.license,'CC BY-SA 3.0');}}
const fall=sequences.find(s=>s.id==='eden-chapter-three');
assert.equal(fall.steps.length,6);
assert.deepEqual(fall.steps.map(s=>[s.reference.verseStart,s.reference.verseEnd]),[[1,5],[6,7],[8,13],[14,19],[20,21],[22,24]]);
assert.equal(fall.steps[3].groups.length,3);
for(const step of fall.steps){assert.equal(step.reference.chapter,3);for(const id of step.assetIds){const asset=assets.find(a=>a.id===id);assert.ok(asset);assert.equal(asset.license,'CC BY-SA 3.0');}}

// Location annotations must attach to a known shared person and stay inside the viewport.
const geography = await read('data/geography.json');
for (const location of geography) {
  assert.ok(personIds.has(location.personId));
  assert.ok(location.disclaimer && location.sources.length);
  const [west,south,east,north] = location.bounds;
  for (const [lon,lat] of [...location.coast,...location.area,...location.river,...location.places.map(p=>p.coordinates)]) {
    assert.ok(lon>=west && lon<=east && lat>=south && lat<=north, 'Location outside map viewport');
  }
}

// Cross-chapter genealogy shares people but respects each chapter's scope.
const eleven = figures.find(f=>f.id==='genesis-11-lineage');
assert.deepEqual(selectFamilies({families},eleven).find(f=>f.id==='eber-descendants').children,['peleg']);
const ten=selectFamilies({families},figures.find(f=>f.id==='genesis-10-family'));
assert.ok(!ten.some(f=>f.parents.includes('peleg')), 'Chapter 11 additions must not leak into chapter 10');
assert.notEqual(people.find(p=>p.id==='nahor-ancestor'),people.find(p=>p.id==='nahor-terah'));
assert.equal(people.find(p=>p.id==='shem').genealogyAges.ageAtBirth,100);
const household=selectFamilies({families},figures.find(f=>f.id==='genesis-11-household'));
assert.deepEqual(household.find(f=>f.id==='abram-sarai').parents,['abram','sarai']);
assert.deepEqual(household.find(f=>f.id==='abram-sarai').children,[]);
for (const story of journeys) {
  story.personIds.forEach(id=>assert.ok(personIds.has(id)));
  assert.ok(story.steps.length>1);
  for (const step of story.steps) {
    assert.ok(placeIds.has(step.placeId));
    step.visitedPlaceIds.forEach(id=>assert.ok(placeIds.has(id)));
    if(step.destinationId)assert.ok(placeIds.has(step.destinationId));
    assert.ok(assets.some(a=>a.id===step.assetId && a.license==='CC BY-SA 3.0'));
    assert.ok(step.reference.verseStart<=step.reference.verseEnd);
    assert.ok(chapterKeys.has(step.reference.bookId+'/'+step.reference.chapter));
  }
}
const twelve=journeys.find(j=>j.id==='abram-journey');
assert.deepEqual(twelve.steps.map(s=>[s.reference.verseStart,s.reference.verseEnd]),[[1,3],[4,5],[6,7],[8,8],[9,9],[10,10],[11,13],[14,16],[17,19],[20,20]]);
assert.equal(twelve.steps.at(-1).placeId,'egypt-region');
const terahJourney=journeys.find(j=>j.id==='terah-journey');
assert.equal(terahJourney.steps.at(-1).placeId,'haran-place');
assert.equal(terahJourney.steps.at(-1).destinationId,'canaan-region');
for(const base of journeyMaps)base.placeIds.forEach(id=>assert.ok(placeIds.has(id)));
const babel=sequences.find(s=>s.id==='babel-story');
assert.deepEqual(babel.steps.map(s=>[s.reference.verseStart,s.reference.verseEnd]),[[1,2],[3,4],[5,7],[8,9]]);

// Map references are reusable resources with local previews and explicit licenses.
const mapLibrary=await read('data/map-library.json');
index(mapLibrary);
for(const resource of mapLibrary) {
  await stat(resource.previewPath);
  if(resource.originalPath)await stat(resource.originalPath);
  for(const field of ['sourceUrl','originalUrl','licenseUrl'])assert.ok(resource[field].startsWith('https://'));
  assert.ok(resource.creator && resource.license && resource.licenseNote);
  for(const chapter of resource.chapters)assert.ok(chapterKeys.has(chapter.bookId+'/'+chapter.number));
}

const chapter25=chapters.find(c=>c.bookId==='genesis'&&c.number===25);
assert.equal(chapter25.figureIds.length,4);
const abraham25=selectFamilies({families},figures.find(f=>f.id==='genesis-25-abraham'));
assert.deepEqual(abraham25.find(f=>f.id==='abram-sarai').children,['isaac']);
assert.deepEqual(abraham25.find(f=>f.id==='abraham-hagar').children,['ishmael']);
assert.equal(abraham25.find(f=>f.id==='abraham-keturah').children.length,6);
assert.equal(selectFamilies({families},figures.find(f=>f.id==='genesis-25-ishmael')).find(f=>f.id==='ishmael-children').children.length,12);
assert.deepEqual(families.find(f=>f.id==='isaac-rebekah').children,['esau','jacob']);
assert.deepEqual(selectFamilies({families},figures.find(f=>f.id==='genesis-11-household')).find(f=>f.id==='abram-sarai').children,[]);

// Compression must preserve important figures, junctions, spouses and exact generation order.
const { collectMinorGenerations } = await import('../src/genealogy-summary.js');
const overview = await read('presentation/genealogy-overview.json');
overview.importantIds.forEach(id=>assert.ok(personIds.has(id)));
const important=new Set(overview.importantIds);
assert.deepEqual(collectMinorGenerations('enosh',families,important),{hiddenIds:['enosh','kenan','mahalalel','jared'],nextId:'enoch-seth'});
assert.equal(collectMinorGenerations('noah',families,important),null);
assert.equal(collectMinorGenerations('eber',families,new Set()),null, 'Branching generations stay visible');
assert.equal(collectMinorGenerations('abram',families,new Set()),null, 'Spouse relations stay visible');
assert.deepEqual(collectMinorGenerations('enosh',families,new Set([...important,'mahalalel'])),{hiddenIds:['enosh','kenan'],nextId:'mahalalel'});
assert.equal(collectMinorGenerations('jared',families,important),null, 'Do not replace a lone generation with an ellipsis');

// Each chapter shows only relationships and births reached in that chapter.
const chapterView=id=>selectFamilies({families},figures.find(f=>f.id===id));
const twentyEight=chapterView('genesis-28-isaac');
assert.ok(!twentyEight.some(f=>f.parents.includes('jacob')));
assert.deepEqual(twentyEight.find(f=>f.id==='esau-mahalath').parents,['esau','mahalath-ishmael']);
assert.deepEqual(chapterView('genesis-28-mahalath')[0].children,['nebaioth','mahalath-ishmael']);
const twentyNine=chapterView('genesis-29-jacob');
assert.deepEqual(twentyNine.find(f=>f.id==='jacob-leah').children,['reuben','simeon','levi','judah']);
assert.deepEqual(twentyNine.find(f=>f.id==='jacob-rachel').children,[]);
assert.ok(!twentyNine.some(f=>f.parents.includes('bilhah')||f.parents.includes('zilpah')));
const thirty=chapterView('genesis-30-jacob');
assert.deepEqual(thirty.find(f=>f.id==='jacob-leah').children,['reuben','simeon','levi','judah','issachar','zebulun','dinah']);
assert.deepEqual(thirty.find(f=>f.id==='jacob-rachel').children,['joseph']);
assert.deepEqual(thirty.find(f=>f.id==='jacob-bilhah').children,['dan','naphtali']);
assert.deepEqual(thirty.find(f=>f.id==='jacob-zilpah').children,['gad','asher']);
assert.equal(thirty.flatMap(f=>f.children).length,12);
assert.equal(thirty.flatMap(f=>f.children).filter(id=>people.find(p=>p.id===id).gender==='female').length,1);
assert.ok(!thirty.some(f=>f.children.includes('benjamin')));
assert.equal(families.filter(f=>f.id==='ishmael-children').length,1);

// Reading guides cover each chapter in order and share the same people under new names.
const danielBook=catalog.find(b=>b.id==='daniel');
assert.equal(danielBook.chapters,12);
index(readingGuides);
for(const guide of readingGuides){
  guide.personIds.forEach(id=>assert.ok(personIds.has(id)));
  (guide.nameTableIds||[]).forEach(id=>assert.ok(people.find(p=>p.id===id).aliases.length));
  const ranges=guide.stages.map(s=>s.reference);
  assert.equal(ranges[0].verseStart,1);
  for(let i=0;i<ranges.length;i++){
    const r=ranges[i];assert.ok(['daniel','genesis','exodus'].includes(r.bookId));assert.equal(r.bookId,ranges[0].bookId);assert.ok(r.verseStart<=r.verseEnd);
    if(i)assert.equal(r.verseStart,ranges[i-1].verseEnd+1);
  }
  assert.equal(ranges.at(-1).verseEnd,{'daniel:1':21,'daniel:2':49,'daniel:3':30,'genesis:37':36,'genesis:38':30,'genesis:39':23,'genesis:49':33,'exodus:25':40}[ranges[0].bookId+':'+ranges[0].chapter]);
}
const guide1=readingGuides.find(g=>g.id==='daniel-1-guide');
assert.deepEqual(guide1.nameTableIds.map(id=>people.find(p=>p.id===id).aliases[0]),['伯提沙撒','沙得拉','米煞','亚伯尼歌']);
const guide2=readingGuides.find(g=>g.id==='daniel-2-guide');
assert.deepEqual(guide2.statue.parts.map(p=>p.id),['gold','silver','bronze','iron','mixed','stone']);
for(const part of guide2.statue.parts){
  assert.equal(part.dreamReference.chapter,2);assert.equal(part.explanationReference.chapter,2);
}
const guide3=readingGuides.find(g=>g.id==='daniel-3-guide');
assert.ok(!guide3.personIds.includes('daniel'),'Do not invent Daniel’s whereabouts in chapter 3');
assert.equal(guide3.personIds.filter(id=>guide1.nameTableIds.includes(id)).length,3);
assert.deepEqual(guide3.stages[2].reference,{bookId:'daniel',chapter:3,verseStart:16,verseEnd:18});

const thirtyFive=chapterView('genesis-35-jacob');
const twelveSons=thirtyFive.flatMap(f=>f.children);
assert.equal(twelveSons.length,12);
assert.equal(new Set(twelveSons).size,12);
assert.ok(twelveSons.every(id=>people.find(p=>p.id===id).gender==='male'));
assert.deepEqual(thirtyFive.find(f=>f.id==='jacob-rachel').children,['joseph','benjamin']);
assert.deepEqual(chapterView('genesis-30-jacob').find(f=>f.id==='jacob-rachel').children,['joseph']);
assert.deepEqual(chapterView('genesis-29-jacob').find(f=>f.id==='jacob-rachel').children,[]);
assert.ok(people.find(p=>p.id==='benjamin').aliases.includes('便俄尼'));
assert.ok(people.find(p=>p.id==='jacob').aliases.includes('以色列'));

const esau36=chapterView('genesis-36-esau');
assert.equal(esau36.filter(f=>f.parents[0]==='esau').length,3);
assert.deepEqual(esau36.find(f=>f.id==='esau-adah').children,['eliphaz-esau']);
assert.deepEqual(esau36.find(f=>f.id==='eliphaz-timna').parents,['eliphaz-esau','timna-eliphaz']);
assert.deepEqual(esau36.find(f=>f.id==='eliphaz-timna').children,['amalek-eliphaz']);
assert.ok(!esau36.some(f=>f.children.includes('korah-eliphaz-chief')));
const seir36=chapterView('genesis-36-seir');
assert.equal(seir36.find(f=>f.id==='seir-horite-children').children.length,7);
assert.ok(!seir36.some(f=>f.parents.includes('esau')));
assert.ok(!seir36.some(f=>f.children.includes('hemdan')),'Do not force the uncertain Dishon parentage');
assert.ok(!seir36.find(f=>f.id==='lotan-children').children.includes('timna-eliphaz'));
const kings36=chapterRecords.find(r=>r.id==='genesis-36-records');
assert.deepEqual(kings36.kingRows.map(k=>k.order),[1,2,3,4,5,6,7,8]);
assert.equal(kings36.chiefNames.length,11);
assert.equal(kings36.kingRows.filter(k=>people.find(p=>p.id===k.personId).name==='哈达').length,2);
kings36.kingRows.forEach(k=>{
  assert.ok(personIds.has(k.personId));
  assert.ok(!families.some(f=>f.parents.includes(k.personId)||f.children.includes(k.personId)),'Kings sequence must not invent parentage');
});
assert.ok(!selectFamilies({families},{},true).some(f=>f.id==='esau-mahalath'));
assert.ok(selectFamilies({families},{},true,'mahalath-ishmael').some(f=>f.id==='esau-mahalath'));
for(const f of families.filter(f=>f.overviewAlternativeTo))assert.ok(familyIds.has(f.overviewAlternativeTo));

// Genesis 38 keeps marriage, promised marriage and biological parentage distinct.
const judah38=chapterView('genesis-38-family');
assert.deepEqual(judah38.find(f=>f.id==='judah-shua-daughter').children,['er-judah','onan-judah','shelah-judah']);
assert.deepEqual(judah38.find(f=>f.id==='judah-tamar').children,['perez-judah','zerah-judah']);
assert.equal(judah38.find(f=>f.id==='judah-tamar').relationship,'生父母');
assert.equal(judah38.find(f=>f.id==='er-tamar').relationship,'夫妻');
assert.ok(!families.some(f=>f.parents.includes('shelah-judah')&&f.parents.includes('tamar-judah')));
assert.ok(!families.some(f=>f.parents.includes('onan-judah')&&f.parents.includes('tamar-judah')));
const guide37=readingGuides.find(g=>g.id==='genesis-37-guide');
assert.deepEqual(guide37.dreams.map(d=>d.kind),['sheaves','stars']);
const guide39=readingGuides.find(g=>g.id==='genesis-39-guide');
assert.equal(guide39.parallels.rows.length,3);
assert.deepEqual(guide39.parallels.columns,['波提乏家中','监狱中']);
for(const guide of readingGuides.filter(g=>g.crossChapterLinks)){
  assert.equal(guide.crossChapterLinks.length,3);
  for(const link of guide.crossChapterLinks)assert.ok(chapters.some(c=>'#/book/'+c.bookId+'/'+c.number===link.href));
}

// Genesis 49 follows the poem's order, with shared words for Simeon/Levi.
const guide49=readingGuides.find(g=>g.id==='genesis-49-guide');
assert.deepEqual(guide49.portraits.map(p=>p.personId),['reuben','simeon','levi','judah','zebulun','issachar','dan','gad','asher','naphtali','joseph','benjamin']);
for(const portrait of guide49.portraits){
  assert.ok(personIds.has(portrait.personId));
  assert.equal(portrait.reference.chapter,49);
  assert.ok(portrait.summary && portrait.message && portrait.note);
}
assert.deepEqual(guide49.portraits[1].reference,guide49.portraits[2].reference);
assert.equal(guide49.portraits.find(p=>p.personId==='dan').reference.verseEnd,17);

const ex25=readingGuides.find(g=>g.id==='exodus-25-guide');
assert.deepEqual(ex25.sanctuaryItems.map(i=>i.id),['ark','table','lampstand']);
assert.deepEqual(ex25.sanctuaryItems[0].dimensions,[2.5,1.5,1.5]);
assert.deepEqual(ex25.sanctuaryItems[1].dimensions,[2,1,1.5]);
assert.equal(ex25.sanctuaryItems[2].dimensions,null,'Do not invent lampstand dimensions');
for(const item of ex25.sanctuaryItems){assert.equal(item.reference.bookId,'exodus');assert.equal(item.reference.chapter,25);}
assert.ok(chapters.find(c=>c.bookId==='exodus'&&c.number===25).sources.some(s=>s.url.endsWith('/EXO.25')));
for(const item of ex25.sanctuaryItems){
  const asset=assets.find(a=>a.id===item.assetId);
  assert.ok(asset,'Each sanctuary object must reference a registered photo');
  assert.match(asset.license,/^CC BY-SA (3|4)\.0$/);
  assert.ok(asset.creator && asset.sourceUrl && asset.licenseUrl && asset.changes);
}

// Themes cover references across chapters without requiring chapter-page copies.
const topics=await read('data/topics.json');index(topics);
const tabernacle=topics.find(t=>t.id==='tabernacle');
index(tabernacle.sections);
const covered=new Map();
for(const section of tabernacle.sections){
  assert.ok(assets.some(a=>a.id===section.assetId));index(section.blocks);
  for(const item of section.blocks){
    assert.ok(item.summary && item.details.length);
    assert.ok(['layers','frame','interior','altar','court','priest','breastplate'].includes(item.diagram));
    if(item.assetId)assert.ok(assets.some(a=>a.id===item.assetId));
    const r=item.reference;assert.equal(r.bookId,'exodus');assert.ok(r.verseStart<=r.verseEnd);
    for(let verse=r.verseStart;verse<=r.verseEnd;verse++){
      const key=r.chapter+':'+verse;assert.ok(!covered.has(key),'No missing or duplicated passage grouping');covered.set(key,item.id);
    }
  }
}
for(const [chapter,last] of [[26,37],[27,21],[28,43]])for(let v=1;v<=last;v++)assert.ok(covered.has(chapter+':'+v));
assert.equal(covered.size,101);
assert.equal(tabernacle.processing.status,'prototype');
