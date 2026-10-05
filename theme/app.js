"use strict";
const $ = (id) => document.getElementById(id),
  palette = ["#e3aeca", "#bdb5e3", "#a7d7c9", "#eec19d", "#b5d1e8", "#dfd997"];
import { groupApps } from "./layout.js";
import { demoApps, demoIcon } from "./preview.js";
const isPreview = !window.Bridge;
let apps = [],
  query = "",
  opts = {
    size: 12,
    dark: false,
    paint: false,
    motion: false,
    shimmer: false,
    speed: 12,
    colors: {},
    favorites: [],
  };
try {
  opts = {
    ...opts,
    ...JSON.parse(localStorage.getItem("fold-button-wall") || "{}"),
  };
} catch (e) {}
opts.favorites = Array.isArray(opts.favorites)
  ? [...new Set(opts.favorites.filter((p) => typeof p === "string"))].slice(
      0,
      15,
    )
  : [];
if (isPreview && !localStorage.getItem("fold-button-wall")) {
  opts.favorites = demoApps.slice(0, 10).map((a) => a.packageName);
  opts.motion = true;
  opts.shimmer = true;
}
function save() {
  try {
    localStorage.setItem("fold-button-wall", JSON.stringify(opts));
  } catch (e) {}
}
function call(name, ...args) {
  if (isPreview) {
    if (name.startsWith("request")) {
      toast("浏览器预览：" + (args[0] || "此操作需要 Bridge Launcher"));
      suspended = false;
      animateStart();
    }
    return false;
  }
  try {
    return window.Bridge && Bridge[name](...args);
  } catch (e) {
    $("error").hidden = false;
    $("error").textContent = "暂时无法执行，请打开 Bridge 设置后重试。";
    return false;
  }
}
function theme() {
  let s = document.documentElement.style;
  s.setProperty("--size", opts.size + "px");
  s.setProperty("--bg", opts.dark ? "#19191d" : "#f2eef0");
  s.setProperty("--ink", opts.dark ? "#eae6e9" : "#38343d");
  s.setProperty("--edge", opts.dark ? "#7e7882" : "#938c95");
  if (window.Bridge) {
    call("requestSetStatusBarAppearance", opts.dark ? "light-fg" : "dark-fg");
    call(
      "requestSetNavigationBarAppearance",
      opts.dark ? "light-fg" : "dark-fg",
    );
  }
  insets();
}
function insets() {
  if (!window.Bridge) return;
  try {
    let a = JSON.parse(Bridge.getSystemBarsWindowInsets()),
      b = JSON.parse(Bridge.getDisplayCutoutWindowInsets());
    let d = 1;
    document.documentElement.style.setProperty(
      "--top",
      Math.max(a.top, b.top, 42) / d + "px",
    );
    document.documentElement.style.setProperty(
      "--bottom",
      Math.max(a.bottom, b.bottom, 26) / d + "px",
    );
  } catch (e) {}
}
function tile(text, action) {
  let b = document.createElement("button");
  b.className = "tile";
  let s = document.createElement("span");
  s.textContent = text;
  b.appendChild(s);
  b.addEventListener("click", action);
  return b;
}
function tint(b, pkg) {
  let k = opts.colors[pkg];
  if (k !== undefined) {
    b.style.background = palette[k % palette.length];
    b.dataset.color = k;
  } else {
    b.style.background = "";
    delete b.dataset.color;
  }
}
function cycle(b, pkg) {
  opts.colors[pkg] = ((opts.colors[pkg] ?? -1) + 1) % palette.length;
  tint(b, pkg);
  save();
}
let lanes = [],
  raf = 0,
  frameTimer = 0,
  lastFrame = 0,
  colorClock = 0,
  suspended = false;
