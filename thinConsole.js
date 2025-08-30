class thinConsole{
        constructor(options = {}){
        let conbtn = document.getElementById("thinConsole-btn")
        if(conbtn)return
        let defaultOptions = {position:{x:-30,y:-30},text:'thinConsole',color:'#007aff',width:'auto',height:'auto',autoShow:true,theme:'light',plugins:true,disabledPlugins:[]}
        this.options = {...defaultOptions,...options}
        this.currentTheme = this.options.theme
        this.currentTab = 'console'
        this.pluginEnabled = this.options.plugins
        this.disabledPlugins = options.disabledPlugins || []
        this.plugins = {}
        this.pluginTabs = {}
        this.pluginViewContainers = {}
        this.logs = []
        this.systemLogs = []
        this.lastLog = null
        this.createStyles()
        this.createButton()
        this.bindEvents()
        this.captureConsoleLogs()
        this.createNotificationElement()
        this.createOverlayElement()
        this.setupGlobalEventHandlers()
        if(this.options.autoShow){
            this.setInitialPosition()
        }
        thinConsole.instances[this.options.id] = this
        this.renderContent()
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
            this.pluginTabs[pluginName] = {
                id:tabConfig.id,
                name:tabConfig.name,
                icon:tabConfig.icon || 'fa fa-plug',
                plugin:pluginInstance
            }
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
    createButton(){
        this.btn = document.createElement('button')
        this.btn.id = "thinConsole-btn"
        this.btn.className = 'floating-console-btn'
        this.btn.textContent = this.options.text
        this.btn.style.background = this.options.color
        this.btn.style.width = this.options.width
        this.btn.style.height = this.options.height
        document.querySelector("html").append(this.btn)
    }
    createOverlayElement(){
    this.overlay = document.createElement('div')
    this.overlay.id = 'consoleOverlay'
    this.overlay.className = 'overlay'
    this.overlay.innerHTML = `<div class="console-container"><div class="console-header"><div class="console-title"><i class="fa fa-terminal"></i>${this.options.text.slice(0,11)}</div><button class="clear-all-btn" title="清除所有日志" id="clearLogsBtn"><i class="fa fa-trash-alt"></i></button><button class="close-btn" id="closeConsoleBtn"><i class="fa fa-times"></i></button></div><div class="tabs" id="tabsContainer"></div><div class="console-content" id="contentArea"><div class="controls" id="consoleControls"><div class="filters"><button class="filter-btn active" data-type="all"><i class="fa fa-stream"></i>全部</button><button class="filter-btn" data-type="log"><i class="fa fa-info-circle"></i>日志</button><button class="filter-btn" data-type="info"><i class="fa fa-info-circle"></i>信息</button><button class="filter-btn" data-type="warn"><i class="fa fa-exclamation-triangle"></i>警告</button><button class="filter-btn" data-type="error"><i class="fa fa-times-circle"></i>错误</button></div><div class="search-box"><input type="text" id="searchInput" placeholder="搜索日志内容..."></div></div><div class="console-output" id="consoleOutput"></div><div class="localstorage-view" id="localstorageView" style="display:none"><div class="ls-header"><button id="addLSItemBtn" class="push-btn"><i class="fa fa-plus"></i>添加新项</button></div><div class="ls-items" id="lsItems"></div></div><div class="system-logs" id="systemLogs" style="display:none"></div></div></div>`
    document.querySelector("html").appendChild(this.overlay)
    this.tabButtonsContainer = this.overlay.querySelector('#tabsContainer')
    this.createBuiltinTabs()
    this.closeConsoleBtn = this.overlay.querySelector('#closeConsoleBtn')
    this.consoleOutput = this.overlay.querySelector('#consoleOutput')
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
this.lsItems.addEventListener('click',(e)=>{
    let btn = e.target.closest('.ls-action-btn')
    if(!btn)return
    let action = btn.dataset.action
    let key = btn.dataset.key
    switch(action){
        case 'edit':this.editLSItem(key);break
        case 'copy':this.copyLSValue(key);break
        case 'remove':this.removeLSItem(key);break
        case 'cancel':this.cancelEditLSItem(key);break
        case 'save':this.saveLSItem(key);break
    }
})
    this.overlay.addEventListener('click',(e)=>{
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
        tabBtn.addEventListener('click',() => {
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
        styles.innerHTML = `@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");*{margin:0;padding:0;box-sizing:border-box}.floating-console-btn{position:fixed;right:30px;bottom:30px;z-index:11000;padding:15px 25px;backdrop-filter:blur(5px);border-radius:10px;border:none;background:#007aff;color:white;font-size:1rem;cursor:move;display:flex;align-items:center;gap:10px;font-weight:500;box-shadow:0 8px 20px rgba(0,0,0,0.4);transition:all 0.3s ease;user-select:none}.floating-console-btn:hover{transform:scale(0.9);box-shadow:0 10px 25px rgba(0,0,0,0.5)}.floating-console-btn:active{transform:scale(0.98)}.floating-console-btn i{font-size:1.2rem}.overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:99998;opacity:0;visibility:hidden;transition:all 0.4s ease;backdrop-filter:blur(5px)}.overlay.active{opacity:1;visibility:visible}.theme-dark{--console-bg:#1e1e1e;--header-bg:#252526;--text-color:#d4d4d4;--controls-bg:#2d2d2d;--border-color:rgba(255,255,255,0.05);--log-bg:#191919;--log-border-light:3px solid;--filter-active:#4a4ae6;--search-bg:#3e3e42;--json-bg:rgba(40,40,40,0.7);--json-key:#6aaeff;--json-string:#98c379;--json-number:#d19a66;--json-boolean:#56b6c2;--json-null:#be5046;--action-bg:rgba(106,174,255,0.3);--action-hover:rgba(106,174,255,0.5);--log-icon-info:#4a4ae6;--log-icon-warn:#d9a40d;--log-icon-error:#ff3b30;--clear-btn-color:#ff6b6b;--clear-btn-hover:#ff5252;--tab-bg:#333;--tab-active:#444;--tab-color:#ddd}.theme-light{--console-bg:#ffffff;--header-bg:#f0f0f0;--text-color:#333;--controls-bg:#e0e0e0;--border-color:rgba(0,0,0,0.1);--log-bg:#f3f3f3;--log-border-light:3px solid;--filter-active:#4a4ae6;--search-bg:#f0f0f0;--json-bg:rgba(240,240,240,0.9);--json-key:#1e6bb8;--json-string:#22863a;--json-number:#d73a49;--json-boolean:#005cc5;--json-null:#6f42c1;--action-bg:rgba(30,107,184,0.1);--action-hover:rgba(30,107,184,0.2);--log-icon-info:#1e6bb8;--log-icon-warn:#e36209;--log-icon-error:#d73a49;--clear-btn-color:#ff5252;--clear-btn-hover:#ff3b30;--tab-bg:#e5e5e5;--tab-active:#ddd;--tab-color:#333}.console-container{background:var(--console-bg);width:100%;height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 15px 35px rgba(0,0,0,0.6);position:fixed;z-index:99999;bottom:0;left:0}.console-header{display:flex;justify-content:space-between;align-items:center;padding:15px 25px;background:var(--header-bg);border-bottom:1px solid var(--border-color);position:relative}.console-title{font-size:1.3rem;color:var(--text-color);gap:10px;display:flex;align-items:center}.push-btn{border:none;background:var(--filter-active);color:white;padding:10px;border-radius:5px}.close-btn{background:transparent;border:none;color:var(--text-color);font-size:1.5rem;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:all 0.3s}.close-btn:hover{background:rgba(255,100,100,0.2);color:#ff6464;transform:scale(1.1)}.clear-all-btn{position:absolute;top:50%;right:50px;transform:translateY(-50%);background:transparent;border:none;color:var(--clear-btn-color);font-size:1.5rem;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:all 0.3s;margin-left:0}.clear-all-btn:hover{background:rgba(255,100,100,0.2);color:var(--clear-btn-hover)}.tabs{display:flex;background:var(--tab-bg);padding:5px 10px 0;border-bottom:1px solid var(--border-color)}.tab-btn{padding:12px 20px;background:transparent;border:none;color:var(--tab-color);font-size:1rem;cursor:pointer;position:relative;transition:all 0.2s;display:flex;align-items:center;gap:8px}.tab-btn.active{color:var(--text-color);font-weight:600}.tab-btn.active::after{content:'';position:absolute;top:35px;left:0;width:100%;height:2px;border-radius:3px;background:var(--filter-active)}.tab-btn:hover:not(.active){background:rgba(255,255,255,0.05)}.controls{display:flex;padding:15px 20px;background:var(--controls-bg);gap:15px;flex-wrap:wrap;border-bottom:1px solid var(--border-color);align-items:center}.filters{display:flex;flex-wrap:nowrap}.filter-btn{position:relative;padding:10px;border-radius:10px;border:none;background:none;color:var(--text-color);cursor:pointer;font-size:0.85rem;transition:all 0.2s;display:flex;align-items:center}.filter-btn.active::after{content:"";position:absolute;width:90%;transition:all 0.3s ease;left:3px;height:2px;top:90%;border-radius:3px;background:var(--filter-active);color:white}.search-box{display:flex;flex-grow:1;max-width:400px}.search-box input{padding:10px 15px;border-radius:10px;border:none;background:var(--search-bg);color:var(--text-color);width:100%;transition:all 0.3s ease;font-size:0.95rem}.search-box input:focus{outline:none;border:2px solid #4a4ae6}.console-content{flex:1;overflow:hidden;display:flex;flex-direction:column}.console-output,.localstorage-view,.system-logs{flex:1;overflow-y:auto;padding:20px;font-family:monospace;font-size:0.95rem}.log-item{padding:10px 15px;margin-bottom:10px;display:flex;align-items:flex-start;border-left:var(--log-border-light) #4a4ae6;animation:fadeIn 0.2s ease;background:var(--log-bg);border-radius:10px}.log-item.log{border-left-color:#4a4ae6}.log-item.info{border-left-color:var(--log-icon-info)}.log-item.warn{border-left-color:var(--log-icon-warn)}.log-item.error{border-left-color:var(--log-icon-error);background:rgba(255,59,48,0.15)}.log-count{background:#4a4ae6;color:white;border-radius:20px;min-width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:0.85rem;margin-right:10px;margin-top:2px}.log-icon{margin-right:12px;font-size:1rem;min-width:20px;color:var(--text-color)}.log-content{width:100%;max-height:300px;overflow-y:auto;flex-grow:1;word-break:break-word;line-height:1.5;color:var(--text-color)}.timestamp{color:#707070;font-size:0.8rem;margin-left:10px;white-space:nowrap}.json-preview{font-family:monospace;padding:10px;margin-top:5px;background:var(--json-bg);border-radius:10px;white-space:pre-wrap !important;word-break:break-all ！important}.json-key{color:var(--json-key)}.json-string{color:var(--json-string)}.json-number{color:var(--json-number)}.json-boolean{color:var(--json-boolean)}.json-null{color:var(--json-null)}.log-actions{margin-top:8px;display:flex;gap:10px;font-size:0.85rem}.log-action{color:var(--json-key);cursor:pointer;padding:5px 10px;background:var(--action-bg);transition:all 0.2s;display:inline-flex;align-items:center;gap:5px;border-radius:5px}.log-action:hover{background:var(--action-hover)}.log-action.copy-btn{background:var(--action-bg)}.log-action.copy-btn:hover{background:var(--action-hover)}.error-stack{font-family:monospace;padding:10px;margin-top:10px;background:rgba(255,59,48,0.1);border-radius:10px;white-space:pre-wrap;word-break:break-all;color:#ff8a80;font-size:0.85rem}.object-preview{font-family:monospace;padding:10px;margin-top:5px;background:var(--json-bg);color:var(--json-number)}.function-preview{font-family:monospace;padding:10px;margin-top:5px;background:var(--json-bg);color:var(--json-boolean)}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.ls-header{padding:15px 0;display:flex;justify-content:flex-end}.ls-item{animation:fadeIn 0.2s ease;background:var(--log-bg);padding:15px;margin-bottom:15px;border-radius:8px}.ls-key-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid var(--border-color);padding-bottom:10px}.ls-key{font-weight:bold;color:var(--json-key);font-size:1.1rem;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ls-actions{display:flex;gap:8px}.ls-action-btn{background:var(--action-bg);border:none;color:var(--text-color);padding:5px 10px;border-radius:5px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:5px}.ls-action-btn:hover{background:var(--action-hover)}.ls-value{white-space:normal;word-break:break-all;padding:10px;background:var(--json-bg);border-radius:5px;font-family:monospace;max-height:200px;overflow-y:auto;color:var(--text-color)}.ls-edit{display:flex;flex-direction:column;gap:10px;margin-top:10px;display:none}.ls-edit textarea{width:100%;min-height:100px;padding:10px;background:var(--search-bg);border:1px solid var(--border-color);border-radius:5px;color:var(--text-color);font-family:monospace;resize:vertical;outline:none;transition:all 0.3s ease}.ls-edit textarea:focus{border-color:#4a4ae6}.ls-edit-actions{display:flex;gap:10px;justify-content:flex-end}.ls-value-type{font-size:0.8rem;opacity:0.7;margin-top:5px;color:var(--text-color)}.system-log-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.system-log-content{width:100%;max-height:300px;overflow-y:auto;font-family:monospace;white-space:pre-wrap;word-break:break-word;color:var(--text-color)}.system-log-date{font-size:0.8rem;color:#888}@media (max-width:768px){.controls{flex-direction:column;align-items:flex-start}.search-box{max-width:100%;width:100%}.filters{width:100%;justify-content:center}.log-item{flex-wrap:wrap}.timestamp{width:100%;margin-left:40px;margin-top:5px}.log-actions{flex-wrap:wrap}.floating-console-btn{padding:12px 20px;font-size:0.9rem;right:20px;bottom:20px}.clear-all-btn{right:60px}.tabs{flex-wrap:wrap}.tab-btn{padding:8px 12px;font-size:0.9rem}}.nolog{text-align:center;font-size:20px;color:var(--text-color);padding:40px 0}.notification{position:fixed;top:20px;right:20px;padding:12px 20px;background:#4CAF50;color:white;border-radius:5px;box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:99999;transform:translateX(120%);transition:transform 0.3s ease}.notification.show{transform:translateX(0)}.notification.warning{background:#ff9800}`
        document.head.append(styles)
    }
    showNotification(message,type=''){
        this.notification.textContent = message
        this.notification.className = 'notification'
        if(type === 'warning'){
            this.notification.classList.add('warning')
        }
        this.notification.classList.add('show')
        setTimeout(()=>{
            this.notification.classList.remove('show')
        },3000)
    }
    setInitialPosition(){
        let btn = document.getElementById(this.options.id)
        if(!btn)return
        btn.style.top = 'auto'
        btn.style.bottom = '30px'
        btn.style.right = '30px'
        btn.style.left = 'auto'
        btn.dataset.top = btn.style.top
        btn.dataset.left = btn.style.left
    }
    bindEvents(){
        this.btn.addEventListener('click',()=>{
            this.triggerGlobalHook('beforeOpen')
            this.overlay.className = 'overlay active theme-' + this.currentTheme
            this.renderContent()
            this.triggerGlobalHook('afterOpen')
        })
    }
    bindResizeHandler(){
        window.addEventListener('resize',()=>{
            let btn = document.getElementById(this.options.id)
            if(!btn)return
            let btnRect = btn.getBoundingClientRect()
            let windowHeight = window.innerHeight
            let windowWidth = window.innerWidth
            let newTop = parseInt(btn.style.top || 0)
            let newLeft = parseInt(btn.style.left || 0)
            if(newTop + btn.offsetHeight > windowHeight){
                newTop = windowHeight - btn.offsetHeight
            }
            if(newLeft + btn.offsetWidth > windowWidth){
                newLeft = windowWidth - btn.offsetWidth
            }
            btn.style.top = Math.max(0,newTop) + "px"
            btn.style.left = Math.max(0,newLeft) + "px"
            let maxTop = windowHeight - btn.offsetHeight
            let maxLeft = windowWidth - btn.offsetWidth
            if(parseInt(btn.style.top) > maxTop * 1.5 || parseInt(btn.style.left) > maxLeft * 1.5){
                btn.style.top = maxTop + "px"
                btn.style.left = maxLeft + "px"
            }
        })
    }
    captureConsoleLogs(){
        this.originalConsole = {
            log:console.log,
            info:console.info,
            warn:console.warn,
            error:console.error
        }
        console.log = (...args) => this.captureConsole('log',...args)
        console.info = (...args) => this.captureConsole('info',...args)
        console.warn = (...args) => this.captureConsole('warn',...args)
        console.error = (...args) => this.captureConsole('error',...args)
    }
    safeStringify(obj,space = 2){
        let seen = new WeakSet()
        return JSON.stringify(obj,(key,value) => {
            if(typeof value === 'object' && value !== null){
                if(seen.has(value)){
                    return '[循环引用]'
                }
                seen.add(value)
                if(value instanceof RegExp){
                    return value.toString()
                }
                let clone = Object.assign({},value)
                let propNames = Object.getOwnPropertyNames(value)
                for(let name of propNames){
                    if(!(name in clone)){
                        try{
                            clone[name] = value[name]
                        }catch(e){clone[name] = '不可访问属性'}
                    }
                }
                return clone
            }
            if(value instanceof Error){
                return {
                    name:value.name,
                    message:value.message,
                    stack:value.stack
                }
            }
            if(typeof value === 'function'){
                return value.toString()
            }
            if(value instanceof Date){
                return value.toISOString()
            }
            if(value instanceof HTMLElement){
                return `<${value.tagName.toLowerCase()}>`
            }
            return value
        },space)
    }
    formatArgsForPlainText(args){
        return Array.from(args).map(arg => {
            if(typeof arg === 'object' && arg !== null){
                try{
                    return this.safeStringify(arg)
                }catch(e){return '[无法序列化的对象]'}
            }
            return String(arg)
        }).join(' ')
    }
captureConsole(type,...args){
  this.triggerGlobalHook('beforeLog',type,...args)
  let timestamp = new Date()
  let generateContentSignature = () => {
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
 let contentSign = generateContentSignature()
 let logEntry = this.logs[this.logs.length - 1]
 this.triggerGlobalHook('afterLog',logEntry)
 }
  let contentSign = generateContentSignature()
  let isSystem = args.length > 0 && typeof args[0] === 'string' && args[0].startsWith("[system]")
  if(this.lastLog && this.lastLog.type === type && this.lastLog.contentSign === contentSign) {
  this.lastLog.args = [...args]
  this.lastLog.timestamp = new Date()
  this.lastLog.count++
  if(isSystem){
    let systemLog = this.systemLogs.find(l => l.id === this.lastLog.id)
     if(systemLog){
      systemLog.args = [...args]
      systemLog.timestamp = new Date()
      systemLog.count = this.lastLog.count
   }
 }
}else{
let logEntry = {id:this.logs.length,type,args:[...args],content:this.formatArgsForPlainText(args),timestamp,count:1,expandedJson:false,contentSign,hasObject:args.some(arg => typeof arg === 'object' && arg !== null),isError:type === 'error' || args.some(arg => arg instanceof Error),isSystem:isSystem}
  if(isSystem){
    let systemLogEntry = {...logEntry}
    systemLogEntry.id = this.systemLogs.length
    this.systemLogs.push(systemLogEntry)
}
  this.logs.push(logEntry)
  this.lastLog = logEntry
}
  this.originalConsole[type].apply(console,args)
  if(this.overlay?.classList.contains('active')){
  if(this.currentTab === 'console'){
    this.renderLogList(this.logs.filter(log => !log.isSystem),false)
    }else if(this.currentTab === 'system' && isSystem){
     this.renderLogList(this.systemLogs,true)
    }
  }
}
    formatArgs(args){
        return Array.from(args).map(arg => {
            if(typeof arg === 'object' && arg !== null){
                if(arg instanceof Error){
                    return `<div class="error-stack"><strong>${arg.name}:</strong>${arg.message}<div>${arg.stack || '无堆栈信息'}</div></div>`
                }
                if(typeof arg === 'function'){
                    return `<div class="function-preview">function ${arg.name || 'anonymous'}(){${arg}}</div>`
                }
                if(arg instanceof HTMLElement){
                    return `<div class="object-preview">&lt;${arg.tagName.toLowerCase()}&gt;${arg.tagName.toLowerCase()}元素&lt;/${arg.tagName.toLowerCase()}&gt;</div>`
                }
                try{
                    let json = this.safeStringify(arg,2)
                    return '<div class="json-preview">' + this.highlightJson(json) + '</div>'
                }catch(e){return `<div class="object-preview">无法序列化的对象:${e.message}</div>`}
            }
            return String(arg).replace(/</g,'&lt;').replace(/>/g,'&gt;')
        }).join(' ')
    }
highlightJson(json){
 if(!json)return ''
   return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d*)?([eE][+-]?\d+)?)/g,(match)=>{
   let cls = 'json-number'
   if(/^"/.test(match)){
     if(/:$/.test(match)){
       cls = 'json-key'
     }else{
       cls = 'json-string'
     }
   }else if(/true|false/.test(match)){
       cls = 'json-boolean'
   }else if(/null/.test(match)){
       cls = 'json-null'
   }
     return '<span class="' + cls + '">' + match + '</span>'
  })
}
    toggleExpandJson(logId){
        if(this.currentTab === 'console'){
            this.logs = this.logs.map(log => {
                if(log.id === logId){
                    return {...log,expandedJson:!log.expandedJson}
                }
                return log
            })
            this.renderLogList(this.logs.filter(log => !log.isSystem),false)
        }else if(this.currentTab === 'system'){
            this.systemLogs = this.systemLogs.map(log => {
                if(log.id === logId){
                    return {...log,expandedJson:!log.expandedJson}
                }
                return log
            })
            this.renderLogList(this.systemLogs,true)
        }
    }
renderContent(){
    this.triggerGlobalHook('beforeRender',this.currentTab)
    this.consoleOutput.style.display = 'none'
    this.localstorageView.style.display = 'none'
    this.systemLogsEl.style.display = 'none'
    Object.values(this.pluginViewContainers).forEach(view => {
        view.style.display = 'none'
    })
    this.consoleControls.style.display = 'flex'
    if (['console','system','localstorage'].includes(this.currentTab)){
        switch(this.currentTab){
            case 'console':
                this.consoleOutput.style.display = 'block'
                this.renderLogList(this.logs.filter(log => !log.isSystem),false)
                break
            case 'localstorage':
                this.localstorageView.style.display = 'block'
                this.consoleControls.style.display = 'none'
                this.renderLocalStorage()
                break
            case 'system':
                this.systemLogsEl.style.display = 'block'
                this.renderLogList(this.systemLogs,true)
                break
        }
    }else if(this.pluginViewContainers[this.currentTab]) {
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
        }catch(e){
            console.warn("无效的正则表达式:",query,"错误:",e)
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
        let logItems = filteredLogs.reverse().map(log => {
            let iconClass
            switch(log.type){
                case 'info':iconClass = 'fa fa-info-circle';break
                case 'warn':iconClass = 'fa fa-exclamation-triangle';break
                case 'error':iconClass = 'fa fa-bug';break
                default:iconClass = 'fa fa-info'
            }
            let time = log.timestamp.toLocaleTimeString()
            let date = log.timestamp.toLocaleDateString()
            if(isSystem){
                return `<div class="log-item ${log.type}">${log.count > 1 ? `<div class="log-count">${this.lastLog.count+1}</div>` : ''}<div class="log-icon"><i class="${iconClass}"></i>${log.type.toUpperCase()}</div><div class="system-log-date">${date} ${time}</div><div class="system-log-content">${log.expandedJson ? this.formatArgs(log.args) : log.args.map(arg => typeof arg === 'object' && !log.expandedJson ? '{Object}' : String(arg).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\[system\]/,"")).join(' ')}</div>${log.hasObject ? `<div class="log-actions"><div class="log-action" onclick="thinConsole.instances['${this.options.id}'].toggleExpandJson(${log.id})"><i class="fa ${log.expandedJson ? 'fa-compress' : 'fa-expand'}"></i>${log.expandedJson ? '收起' : '展开'}</div><div class="log-action copy-btn" onclick="thinConsole.instances['${this.options.id}'].copyLog(${log.id},true)"><i class="fa fa-copy"></i></div></div>` : `<div class="log-actions"><div class="log-action copy-btn" onclick="thinConsole.instances['${this.options.id}'].copyLog(${log.id},true)"><i class="fa fa-copy"></i></div></div>`}</div>`
            }else{
                return `<div class="log-item ${log.type}">${log.count > 1 ? `<div class="log-count">${this.lastLog.count+1}</div>` : ''}<div class="log-icon"><i class="${iconClass}"></i></div><div class="log-content">${log.expandedJson ? this.formatArgs(log.args) : log.args.map(arg => {
                    if(typeof arg === 'object' && !log.expandedJson){
                        if(arg instanceof Error)return `<strong>${arg.name}:</strong>${arg.message}`
                        if(typeof arg === 'function')return arg.toString()
                        if(arg instanceof HTMLElement)return `&lt;${arg.tagName.toLowerCase()}&gt;`
                        return '{Object}'
                    }
                    return String(arg).replace(/</g,'&lt;').replace(/>/g,'&gt;')
                }).join(' ')}${log.hasObject ? `<div class="log-actions"><div class="log-action" onclick="thinConsole.instances['${this.options.id}'].toggleExpandJson(${log.id})"><i class="fa ${log.expandedJson ? 'fa-compress' : 'fa-expand'}"></i>${log.expandedJson ? '收起' : '展开'}</div><div class="log-action copy-btn" onclick="thinConsole.instances['${this.options.id}'].copyLog(${log.id},false)"><i class="fa fa-copy"></i></div></div>` : `<div class="log-actions"><div class="log-action copy-btn" onclick="thinConsole.instances['${this.options.id}'].copyLog(${log.id},false)"><i class="fa fa-copy"></i></div></div>`}</div><div class="timestamp">${date} ${time}</div></div>`
            }
        }).join('')
        container.innerHTML = logItems
    }
    copyLog(logId,isSystemLog = false){
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
                }catch(e){text += '[object]'}
            }else{
                text += String(arg)
            }
        })
        navigator.clipboard.writeText(text).then(() => this.showNotification('已复制到剪贴板!')).catch(err => console.error('复制失败:',err))
    }
    clearAllLogs(){
        this.triggerGlobalHook('beforeClear')
        if(confirm("确定要清除所有控制台日志吗？此操作不可撤销。")){
            this.logs = []
            this.systemLogs = []
            this.lastLog = null
            this.renderContent()
            this.showNotification('所有日志已清除','warning')
            this.triggerGlobalHook('afterClear')
        }
    }
    renderLocalStorage(){
        this.lsItems.innerHTML = ''
        if(localStorage.length === 0){
            this.lsItems.innerHTML = '<div class="nolog"><i class="fa fa-database"></i>本地存储为空</div>'
            return
        }
        for(let i = 0;i < localStorage.length;i++){
            let key = localStorage.key(i)
            let value = localStorage.getItem(key)
            this.addLSItemToDOM(key,value)
        }
    }
    addLSItemToDOM(key,value){
        let lsItem = document.createElement('div')
        lsItem.className = 'ls-item'
        lsItem.dataset.key = key
        let safeKey = this.escapeHtml(key)
        let {displayValue,valueType,isJSON} = this.parseAndTypeCheck(value)
        let highlightedValue = isJSON ? this.highlightJson(displayValue) : this.escapeHtml(displayValue)
        lsItem.innerHTML = `<div class="ls-key-row"><div class="ls-key" title="${safeKey}">${safeKey}</div><div class="ls-actions"><button class="ls-action-btn" data-action="edit" data-key="${safeKey}"><i class="fa fa-edit"></i></button><button class="ls-action-btn" data-action="copy" data-key="${safeKey}"><i class="fa fa-copy"></i></button><button class="ls-action-btn" data-action="remove" data-key="${safeKey}"><i class="fa fa-trash"></i></button></div></div><div class="ls-value">${isJSON ? `<pre>${highlightedValue}</pre>` : `<span class='json-${valueType}'>${valueType == "string" ? '"' : ''}${highlightedValue}${valueType == "string" ? '"' : ''}</span>`}</div><div class="ls-value-type">类型:${valueType}</div><div class="ls-edit" style="display:none"><textarea class="ls-edit-input">${this.escapeHtml(value)}</textarea><div class="ls-edit-actions"><button class="ls-action-btn" data-action="cancel" data-key="${safeKey}">取消</button><button class="ls-action-btn" data-action="save" data-key="${safeKey}">保存</button></div></div>`
        this.lsItems.appendChild(lsItem)
    }
    parseAndTypeCheck(value){
        try{
            let parsed = JSON.parse(value)
            if(typeof parsed === 'object' && parsed !== null){
                return{
                    displayValue:this.safeStringify(parsed,2),
                    valueType:Array.isArray(parsed) ? 'array' : 'object',
                    isJSON:true
                }
            }else if(parsed == null){
                return{
                displayValue:null,
                valueType:null,
                isJSON:false
            }
        }
            return{
                displayValue:value,
                valueType:typeof parsed,
                isJSON:false
            }
        }catch(e){
            return{
                displayValue:value,
                valueType:'string',
                isJSON:false
            }
        }
    }
    escapeHtml(str){
        return String(str).replace(/</g,'&lt;').replace(/>/g,'&gt;')
    }
    addLSItem(){
        let key = prompt("请输入键名：")
        if(!key)return
        if(localStorage.getItem(key) !== null){
            alert(`键名"${key}"已存在！`)
            return
        }
        let value = prompt(`请输入"${key}"的值：`,"")
        if(value === null)return
        localStorage.setItem(key,value)
        this.addLSItemToDOM(key,value)
        this.showNotification('已添加LocalStorage项')
    }
    editLSItem(key){
        let allItems = this.lsItems.querySelectorAll('.ls-item')
        allItems.forEach(item => {
            let lsValue = item.querySelector('.ls-value')
            let lsEdit = item.querySelector('.ls-edit')
            let typeIndicator = item.querySelector('.ls-value-type')
            if(lsValue && lsEdit){
                lsValue.style.display = 'block'
                lsEdit.style.display = 'none'
            }
            if(typeIndicator){
                typeIndicator.style.display = 'block'
            }
        })
        let item = this.findLSItem(key)
        if(!item)return
        let lsValue = item.querySelector('.ls-value')
        let lsEdit = item.querySelector('.ls-edit')
        let typeIndicator = item.querySelector('.ls-value-type')
        lsValue.style.display = 'none'
        lsEdit.style.display = 'block'
        if(typeIndicator){
            typeIndicator.style.display = 'none'
        }
        let editInput = item.querySelector('.ls-edit-input')
        if(editInput){
            editInput.focus()
        }
    }
    saveLSItem(key){
        let item = this.findLSItem(key)
        if(!item)return
        let editInput = item.querySelector('.ls-edit-input')
        let newValue = editInput.value
        try{
            let jsonValue = JSON.parse(newValue)
            if(jsonValue && typeof jsonValue === 'object'){
                localStorage.setItem(key,JSON.stringify(jsonValue))
            }else{
                localStorage.setItem(key,newValue)
            }
        }catch{localStorage.setItem(key,newValue)}
        this.updateLSItemView(key)
        this.showNotification(`已更新"${key}"`)
        this.cancelEditLSItem(key)
    }
    cancelEditLSItem(key){
        let item = this.findLSItem(key)
        if(!item)return
        let lsValue = item.querySelector('.ls-value')
        let lsEdit = item.querySelector('.ls-edit')
        lsValue.style.display = 'block'
        lsEdit.style.display = 'none'
        let typeIndicator = item.querySelector('.ls-value-type')
        if(typeIndicator){
            typeIndicator.style.display = 'block'
        }
        this.renderLocalStorage()
    }
    removeLSItem(key){
        if(!confirm(`确定要删除键"${key}"吗？`))return
        localStorage.removeItem(key)
        let item = this.findLSItem(key)
        if(item){
            item.remove()
            this.showNotification(`已删除"${key}"`,'warning')
        }
    }
    copyLSValue(key){
        let value = localStorage.getItem(key)
        if(value){
            navigator.clipboard.writeText(value).then(() => this.showNotification(`已复制"${key}"的值`)).catch(err => console.error('复制失败:',err))
        }
    }
    findLSItem(key){
        return this.overlay.querySelector(`.ls-item[data-key="${key}"]`)
    }
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
        }catch(e){}
        let valueType = isJSON ? 'JSON' : typeof value
        item.innerHTML = `<div class="ls-key-row"><div class="ls-key" title="${key}">${key}</div><div class="ls-actions"><button class="ls-action-btn" onclick="thinConsole.instances['${this.options.id}'].editLSItem('${key}')"><i class="fa fa-edit"></i></button><button class="ls-action-btn" onclick="thinConsole.instances['${this.options.id}'].copyLSValue('${key}')"><i class="fa fa-copy"></i></button><button class="ls-action-btn" onclick="thinConsole.instances['${this.options.id}'].removeLSItem('${key}')"><i class="fa fa-trash"></i></button></div></div><div class="ls-value">${value.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div><div class="ls-value-type">类型: ${valueType}</div><div class="ls-edit"><textarea class="ls-edit-input">${value.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea><div class="ls-edit-actions"><button class="ls-action-btn" onclick="thinConsole.instances['${this.options.id}'].cancelEditLSItem('${key}')">取消</button><button class="ls-action-btn" onclick="thinConsole.instances['${this.options.id}'].saveLSItem('${key}')">保存</button></div></div>`
    }
    setupGlobalEventHandlers(){
        this.activeFilter = 'all'
        this.searchQuery = ''
        window.addEventListener('error',(e)=>{
            if(e.filename === '' && e.lineno === 0 && e.colno === 0)return false
            console.error(e.error.toString(),{
                错误信息:e.message || "无信息",
                文件名:e.filename || "未知",
                位置:`${e.lineno}:${e.colno}` || "0:0",
                是否可信:e.isTrusted || true,
                类型:e.type || "error"
            })
            return true
        })
        window.addEventListener('unhandledrejection',(e)=>{
            console.error("未处理的Promise异常",e.reason)
        })
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
thinConsole.instances = {}
thinConsole.plugins = {}
window.thinConsole = thinConsole
thinConsole.hooks = {beforeRender:[],afterRender:[],beforeLog:[],afterLog:[],beforeOpen:[],afterOpen:[],beforeClose:[],afterClose:[],beforeClear:[],afterClear:[],pluginMount:[],pluginUnmount:[]}
thinConsole.addPlugin = function(name,PluginClass,config={}){
   let isClass = PluginClass.prototype instanceof tCPlugin
   if(isClass){
    PluginClass.config = config
    thinConsole.plugins[name] = PluginClass
    Object.values(thinConsole.instances).forEach(instance => {
        if(instance.disabledPlugins.includes(name))return
        if(instance.pluginEnabled && !instance.plugins[name]){
            try{
                let pluginInstance = new PluginClass(instance,config)
                pluginInstance.init()
                instance.plugins[name] = pluginInstance
                if(pluginInstance.addTab){
                    let tabConfig = pluginInstance.addTab()
                    instance.pluginTabs[name] = {
                        id:tabConfig.id,
                        name:tabConfig.name,
                        icon:tabConfig.icon || 'fa fa-tool',
                        plugin:pluginInstance
                    }
                    instance.createPluginTab(tabConfig)
                }
                instance.triggerGlobalHook('pluginMount',name,pluginInstance)
            }catch(e){console.error(`插件"${name}"动态加载失败:`,e)}
        }
    })
    }else if(typeof PluginClass === 'function'){
        Object.values(thinConsole.instances).forEach(instance => {
            if(instance.disabledPlugins.includes(name))return
            try{
             PluginClass.call(null,instance,config)
             instance.triggerGlobalHook('pluginMount',name,null)
            }catch(e){console.error(`函数插件"${name}"执行失败:`,e)}
        })
    }else{
        throw new Error(`插件"${name}"必须是类或函数类型`)
    }
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
}
class tCPlugin{
    constructor(consoleInstance,config = {}){
        if(!(consoleInstance instanceof thinConsole)){
            throw new Error('插件必须绑定到thinConsole实例')
        }
        this.console = consoleInstance
        this.config = config
        this.id = this.constructor.name.toLowerCase()
    }
    init(){}
    render(container){}
    onShow(){}
    onHide(){}
    destroy(){}
    log(...t){console.log(...t);return this;}
    info(...t){console.info(...t);return this;}
    warn(...t){console.warn(...t);return this;}
    error(...t){console.error(...t);return this;}
    Systemlog(...t){console.log("[system]",...t);return this;}
    Systeminfo(...t){console.info("[system]",...t);return this;}
    Systemwarn(...t){console.warn("[system]",...t);return this;}
    Systemerror(...t){console.error("[system]",...t);return this;}
}