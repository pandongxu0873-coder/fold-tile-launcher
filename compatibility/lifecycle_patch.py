"""Repair context ownership on Activity recreation. Run on a decoded FoldFix 1 APK."""
from pathlib import Path
import sys

def patch(root):
    base=root/'smali_classes2/com/tored/bridgelauncher/ui2/home'
    p=base/'HomeScreen2VM.smali';s=p.read_text()
    old='''.method public final beforeDestroy()V
    .locals 2

    .line 167
    iget-object v0, p0, Lcom/tored/bridgelauncher/ui2/home/HomeScreen2VM;->_jsToBridgeInterface:Lcom/tored/bridgelauncher/api2/jstobridge/JSToBridgeAPI;

    const/4 v1, 0x0

    invoke-virtual {v0, v1}, Lcom/tored/bridgelauncher/api2/jstobridge/JSToBridgeAPI;->setHomeScreenContext(Landroid/content/Context;)V

    return-void
.end method'''
    new='''.method public final beforeDestroy(Landroid/content/Context;)V
    .locals 2

    iget-object v0, p0, Lcom/tored/bridgelauncher/ui2/home/HomeScreen2VM;->_jsToBridgeInterface:Lcom/tored/bridgelauncher/api2/jstobridge/JSToBridgeAPI;

    invoke-virtual {v0}, Lcom/tored/bridgelauncher/api2/jstobridge/JSToBridgeAPI;->getHomeScreenContext()Landroid/content/Context;
    move-result-object v1

    if-ne v1, p1, :context_owned_elsewhere

    const/4 v1, 0x0
    invoke-virtual {v0, v1}, Lcom/tored/bridgelauncher/api2/jstobridge/JSToBridgeAPI;->setHomeScreenContext(Landroid/content/Context;)V

    :context_owned_elsewhere
    return-void
.end method'''
    assert s.count(old)==1,'Unexpected beforeDestroy implementation'
    p.write_text(s.replace(old,new))
    p=base/'HomeScreenActivity.smali';s=p.read_text()
    old='invoke-virtual {v0}, Lcom/tored/bridgelauncher/ui2/home/HomeScreen2VM;->beforeDestroy()V'
    assert s.count(old)==1
    s=s.replace(old,'invoke-virtual {v0, p0}, Lcom/tored/bridgelauncher/ui2/home/HomeScreen2VM;->beforeDestroy(Landroid/content/Context;)V')
    for reg,method in [('v0','afterResume'),('p1','onNewIntent')]:
        old=f'invoke-virtual {{{reg}}}, Lcom/tored/bridgelauncher/ui2/home/HomeScreen2VM;->{method}()V'
        assert s.count(old)==1
        s=s.replace(old,f'invoke-virtual {{{reg}, p0}}, Lcom/tored/bridgelauncher/ui2/home/HomeScreen2VM;->afterCreate(Landroid/content/Context;)V\n\n    '+old)
    p.write_text(s)
    p=root/'apktool.yml';s=p.read_text().replace('versionCode: 6','versionCode: 7').replace('versionName: 0.1.0alpha-foldfix1','versionName: 0.1.0alpha-foldfix2');p.write_text(s)
    p=root/'AndroidManifest.xml';s=p.read_text().replace('<manifest xmlns:android=', '<manifest android:versionCode="7" android:versionName="0.1.0alpha-foldfix2" xmlns:android=');p.write_text(s)
    print('Lifecycle context ownership and foreground rebind patched')

if __name__=='__main__':patch(Path(sys.argv[1]))
