class thinConsole{
constructor(options = {}){
if(thinConsole.instance){this.warn("[thinConsole]thinConsole实例已存在");return thinConsole.instance}
thinConsole.instance = this
this.version = "1.0.3"
let defaultOptions = {pos:{x:30,y:30},text:'thinConsole',color:'#007aff',width:'auto',height:'auto',theme:'auto',plugins:true,disabledPlugins:[],jsExecute:true}
this.options = {...defaultOptions,...options}
switch(this.options.theme){
case "light":this.currentTheme="light";break
case "dark":this.currentTheme="dark";break
case "auto":this.currentTheme=(()=>{let h=new Date().getHours();return h>=7&&h<18?'light':'dark';})();this.themeTimer=setInterval(()=>{let h=new Date().getHours(),e=h>=7&&h<18?'light':'dark';e!==this.currentTheme&&(this.currentTheme=e,this.overlay&&this.overlay.classList.contains('active')&&(this.overlay.className='overlay active theme-'+this.currentTheme))},30000);break
default:this.currentTheme="light";break
}
this.currentTab = 'console'
this.pluginEnabled = this.options.plugins
this.disabledPlugins = options.disabledPlugins || []
this.plugins = {}
this.pluginTabs = {}
this.pluginViewContainers = {}
this.logs = []
this.systemLogs = []
this.lastLog = null
this.jsonPageSize = 200
this.lsJsonPageSize = 200
this.jsonPageCache = new Map()
this.jsonPageIndex = new Map()
this.lsJsonPageIndex = new Map()
this.timerMap = new Map()
this.countMap = new Map()
this.createStyles()
this.createButton()
this.captureConsoleLogs()
this.createNotificationElement()
this.createOverlayElement()
this.setupGlobalEventHandlers()
this.setupSelfProtection()
this.renderContent()
}
createButton(){
this.btn = document.createElement('button')
this.btn.id = 'thinConsole-btn'
this.btn.className = 'floating-console-btn'
this.btn.textContent = this.options.text.slice(0,11)
this.btn.style.background = this.options.color
this.btn.style.width = this.options.width
this.btn.style.height = this.options.height
this.btn.style.bottom = this.options.pos.y+'px'
this.btn.style.right = this.options.pos.x+'px'
document.documentElement.append(this.btn)
let isDragging=false,startX=0,startY=0,initX=0,initY=0,btnW=0,btnH=0,longTimer=null;let st=500,clearLong=()=>{longTimer&&(clearTimeout(longTimer),longTimer=null)},onMove=e=>{if(isDragging){let t=e.touches?e.touches[0]:e,dx=t.clientX-startX,dy=t.clientY-startY,cx=Math.max(btnW/2,Math.min(innerWidth-btnW/2,initX+dx)),cy=Math.max(btnH/2,Math.min(innerHeight-btnH/2,initY+dy));this.btn.style.transform=`translate3d(${cx-initX}px,${cy-initY}px,0)`,e.preventDefault()}},onEnd=()=>{if(clearLong(),isDragging){isDragging=false;let r=innerWidth-this.btn.getBoundingClientRect().right,b=innerHeight-this.btn.getBoundingClientRect().bottom;this.btn.style.right=Math.max(0,r)+'px',this.btn.style.bottom=Math.max(0,b)+'px',this.btn.style.transform='',this.btn.dataset.right=Math.max(0,r),this.btn.dataset.bottom=Math.max(0,b),this.btn.removeEventListener('touchmove',onMove,{passive:false}),this.btn.removeEventListener('touchend',onEnd),this.btn.removeEventListener('mousemove',onMove),this.btn.removeEventListener('mouseup',onEnd)}},onStart=e=>{let t=e.touches?e.touches[0]:e;startX=t.clientX,startY=t.clientY;let rect=this.btn.getBoundingClientRect();btnW=rect.width,btnH=rect.height,initX=rect.left+btnW/2,initY=rect.top+btnH/2,longTimer=setTimeout(()=>{isDragging=true,this.btn.addEventListener('touchmove',onMove,{passive:false}),this.btn.addEventListener('touchend',onEnd),this.btn.addEventListener('mousemove',onMove),this.btn.addEventListener('mouseup',onEnd)},st)};this.btn.addEventListener('touchstart',onStart,{passive:false}),this.btn.addEventListener('mousedown',onStart),this.btn.addEventListener('touchend',clearLong),this.btn.addEventListener('mouseup',clearLong),this.btn.addEventListener('mouseleave',clearLong)
}
createOverlayElement(){
this.overlay = document.createElement('div')
this.overlay.id = 'consoleOverlay'
this.overlay.className = 'overlay'
this.overlay.innerHTML = `<div class="console-container"><div class="console-header"><div class="console-title"><i class="fa fa-terminal"></i>${this.options.text.slice(0,11)}</div><button class="clear-all-btn" title="清除所有日志" id="clearLogsBtn"><i class="fa fa-trash-alt"></i></button><button class="close-btn" id="closeConsoleBtn"><i class="fa fa-times"></i></button></div><div class="tabs" id="tabsContainer"></div><div class="console-content" id="contentArea"><div class="controls" id="consoleControls"><div class="filters"><button class="filter-btn active" data-type="all"><i class="fa fa-stream"></i>全部</button><button class="filter-btn" data-type="log"><i class="fa fa-info"></i>日志</button><button class="filter-btn" data-type="info"><i class="fa fa-info-circle"></i>信息</button><button class="filter-btn" data-type="warn"><i class="fa fa-exclamation-triangle"></i>警告</button><button class="filter-btn" data-type="error"><i class="fa fa-times-circle"></i>错误</button></div><div class="search-box"><input type="text" id="searchInput" placeholder="搜索日志内容..."></div></div><div class="console-output" id="consoleOutput"></div><div class="localstorage-view" id="localstorageView" style="display:none"><div class="ls-header"><button id="addLSItemBtn" class="push-btn"><i class="fa fa-plus"></i>添加新项</button></div><div class="ls-items" id="lsItems"></div></div><div class="system-logs" id="systemLogs" style="display:none"></div></div></div>`
document.querySelector("html").appendChild(this.overlay)
this.tabButtonsContainer = this.overlay.querySelector('#tabsContainer')
this.createBuiltinTabs()
this.closeConsoleBtn = this.overlay.querySelector('#closeConsoleBtn')
this.consoleOutput = this.overlay.querySelector('#consoleOutput')
this.title = this.overlay.querySelector('.console-title')
this.localstorageView = this.overlay.querySelector('#localstorageView')
this.lsItems = this.overlay.querySelector('#lsItems')
this.systemLogsEl = this.overlay.querySelector('#systemLogs')
this.contentArea = this.overlay.querySelector('#contentArea')
this.filterButtons = this.overlay.querySelectorAll('.filter-btn')
this.searchInput = this.overlay.querySelector('#searchInput')
this.clearLogsBtn = this.overlay.querySelector('#clearLogsBtn')
this.tabButtons = this.overlay.querySelectorAll('.tab-btn')
this.consoleControls = this.overlay.querySelector('#consoleControls')
this.addLSItemBtn = this.overlay.querySelector('#addLSItemBtn')
this.closeConsoleBtn.addEventListener('click',()=>{
this.triggerGlobalHook('beforeClose')
this.overlay.classList.remove('active')
this.triggerGlobalHook('afterClose')
})
this.lsItems.addEventListener('click',e=>{
let btn = e.target.closest('.ls-action-btn')
if(!btn)return
let action = btn.dataset.action
let key = btn.dataset.key
switch(action){
case 'edit':this.editLSItem(key);break
case 'copy':this.copyLog(key,"",true);break
case 'remove':this.removeLSItem(key);break
case 'cancel':this.cancelEditLSItem(key);break
case 'save':this.saveLSItem(key);break
}
})
this.btn.addEventListener('click',()=>{
this.triggerGlobalHook('beforeOpen')
this.overlay.className = 'overlay active theme-'+this.currentTheme
this.renderContent()
this.triggerGlobalHook('afterOpen')
})
if(this.options.jsExecute){
this.title.addEventListener('click',function(){
let code = prompt("请输入要执行的代码:")
if(!code.trim())return
try{
let result
result = eval(code)
console.log(`${code}\n>`,result)
}catch(e){console.error(`${code}\n> 执行失败:${e}`)}
}.bind(window))
}
this.overlay.addEventListener('click',e=>{
  let btn = e.target.closest('.json-page-btn')
  if(btn){
    let key = decodeURIComponent(btn.dataset.key)
    let page = parseInt(btn.dataset.page,10)
    let id = parseInt(btn.dataset.id)
    this.changeJsonPage(id,page)
  }
  let lsBtn = e.target.closest('.ls-json-page-btn')
  if(lsBtn){
    let key = decodeURIComponent(lsBtn.dataset.key)
    let page = parseInt(lsBtn.dataset.page,10)
    this.changeLSJsonPage(key,page)
  }
  if(e.target === this.overlay){
    this.triggerGlobalHook('beforeClose')
    this.overlay.classList.remove('active')
    this.triggerGlobalHook('afterClose')
  }
})
this.filterButtons.forEach(button => {
   button.addEventListener('click',()=>{
     this.filterButtons.forEach(btn => btn.classList.remove('active'))
     button.classList.add('active')
     this.activeFilter = button.dataset.type
     this.updateFilterCounts()
     this.renderContent()
   })
})
     this.searchInput.addEventListener('input',(e)=>{
        this.searchQuery = e.target.value.toLowerCase().trim()
        this.renderContent()
     })
        this.clearLogsBtn.addEventListener('click',() => this.clearAllLogs())
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click',()=>{
                this.tabButtons.forEach(b => b.classList.remove('active'))
                btn.classList.add('active')
                this.currentTab = btn.dataset.tab
                this.renderContent()
            })
        })
        this.addLSItemBtn.addEventListener('click',() => this.addLSItem())
    }
