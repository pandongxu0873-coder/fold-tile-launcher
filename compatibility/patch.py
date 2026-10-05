from pathlib import Path
import sys
root=Path(sys.argv[1]);old='com.tored.bridgelauncher';new=old+'.foldfix'
p=root/'smali_classes2/com/tored/bridgelauncher/webview/WebViewKt$WebView$13.smali'
s=p.read_text();needle='    .line 235\n    invoke-interface {p1, v0}, Lkotlin/jvm/functions/Function1;->invoke(Ljava/lang/Object;)Ljava/lang/Object;'
assert s.count(needle)==1
# Attach request interception before onCreated() triggers initial loadUrl().
s=s.replace(needle,'    invoke-virtual {v0, v3}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V\n\n    invoke-virtual {v0, v4}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V\n\n'+needle);p.write_text(s)
p=root/'AndroidManifest.xml';s=p.read_text().replace(f'package="{old}"',f'package="{new}"').replace(old+'.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',new+'.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION').replace(old+'.androidx-startup',new+'.androidx-startup')
s=s.replace('<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES"/>','<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES"/>\n    <uses-permission android:name="com.samsung.android.permission.GET_APP_LIST"/>')
p.write_text(s)
p=root/'res/values/strings.xml';s=p.read_text().replace('<string name="app_name">Bridge Launcher</string>','<string name="app_name">Bridge · Fold修复版</string>');p.write_text(s)
for p in (root/'res').glob('values-*/strings.xml'):
 s=p.read_text();import re
 s=re.sub(r'(<string name="app_name">)[^<]*(</string>)',r'\1Bridge · Fold修复版\2',s);p.write_text(s)
p=root/'apktool.yml';p.write_text(p.read_text().replace('versionName: 0.1.0alpha','versionName: 0.1.0alpha-foldfix1'))
print('Startup client order and independent package patched')

from lifecycle_patch import patch
patch(root)
