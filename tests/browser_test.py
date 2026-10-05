"""Local demo and Bridge contract checks; no real phone or personal data."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import json

ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'theme')))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
def click_app(page):
    # A continuously moving tile cannot satisfy Playwright's stability gate.
    # Click its actual visible hit box, as a finger would, without stopping it.
    rect=page.locator('.segment').nth(1).locator('[data-pkg]').bounding_box()
    width=page.viewport_size['width']
    page.mouse.click(min(width-10,max(10,rect['x']+rect['width']/2)),rect['y']+rect['height']/2)

results={}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':475,'height':750})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url);page.wait_for_selector('.track')
    assert page.locator('#previewNotice').is_visible()
    for width,height in [(475,750),(932,704),(360,800)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(150)
        assert page.evaluate('document.documentElement.scrollWidth')==width
        assert page.evaluate('document.documentElement.scrollHeight')<=height+1
        before=page.locator('.track').first.evaluate('(e)=>e.style.transform')
        rect=page.locator('.tools').bounding_box();page.wait_for_timeout(300)
        assert page.locator('.track').first.evaluate('(e)=>e.style.transform')!=before
        assert page.locator('.tools').bounding_box()==rect
    results['responsive_motion_and_fixed_search']='passed'
    page.set_viewport_size({'width':475,'height':750})
    page.locator('.tools button').last.click()
    page.locator('#motion').uncheck();page.locator('#shimmer').uncheck()
    page.locator('#editFavorites').click()
    old=page.locator('.favoriteRow span').all_text_contents()
    add=page.locator('#availableFavorites button').first
    added_name=add.inner_text()[2:];add.click()
    assert page.locator('.favoriteRow span').last.inner_text().endswith(added_name)
    page.locator('.favoriteRow').last.locator('button').first.click()
    names=page.locator('.favoriteRow span').all_text_contents()
    assert names[-2].endswith(added_name)
    page.locator('#favoritesDone').click()
    page.reload();page.wait_for_selector('.track')
    page.locator('.tools button').last.click();page.locator('#editFavorites').click()
    assert page.locator('.favoriteRow span').all_text_contents()==names
    page.locator('.favoriteRow').nth(len(names)-2).locator('button').last.click()
    assert len(page.locator('.favoriteRow span').all_text_contents())==len(old)
    page.locator('#favoritesDone').click()
    page.locator('.tools button').first.click();page.locator('#needle').fill('demo.app099');page.locator('#searchDone').click()
    assert page.locator('.segment').first.locator('[data-pkg]').count()==1
    click_app(page)
    assert page.locator('#toast').is_visible()
    page.locator('.tools button').first.click();page.locator('#needle').fill('no-match-anywhere');page.locator('#searchDone').click()
    rect=page.locator('.segment').nth(1).locator('button').bounding_box();page.mouse.click(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
    assert page.locator('#search').is_visible();page.locator('#clearSearch').click()
    results['favorites_reorder_remove_persist_and_search']='passed'
    # Export only synthetic preview imagery.
    page.locator('.tools button').first.click();page.locator('#clearSearch').click()
    page.set_viewport_size({'width':932,'height':704});page.wait_for_timeout(150)
    page.locator('.tools button').last.click();page.locator('#motion').check();page.locator('#shimmer').check();page.locator('#closeSettings').click();page.wait_for_timeout(2300)
    (ROOT/'docs').mkdir(exist_ok=True)
    page.screenshot(path=str(ROOT/'docs/preview.png'))
    page.close()

    # Contract mock intentionally returns false for failed native requests.
    data=[{'label':f'Test App {i:03}','packageName':f'test.app{i}'} for i in range(130)]
    page=browser.new_page(viewport={'width':475,'height':750},has_touch=True)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''window.__calls=[];window.__failLaunch=false;localStorage.setItem('fold-button-wall',JSON.stringify({motion:true,shimmer:true}));
      window.Bridge=new Proxy({}, {get:(_,name)=>{
      if(name==='getAppsURL')return ()=>location.origin+'/apps';
      if(name==='getSystemBarsWindowInsets'||name==='getDisplayCutoutWindowInsets')return ()=>JSON.stringify({top:42,bottom:26,left:0,right:0});
      if(name==='getDefaultAppIconURL')return ()=>'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/%3E';
      return (...args)=>{window.__calls.push({name,args});return !window.__failLaunch};}});''')
    page.route('**/apps',lambda route:route.fulfill(json={'apps':data}))
    page.goto(url);page.wait_for_selector('.track')
    row=page.locator('.lane').nth(3).bounding_box();y=row['y']+row['height']/2
    page.mouse.move(360,y);page.mouse.down();page.mouse.move(80,y,steps=12);page.mouse.up()
    assert not page.evaluate('__calls.some(c=>c.name==="requestLaunchApp")')
    page.wait_for_timeout(350)
    page.locator('.tools button').first.click();page.locator('#needle').fill('test.app50');page.locator('#searchDone').click()
    page.evaluate('__failLaunch=true')
    click_app(page)
    assert page.locator('#error').is_visible()
    before=page.locator('.track').first.evaluate('(e)=>e.style.transform');page.wait_for_timeout(300)
    assert page.locator('.track').first.evaluate('(e)=>e.style.transform')!=before
    # Returning Home clears interrupted gesture state and permits a later launch.
    page.evaluate("__failLaunch=false;window.onBridgeEvent({name:'afterResume'})")
    page.wait_for_timeout(1500)
    click_app(page)
    assert page.evaluate('__calls.some(c=>c.name==="requestLaunchApp"&&c.args[0]==="test.app50")')
    before=page.locator('.track').first.evaluate('(e)=>e.style.transform');page.wait_for_timeout(200)
    assert page.locator('.track').first.evaluate('(e)=>e.style.transform')==before
    page.evaluate("window.onBridgeEvent({name:'afterResume'});window.onBridgeEvent({name:'newIntent'})")
    page.wait_for_timeout(1500)
    before=page.locator('.track').first.evaluate('(e)=>e.style.transform');page.wait_for_timeout(250)
    assert page.locator('.track').first.evaluate('(e)=>e.style.transform')!=before
    data.append({'label':'Fresh App','packageName':'test.fresh'})
    page.evaluate("window.onBridgeEvent({name:'appInstalled'})");page.wait_for_timeout(1500)
    assert page.locator('[data-pkg="test.fresh"]').count()>0
    data.pop()
    page.evaluate("window.onBridgeEvent({name:'appRemoved'})");page.wait_for_timeout(1500)
    assert page.locator('[data-pkg="test.fresh"]').count()==0
    page.evaluate("window.onBridgeEvent({name:'beforePause'})")
    before=page.locator('.track').first.evaluate('(e)=>e.style.transform');page.wait_for_timeout(250)
    assert page.locator('.track').first.evaluate('(e)=>e.style.transform')==before
    # Native touch events must recover a visible row even after stale pause.
    cdp=page.context.new_cdp_session(page)
    row=page.locator('.lane').nth(3).bounding_box();y=row['y']+row['height']/2
    before=page.locator('.track').nth(2).evaluate('(e)=>e.style.transform')
    launches=page.evaluate('__calls.filter(c=>c.name==="requestLaunchApp").length')
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':320,'y':y}]})
    for x in [280,240,200,160,120]:
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y}]})
        page.wait_for_timeout(30)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert page.locator('.track').nth(2).evaluate('(e)=>e.style.transform')!=before
    assert page.evaluate('__calls.filter(c=>c.name==="requestLaunchApp").length')==launches
    # With both automatic effects off and inertia settled, there is no idle paint.
    page.locator('.tools button').last.click();page.locator('#motion').uncheck();page.locator('#shimmer').uncheck();page.locator('#closeSettings').click();page.wait_for_timeout(1700)
    frames=page.evaluate("window.__paintCount=0;window.__observer=new MutationObserver(ms=>{__paintCount+=ms.filter(m=>m.target.classList.contains('track')).length});__observer.observe(document.querySelector('#wall'),{subtree:true,attributes:true,attributeFilter:['style']});0")
    page.wait_for_timeout(500);assert page.evaluate('__paintCount')==0
    results['native_touch_after_pause_and_zero_idle_paints']='passed'
    results['drag_no_launch_failure_recovery_resume_app_sync_and_pause']='passed'
    assert not errors,errors
    browser.close()
server.shutdown()
print(json.dumps(results,ensure_ascii=False,indent=2))