createBuiltinTabs(){
    let builtinTabs = [{id:'console',name:'控制台',icon:'fa fa-terminal'},{id:'system',name:'系统日志', icon:'fa fa-server'},{id:'localstorage',name:'本地存储',icon:'fa fa-database'}]
    builtinTabs.forEach(tab => {
        let tabBtn = document.createElement('button')
        tabBtn.className = 'tab-btn'
        tabBtn.dataset.tab = tab.id
        tabBtn.innerHTML = `<i class="${tab.icon}"></i>${tab.name}`
        if(tab.id === 'console'){
            tabBtn.classList.add('active')
        }
        tabBtn.addEventListener('click',()=>{
            this.tabButtons = this.overlay.querySelectorAll('.tab-btn')
            this.tabButtons.forEach(b => b.classList.remove('active'))
            tabBtn.classList.add('active')
            this.currentTab = tab.id
            this.renderContent()
        })
        this.tabButtonsContainer.appendChild(tabBtn)
    })
}
    createPluginTab(tabConfig){
        let tabBtn = document.createElement('button')
        tabBtn.className = 'tab-btn'
        tabBtn.dataset.tab = (!tabConfig.id ? "newTab" : tabConfig.id)
        tabBtn.innerHTML = `<i class="${!tabConfig.icon ? "fa fa-plug" : tabConfig.icon}"></i>${!tabConfig.name ? "新的插件" : tabConfig.name}`
        this.tabButtonsContainer.appendChild(tabBtn)
        tabBtn.addEventListener('click',()=>{
            this.tabButtons = this.overlay.querySelectorAll('.tab-btn')
            this.tabButtons.forEach(b => b.classList.remove('active'))
            tabBtn.classList.add('active')
            this.currentTab = tabConfig.id
            this.renderContent()
        })
        let pluginView = document.createElement('div')
        pluginView.id = `${tabConfig.id}View`
        pluginView.innerHTML = "<center style='font-size:20px;margin-top:30px;color:var(--text-color);'><i class='fa fa-info-circle'></i>无插件视图</center>"
        pluginView.className = 'plug-view'
        pluginView.style.display = 'none'
        this.contentArea.appendChild(pluginView)
        this.pluginViewContainers[tabConfig.id] = pluginView
    }
    createNotificationElement(){
        this.notification = document.createElement('div')
        this.notification.id = 'notification'
        this.notification.className = 'notification'
        this.notification.textContent = '已复制到剪贴板'
        document.body.appendChild(this.notification)
    }
    createStyles(){
        let styles = document.createElement("style")
        styles.innerHTML = `@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");*{margin:0;padding:0;box-sizing:border-box}.floating-console-btn{position:fixed;z-index:11000;padding:15px 25px;backdrop-filter:blur(5px);border-radius:5px;border:none;background:#007aff;color:white;font-size:1rem;cursor:move;display:flex;align-items:center;gap:10px;font-weight:500;box-shadow:0 8px 20px rgba(0,0,0,0.4);transition:all 0.3s ease;user-select:none}.floating-console-btn:hover{transform:scale(0.9);box-shadow:0 10px 25px rgba(0,0,0,0.5)}.floating-console-btn:active{transform:scale(0.98)}.floating-console-btn i{font-size:1.2rem}.overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:99998;opacity:0;visibility:hidden;transition:all 0.4s ease;backdrop-filter:blur(5px)}.overlay.active{opacity:1;visibility:visible}.theme-dark{--console-bg:#1e1e1e;--header-bg:#252526;--text-color:#d4d4d4;--controls-bg:#2d2d2d;--border-color:rgba(255,255,255,0.05);--log-bg:#191919;--log-border-light:3px solid;--filter-active:#4a4ae6;--search-bg:#3e3e42;--json-bg:rgba(40,40,40,0.7);--json-key:#6aaeff;--json-string:#98c379;--json-number:#d19a66;--json-boolean:#56b6c2;--json-null:#be5046;--action-bg:rgba(106,174,255,0.3);--action-hover:rgba(106,174,255,0.5);--log-icon-info:#4a4ae6;--log-icon-warn:#d9a40d;--log-icon-error:#ff3b30;--clear-btn-color:#ff6b6b;--clear-btn-hover:#ff5252;--tab-bg:#333;--tab-active:#444;--tab-color:#ddd}.theme-light{--console-bg:#ffffff;--header-bg:#f0f0f0;--text-color:#333;--controls-bg:#e0e0e0;--border-color:rgba(0,0,0,0.1);--log-bg:#f3f3f3;--log-border-light:3px solid;--filter-active:#4a4ae6;--search-bg:#f0f0f0;--json-bg:rgba(240,240,240,0.9);--json-key:#1e6bb8;--json-string:#22863a;--json-number:#d73a49;--json-boolean:#005cc5;--json-null:#6f42c1;--action-bg:rgba(30,107,184,0.1);--action-hover:rgba(30,107,184,0.2);--log-icon-info:#1e6bb8;--log-icon-warn:#e36209;--log-icon-error:#d73a49;--clear-btn-color:#ff5252;--clear-btn-hover:#ff3b30;--tab-bg:#e5e5e5;--tab-active:#ddd;--tab-color:#333}.console-container{background:var(--console-bg);width:100%;height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 15px 35px rgba(0,0,0,0.6);position:fixed;z-index:99999;bottom:0;left:0}.console-header{display:flex;justify-content:space-between;align-items:center;padding:15px 25px;background:var(--header-bg);border-bottom:1px solid var(--border-color);position:relative}.console-title{font-size:1.3rem;color:var(--text-color);gap:10px;display:flex;align-items:center}.push-btn{border:none;background:var(--filter-active);color:white;padding:10px;border-radius:5px}.close-btn{background:transparent;border:none;color:var(--text-color);font-size:1.5rem;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:5px;transition:all 0.3s}.close-btn:hover{background:rgba(255,100,100,0.2);color:#ff6464;transform:scale(1.1)}.clear-all-btn{position:absolute;top:50%;right:50px;transform:translateY(-50%);background:transparent;border:none;color:var(--clear-btn-color);font-size:1.5rem;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:5px;transition:all 0.3s;margin-left:0}.clear-all-btn:hover{background:rgba(255,100,100,0.2);color:var(--clear-btn-hover)}.tabs{display:block;white-space:nowrap;overflow-x:auto;background:var(--tab-bg);padding:5px 10px 0;border-bottom:1px solid var(--border-color)}.tab-btn{padding:12px 20px;background:transparent;border:none;color:var(--tab-color);font-size:1rem;cursor:pointer;position:relative;transition:all 0.2s;display:inline-flex;align-items:center;gap:8px}.tab-btn.active{color:var(--text-color);font-weight:600}.tab-btn.active::after{content:'';position:absolute;bottom:0;left:0;width:100%;height:2px;border-radius:3px;background:var(--filter-active)}.tab-btn:hover:not(.active){background:rgba(255,255,255,0.05)}.controls{display:flex;padding:15px 20px;background:var(--controls-bg);gap:15px;flex-wrap:wrap;border-bottom:1px solid var(--border-color);align-items:center}.filters{display:flex;flex-wrap:nowrap;margin-left:-5px}.filter-btn>.fa{margin-right:5px;margin-top:2px}.filter-btn{position:relative;padding:10px;border:none;background:none;color:var(--text-color);cursor:pointer;font-size:0.85rem;transition:all 0.2s;display:flex;width:100%;white-space:nowrap}.filter-btn.active::after{content:"";position:absolute;width:90%;transition:all 0.3s ease;left:3px;height:2px;top:90%;border-radius:3px;background:var(--filter-active);color:white}.search-box{display:flex;flex-grow:1;max-width:400px}.search-box input{padding:10px 15px;border-radius:5px;border:none;background:var(--search-bg);color:var(--text-color);width:100%;transition:all 0.3s ease;font-size:0.95rem;border:1px solid var(--border-color)}.search-box input:focus{outline:none;border-color:#4a4ae6}.console-content{flex:1;overflow:hidden;display:flex;flex-direction:column}.console-output,.localstorage-view,.system-logs{flex:1;overflow-y:auto;padding:20px;font-family:monospace;font-size:0.95rem}.log-item{padding:10px 15px;margin-bottom:10px;display:flex;align-items:flex-start;border-left:var(--log-border-light) #4a4ae6;background:var(--log-bg);border-radius:5px}.log-item.log{border-left-color:#4a4ae6}.log-item.info{border-left-color:var(--log-icon-info)}.log-item.warn{border-left-color:var(--log-icon-warn)}.log-item.error{border-left-color:var(--log-icon-error);background:rgba(255,59,48,0.15)}.log-count{background:#4a4ae6;color:white;border-radius:5px;min-width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:0.85rem;margin-right:10px;margin-top:-3px;padding:10px}.log-icon{margin-right:12px;font-size:1rem;min-width:20px;color:var(--text-color)}.log-content{width:100%;max-height:500px;overflow-y:auto;flex-grow:1;word-break:break-word;line-height:1.5;color:var(--text-color)}.timestamp{color:#707070;font-size:0.8rem;margin-left:10px;white-space:nowrap}.normal-timestamp{margin-top:-30px !important}.hasobj-tsp{margin-left:115px !important}.json-preview{font-family:monospace;padding:10px;margin-top:5px;background:var(--json-bg);border-radius:5px;white-space:pre !important;word-break:break-all ！important;max-height:400px;overflow:auto}.json-page-btn,.ls-json-page-btn{border:none}.ls-json-preview{border-radius:5px;margin-top:-5px}.json-number{color:var(--json-number)}.json-boolean{color:var(--json-boolean)}.json-key{color:var(--json-key)}.json-null{color:var(--json-null)}.json-string{color:var(--json-string)}.json-cmt{color:#707070}.log-actions{margin-top:8px;display:flex;gap:10px;font-size:0.85rem}.log-action{color:var(--json-key);cursor:pointer;padding:5px 10px;background:var(--action-bg);transition:all 0.2s;display:inline-flex;align-items:center;gap:5px;border-radius:5px}.log-action:hover{background:var(--action-hover)}.log-action.copy-btn{background:var(--action-bg)}.log-action.copy-btn:hover{background:var(--action-hover)}.error-stack{font-family:monospace;padding:10px;margin-top:10px;background:rgba(255,59,48,0.1);border-radius:5px;white-space:pre-wrap;word-break:break-all;color:#ff8a80;font-size:0.85rem}.object-preview{font-family:monospace;padding:10px;margin-top:5px;background:var(--json-bg);color:var(--json-number);border-radius:5px}.function-preview{font-family:monospace;padding:10px;margin-top:5px;background:var(--json-bg);color:var(--json-boolean);border-radius:5px;white-space:pre;word-break:break-all;overflow-x:auto}.ls-header{padding:15px 0;display:flex;justify-content:flex-end}.ls-item{background:var(--log-bg);padding:15px;margin-bottom:15px;border-radius:8px}.ls-key-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid var(--border-color);padding-bottom:10px}.ls-key{color:var(--json-key);font-size:1.1rem;max-width:60%;overflow-x:auto;white-space:nowrap}.ls-actions{display:flex;gap:8px}.ls-action-btn{background:var(--action-bg);border:none;color:var(--text-color);padding:5px 10px;border-radius:5px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:5px}.ls-action-btn:hover{background:var(--action-hover)}.ls-value{white-space:normal;word-break:break-all;padding:10px;background:var(--json-bg);border-radius:5px;font-family:monospace;max-height:200px;overflow-y:auto;color:var(--text-color)}.ls-edit{display:flex;flex-direction:column;gap:10px;margin-top:10px;display:none}.ls-edit textarea{width:100%;min-height:100px;padding:10px;background:var(--search-bg);border:1px solid var(--border-color);border-radius:5px;color:var(--text-color);font-family:monospace;resize:vertical;outline:none;transition:all 0.3s ease}.ls-edit textarea:focus{border-color:#4a4ae6}.ls-key-edit{display:none;width:60%;padding:6px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--search-bg);font-size:1.1rem;outline:none;transition:border .2s;color:var(--json-key);font-family:monospace;}.ls-key-edit:focus{border-color:#4a4ae6;}.ls-item.editing .ls-key{display:none;}.ls-item.editing .ls-key-edit{display:block;}.ls-edit-actions{display:flex;gap:10px;justify-content:flex-end}.ls-value-type{font-size:0.8rem;opacity:0.7;margin-top:5px;color:var(--text-color)}.system-log-content{width:100%;max-height:300px;overflow-y:auto;font-family:monospace;white-space:pre-wrap;word-break:break-word;color:var(--text-color)}.system-log-date{font-size:0.8rem;color:#707070;margin-top:3px}@media(orientation:landscape){.timestamp{display:none}}@media(max-width:768px){.controls{flex-direction:column;align-items:flex-start}.search-box{max-width:100%;width:100%}.log-item{flex-wrap:wrap}.timestamp{width:100%;margin-left:40px;margin-top:5px}.log-actions{flex-wrap:wrap}.floating-console-btn{padding:12px 20px;font-size:0.9rem;right:20px;bottom:20px}.clear-all-btn{right:60px}.tab-btn{padding:8px 12px;font-size:0.9rem}}.nolog{text-align:center;font-size:20px;color:var(--text-color);padding:40px 0}.nolog>.fa{margin-right:5px}.notification{position:fixed;top:20px;right:20px;padding:12px 20px;background:#4CAF50;color:white;border-radius:5px;box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:99999;transform:translateX(120%);transition:transform 0.3s ease}.notification.show{transform:translateX(0)}.notification.warning{background:#ff9800}`
        styles.setAttribute('tcstyle','')
        document.head.append(styles)
    }
    showNotification(message,type=''){
        this.notification.textContent = message
        this.notification.className = 'notification'
        if(type === 'warning')this.notification.classList.add('warning')
        this.notification.classList.add('show')
        setTimeout(()=>{
            this.notification.classList.remove('show')
        },3000)
    }
    captureConsoleLogs(){
        this.originalConsole = {log:console.log,info:console.info,warn:console.warn,error:console.error}
        console.log=(...args)=>this.captureConsole('log',...args)
        console.info=(...args)=>this.captureConsole('info',...args)
        console.warn=(...args)=>this.captureConsole('warn',...args)
        console.error=(...args)=>this.captureConsole('error',...args)
        console.debug=(...args)=>this.captureConsole('log',...args)
        console.time=(l='time')=>{l=String(l);let s=performance.now();this.timerMap.has(l)&&clearTimeout(this.timerMap.get(l).timeoutId);let t=setTimeout(()=>{if(!this.timerMap.has(l))return;let{start}=this.timerMap.get(l);this.timerMap.delete(l);this.info(`[time]"${l}"用时:${(performance.now()-start).toFixed(1)}ms(已超时)`)},300000);this.timerMap.set(l,{start:s,timeoutId:t})}
        console.timeEnd=(l='time')=>{l=String(l);let i=this.timerMap.get(l);if(!i){this.error(`[timeEnd]标签"${l}"不存在`);return}i.timeoutId&&clearTimeout(i.timeoutId);let c=performance.now()-i.start;this.timerMap.delete(l);this.info(`[time]"${l}"用时:${c.toFixed(1)}ms`)}
        console.count=(l='count')=>{l=String(l);let c=(this.countMap.get(l)||0)+1;this.countMap.set(l,c);this.info(`[count]标签"${l}"被调用了${c}次`)}
        console.countReset=(l='count')=>{l=String(l);if(!this.countMap.has(l)){this.error(`[countReset]标签"${l}"不存在`);return}this.countMap.delete(l)}
        console.assert=(cond,...a)=>{if(!cond)this.error('[assertion failed]',...a)}
        console.trace=(...a)=>{let s=new Error().stack.split('\n').slice(2).join('\n');this.warn('[trace]',...a,'\n'+s)}
        console.group=(a)=>this.captureConsole('log',`[Group ${a}]`)
        console.groupEnd=()=>this.captureConsole('log','[GroupEnd]')
        console.clear=()=>this.clearAllLogs(true)
    }
