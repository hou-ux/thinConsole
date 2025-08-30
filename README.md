
# thinConsole

`thinConsole` 是一个轻量级、功能丰富的浏览器端 JavaScript 控制台增强库。它提供了一个可浮动的按钮，点击后可以展开一个功能强大的控制台面板，用于捕获和查看日志、管理本地存储（LocalStorage）、记录系统事件，并支持通过插件系统进行扩展。

## 功能特性

*   **📝 智能日志捕获**: 拦截并重写 `console.log`, `info`, `warn`, `error`，提供更美观、可交互的日志显示。
*   **🎨 主题支持**: 提供亮色（Light）和暗色（Dark）两种主题。
*   **🔍 日志过滤与搜索**: 可按日志类型（全部、日志、信息、警告、错误）过滤，并支持关键词和正则表达式搜索。
*   **📂 多标签页管理**:
    *   **控制台**: 查看所有捕获的应用程序日志。
    *   **系统日志**: 查看标记为 `[system]` 的特殊日志。
    *   **本地存储**: 可视化地查看、编辑、添加、删除和复制 LocalStorage 项，支持 JSON 高亮和类型显示。
*   **🧩 插件系统**: 强大的插件架构，允许开发者轻松扩展控制台的功能，添加自定义标签页和逻辑。
*   **⚙️ 丰富的配置**: 可通过构造函数选项自定义按钮文本、颜色、位置、主题等。
*   **📋 交互操作**: 支持展开/收起对象、复制日志内容、一键清除所有日志等。
*   **🎯 全局钩子 (Hooks)**: 提供多个生命周期钩子（如 `beforeLog`, `afterOpen`, `pluginMount` 等），便于在其他代码中监听和控制控制台的行为。
*   **🖱️ 可拖动按钮**: 悬浮按钮可在屏幕上自由拖动。

## 安装与使用

### 1. 引入库

将 `thinConsole` 的源代码直接引入到你的 HTML 文件中。

```html

<!DOCTYPE html>

<html lang="zh-CN">

<head>

<meta charset="UTF-8">

<title>My App with thinConsole</title>

<!-- thinConsole 会自动注入所需样式和 Font Awesome -->

</head>

<body>

<!-- 你的页面内容 -->

<script src="path/to/thinconsole.js"></script>
<script>
    // 你的应用代码
</script>

</body>

</html>
```

### 2. 初始化

在您的 JavaScript 代码中，创建一个 `thinConsole` 实例。

```javascript

// 使用默认配置

const console = new thinConsole();

// 或使用自定义配置

const myConsole = new thinConsole({

id: 'myConsole', // 实例 ID，多实例时必需

text: '调试',     // 按钮文字

color: '#ff4757', // 按钮颜色

theme: 'dark',    // 默认主题 'light' | 'dark'

autoShow: true,   // 是否自动设置按钮位置

plugins: true,    // 是否启用插件系统

disabledPlugins: ['examplePlugin'], // 初始禁用的插件名数组

position: { x: 20, y: 20 } // 初始位置

});

// 之后您可以像使用普通 console 一样使用它

myConsole.log('这是一条普通日志');

myConsole.error('这是一条错误日志！');

myConsole.Systemlog('这是一条系统日志');

```
## 配置选项

| 选项 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `String` | - | **重要**：实例的唯一标识符。多实例时必须设置。 |
| `text` | `String` | `'thinConsole'` | 浮动按钮上显示的文字。 |
| `color` | `String` | `'#007aff'` | 浮动按钮的背景颜色。 |
| `width` | `String` | `'auto'` | 浮动按钮的宽度。 |
| `height` | `String` | `'auto'` | 浮动按钮的高度。 |
| `theme` | `String` | `'light'` | 控制台主题，`'light'` 或 `'dark'`。 |
| `autoShow` | `Boolean` | `true` | 是否自动将按钮放置在右下角。 |
| `plugins` | `Boolean` | `true` | 是否自动加载可用插件。 |
| `disabledPlugins` | `Array` | `[]` | 需要禁用的插件名称数组。 |
| `position` | `Object` | `{x: -30, y: -30}` | 按钮的初始坐标。 |

## API 参考

### 实例方法

通过 `thinConsole` 实例可以调用以下方法：

| 方法 | 参数 | 描述 | 返回值 |
| :--- | :--- | :--- | :--- |
| `log(...args)` | `...args`: 任何参数 | 记录一条普通日志，等同于 `console.log`。 | `this` (支持链式调用) |
| `info(...args)` | `...args`: 任何参数 | 记录一条信息日志，等同于 `console.info`。 | `this` |
| `warn(...args)` | `...args`: 任何参数 | 记录一条警告日志，等同于 `console.warn`。 | `this` |
| `error(...args)` | `...args`: 任何参数 | 记录一条错误日志，等同于 `console.error`。 | `this` |
| `Systemlog(...args)` | `...args`: 任何参数 | 记录一条**系统**普通日志。 | `this` |
| `Systeminfo(...args)` | `...args`: 任何参数 | 记录一条**系统**信息日志。 | `this` |
| `Systemwarn(...args)` | `...args`: 任何参数 | 记录一条**系统**警告日志。 | `this` |
| `Systemerror(...args)` | `...args`: 任何参数 | 记录一条**系统**错误日志。 | `this` |
| `disablePlugin(pluginName)` | `pluginName`: `String` | 禁用一个已加载的插件。 | `this` |
| `enablePlugin(pluginName)` | `pluginName`: `String` | 启用一个被禁用的插件。 | `this` |

