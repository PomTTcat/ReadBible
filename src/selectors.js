// Chapter views select from shared records; they never copy the underlying facts.
export function selectFamilies(data, config, global = false) {
  if (global) return data.families;
  const ids = new Set(config.familyIds || data.families.map(f => f.id));
  const people = config.personIds ? new Set(config.personIds) : null;
  return data.families.filter(f => ids.has(f.id)).map(f => {
    const parents = f.parents.filter(id => !people || people.has(id));
    return {
      ...f,
      parents,
      relationship: f.parents.length > 1 && parents.length < 2 ? undefined : f.relationship,
      children: f.children.filter(id => !people || people.has(id))
    };
  }).filter(f => f.parents.length && f.children.length);
}