function drawRow(r) {
  if (!(r.width > 0)) return;
  r.offset = ((r.offset % r.width) + r.width) % r.width;
  const d = window.devicePixelRatio || 1,
    x = Math.round((-r.width + r.offset) * d) / d;
  if (r.lastX === x) return;
  r.lastX = x;
  r.track.style.transform = `translate3d(${x}px,0,0)`;
}
function animateStart() {
  if (!raf && !frameTimer && !suspended && !document.hidden)
    frameTimer = setTimeout(() => {
      frameTimer = 0;
      if (!suspended && !document.hidden) raf = requestAnimationFrame(step);
    }, 33);
}
function animateStop() {
  cancelAnimationFrame(raf);
  clearTimeout(frameTimer);
  frameTimer = 0;
  raf = 0;
  lastFrame = 0;
  for (const a of document.getAnimations()) a.cancel();
}
function step(now) {
  raf = 0;
  if (suspended || document.hidden) return;
  let dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 0;
  lastFrame = now;
  let modal = !!document.querySelector("dialog[open]");
  for (let r of lanes) {
    if (!r.drag && !modal) {
      r.velocity *= Math.exp(-4 * dt);
      r.offset +=
        (r.velocity + (opts.motion ? r.direction * opts.speed : 0)) * dt;
    }
    drawRow(r);
  }
  if (opts.shimmer && !modal) {
    colorClock += dt;
    if (colorClock > 0.25) {
      colorClock = 0;
      let r = lanes[Math.floor(Math.random() * lanes.length)];
      if (r) {
        let item = r.items[Math.floor(Math.random() * r.items.length)];
        if (item && item.pkg) {
          let bg = palette[Math.floor(Math.random() * palette.length)],
            base =
              opts.colors[item.pkg] === undefined
                ? opts.dark
                  ? "#19191d"
                  : "#f2eef0"
                : palette[opts.colors[item.pkg] % palette.length];
          for (let btn of r.track.querySelectorAll("button"))
            if (btn.dataset.pkg === item.pkg)
              btn.animate(
                [
                  { backgroundColor: base },
                  { backgroundColor: bg, offset: 0.12 },
                  { backgroundColor: bg, offset: 0.6 },
                  { backgroundColor: base },
                ],
                { duration: 1500, easing: "ease-out" },
              );
        }
      }
    }
  }
  if (
    opts.motion ||
    opts.shimmer ||
    lanes.some((r) => r.drag || Math.abs(r.velocity) > 1)
  )
    animateStart();
  else lastFrame = 0;
}
function openSettings() {
  $("density").value = opts.size;
  for (let k of ["dark", "paint", "motion", "shimmer"]) $(k).checked = opts[k];
  $("speed").value = opts.speed;
  $("count").textContent = apps.length + " 个应用";
  $("settings").showModal();
}
function resumeMotion() {
  suspended = false;
  for (const row of lanes) {
    row.drag = false;
    row.velocity = 0;
  }
  animateStart();
}
function homeAction(name, pkg) {
  if (isPreview) {
    toast("浏览器预览：" + pkg);
    return false;
  }
  const ok = call(name, pkg);
  if (ok !== true) {
    resumeMotion();
    $("error").hidden = false;
    $("error").textContent = "未能打开应用，请按 Home 返回桌面后重试。";
    return false;
  }
  $("error").hidden = true;
  suspended = true;
  animateStop();
  return true;
}
function appButton(item) {
  let held = false,
    timer = 0,
    moved = false,
    x = 0,
    y = 0;
  let b = tile(item.text, () => {
    if (held || moved) {
      held = false;
      return;
    }
    if (item.empty) {
      $("needle").value = query;
      $("search").showModal();
      $("needle").focus();
      return;
    }
    if (item.action) {
      item.action();
      return;
    }
    cycle(b, item.pkg);
    for (let other of $("wall").querySelectorAll("button"))
      if (other.dataset.pkg === item.pkg) tint(other, item.pkg);
    if (!opts.paint) {
      homeAction("requestLaunchApp", item.pkg);
    }
  });
  if (!item.pkg) return b;
  b.dataset.pkg = item.pkg;
  let img = document.createElement("img");
  img.src = isPreview
    ? demoIcon(item.text)
    : call("getDefaultAppIconURL", item.pkg);
  img.alt = "";
  img.draggable = false;
  b.prepend(img);
  tint(b, item.pkg);
  b.addEventListener("pointerdown", (e) => {
    held = false;
    moved = false;
    x = e.clientX;
    y = e.clientY;
    timer = setTimeout(() => {
      held = true;
      homeAction("requestOpenAppInfo", item.pkg);
    }, 600);
  });
  b.addEventListener("pointermove", (e) => {
    if (Math.abs(e.clientX - x) + Math.abs(e.clientY - y) > 8) {
      moved = true;
      clearTimeout(timer);
    }
  });
  for (let e of ["pointerup", "pointercancel", "pointerleave"])
    b.addEventListener(e, () => clearTimeout(timer));
  b.addEventListener("contextmenu", (e) => e.preventDefault());
  return b;
}
function bindDrag(lane, r) {
  let startX = 0,
    startY = 0,
    lastX = 0,
    lastTime = 0,
    active = false,
    horizontal = false;
  movedReset();
  function movedReset() {
    r.suppressUntil = 0;
  }
  lane.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary) return;
    suspended = false;
    active = true;
    horizontal = false;
    startX = lastX = e.clientX;
    startY = e.clientY;
    lastTime = e.timeStamp;
    r.drag = true;
    r.velocity = 0;
    animateStart();
  });
  lane.addEventListener("pointermove", (e) => {
    if (!active) return;
    let dx = e.clientX - startX,
      dy = e.clientY - startY;
    if (!horizontal && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
      active = false;
      r.drag = false;
      return;
    }
    if (!horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      horizontal = true;
      lane.setPointerCapture(e.pointerId);
    }
    if (horizontal) {
      let elapsed = Math.max(1, e.timeStamp - lastTime);
      r.offset += e.clientX - lastX;
      drawRow(r);
      r.velocity = Math.max(
        -1800,
        Math.min(1800, ((e.clientX - lastX) / elapsed) * 1000),
      );
      r.suppressUntil = performance.now() + 300;
      lastX = e.clientX;
      lastTime = e.timeStamp;
      animateStart();
    }
  });
  function end() {
    active = false;
    r.drag = false;
    if (horizontal) r.suppressUntil = performance.now() + 300;
    animateStart();
  }
  lane.addEventListener("pointerup", end);
  lane.addEventListener("pointercancel", () => {
    r.velocity = 0;
    end();
  });
  lane.addEventListener(
    "click",
    (e) => {
      if (performance.now() < r.suppressUntil) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
}
function render() {
  animateStop();
  lanes = [];
  let ctx = document.createElement("canvas").getContext("2d");
  ctx.font = opts.size + "px Arial";
  let groups = groupApps(
    apps,
    query,
    opts.size === 10 ? 20 : opts.size === 15 ? 14 : 17,
    (i) => ctx.measureText(i.text).width + (i.pkg ? opts.size + 19 : 14),
    opts.favorites,
  );
  let top =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--top"),
      ) || 42,
    bottom =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--bottom"),
      ) || 26;
  document.documentElement.style.setProperty(
    "--row",
    (query
      ? opts.size + 24
      : Math.max(
          opts.size + 12,
          (innerHeight - top - bottom) / (groups.length + 1),
        )) + "px",
  );
  let f = document.createDocumentFragment(),
    tools = document.createElement("section");
  tools.className = "lane tools";
  tools.appendChild(
    tile(query ? "Search: " + query + " ×" : "Search · 搜索应用", () => {
      $("needle").value = query;
      $("search").showModal();
      $("needle").focus();
    }),
  );
  tools.appendChild(tile("⚙", openSettings));
  f.appendChild(tools);
  for (let i = 0; i < groups.length; i++) {
    let lane = document.createElement("section");
    lane.className = "lane";
    let track = document.createElement("div");
    track.className = "track";
    let seg = document.createElement("div");
    seg.className = "segment";
    seg.style.minWidth = innerWidth + 32 + "px";
    for (let item of groups[i]) seg.appendChild(appButton(item));
    track.appendChild(seg);
    lane.appendChild(track);
    f.appendChild(lane);
    lanes.push({
      lane,
      track,
      segment: seg,
      items: groups[i],
      offset: 0,
      width: 1,
      velocity: 0,
      drag: false,
      direction: i % 2 ? -1 : 1,
    });
  }
  $("wall").replaceChildren(f);
  for (let [i, r] of lanes.entries()) {
    r.width = r.segment.getBoundingClientRect().width;
    r.offset = 0;
    for (let c = 0; c < 2; c++) {
      let seg = document.createElement("div");
      seg.className = "segment";
      seg.style.width = r.width + "px";
      seg.setAttribute("aria-hidden", "true");
      for (let item of r.items) {
        let b = appButton(item);
        b.tabIndex = -1;
        seg.appendChild(b);
      }
      r.track.appendChild(seg);
    }
    drawRow(r);
    bindDrag(r.lane, r);
  }
  animateStart();
}
async function load() {
  if (isPreview) {
    apps = demoApps;
    render();
    return;
  }
  try {
    let data;
    for (let attempt = 0; attempt < 7; attempt++) {
      let r = await fetch(Bridge.getAppsURL(), { cache: "no-store" });
      if (!r.ok) throw new Error("应用列表读取失败");
      data = await r.json();
      if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, 200));
    }
    apps = data.apps
      .filter((a) => !a.packageName.startsWith("com.tored.bridgelauncher"))
      .sort((a, b) =>
        a.label.toLowerCase() < b.label.toLowerCase()
          ? -1
          : a.label.toLowerCase() > b.label.toLowerCase()
            ? 1
            : a.packageName.localeCompare(b.packageName),
      );
    $("error").hidden = true;
    let signature = JSON.stringify(apps.map((a) => [a.packageName, a.label]));
    if (signature !== load.signature) {
      load.signature = signature;
      render();
    }
  } catch (e) {
    $("error").hidden = false;
    $("error").textContent = e.message;
  }
}
$("needle").addEventListener("input", (e) => {
  query = e.target.value;
  render();
});
$("searchDone").onclick = () => $("search").close();
$("clearSearch").onclick = () => {
  query = "";
  $("search").close();
  render();
};
$("closeSettings").onclick = () => $("settings").close();
$("density").onchange = (e) => {
  opts.size = Number(e.target.value);
  save();
  theme();
  render();
};
for (let k of ["dark", "paint", "motion", "shimmer"])
  $(k).onchange = (e) => {
    opts[k] = e.target.checked;
    save();
    theme();
    render();
  };
