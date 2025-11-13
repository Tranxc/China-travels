# 诗意山河 - 交互式地图文化探索平台

## 1. 项目简介

"诗意山河"是一个集成了高德地图服务、中国历史文化时间轴和用户交互系统（如收藏、评论）的Web应用程序。本项目旨在为用户提供一个深度互动、信息丰富且富有诗意的中国文化探索体验，让用户在浏览地理信息的同时，能直观地感受到"中国画卷"般的诗意与宏伟。

### 数据快速初始化
- 运行 
ode scripts/seed-scenes.js 可一次性把地图/经典景点同步到 scenes 表（需配置好 wrangler d1 并保证数据库中存在该表）。
- 默认向 china_travel_db 写入；若使用其他 D1 绑定，可通过环境变量 D1_DATABASE=your_db_name node scripts/seed-scenes.js 覆盖。

## 2. 核心功能模块 (Features)

- **用户认证系统**: 登录 / 注册 / 邮箱验证
- **地图探索服务**: 高德地图API接入 / 搜索跳转 / 缩放 / 定位
- **地图交互体验**: 双击获取地点信息 / 著名景点抽屉式详情
- **文化内容展示**: 首页 / 中国历史文化滚动时间轴
- **用户个性化功能**: 我的收藏 / 景点评论 / 删除评论
- **内容关联**: 景点与相关文化诗词的连接

## 3. 页面与模块详细分解

### (一) 首页 (Homepage)
**目标**: 作为应用的门户，提供项目简介和引导。

**组件**:
- 顶部栏 (Navbar): 左上角Logo, 右上角导航 (首页, 文化介绍, 登录/注册)
- 中间内容 (Hero Section): Slogan、介绍、[开始探索] 按钮 (跳转至地图页)
- 页脚 (Footer): 版权信息

### (二) 文化介绍页面
**目标**: 以视觉化的方式展示中国历史文化变迁。
- **访问**: 无需注册
- **核心组件**: 滚动时间轴 (展示历史节点、景点变迁)

### (三) 登录 / 注册页面
**目标**: 提供安全、简单的用户认证 (弹窗或独立页面)
- **功能**: 邮箱注册 (集成 Resend) 和登录

### (四) 探索地图页面 (核心)
**目标**: 提供主要的地图交互功能。

**组件**:
- 顶部栏 (Map Navbar): 搜索框 + [我的收藏] 按钮、引导语、用户信息
- 中间地图容器 (Map Container): 接入高德地图 JS API
- 地图控件 (Map Controls): 保留高德缩放，添加 [定位] 按钮

## 4. 核心交互流程

### (一) 交互1：常规地点信息 (右侧弹窗)
- **触发**: 用户在地图上 doubleClick (双击) 任意地点
- **响应**: 调用高德API (逆地理编码)，在 右侧 弹出一个小信息窗，展示地点介绍

### (二) 交互2：著名景点详情 (底部抽屉)
- **触发**: 用户 doubleClick 特定的预设景点
- **响应**: 执行 交互1，并在地图 正下方 显示一个 [箭头] 按钮
- **后续**: 用户点击 [箭头]
- **响应**: "景点文化介绍页面" 以抽屉（Drawer）的形式从 底部向上平滑划出

### (三) 交互3：景点文化介绍页面 (抽屉内部)
- **布局**: 左 (图片)、中 (介绍、诗词、收藏按钮)、右 (评论区)
- **评论区**: 默认 收缩，点击后 向左平滑划出。提供评论列表、发表、删除功能

## 5. 技术栈与API需求

### (一) 前端 (Frontend)
- **构建工具**: Vite (负责开发服务器、打包 src/main.js 和 src/style.css)
- **核心文件**: index.html (入口HTML), src/main.js (Vite 指定的 JS 入口), src/style.css
- **架构**: Vanilla JS (原生JS) 单页应用 (SPA)
- **地图**: 高德地图 JavaScript API 2.0
- **样式**: Tailwind CSS (推荐) 或原生 CSS

**提示**: 如使用 Tailwind，需在项目根目录配置 tailwind.config.js 和 postcss.config.js，并让 Vite 加载一个包含 @tailwind 指令的 CSS 文件。

### (二) 后端 & 服务 (Backend & Services)
- **文件**: functions/[[path]].js (Cloudflare Pages Functions)
- **核心API**: 高德地图 Web 服务 API (逆地理编码, POI搜索)
- **邮件服务**: Resend API
- **对象存储**: Cloudflare R2
- **数据库**: Firebase Firestore / Supabase
- **路由**: (推荐) 在 functions/[[path]].js 中使用 itty-router

