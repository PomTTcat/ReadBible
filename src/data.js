export async function loadData() {
  const files = { catalog: 'data/catalog', people: 'data/people', families: 'data/families', places: 'data/places', events: 'data/events', chapters: 'data/chapters', figures: 'presentation/figures', maps: 'presentation/maps' };
  const entries = await Promise.all(Object.entries(files).map(async ([key, path]) => {
    const response = await fetch(new URL(`../${path}.json`, import.meta.url));
    if (!response.ok) throw new Error(`无法读取 ${path}：${response.status}`);
    return [key, await response.json()];
  }));
  const data = Object.fromEntries(entries);
  for (const key of ['people', 'places', 'events', 'figures', 'maps']) data[`${key}ById`] = new Map(data[key].map(item => [item.id, item]));
  return data;
}
