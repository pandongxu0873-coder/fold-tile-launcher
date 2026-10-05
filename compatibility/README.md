# 非官方 Bridge Fold 兼容补丁

上游：[Bridge Launcher v0.1.0-alpha](https://github.com/bridgelauncher/launcher/releases/tag/v0.1.0-alpha)，MIT 许可，版权归 Tored。API 参考：[Bridge.d.ts](https://github.com/bridgelauncher/api/blob/master/Bridge.d.ts)。

官方 WebView 初始化中，`onCreated()` 的 `loadUrl()` 先于 WebViewClient 注册，首次请求可能无法通过本地拦截器。补丁把 WebViewClient / WebChromeClient 注册放到 onCreated 前面，并保留后续注册流程。

FoldFix 2 同时修复 Activity 重建时的桌面连接：旧 Activity 销毁时只清理自己持有的 context，返回前台或接收 Home 时重新绑定当前 Activity。主题也检查打开应用的返回值，失败时显示提示并恢复流动，不再永久暂停。

还修改应用名、独立包名、AndroidX provider 以及内部广播权限名，增加三星 GET_APP_LIST 权限声明，供已测试设备读取应用列表。应用仍需用户在系统中授予其要求的存储权限。

## 重建

依赖：JDK、Android SDK build-tools（zipalign / apksigner）、Apktool **3.0.3**、Python 3。补丁匹配官方 **v0.1.0-alpha** 的反编译结构，版本不匹配会停止，不应强行套用其他版本。

从上游 Release 获取 APK，保存为 `bridge-official.apk`：

```sh
apktool d -f bridge-official.apk -o bridge-decoded
python3 patch.py bridge-decoded
apktool b -f bridge-decoded -o bridge-unsigned.apk
zipalign -f 4 bridge-unsigned.apk bridge-aligned.apk
# 使用你自己的 Android 签名密钥，按 apksigner 提示输入密码。
apksigner sign --ks your-release.keystore --out Bridge-FoldFix.apk bridge-aligned.apk
apksigner verify --verbose Bridge-FoldFix.apk
```

修改完成的 APK 不使用上游签名，与官方版本独立安装。原上游源码及授权链接见上述地址，发布时应附上 LICENSE.upstream。本仓库不提供签名私钥。
