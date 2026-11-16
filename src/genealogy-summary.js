// Only compress a straight, unbranched lineage. Never hide a spouse or junction.
export function collectMinorGenerations(startId, families, importantIds) {
  const hiddenIds = [];
  const seen = new Set();
  let nextId = startId;
  while (!importantIds.has(nextId) && !seen.has(nextId)) {
    seen.add(nextId);
    const outgoing = families.filter(f => f.parents.includes(nextId));
    if (outgoing.length !== 1) break;
    const family = outgoing[0];
    if (family.parents.length !== 1 || family.children.length !== 1) break;
    hiddenIds.push(nextId);
    nextId = family.children[0];
  }
  return hiddenIds.length >= 2 ? { hiddenIds, nextId } : null;
}
