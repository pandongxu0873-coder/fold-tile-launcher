// Fictional local data. No phone app names, icons or screenshots are shipped.
const names = [
  "聊天 Chat",
  "邮件 Mail",
  "音乐 Music",
  "相机 Camera",
  "地图 Maps",
  "笔记 Notes",
  "日历 Calendar",
  "浏览器 Browser",
  "天气 Weather",
  "时钟 Clock",
  "图库 Gallery",
  "阅读 Reader",
  "任务 Tasks",
  "播客 Podcasts",
  "文件 Files",
  "计算器 Calculator",
  "运动 Fitness",
  "录音 Recorder",
  "设置 Settings",
  "视频 Video",
];
export const demoApps = Array.from({ length: 100 }, (_, i) => ({
  label:
    names[i % names.length] + (i < 20 ? "" : " " + (Math.floor(i / 20) + 1)),
  packageName: "demo.app" + String(i).padStart(3, "0"),
}));
export function demoIcon(label) {
  const text = label.slice(0, 1);
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" rx="5" fill="#bdb5e3"/><text x="12" y="17" text-anchor="middle" font-size="14" fill="#302d37">' +
        text +
        "</text></svg>",
    )
  );
}