## 6. 三人团队分工建议 (模块化文件分离)

### 成员 A: 前端核心 & 地图专家 (Frontend Lead & Map Specialist)

**核心职责**: 负责高德地图API的深度集成和所有地图交互。

**独立工作文件**:
- `src/modules/map.js` - 地图核心逻辑模块
- `src/modules/mapEvents.js` - 地图事件处理模块  
- `src/styles/map.css` - 地图专用样式

**具体任务**:

**src/modules/map.js** (核心地图模块):
```javascript
// 地图初始化和配置
export class MapManager {
  constructor() { /* ... */ }
  initMap() { /* 初始化高德地图 */ }
  loadPlugins() { /* 加载地图插件 */ }
  // 其他地图核心方法...
}
```

**src/modules/mapEvents.js** (地图事件处理):
```javascript
// 地图交互事件处理
export class MapEvents {
  onMapDoubleClick(event) { /* 双击事件处理 */ }
  handleSearch() { /* 搜索功能 */ }
  handleLocateMe() { /* 定位功能 */ }
  // 其他事件处理方法...
}
```

**src/styles/map.css** (地图样式):
```css
/* 地图容器样式 */
#map-container { /* ... */ }
#info-popup { /* 右侧弹窗样式 */ }
```

### 成员 B: 前端UI/UX & 页面开发 (Frontend UI/UX)

**核心职责**: 负责所有非地图的页面结构、UI/UX设计、页面切换和交互实现。

**独立工作文件**:
- `src/modules/ui.js` - UI状态管理和页面切换
- `src/modules/api.js` - API调用封装
- `src/styles/pages.css` - 页面样式
- `src/styles/components.css` - 组件样式  
- `src/components/home-page.html` - 首页HTML
- `src/components/culture-page.html` - 文化页HTML
- `src/components/auth-modal.html` - 登录注册弹窗
- `src/components/scene-drawer.html` - 景点详情抽屉

**具体任务**:

**src/modules/ui.js** (UI管理模块):
```javascript
// 页面切换和UI状态管理
export class UIManager {
  navigateTo(pageId) { /* 页面切换逻辑 */ }
  openAuthModal() { /* 打开登录弹窗 */ }
  showSceneDrawer(sceneId) { /* 显示景点抽屉 */ }
  showInfoPopup(addressString) { /* 显示信息弹窗 */ }
  // 其他UI管理方法...
}
```

**src/modules/api.js** (API封装模块):
```javascript
// 后端API调用封装
export class ApiService {
  async login(email, password) { /* 登录API */ }
  async register(email, password) { /* 注册API */ }
  async getSceneDetails(sceneId) { /* 获取景点详情 */ }
  async getComments(sceneId) { /* 获取评论 */ }
  // 其他API方法...
}
```

**src/styles/pages.css** (页面样式):
```css
/* 首页、文化页等页面样式 */
#page-home { /* 首页样式 */ }
#page-culture { /* 文化页样式 */ }
.timeline { /* 时间轴样式 */ }
```

**src/styles/components.css** (组件样式):
```css
/* 弹窗、抽屉等组件样式 */
#auth-modal { /* 登录弹窗样式 */ }
#scene-drawer { /* 景点抽屉样式 */ }
.comment-panel { /* 评论面板样式 */ }
```

