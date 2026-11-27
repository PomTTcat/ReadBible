export async function loadData() {
  const files = { topics:'data/topics', chapterRecords: 'data/chapter-records', readingGuides: 'data/reading-guides', genealogyOverview: 'presentation/genealogy-overview', mapLibrary: 'data/map-library', journeys: 'data/journeys', journeyMaps: 'presentation/journey-maps', geography: 'data/geography', catalog: 'data/catalog', people: 'data/people', families: 'data/families', places: 'data/places', events: 'data/events', chapters: 'data/chapters', sequences:'data/sequences', objects:'data/objects', assets:'data/assets', figures: 'presentation/figures', maps: 'presentation/maps' };
  const entries = await Promise.all(Object.entries(files).map(async ([key, path]) => {
    const response = await fetch(new URL(`../${path}.json`, import.meta.url));
    if (!response.ok) throw new Error(`无法读取 ${path}：${response.status}`);
    return [key, await response.json()];
  }));
  const data = Object.fromEntries(entries);
  for (const key of ['chapterRecords', 'readingGuides', 'journeys', 'journeyMaps', 'people', 'places', 'events', 'sequences', 'objects', 'assets', 'figures', 'maps']) data[`${key}ById`] = new Map(data[key].map(item => [item.id, item]));
  return data;
}
