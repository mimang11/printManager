# 项目结构

```
printManager/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 主进程入口，窗口创建，IPC处理
│   │   ├── preload.ts           # 预加载脚本，暴露API给渲染进程
│   │   ├── fileManager.ts       # 文件管理，配置/记录读写
│   │   ├── scraper.ts           # 网页爬虫，抓取打印机计数器
│   │   └── analytics.ts         # 数据分析，统计计算
│   │
│   ├── renderer/                # React 渲染进程
│   │   ├── main.tsx             # React 入口
│   │   ├── App.tsx              # 根组件，路由管理
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # 数据看板（KPI、图表）
│   │   │   ├── DeviceManager.tsx # 设备管理（CRUD）
│   │   │   ├── PrinterDetail.tsx # 打印机详情
│   │   │   ├── DataComparison.tsx # 数据对比
│   │   │   └── RevenueManager.tsx # 营收管理
│   │   └── styles/
│   │       └── global.css       # 全局样式
│   │
│   └── shared/
│       └── types.ts             # 共享类型定义
│
├── dist/                        # 编译输出
│   ├── main/                    # 主进程编译结果
│   └── renderer/                # 渲染进程编译结果
│
├── release/                     # 打包输出 (exe)
│
├── package.json                 # 项目配置
├── tsconfig.json                # TypeScript 配置 (渲染进程)
├── tsconfig.main.json           # TypeScript 配置 (主进程)
└── vite.config.ts               # Vite 配置
```

## 核心模块说明

| 模块 | 功能 |
|------|------|
| `fileManager.ts` | 管理 config.json、records.json、other_revenues.json |
| `scraper.ts` | 使用 axios + cheerio 抓取打印机网页数据 |
| `analytics.ts` | 计算统计数据、图表数据、支持自定义公式 |
| `Dashboard.tsx` | BI 看板，支持按日/月/年切换 |
| `DeviceManager.tsx` | 打印机增删改查，测试抓取 |
| `RevenueManager.tsx` | 营收管理，每台机器明细 |

## 数据存储

数据默认存储在 `C:\Users\{用户}\Documents\PrinterData\`:
- `config.json` - 打印机配置
- `records.json` - 每日打印记录
- `other_revenues.json` - 其他营收记录