**src/components/*.html** (HTML组件片段):
- 各个页面和组件的HTML结构
- 便于模块化管理和维护

---

### 成员 C: 后端 & 数据管理 (Backend & Full-Stack)

**核心职责**: 负责后端API、数据存储、用户认证和第三方服务集成。

**独立工作文件**:
- `functions/api/auth.js` - 用户认证相关API
- `functions/api/scenes.js` - 景点数据相关API  
- `functions/api/comments.js` - 评论系统API
- `functions/api/favorites.js` - 收藏功能API
- `functions/services/database.js` - 数据库操作服务
- `functions/services/email.js` - 邮件服务
- `functions/utils/auth.js` - 认证工具函数
- `functions/[[path]].js` - 路由入口文件

**具体任务**:

**functions/[[path]].js** (路由入口):
```javascript
// 主路由文件，整合所有API模块
import { Router } from 'itty-router';
import { authRoutes } from './api/auth.js';
import { sceneRoutes } from './api/scenes.js';
// ... 其他路由导入

const router = Router();
router.all('/api/auth/*', authRoutes);
router.all('/api/scenes/*', sceneRoutes);
// ... 其他路由配置

export const onRequest = (context) => router.handle(context.request, context);
```

**functions/api/auth.js** (认证API):
```javascript
// 用户认证相关API
export async function handleLogin(request, env) { /* 登录逻辑 */ }
export async function handleRegister(request, env) { /* 注册逻辑 */ }
export async function handleVerifyEmail(request, env) { /* 邮箱验证 */ }
```

**functions/api/scenes.js** (景点API):
```javascript
// 景点数据相关API
export async function getFamousScenes(request, env) { /* 获取著名景点列表 */ }
export async function getSceneDetails(request, env) { /* 获取景点详情 */ }
```

**functions/services/database.js** (数据库服务):
```javascript
// 数据库操作封装
export class DatabaseService {
  constructor(env) { /* 初始化数据库连接 */ }
  async createUser(userData) { /* 创建用户 */ }
  async getSceneById(sceneId) { /* 获取景点信息 */ }
  // 其他数据库操作...
}
```

**functions/services/email.js** (邮件服务):
```javascript
// 邮件发送服务 (Resend集成)
export class EmailService {
  constructor(apiKey) { /* 初始化邮件服务 */ }
  async sendVerificationEmail(email, token) { /* 发送验证邮件 */ }
}
```

## 7. 模块化文件分工概览

### 📁 项目文件结构 (模块化分离)
```
诗意山河/
├── index.html                    # 入口HTML (共同维护)
├── src/
│   ├── main.js                   # 主入口文件 (共同维护)
│   ├── modules/                  # 功能模块目录
│   │   ├── map.js               # 🗺️ 成员A: 地图核心逻辑
│   │   ├── mapEvents.js         # 🗺️ 成员A: 地图事件处理  
│   │   ├── ui.js                # 🎨 成员B: UI状态管理
│   │   └── api.js               # 🎨 成员B: API调用封装
│   ├── styles/                   # 样式文件目录
│   │   ├── main.css             # 🎨 成员B: 主样式文件
│   │   ├── map.css              # 🗺️ 成员A: 地图样式
│   │   ├── pages.css            # 🎨 成员B: 页面样式
│   │   └── components.css       # 🎨 成员B: 组件样式
│   └── components/               # HTML组件目录
│       ├── home-page.html       # 🎨 成员B: 首页HTML
│       ├── culture-page.html    # 🎨 成员B: 文化页HTML
│       ├── auth-modal.html      # 🎨 成员B: 登录弹窗
│       └── scene-drawer.html    # 🎨 成员B: 景点抽屉
└── functions/                    # 后端API目录
    ├── [[path]].js              # ⚙️ 成员C: 路由入口
    ├── api/                     # API模块目录
    │   ├── auth.js              # ⚙️ 成员C: 用户认证API
    │   ├── scenes.js            # ⚙️ 成员C: 景点数据API
    │   ├── comments.js          # ⚙️ 成员C: 评论系统API
    │   └── favorites.js         # ⚙️ 成员C: 收藏功能API
    ├── services/                # 服务模块目录
    │   ├── database.js          # ⚙️ 成员C: 数据库服务
    │   └── email.js             # ⚙️ 成员C: 邮件服务
    └── utils/                   # 工具函数目录
        └── auth.js              # ⚙️ 成员C: 认证工具
