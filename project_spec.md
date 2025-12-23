1. 项目概述 (Overview) 这是一个基于 Electron 的本地化打印机商业智能（BI）管理系统。

核心目标：自动化抓取局域网内打印机的计数器数据，进行成本/营收核算，并提供多维度的数据对比分析。

运行环境：Windows 10/11 (Local E: Drive)。

交付形态：单文件 .exe (Portable)。

2. 技术栈 (Tech Stack) Runtime: Electron (主进程处理 I/O 和 爬虫).

Frontend: React + TypeScript + Tailwind CSS + Shadcn/UI (组件库).

Visualization: Recharts (用于绘制营收趋势图).

Backend Logic (Node.js):

axios: HTTP 请求。

cheerio: HTML 解析 (jQuery 风格)。

iconv-lite: 处理旧式打印机页面的 GBK/GB2312 编码问题。

fs-extra: 增强的文件系统操作。

3. 数据架构 (Data Architecture) 所有数据必须存储在 E:\PrinterData\ 目录下。系统启动时需检测并自动创建。

3.1 配置文件 (config.json) 存储打印机的元数据和爬虫配置。

TypeScript

interface PrinterConfig { id: string; // UUID alias: string; // 自定义别名 (e.g., "财务室夏普") target_url: string; // 抓取地址 dom_selector: string; // CSS Selector (可编辑) financials: { cost_per_page: number; // 单张成本 (e.g., 0.05) price_per_page: number; // 单张售价 (e.g., 0.50) }; last_updated: string; // ISO Date status: 'online' | 'offline' | 'error'; } 3.2 历史记录 (records.json) 存储每日的快照数据，用于生成报表。

TypeScript

interface DailyRecord { record_id: string; printer_id: string; date: string; // YYYY-MM-DD (作为主索引) total_counter: number; // 当日抓取的总读数 daily_increment: number;// 当日新增印量 (Total - Yesterday_Total) timestamp: number; } 4. 核心功能需求 (Functional Requirements) 4.1 爬虫引擎 (Scraper Engine - Main Process) 触发机制：手动点击“刷新”或定时任务。

核心逻辑：

读取 config.json 遍历所有打印机。

请求 target_url (需处理 Timeout 和 Encoding)。

使用 dom_selector 提取数值 (过滤掉非数字字符)。

智能增量计算：

获取该打印机“昨天”的 total_counter。

daily_increment = current_counter - yesterday_counter。

如果找不到昨天的数据，daily_increment 默认为 0。

默认 Selector: 用户提供的默认选择器为： body > table > tbody > tr > td:nth-child(4) > table:nth-child(4) > tbody > tr > td:nth-child(2) > table:nth-child(1) > tbody > tr > td:nth-child(4)

4.2 设备管理 (Device Manager) 添加/编辑弹窗：

输入 URL、别名。

高级设置：Selector 输入框 (默认填入上述长串，但允许修改以适配不同机型)。

财务设置：设置成本价和销售价。

测试连接：在保存前，提供一个“测试抓取”按钮，实时验证 URL 和 Selector 是否能取到数据。

4.3 商业分析看板 (BI Dashboard) 头部指标卡 (KPI Cards):

今日总印量: (所有打印机今日增量之和) + 环比昨日 (↑/↓ %).

本月预估营收: (本月累计增量 \* 单价) + 环比上月.

本月净利润: (营收 - 成本).

趋势图表 (Charts):

使用 Recharts 渲染“近 7 天印量走势” (柱状图)。

渲染“设备贡献占比” (饼图，看哪台机器印得最多)。

4.4 数据对比 (Data Comparison) 在详情页展示表格：

昨日 vs 今日 (Day-over-Day).

本周 vs 上周 (Week-over-Week).

本月 vs 上月 (Month-over-Month).

5. 开发规范 (Implementation Guidelines) IPC Communication:

使用 ipcMain.handle 和 contextBridge.exposeInMainWorld。

禁止渲染进程直接使用 Node.js API。

Error Handling:

如果抓取失败，必须返回具体的错误原因（如：无法连接、选择器未匹配到数据）。

UI 上显示黄色警告状态，而不是崩溃。

Type Safety: 必须定义完整的 TypeScript 接口。

6. 用户不懂 React 尽可能多加注释 解释其原理