safeStringify(obj,space=2){
 let seen = new WeakSet()
 return JSON.stringify(obj,function(key,value){
  if(typeof value === 'object' && value !== null){
    if(seen.has(value))return '[循环引用]'
    seen.add(value)
    if(!Array.isArray(value) && value.constructor === Object){
      let sortedKeys = Object.keys(value).sort((a,b) => a.localeCompare(b))
      let sortedObj = {}
      for(let k of sortedKeys){
         sortedObj[k] = value[k]
      }
      return sortedObj
    }
    if(value instanceof RegExp)return value.toString()
    if(value instanceof Error)return {名字:value.name,信息:value.message,堆栈:value.stack}
    if(value instanceof Date)return value.toISOString()
    if(value instanceof HTMLElement)return `<${value.tagName.toLowerCase()}>${value.tagName.toLowerCase()}元素</${value.tagName.toLowerCase()}>`
      return value
  }
  if(value instanceof Error)return {名字:value.name,信息:value.message,堆栈:value.stack}
  if(typeof value === 'function')return value.toString().replace(/function /,'').replace(/ { \[native code\] }/,'').replace(/^\(\)$/,'function()')
  if(value instanceof Date)return value.toISOString()
  if(value instanceof HTMLElement)return `<${value.tagName.toLowerCase()}>${value.tagName.toLowerCase()}元素</${value.tagName.toLowerCase()}>`
        return value
 },space)
}
formatArgsForPlainText(args){
    return Array.from(args).map(arg => {
        if(typeof arg === 'object' && arg !== null){
        try{
         return this.safeStringify(arg)
        }catch{return '[无法序列化的对象]'}
     }
     return String(arg)
    }).join(' ')
}
captureConsole(type,...args){
  this.triggerGlobalHook('beforeLog',type,...args)
  let timestamp = new Date()
  let generateContentSignature = ()=>{
  return args.map(arg => {
  if(typeof arg === 'object' && arg !== null){
  try{
     if(arg instanceof Date)return `Date:${arg.getTime()}`
     if(arg instanceof RegExp)return `RegExp:${arg.toString()}`
     if(arg instanceof Error)return `Error:${arg.message}`
     let snapshot = Object.entries(arg).reduce((acc,[key,value]) => {
     if(key === 'then' && typeof value === 'function')return acc
     if(key === '__proto__')return acc
     if(typeof value === 'object' && value !== null){
       try{
        acc[key] = JSON.stringify(value)
       }catch{acc[key] = 'NestedObject'}
     }else{
        acc[key] = value
   }
   return acc
   },{})
  return `[Object]:${JSON.stringify(snapshot)}`
 }catch{return `无法序列化:${Math.random().toString(36).substring(2,10)}`}
}
 return `${typeof arg}:${String(arg)}`
 }).join('|')
}
  let contentSign = generateContentSignature()
  let isSystem = args.length > 0 && typeof args[0] === 'string' && args[0].startsWith("[system]")
  if(this.lastLog && this.lastLog.type === type && this.lastLog.contentSign === contentSign){
  this.lastLog.args = [...args]
  this.lastLog.timestamp = new Date()
  this.lastLog.count++
  let systemLog = this.systemLogs.find(l => l.id === this.lastLog.id)
  if(args.some(a => typeof a === 'object' && a !== null)){
    let cacheKey = this.safeStringify(args[0])
    if(!this.jsonPageIndex.has(cacheKey)){
        this.jsonPageIndex.set(cacheKey,0)
        this.getPagedJson(args[0],0)
    }
}
  if(!systemLog){
  if(this.lastLog.isSystem){
    this.systemLogs.push(this.lastLog)
    systemLog = this.lastLog
    }
  }
  if(isSystem){
    systemLog.args = [...args]
    systemLog.timestamp = new Date()
    systemLog.count = this.lastLog.count
    let logItemEl = document.getElementById(`sys-log-item-${systemLog.id}`)
    if(logItemEl){
    let countEl = logItemEl.querySelector('.log-count')
    if(!countEl){
    countEl = document.createElement('div')
    countEl.className = 'log-count'
    logItemEl.insertBefore(countEl,logItemEl.firstChild)
    }
    countEl.textContent = this.lastLog.count
  }
 }
  let logItemEl = document.getElementById(`log-item-${this.lastLog.id}`)
  if(logItemEl){
  let countEl = logItemEl.querySelector('.log-count')
  if(!countEl){
    countEl = document.createElement('div')
    countEl.className = 'log-count'
    logItemEl.insertBefore(countEl,logItemEl.firstChild)
  }
  countEl.textContent = this.lastLog.count
  }
  this.originalConsole[type].apply(console,args)
  this.updateFilterCounts()
  return
}else{
let logEntry = {id:this.logs.length,type,args:[...args],content:this.formatArgsForPlainText(args),timestamp,count:1,expandedJson:false,contentSign,hasObject:args.some(arg => (typeof arg === 'object' && arg !== null) || typeof arg === 'function' && !/^class\s/.test(arg.toString())),isError:type === 'error' || args.some(arg => arg instanceof Error),isSystem:isSystem}
  if(isSystem){
    let systemLogEntry = {...logEntry}
    systemLogEntry.id = this.systemLogs.length
    this.systemLogs.push(systemLogEntry)
}
  this.logs.push(logEntry)
  this.lastLog = logEntry
  this.triggerGlobalHook('afterLog',logEntry)
}
this.originalConsole[type].apply(console,args)
if(this.overlay?.classList.contains('active')){
  if(this.currentTab === 'console'){
    this.updateFilterCounts()
    this.renderLogList(this.logs.filter(log => !log.isSystem),false)
    }else if(this.currentTab === 'system' && isSystem){
     this.updateFilterCounts()
     this.renderLogList(this.systemLogs,true)
    }
  }
}
formatArgs(args,id){
return Array.from(args).map(arg => {
  if(typeof arg === 'function'){return `<div class="function-preview">${String(arg)}</div>`}
  if(arg instanceof Error){return `<div class="error-stack"><strong>${arg.name}:</strong> ${arg.message}<div>${arg.stack || '无堆栈信息'}</div></div>`}
  if(arg instanceof HTMLElement){return `<div class="object-preview">&lt;${arg.tagName.toLowerCase()}&gt;${arg.tagName.toLowerCase()}元素&lt;/${arg.tagName.toLowerCase()}&gt;</div>`}
  if(typeof arg === 'object' && arg !== null){
    let cacheKey = "log-"+id
    let pageIndex = this.jsonPageIndex.get(cacheKey) || 0
    let pagedData = this.getPagedJson(arg,pageIndex)
    let totalKeys = this.getJsonKeys(arg).length
    let totalPages = Math.ceil(totalKeys / this.jsonPageSize)
    let json = this.safeStringify(pagedData,2).replace(/\\t/g,'').replace(/\\n/g,"\n").replace(/</g,'&lt;').replace(/>/g,'&gt;')
    let html = '<div class="json-preview">' + this.highlightJson(json) + '</div>'
    if(totalPages > 1){
      let safeKey = encodeURIComponent(cacheKey)
      html += `<div style="margin-top:10px;display:flex;justify-content:center;gap:10px;align-items:center;"><button class="log-action json-page-btn" data-id="${id}" data-page="${Math.max(pageIndex-1,0)}">上一页</button><span style="color:#707070">第 ${pageIndex+1}/${totalPages} 页</span><button class="log-action json-page-btn" data-id="${id}" data-page="${Math.min(pageIndex+1,totalPages-1)}">下一页</button></div>`
    }
    return html
  }
  return String(arg).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>')
}).join(' ')
}
highlightJson(json){if(!json)return'';return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d*)?([eE][+-]?\d+)?|\{|\}|\[|\]|\.|,)/g,(match)=>{let cls='json-number';if(/^"/.test(match)){if(/:$/.test(match)){cls='json-key';}else{cls='json-string';}if(/^"[^"]*\(\)"$/.test(match)){cls='json-boolean';match=match.replace(/"/g,"");match=match.replace(/(\(\))/g,"<span class='json-cmt'>$&</span>");}}else if(/true|false/.test(match)){cls='json-boolean';}else if(/null/.test(match)){cls='json-null';}else if(/(?<!\d)\.(?!\d)|[\{\}\[\],]/.test(match)){cls="json-cmt";}return'<span class="'+cls+'">'+match+'</span>';})}
getJsonKeys(obj){
    if(Array.isArray(obj)){
        return obj.map((_,i) => i)
    }else if(typeof obj === 'object' && obj !== null){
        return Object.keys(obj)
    }
    return []
}
getPagedJson(obj,page){
    let cacheKey = this.safeStringify(obj)
    if(!this.jsonPageCache.has(cacheKey)){
        let keys = this.getJsonKeys(obj)
        let pages = []
        for(let i = 0;i < keys.length;i += this.jsonPageSize){
            pages.push(keys.slice(i,i+this.jsonPageSize))
        }
        this.jsonPageCache.set(cacheKey,pages)
    }
    let pages = this.jsonPageCache.get(cacheKey)
    let pageKeys = pages[page] || []
    if(Array.isArray(obj)){
        return pageKeys.map(i => obj[i])
    }else{
        let res = {}
        pageKeys.forEach(k => res[k] = obj[k])
        return res
    }
}
changeJsonPage(logId,newPage){
  let logUniqueKey = `log-${logId}`
  this.jsonPageIndex.set(logUniqueKey,newPage)
  let log = [...this.logs,...this.systemLogs].find(l => l.id === logId)
  if(log){
    let isSystem = this.systemLogs.includes(log)
    this.updateLogItem(logId,isSystem)
  }
}
toggleExpandJson(logId){
    let isSystem = this.currentTab === 'system'
    let logs = isSystem ? this.systemLogs : this.logs
    let log = logs.find(l => l.id === logId)
    if(!log)return
    let newExpanded = !log.expandedJson
    log.expandedJson = newExpanded
    if(newExpanded){
        let firstArg = log.args[0]
        if(typeof firstArg === 'object' && firstArg !== null){
            let cacheKey = this.safeStringify(firstArg)
            this.jsonPageIndex.set(cacheKey,0)
        }
    }
    this.updateLogItem(logId,isSystem)
}
updateLogItem(logId,isSystem=false){
    let logs = isSystem ? this.systemLogs : this.logs
    let log = logs.find(l => l.id === logId)
    if(!log)return
    let item = document.querySelector(`#log-item-${logId}`)
    if(!item)return
    let iconClass = {info:'fa fa-info-circle',warn:'fa fa-exclamation-triangle',error:'fa fa-bug',log:'fa fa-info'}[log.type] || 'fa fa-info'
    let time = log.timestamp.toLocaleTimeString()
    let date = log.timestamp.toLocaleDateString()
    item.innerHTML = `${log.count > 1 ? `<div class="log-count">${log.count}</div>` : ''}<div class="log-icon"><i class="${iconClass}"></i></div><div class="log-content">${log.expandedJson ? this.formatArgs(log.args,log.id) : log.args.map(arg => {
         if(typeof arg === "function")return `function ${arg.name}(){ [Codes] }`
         if(typeof arg === 'object' && !log.expandedJson){
         if(arg instanceof Error)return `<strong>${arg.name}:</strong>${arg.message}`
         if(arg instanceof HTMLElement)return `&lt;${arg.tagName.toLowerCase()}&gt;`
         return '{Object}'
         }
         return String(arg).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,"<br>")
       }).join(' ').replace(/^\[system](?! )|^\[system] /,"")}<div class="log-actions">${log.hasObject ? `<div class="log-action" onclick="thinConsole.instance.toggleExpandJson(${log.id})"><i class="fa ${log.expandedJson ? 'fa-compress' : 'fa-expand'}"></i>${log.expandedJson ? '收起' : '展开'}</div><div class="log-action copy-btn" onclick="thinConsole.instance.copyLog(${log.id},false)"><i class="fa fa-copy"></i></div>` : `<div class="log-action copy-btn" onclick="thinConsole.instance.copyLog(${log.id},false)"><i class="fa fa-copy"></i></div>`}<div class="timestamp normal-timestamp${log.hasObject ? ' hasobj-tsp' : ''}">${date} ${time}</div></div></div>`
}
updateFilterCounts(){
    if(!this.filterButtons)return
    let logs = []
    if(this.currentTab === 'console')logs = this.logs.filter(log => !log.isSystem)
    else if(this.currentTab === 'system')logs = this.systemLogs
let countMerged = (arr,type) => arr.reduce((sum,log)=>{
  if(log.type === type)return sum + (log.count||1)
  return sum
},0)
let counts = {
    all:logs.reduce((sum,log) => sum + (log.count||1),0),
    log:countMerged(logs,'log'),
    info:countMerged(logs,'info'),
    warn:countMerged(logs,'warn'),
    error:countMerged(logs,'error')
}
    this.filterButtons.forEach(button => {
        let type = button.dataset.type
        let count = counts[type] || 0
        if(!button.dataset.originalHtml){
            button.dataset.originalHtml = button.innerHTML
        }
        if(button.classList.contains('active')){
            let countDisplay = count > 99 ? '99+' : count
            button.innerHTML = `${button.dataset.originalHtml} (${countDisplay})`
        }else{
            button.innerHTML = button.dataset.originalHtml
        }
    })
}
renderContent(){
    this.triggerGlobalHook('beforeRender',this.currentTab)
    this.consoleOutput.style.display = 'none'
    this.localstorageView.style.display = 'none'
    this.systemLogsEl.style.display = 'none'
    this.clearLogsBtn.style.display = 'none'
    Object.values(this.pluginViewContainers).forEach(view => {
        view.style.display = 'none'
    })
    this.consoleControls.style.display = 'flex'
    if(['console','system','localstorage'].includes(this.currentTab)){
        this.clearLogsBtn.style.display = 'block'
        switch(this.currentTab){
            case 'console':
                this.consoleOutput.style.display = 'block'
                this.renderLogList(this.logs.filter(log => !log.isSystem),false)
                this.updateFilterCounts()
                break
            case 'localstorage':
                this.localstorageView.style.display = 'block'
                this.consoleControls.style.display = 'none'
                this.renderLocalStorage()
                break
            case 'system':
                this.systemLogsEl.style.display = 'block'
                this.renderLogList(this.systemLogs,true)
                this.updateFilterCounts()
                break
        }
    }else if(this.pluginViewContainers[this.currentTab]){
        let pluginName = Object.keys(this.pluginTabs).find(k => this.pluginTabs[k].id === this.currentTab)
        this.consoleControls.style.display = 'none'
        if(pluginName){
            let pluginView = this.pluginViewContainers[this.currentTab]
            pluginView.style.display = 'block'
            let plugin = this.plugins[pluginName]
            if(plugin && typeof plugin.onShow === 'function'){
                plugin.onShow()
            }
            if(plugin && typeof plugin.render === 'function'){
                plugin.render(pluginView)
            }
        }
    }
    this.triggerGlobalHook('afterRender',this.currentTab)
}
    renderLogList(logs,isSystem){
        let container = isSystem ? this.systemLogsEl : this.consoleOutput
        let logType = isSystem ? '系统日志' : '日志记录'
        if(!container)return
        if(logs.length === 0){
            container.innerHTML = `<div class="nolog"><i class="fa fa-${isSystem ? 'server' : 'info-circle'}"></i>无${logType}</div>`
            return
        }
        let filteredLogs = [...logs]
        let scrollPos = container.scrollTop
        if(this.activeFilter && this.activeFilter !== 'all'){
            filteredLogs = filteredLogs.filter(log => log.type === this.activeFilter)
        }
if(this.searchQuery){
    let query = this.searchQuery.trim()
    let isRegex = false
    let regex
    if(query.startsWith("/") && query.endsWith("/")){
        try{
            let pattern = query.slice(1,-1)
            let lastSlash = pattern.lastIndexOf("/")
            let flags = ""
            if(lastSlash > 0){
                flags = pattern.slice(lastSlash + 1)
                regex = new RegExp(pattern.slice(0,lastSlash),flags)
            }else{
                regex = new RegExp(pattern)
            }
            isRegex = true
        }catch{
            this.showNotification("无效的正则表达式:"+query)
            isRegex = false
        }
    }
    let lowerQuery = isRegex ? query : query.toLowerCase()
    filteredLogs = filteredLogs.filter(log => {
        return log.args.some(arg => {
            let strValue
            if(arg instanceof Error){
                strValue = "[error]"
            }else if(arg == null){
                strValue = "null"
            }else if(arg === undefined){
                strValue = "undefined"
            }else if(typeof arg === 'object'){
                strValue = "{Object}"
            }else{
                strValue = String(arg)
            }
            if(isRegex && regex){
                return regex.test(strValue)
            }else{
                return strValue.toLowerCase().includes(lowerQuery.toLowerCase())
            }
        })
    })
}
if(filteredLogs.length === 0){
   container.innerHTML = `<div class="nolog"><i class="fa fa-search"></i>无匹配的${logType}</div>`
   return
}
let logItems = filteredLogs.reverse().map(log=>{
    let iconClass
    switch(log.type){
       case 'info':iconClass='fa fa-info-circle';break
       case 'warn':iconClass='fa fa-exclamation-triangle';break
       case 'error':iconClass='fa fa-bug';break
       default:iconClass='fa fa-info'
    }
    let time = log.timestamp.toLocaleTimeString()
    let date = log.timestamp.toLocaleDateString()
    if(isSystem){
       return `<div class="log-item ${log.type}" id="sys-log-item-${log.id}">${log.count > 1 ? `<div class="log-count">${log.count}</div>` : ''}<div class="log-icon"><i style="margin-right:5px" class="${iconClass}"></i>${log.type}</div><div class="system-log-date">${date} ${time}</div><div class="system-log-content">${log.expandedJson ? this.formatArgs(log.args,log.id).replace(/^\[system](?! )|^\[system] /,"") : log.args.map(arg => {
         if(typeof arg === "function"){
             if(/^class\s/.test(arg.toString()))return `[Class ${arg.name}]`
             return `function ${arg.name}(){ [Codes] }`
         }
         if(typeof arg === 'object' && !log.expandedJson){
         if(arg instanceof Error)return `<strong>${arg.name}:</strong>${arg.message}`
         if(arg instanceof HTMLElement)return `&lt;${arg.tagName.toLowerCase()}&gt;`
         return '{Object}'
         }
         return String(arg).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,"<br>")
       }).join(' ').replace(/^\[system](?! )|^\[system] /,"")}</div>${log.hasObject ? `<div class="log-actions"><div class="log-action" onclick="thinConsole.instance.toggleExpandJson(${log.id})"><i class="fa ${log.expandedJson ? 'fa-compress' : 'fa-expand'}"></i>${log.expandedJson ? '收起' : '展开'}</div><div class="log-action copy-btn" onclick="thinConsole.instance.copyLog(${log.id},true)"><i class="fa fa-copy"></i></div></div>` : `<div class="log-actions"><div class="log-action copy-btn" onclick="thinConsole.instance.copyLog(${log.id},true)"><i class="fa fa-copy"></i></div></div>`}</div>`
    }else{
       return `<div class="log-item ${log.type}" id="log-item-${log.id}">${log.count > 1 ? `<div class="log-count">${log.count}</div>` : ''}<div class="log-icon"><i class="${iconClass}"></i></div><div class="log-content">${log.expandedJson ? this.formatArgs(log.args,log.id) : log.args.map(arg => {
         if(typeof arg === "function"){
             if(/^class\s/.test(arg.toString()))return `[Class ${arg.name}]`
             return `function ${arg.name}(){ [Codes] }`
         }
         if(typeof arg === 'object' && !log.expandedJson){
         if(arg instanceof Error)return `<strong>${arg.name}:</strong>${arg.message}`
         if(arg instanceof HTMLElement)return `&lt;${arg.tagName.toLowerCase()}&gt;`
         return '{Object}'
         }
         return String(arg).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,"<br>")
       }).join(' ')}<div class="log-actions">${log.hasObject ? `<div class="log-action" onclick="thinConsole.instance.toggleExpandJson(${log.id})"><i class="fa ${log.expandedJson ? 'fa-compress' : 'fa-expand'}"></i>${log.expandedJson ? '收起' : '展开'}</div><div class="log-action copy-btn" onclick="thinConsole.instance.copyLog(${log.id},false)"><i class="fa fa-copy"></i></div>` : `<div class="log-action copy-btn" onclick="thinConsole.instance.copyLog(${log.id},false)"><i class="fa fa-copy"></i></div>`}<div class="timestamp normal-timestamp${log.hasObject ? ' hasobj-tsp' : ''}">${date} ${time}</div></div></div></div>`
    }
   }).join('')
        container.innerHTML = logItems
        container.scrollTop = scrollPos
    }
    copyLog(logId,isSystemLog=false,isLS=false){
        if(isLS){
        let value = localStorage.getItem(logId)
        if(value)navigator.clipboard.writeText(value).then(() => this.showNotification(`已复制"${logId}"的值`)).catch(e => console.error('复制失败:',e))
        }
        let logs = isSystemLog ? this.systemLogs : this.logs
        let log = logs.find(item => item.id === logId)
        if(!log)return
        let text = ''
        if(log.count > 1){
            text += `[重复${log.count}次]`
        }
        log.args.forEach((arg,index)=>{
            if(index > 0)text += ' '
            if(typeof arg === 'object' && arg !== null){
                try{
                    text += this.safeStringify(arg,2)
                }catch{text+='{object}'}
            }else{text+=String(arg)}
        })
        if(isSystemLog)text=text.replace(/\[system](?! )|\[system] /,"")
        navigator.clipboard.writeText(text).then(() => this.showNotification('已复制到剪贴板!')).catch(e => console.error('复制失败:',e))
    }
    clearAllLogs(iscsl=false){
        this.triggerGlobalHook('beforeClear')
        if(iscsl){
            this.logs = []
            this.systemLogs = []
            this.lastLog = null
            this.renderContent()
            this.updateFilterCounts()
        	return
        }
        if(this.currentTab == "localstorage"){
            if(confirm("确定要清除所有本地存储吗？此操作不可撤销。")){
                localStorage.clear()
                this.renderLocalStorage()
            }
            return
        }
        let isSystem = this.currentTab == "system"
        if(confirm(`确定要清除所有${isSystem ? "系统" : "普通"}日志吗？此操作不可撤销。`)){
            if(isSystem){
            this.systemLogs = []
            }else{
            this.logs = []
            }
            this.lastLog = null
            this.renderContent()
            this.updateFilterCounts()
            this.showNotification(`所有${isSystem ? "系统" : "普通"}日志已清除`,'warning')
            this.triggerGlobalHook('afterClear')
        }
}
renderLSJsonPage(key,obj,page){
    let totalKeys = this.getJsonKeys(obj).length
    let totalPages = Math.ceil(totalKeys / this.lsJsonPageSize)
    this.lsJsonPageIndex.set(key,page)
    let keys = this.getJsonKeys(obj)
    let startIdx = page * this.lsJsonPageSize
    let endIdx = Math.min(startIdx + this.lsJsonPageSize,keys.length)
    let pageKeys = keys.slice(startIdx,endIdx)
    let slice = Array.isArray(obj) ? pageKeys.map(i => obj[i]) : Object.fromEntries(pageKeys.map(k => [k,obj[k]]))
    let json = this.safeStringify(slice,2).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'')
    let html = '<div class="json-preview ls-json-preview">' + this.highlightJson(json)
    if(totalPages > 1){
        let safeEncKey = encodeURIComponent(key)
        html += `<div style="display:flex;justify-content:center;gap:10px;margin-top:8px;"><button class="log-action ls-json-page-btn" data-key="${safeEncKey}" data-page="${Math.max(page-1,0)}">上一页</button><span style="color:#707070;margin-top:3px">第 ${page+1}/${totalPages} 页</span><button class="log-action ls-json-page-btn" data-key="${safeEncKey}" data-page="${Math.min(page+1,totalPages-1)}">下一页</button></div>`
    }
    html += '</div>'
    this.findLSItem(key).querySelector(".ls-value").style.background = "inherit"
    let pageDiv = this.findLSItem(key).querySelector('.ls-json-pages')
    if(pageDiv)pageDiv.innerHTML = html
}
changeLSJsonPage(encodedKey,newPage){
    let key = decodeURIComponent(encodedKey)
    let raw = localStorage.getItem(key)
    if(!raw)return
    try{
        let obj = JSON.parse(raw)
        this.renderLSJsonPage(key,obj,newPage)
    }catch(e){console.error('解析错误:',e)}
}
    renderLocalStorage(){
        this.lsItems.innerHTML = ''
        if(this.isLSEmpty()){
            this.lsItems.innerHTML = '<div class="nolog"><i class="fa fa-database"></i>无本地存储</div>'
            return
        }
        for(let i = 0;i < localStorage.length;i++){
            let key = localStorage.key(i)
            let value = localStorage.getItem(key)
            this.addLSItemToDOM(key,value)
        }
    }
addLSItemToDOM(key,value){
  let safeKey = this.escapeHtml(key)
  let item = document.createElement('div')
  item.className = 'ls-item'
  item.dataset.key = safeKey
  let {displayValue,valueType,isJSON} = this.parseAndTypeCheck(value)
  let highlightedValue = isJSON ? this.highlightJson(displayValue) : this.escapeHtml(displayValue)
  let valueHtml = ''
  if(isJSON){
    let obj = JSON.parse(value)
    let totalKeys = this.getJsonKeys(obj).length
    if(totalKeys > this.lsJsonPageSize){
      valueHtml = `<div class="ls-value"><div class="ls-json-pages" data-key="${safeKey}"></div></div>`
      this.lsJsonPageIndex.set(key,0)
      setTimeout(() => this.renderLSJsonPage(key,obj,0))
    }else{
      valueHtml = `<div class="ls-value"><pre>${highlightedValue}</pre></div>`
    }
  }else{
    valueHtml = `<div class="ls-value"><span class="json-${valueType}">${valueType === 'string' ? '"' : ''}${highlightedValue}${valueType === 'string' ? '"' : ''}</span></div>`
  }
  item.innerHTML = `<div class="ls-key-row"><input class="ls-key-edit" value="${safeKey}" data-old-key="${safeKey}"/><div class="ls-key" title="${safeKey}">${safeKey}</div><div class="ls-actions"><button class="ls-action-btn" data-action="edit" data-key="${safeKey}" title="编辑"><i class="fa fa-edit"></i></button><button class="ls-action-btn" data-action="copy" data-key="${safeKey}" title="复制"><i class="fa fa-copy"></i></button><button class="ls-action-btn" data-action="remove" data-key="${safeKey}" title="删除"><i class="fa fa-trash"></i></button></div></div>${valueHtml}<div class="ls-value-type">类型:${valueType}</div><div class="ls-edit" style="display:none"><textarea class="ls-edit-input">${this.escapeHtml(value)}</textarea><div class="ls-edit-actions"><button class="ls-action-btn" data-action="cancel" data-key="${safeKey}">取消</button><button class="ls-action-btn" data-action="save" data-key="${safeKey}">保存</button></div></div>`
  this.lsItems.appendChild(item)
  let noLogEl = this.lsItems.querySelector('.nolog')
  if(noLogEl)noLogEl.style.display = this.isLSEmpty() ? 'block' : 'none'
}
    parseAndTypeCheck(value){
        try{
            let parsed = JSON.parse(value)
            if(typeof parsed === 'object' && parsed !== null){
                return{displayValue:this.safeStringify(parsed,2).replace(/</g,'&lt;').replace(/>/g,'&gt;'),valueType:Array.isArray(parsed) ? 'array' : 'object',isJSON:true}
            }else if(parsed == null){
                return{displayValue:null,valueType:null,isJSON:false}
        }
            return{displayValue:value,valueType:typeof parsed,isJSON:false}
        }catch{
            return{displayValue:value,valueType:'string',isJSON:false}
        }
    }
isLSEmpty(){return !Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).some(k=>(k||'').trim())}
escapeHtml(str){return String(str).replace(/</g,'&lt;').replace(/>/g,'&gt;')}
addLSItem(){
  let key = (prompt('请输入键名：') || "").trim()
  if(!key)return
  if(localStorage.getItem(key) !== null){
    alert(`键名"${key}"已存在！`)
    return
  }
  let value = prompt(`请输入"${key}"的值：`)
  let toStore
  try{
    let fixed = this.fixKeysOnly(value)
    let obj = JSON.parse(fixed)
    toStore = JSON.stringify(obj)
  }catch{toStore=value}
  localStorage.setItem(key,toStore)
  this.addLSItemToDOM(key,toStore)
  this.showNotification(`已添加键"${key}"`)
}
editLSItem(key){
  this.lsItems.querySelectorAll('.ls-item').forEach(node => {
    node.classList.remove('editing')
    node.querySelector('.ls-value').style.display = 'block'
    node.querySelector('.ls-edit').style.display = 'none'
    let typeTag = node.querySelector('.ls-value-type')
    if(typeTag)typeTag.style.display = 'block'
  })
  let item = this.findLSItem(key)
  if(!item)return
  item.classList.add('editing')
  item.querySelector('.ls-value').style.display = 'none'
  item.querySelector('.ls-edit').style.display = 'block'
  let typeTag = item.querySelector('.ls-value-type')
  if(typeTag)typeTag.style.display = 'none'
  let input = item.querySelector('.ls-edit-input')
  if(input)input.focus()
}
saveLSItem(key){
  let item = this.findLSItem(key)
  if(!item)return
  let newKey = item.querySelector('.ls-key-edit').value.trim()
  if(!newKey){
      this.showNotification("键名不能为空","warning")
      return
  }
  let oldKey = item.querySelector('.ls-key-edit').dataset.oldKey
  let inputVal = this.fixKeysOnly(item.querySelector('.ls-edit-input').value)
  let toStore
  try{
      toStore = JSON.stringify(JSON.parse(inputVal))
     }catch{toStore=inputVal}
  if(newKey === oldKey){
    localStorage.setItem(oldKey,toStore)
    this.updateLSItemView(oldKey)
    this.cancelEditLSItem(oldKey)
    this.showNotification(`已保存键"${oldKey}"`)
    return
  }
  if(localStorage.getItem(newKey) !== null){
    this.showNotification(`键名“${newKey}”已存在！`,'warning')
    return
  }
  localStorage.removeItem(oldKey)
  localStorage.setItem(newKey,toStore)
  item.querySelector('.ls-key-edit').dataset.oldKey = newKey
  item.dataset.key = newKey
  this.updateLSItemView(newKey)
  this.cancelEditLSItem(newKey)
  this.showNotification(`已保存键"${newKey}"`)
}
fixKeysOnly(s){try{JSON.parse(s);return s}catch{return s.replace(/([{,])\s*([a-zA-Z_]\w*)\s*:/g,'$1"$2":').replace(/(":)\s*(?!true|false|null|\d+(\.\d+)?)([^\s,"{[}\]]+?)\s*(?=,|})/gs,'$1"$3"')}}
cancelEditLSItem(key){
  let item = this.findLSItem(key)
  if(!item)return
  item.classList.remove('editing')
  item.querySelector('.ls-value').style.display = 'block'
  item.querySelector('.ls-edit').style.display  = 'none'
  let typeTag = item.querySelector('.ls-value-type')
  if(typeTag)typeTag.style.display = 'block'
  this.renderLocalStorage()
}
removeLSItem(key){
   if(!confirm(`确定要删除键"${key}"吗？`))return
     localStorage.removeItem(key)
     let item = this.findLSItem(key)
     if(item){
       item.remove()
       this.showNotification(`已删除"${key}"`,'warning')
       this.renderLocalStorage()
     }
}
    findLSItem(key){return this.overlay.querySelector(`.ls-item[data-key="${key}"]`)}
    updateLSItemView(key){
        let item = this.findLSItem(key)
        if(!item)return
        let value = localStorage.getItem(key)
        if(value === null){
            item.remove()
            return
        }
        let parsedValue
        let isJSON = false
        try{
            parsedValue = JSON.parse(value)
            if(parsedValue && typeof parsedValue === 'object'){
                isJSON = true
            }
        }catch{}
        let valueType = isJSON ? 'JSON' : typeof value
        item.innerHTML = `<div class="ls-key-row"><div class="ls-key" title="${key}">${key}</div><div class="ls-actions"><button class="ls-action-btn" onclick="thinConsole.instance.editLSItem('${key}')"><i class="fa fa-edit"></i></button><button class="ls-action-btn" onclick="thinConsole.instance.copyLog('${key}','',true)"><i class="fa fa-copy"></i></button><button class="ls-action-btn" onclick="thinConsole.instance.removeLSItem('${key}')"><i class="fa fa-trash"></i></button></div></div><div class="ls-value">${value.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div><div class="ls-value-type">类型: ${valueType}</div><div class="ls-edit"><textarea class="ls-edit-input">${value.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea><div class="ls-edit-actions"><button class="ls-action-btn" onclick="thinConsole.instance.cancelEditLSItem('${key}')">取消</button><button class="ls-action-btn" onclick="thinConsole.instance.saveLSItem('${key}')">保存</button></div></div>`
    }
    setupGlobalEventHandlers(){
        this.activeFilter = 'all'
        this.searchQuery = ''
        this.tCError = e=>{
        if(e.filename === '' && e.lineno === 0 && e.colno === 0)return false
        this.error(e.error.toString(),{
             错误信息:e.message || "无信息",
             文件名:e.filename || "未知",
             位置:`${e.lineno}:${e.colno}` || "0:0",
             是否可信:e.isTrusted || true,
             类型:e.type || "error"
        })
        e.preventDefault()
        }
        this.tCUR = e=>{
        this.error("未处理的Promise异常",e.reason)
        e.preventDefault()
        }
        window.addEventListener('error',this.tCError)
        window.addEventListener('unhandledrejection',this.tCUR)
}
setupSelfProtection(){if(this.protectInterval)return;let self=this;this.protectInterval=setInterval(()=>{let btn=document.getElementById('thinConsole-btn');if(!btn||!document.documentElement.contains(btn)){self.btn=null;self.createButton();}else if(btn.style.display==='none'){btn.style.display='flex';}let overlay=document.getElementById('consoleOverlay');if(!overlay||!document.documentElement.contains(overlay)){self.overlay=null;self.createOverlayElement();self.createStyles();}else if(overlay.style.display==='none'){overlay.style.display='flex';}lock(self.btn);lock(self.overlay);},5000);let observer=new MutationObserver(list=>{list.forEach(m=>{if(m.type==='attributes'&&m.attributeName==='contenteditable'&&m.target.contentEditable==='true'&&m.target.dataset.tcLock){m.target.contentEditable='false';}});});function lock(root){if(!root||root.nodeType!==1)return;if(root.contentEditable!=='false'){root.contentEditable='false';root.dataset.tcLock='1';observer.observe(root,{attributes:true,attributeFilter:['contenteditable']});}root.querySelectorAll('*').forEach(n=>{if(n.contentEditable!=='false'){n.contentEditable='false';n.dataset.tcLock='1';observer.observe(n,{attributes:true,attributeFilter:['contenteditable']});}});}setTimeout(()=>{lock(self.btn);lock(self.overlay);},0);}
disablePlugin(pluginName){
    if(!this.disabledPlugins.includes(pluginName)){
        this.disabledPlugins.push(pluginName)
    }
    this.destroyPlugin(pluginName)
    return this
}
enablePlugin(pluginName){
    this.disabledPlugins = this.disabledPlugins.filter(n => n !== pluginName)
    this.loadSinglePlugin(pluginName)
    return this
}
loadSinglePlugin(pluginName){
if(this.disabledPlugins.includes(pluginName) || !thinConsole.plugins[pluginName] || this.plugins[pluginName])return
try{
    let PluginClass = thinConsole.plugins[pluginName]
    let pluginInstance = new PluginClass(this,PluginClass.config)
    pluginInstance.init()
    this.plugins[pluginName] = pluginInstance
    if(pluginInstance.addTab){
       let tabConfig = pluginInstance.addTab()
       this.createPluginTab(tabConfig)
       this.pluginTabs[pluginName] = {id:tabConfig.id,name:tabConfig.name,icon:tabConfig.icon || 'fa fa-plug',plugin:pluginInstance}
    }
    this.triggerGlobalHook('pluginMount',pluginName,pluginInstance)
}catch(e){console.error(`插件"${pluginName}"加载失败:`,e)}
return this
}
initPlugins(){
    Object.keys(thinConsole.plugins).forEach(pluginName => {
        if(this.disabledPlugins.includes(pluginName))return
        this.loadSinglePlugin(pluginName)
    })
    return this
}
destroyPlugin(pluginName){
    let plugin = this.plugins[pluginName]
    if(!plugin)return
    if(typeof plugin.destroy === 'function'){
        plugin.destroy()
    }
    let tabId = this.pluginTabs[pluginName]?.id
    if(tabId){
        let tabBtn = this.overlay.querySelector(`.tab-btn[data-tab="${tabId}"]`)
        tabBtn?.remove()
        let pluginView = this.pluginViewContainers[tabId]
        pluginView?.remove()
        delete this.pluginViewContainers[tabId]
    }
    delete this.plugins[pluginName]
    delete this.pluginTabs[pluginName]
    this.triggerGlobalHook('pluginUnmount',pluginName)
    return this
}
triggerGlobalHook(hookName,...args){
    if(thinConsole.hooks[hookName]){
       thinConsole.hooks[hookName].forEach(callback => {
       try{
         callback.call(this,...args)
      }catch(e){console.error(`钩子"${hookName}"执行错误:`,e)}
    })
  }
  return this
}
destroy(){
    if(thinConsole.instance !== this)return
    Object.assign(console,this.originalConsole)
    Object.keys(this.plugins).forEach(name => this.destroyPlugin(name))
    clearInterval(this.protectInterval)
    clearInterval(this.themeTimer)
    this.btn?.remove()
    this.overlay?.remove()
    this.notification?.remove()
    document.head.querySelector('style[tcstyle]').remove()
    window.removeEventListener('error',this.tCError)
    window.removeEventListener('unhandledrejection',this.tCUR)
    thinConsole.instance = null
}
    log(...t){console.log(...t);return this;}
    info(...t){console.info(...t);return this;}
    warn(...t){console.warn(...t);return this;}
    error(...t){console.error(...t);return this;}
    Systemlog(...t){console.log("[system]",...t);return this;}
    Systeminfo(...t){console.info("[system]",...t);return this;}
    Systemwarn(...t){console.warn("[system]",...t);return this;}
    Systemerror(...t){console.error("[system]",...t);return this;}
}
thinConsole.plugins = {}
window.thinConsole = thinConsole
thinConsole.instance = null
thinConsole.hooks = {beforeRender:[],afterRender:[],beforeLog:[],afterLog:[],beforeOpen:[],afterOpen:[],beforeClose:[],afterClose:[],beforeClear:[],afterClear:[],pluginMount:[],pluginUnmount:[]}
thinConsole.addPlugin = function(name,PluginClass,config={}){
if(!thinConsole.instance)return
let isClass = PluginClass.prototype instanceof tCPlugin
if(isClass){
  PluginClass.config = config
  thinConsole.plugins[name] = PluginClass
  if(thinConsole.instance.disabledPlugins.includes(name))return
  if(thinConsole.instance.pluginEnabled && !thinConsole.instance.plugins[name]){
  try{
     let pluginInstance = new PluginClass(thinConsole.instance,config)
     pluginInstance.init()
     thinConsole.instance.plugins[name] = pluginInstance
     if(pluginInstance.addTab){
       let tabConfig = pluginInstance.addTab()
       thinConsole.instance.pluginTabs[name] = {id:tabConfig.id,name:tabConfig.name,icon:tabConfig.icon || 'fa fa-tool',plugin:pluginInstance}
       thinConsole.instance.createPluginTab(tabConfig)
     }
     thinConsole.instance.triggerGlobalHook('pluginMount',name,pluginInstance)
  }catch(e){console.error(`插件"${name}"动态加载失败:`,e)}
 }
}else if(typeof PluginClass === 'function'){
if(thinConsole.instance.disabledPlugins.includes(name))return
  try{
     PluginClass.call(null, thinConsole.instance, config)
     thinConsole.instance.triggerGlobalHook('pluginMount',name,null)
   }catch(e){console.error(`函数插件"${name}"执行失败:`,e)}
}else{
     throw new Error(`插件"${name}"必须是类或函数类型`)
}
return thinConsole
}
thinConsole.addHook = function(hookName,callback){
    if(thinConsole.hooks[hookName] && !thinConsole.hooks[hookName].includes(callback)){
        thinConsole.hooks[hookName].push(callback)
    }else{
        console.warn(`未知钩子:${hookName}`)
    }
    return thinConsole
}
thinConsole.removeHook = function(hookName,callback){
if(thinConsole.hooks[hookName]){
    thinConsole.hooks[hookName] = thinConsole.hooks[hookName].filter(cb => cb !== callback)
}
return thinConsole
}
class tCPlugin{
    constructor(consoleInstance,config={}){
        if(!(consoleInstance instanceof thinConsole))throw new Error('插件必须绑定到thinConsole实例')
        this.tC = consoleInstance
        this.config = config
        this.id = this.constructor.name.toLowerCase()
    }
    init(){}
    render(container){}
    onShow(){}
    onHide(){}
    destroy(){}
}