```

### 👥 明确的文件分工表

| 文件/模块                          | 负责人     | 主要职责                | 文件数量    |
| ---------------------------------- | ---------- | ----------------------- | ----------- |
| **🗺️ 地图相关**                     | **成员 A** | 地图API集成、交互逻辑   | **4个文件** |
| `src/modules/map.js`               | 成员 A     | 地图初始化和核心功能    |             |
| `src/modules/mapEvents.js`         | 成员 A     | 地图事件处理逻辑        |             |
| `src/styles/map.css`               | 成员 A     | 地图容器和控件样式      |             |
| **🎨 UI/UX相关**                    | **成员 B** | 页面设计、交互体验      | **7个文件** |
| `src/modules/ui.js`                | 成员 B     | UI状态管理和页面切换    |             |
| `src/modules/api.js`               | 成员 B     | 前端API调用封装         |             |
| `src/styles/main.css`              | 成员 B     | 主样式和全局样式        |             |
| `src/styles/pages.css`             | 成员 B     | 页面布局和样式          |             |
| `src/styles/components.css`        | 成员 B     | 组件样式和动画          |             |
| `src/components/home-page.html`    | 成员 B     | 首页HTML结构            |             |
| `src/components/culture-page.html` | 成员 B     | 文化介绍页HTML          |             |
| `src/components/auth-modal.html`   | 成员 B     | 登录注册弹窗HTML        |             |
| `src/components/scene-drawer.html` | 成员 B     | 景点详情抽屉HTML        |             |
| **⚙️ 后端相关**                     | **成员 C** | 服务端逻辑、数据管理    | **8个文件** |
| `functions/[[path]].js`            | 成员 C     | 路由入口和整合          |             |
| `functions/api/auth.js`            | 成员 C     | 用户认证API逻辑         |             |
| `functions/api/scenes.js`          | 成员 C     | 景点数据API逻辑         |             |
| `functions/api/comments.js`        | 成员 C     | 评论系统API逻辑         |             |
| `functions/api/favorites.js`       | 成员 C     | 收藏功能API逻辑         |             |
| `functions/services/database.js`   | 成员 C     | 数据库操作封装          |             |
| `functions/services/email.js`      | 成员 C     | 邮件服务封装            |             |
| `functions/utils/auth.js`          | 成员 C     | 认证工具函数            |             |
| **🔧 共同维护**                     | **全体**   | 项目配置和入口文件      | **3个文件** |
| `index.html`                       | 全体       | 主HTML入口 (引入各模块) |             |
| `src/main.js`                      | 全体       | JS主入口 (整合各模块)   |             |
| `vite.config.js`                   | 成员 B     | Vite配置和代理设置      |             |

### 🔄 模块间协作方式

**成员A ↔ 成员B**: 
- A的 `mapEvents.js` 调用 B的 `ui.js` 中的方法
- B的 `ui.js` 调用 A的 `map.js` 中的地图方法

**成员B ↔ 成员C**:
- B的 `api.js` 调用 C提供的后端API接口
- C根据B的需求设计API数据格式

**统一接口约定**:
```javascript
// 成员A提供给成员B的接口
window.MapAPI = {
  initMap: () => {},
  focusLocation: (lat, lng) => {},
  // ...
}

// 成员B提供给成员A的接口  
window.UIManager = {
  showInfoPopup: (data) => {},
  showSceneArrow: (sceneId) => {},
  // ...
}
```

## 8. 开发启动指南

1. **环境准备**
   ```bash
   npm install
   ```

2. **本地开发**
   ```bash
   # 启动前端开发服务器 (Vite)
   npm run dev
   
   # 启动后端开发服务器 (Wrangler) - 新终端窗口
   npx wrangler pages dev dist
   ```

3. **部署**
   ```bash
   # 构建项目
   npm run build
   
   # 部署到 Cloudflare Pages
   npx wrangler pages deploy dist
   ```

## 8. 开发协作流程

### 🚀 项目启动流程
1. **成员C** 首先创建后端API框架
2. **成员B** 搭建基础UI框架和页面结构  
3. **成员A** 集成地图功能和交互
4. **全体** 进行接口联调和测试

### 🔧 本地开发配置

**main.js 整合示例**:
```javascript
// src/main.js - 各模块整合入口
import { MapManager } from './modules/map.js';
import { UIManager } from './modules/ui.js';
import { ApiService } from './modules/api.js';

// 初始化各模块
const mapManager = new MapManager();
const uiManager = new UIManager();
const apiService = new ApiService();

// 暴露全局接口供模块间调用
window.MapAPI = mapManager;
window.UIManager = uiManager;
window.ApiService = apiService;

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
  uiManager.init();
  mapManager.init();
});
```

**CSS 整合示例**:
```css
/* src/styles/main.css - 样式入口文件 */
@import './pages.css';      /* 成员B: 页面样式 */
@import './components.css'; /* 成员B: 组件样式 */
@import './map.css';        /* 成员A: 地图样式 */

/* 全局样式 */
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
```

### 📝 开发规范
- **命名规范**: 使用kebab-case命名文件，camelCase命名变量
- **注释规范**: 每个函数必须有JSDoc注释
- **提交规范**: `feat: 功能描述` / `fix: 修复描述` / `style: 样式调整`
- **测试要求**: 各模块完成后进行单元测试

---

**让我们一起创造一个诗意盎然的中华文化探索之旅！** 🗺️✨