### 全局方法

通过 `window.thinConsole` 调用：

| 方法 | 参数 | 描述 |
| :--- | :--- | :--- |
| `thinConsole.addPlugin(name, PluginClass, config)` | `name`: `String`<br>`PluginClass`: `Class\|Function`<br>`config`: `Object` | 注册一个全局插件。可以是类（继承自 `tCPlugin`）或函数。 |
| `thinConsole.addHook(hookName, callback)` | `hookName`: `String`<br>`callback`: `Function` | 注册一个全局生命周期钩子函数。 |
| `thinConsole.removeHook(hookName, callback)` | `hookName`: `String`<br>`callback`: `Function` | 移除一个全局生命周期钩子函数。 |

### 生命周期钩子 (Hooks)

可用的钩子名称及其触发时机：

*   `beforeLog(type, ...args)`: 在日志被捕获并输出到原始控制台之前。
*   `afterLog(logEntry)`: 在日志被处理并存储之后。
*   `beforeOpen()`: 在控制台覆盖层显示之前。
*   `afterOpen()`: 在控制台覆盖层显示之后。
*   `beforeClose()`: 在控制台覆盖层隐藏之前。
*   `afterClose()`: 在控制台覆盖层隐藏之后。
*   `beforeClear()`: 在清除所有日志之前。
*   `afterClear()`: 在清除所有日志之后。
*   `beforeRender(currentTab)`: 在渲染标签页内容之前。
*   `afterRender(currentTab)`: 在渲染标签页内容之后。
*   `pluginMount(pluginName, pluginInstance)`: 在插件挂载完成后。
*   `pluginUnmount(pluginName)`: 在插件卸载后。

**示例：使用钩子**

```javascript

function myBeforeOpenHook() {

console.log('控制台即将打开！');

}

thinConsole.addHook('beforeOpen', myBeforeOpenHook);

```
## 插件开发

您可以创建插件来扩展 `thinConsole` 的功能。

### 1. 创建插件类

插件类应继承自 `tCPlugin`。

```javascript

// my-plugin.js

class MyAwesomePlugin extends tCPlugin {

init() {

// 插件初始化逻辑，例如绑定事件、设置初始状态

this.console.log(
"插件 ${this.id} 已初始化！");

}

// 可选：返回一个标签页配置对象，用于在控制台中创建新标签页
addTab() {
    return {
        id: 'myPluginTab', // 标签页唯一ID
        name: '我的插件',   // 标签页显示名称
        icon: 'fa fa-rocket' // 标签页图标 (Font Awesome)
    };
}

// 可选：当插件标签页被显示时调用
onShow() {
    // 可以在这里获取最新数据
}

// 可选：用于渲染插件标签页的内容
render(container) {
    container.innerHTML = `
        <h2>欢迎使用我的插件！</h2>
        <p>当前配置：${JSON.stringify(this.config)}</p >
        <button onclick="alert('来自插件！')">点击我</button>
    `;
}

// 可选：清理工作
destroy() {
    this.console.log(`插件 ${this.id} 已被销毁。`);
}

}

```
### 2. 注册插件

在您的应用代码中注册插件：

```javascript

// 注册插件，并传递配置

thinConsole.addPlugin('myAwesomePlugin', MyAwesomePlugin, { someOption: true });

// 初始化控制台实例

const console = new thinConsole({ id: 'mainConsole' });

// 插件会自动加载（除非在 disabledPlugins 中禁用）

```
### 3. 函数式插件

您也可以注册一个简单的函数作为插件。

```javascript

function simplePlugin(consoleInstance, config) {

consoleInstance.log('这是一个简单的函数插件！', config);

}

thinConsole.addPlugin('simplePlugin', simplePlugin, { message: 'Hello' });

```
## 多实例支持

通过配置不同的 `id`，可以创建多个独立的 `thinConsole` 实例。

```javascript

const console1 = new thinConsole({ id: 'console_1', text: '控制台1', color: 'red' });

const console2 = new thinConsole({ id: 'console_2', text: '控制台2', color: 'blue' });

// 可以通过 thinConsole.instances 访问所有实例

thinConsole.instances['console_1'].log('来自控制台1');
```

## 注意事项

1.  **依赖**: 该库自动从 CDN 加载 Font Awesome v6，用于图标显示。
2.  **样式冲突**: 库会向 `<head>` 注入大量 CSS 样式，请确保不会与您项目的样式发生冲突。
3.  **性能**: 捕获大量复杂的对象日志可能会轻微影响性能，建议在生产环境中禁用或谨慎使用。
4.  **错误处理**: 库会监听全局 `error` 和 `unhandledrejection` 事件，并自动将其记录为错误日志。

## 浏览器兼容性

适用于所有支持 ES6+ 和现代 DOM API 的现代浏览器（如 Chrome, Firefox, Safari, Edge 等）。

## 许可证

MIT
