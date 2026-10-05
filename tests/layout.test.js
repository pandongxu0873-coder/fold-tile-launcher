import assert from "node:assert/strict";
import { test } from "node:test";
import { groupApps } from "../theme/layout.js";
const apps = Array.from({ length: 190 }, (_, i) => ({
  label: "App " + i,
  packageName: "test.app" + i,
}));
const measure = (i) => i.text.length * 12 + 30;
test("favorites lead in requested order, without duplicating or losing apps", () => {
  const favorites = [
    "test.app180",
    "test.app5",
    "test.app80",
    "test.app0",
    "test.app70",
    "test.app40",
  ];
  for (const density of [14, 17, 20]) {
    const rows = groupApps(apps, "", density, measure, favorites),
      flat = rows.flat();
    assert.equal(rows.length, density - 1);
    assert.equal(flat.length, apps.length);
    assert.equal(new Set(flat.map((a) => a.pkg)).size, apps.length);
    assert.deepEqual(
      rows
        .slice(0, 2)
        .flat()
        .map((a) => a.pkg),
      favorites,
    );
  }
});
test("new installs appear and removed favorites do not create phantom apps", () => {
  let changed = apps.slice(1).concat({ label: "New", packageName: "test.new" });
  const flat = groupApps(changed, "", 17, measure, [
    "test.app0",
    "test.app5",
  ]).flat();
  assert.equal(flat[0].pkg, "test.app5");
  assert(!flat.some((a) => a.pkg === "test.app0"));
  assert(flat.some((a) => a.pkg === "test.new"));
});
test("name and package searches ignore the favorite section", () => {
  const results = groupApps(apps, "TEST.APP18", 17, measure, [
    "test.app5",
  ]).flat();
  assert.equal(results.length, 11);
  assert(results.every((a) => a.pkg.startsWith("test.app18")));
  assert.equal(
    groupApps(apps, "App 189", 17, measure, []).flat()[0].pkg,
    "test.app189",
  );
});
test("empty list and all-favorite list produce usable rows", () => {
  assert.equal(groupApps([], "", 17, measure).flat()[0].text, "没有匹配应用");
  assert.equal(
    groupApps(
      apps.slice(0, 5),
      "",
      17,
      measure,
      apps.slice(0, 5).map((a) => a.packageName),
    ).flat().length,
    5,
  );
});
