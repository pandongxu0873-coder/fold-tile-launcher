export function groupApps(
  appList,
  searchQuery,
  rowLimit,
  measure,
  favoritePackages = [],
) {
  let filtered = appList.filter(
    (a) =>
      !searchQuery ||
      a.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.packageName.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  let pinned = searchQuery
    ? []
    : favoritePackages
        .map((pkg) => filtered.find((a) => a.packageName === pkg))
        .filter(Boolean);
  let remaining = filtered
    .filter((a) => !pinned.includes(a))
    .map((a) => ({ text: a.label, pkg: a.packageName }));
  let groups = [];
  for (let i = 0; i < pinned.length; i += 5)
    groups.push(
      pinned
        .slice(i, i + 5)
        .map((a) => ({ text: a.label, pkg: a.packageName })),
    );
  if (!remaining.length && !groups.length)
    remaining.push({
      text: "没有匹配应用",
      empty: true,
    });
  let rows = searchQuery
    ? Math.max(1, Math.ceil(remaining.length / 7))
    : Math.min(remaining.length, Math.max(1, rowLimit - 1 - groups.length));
  let widths = remaining.map(measure),
    total = widths.reduce((a, b) => a + b, 0),
    at = 0;
  for (let n = 0; n < rows; n++) {
    let group = [],
      w = 0,
      target = total / (rows - n);
    while (
      at < remaining.length &&
      (group.length === 0 || w < target) &&
      remaining.length - at > rows - n - 1
    ) {
      group.push(remaining[at]);
      w += widths[at++];
    }
    total -= w;
    groups.push(group);
  }
  if (at < remaining.length) groups.at(-1).push(...remaining.slice(at));
  return groups;
}