$("speed").onchange = (e) => {
  opts.speed = Number(e.target.value);
  save();
  animateStart();
};
$("clearColors").onclick = () => {
  opts.colors = {};
  save();
  render();
};
$("refresh").onclick = () => {
  $("settings").close();
  load();
};
$("bridgeSettings").onclick = () => call("requestOpenBridgeSettings");
$("oneui").onclick = () =>
  call("requestLaunchApp", "com.sec.android.app.launcher");
document.addEventListener("visibilitychange", () => {
  if (document.hidden) animateStop();
  else {
    suspended = false;
    animateStart();
  }
});
window.onBridgeEvent = (e) => {
  if (e.name === "beforePause") {
    suspended = true;
    animateStop();
  }
  if (e.name === "afterResume") {
    resumeMotion();
    load();
  }
  if (["appInstalled", "appChanged", "appRemoved"].includes(e.name)) load();
  if (e.name.toLowerCase().includes("insets")) insets();
  if (e.name === "newIntent") {
    resumeMotion();
    query = "";
    render();
    scrollTo(0, 0);
  }
};
window.addEventListener("resize", () => {
  insets();
  if (apps.length) render();
});
theme();
load();
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 2200);
}
function drawFavorites() {
  const selected = $("selectedFavorites");
  selected.replaceChildren();
  for (const [i, pkg] of opts.favorites.entries()) {
    const app = apps.find((a) => a.packageName === pkg);
    const row = document.createElement("div");
    row.className = "favoriteRow";
    const name = document.createElement("span");
    name.textContent = i + 1 + ". " + (app?.label || pkg + "（未安装）");
    row.appendChild(name);
    for (const [text, change, disabled] of [
      [
        "↑",
        () => {
          [opts.favorites[i - 1], opts.favorites[i]] = [
            opts.favorites[i],
            opts.favorites[i - 1],
          ];
        },
        i === 0,
      ],
      [
        "↓",
        () => {
          [opts.favorites[i + 1], opts.favorites[i]] = [
            opts.favorites[i],
            opts.favorites[i + 1],
          ];
        },
        i === opts.favorites.length - 1,
      ],
      ["移除", () => opts.favorites.splice(i, 1), false],
    ]) {
      const button = document.createElement("button");
      button.textContent = text;
      button.disabled = disabled;
      button.setAttribute("aria-label", text + " " + (app?.label || pkg));
      button.onclick = () => {
        change();
        save();
        render();
        drawFavorites();
      };
      row.appendChild(button);
    }
    selected.appendChild(row);
  }
  const available = $("availableFavorites");
  available.replaceChildren();
  const needle = $("favoriteNeedle").value.toLowerCase();
  for (const app of apps.filter(
    (a) =>
      !opts.favorites.includes(a.packageName) &&
      (a.label.toLowerCase().includes(needle) ||
        a.packageName.toLowerCase().includes(needle)),
  )) {
    const button = document.createElement("button");
    button.textContent = "＋ " + app.label;
    button.disabled = opts.favorites.length >= 15;
    button.onclick = () => {
      opts.favorites.push(app.packageName);
      save();
      render();
      drawFavorites();
    };
    available.appendChild(button);
  }
  $("favoriteCount").textContent = opts.favorites.length + " / 15 个常用应用";
}
$("editFavorites").onclick = () => {
  $("settings").close();
  $("favoriteNeedle").value = "";
  drawFavorites();
  $("favorites").showModal();
};
$("favoriteNeedle").oninput = drawFavorites;
$("favoritesDone").onclick = () => $("favorites").close();
if (isPreview) {
  $("previewNotice").hidden = false;
  document.title = "Fold Tile · 浏览器预览";
}
