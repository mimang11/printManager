# 数据库表结构说明

本系统使用 **Turso (LibSQL)** 云端数据库存储数据。

数据库名称: `printbase`

## 表结构

### 1. printer_logs - 打印日志表

存储每台打印机每天的打印数量记录。

```sql
CREATE TABLE printer_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_name TEXT NOT NULL,     -- 打印机名称，如 "一号机"
  machine_ip TEXT NOT NULL,       -- 打印机 IP 地址，如 "192.168.1.18"
  print_count INTEGER NOT NULL,   -- 当日打印数量
  log_date TEXT NOT NULL,         -- 日期 YYYY-MM-DD
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- 唯一约束
CREATE UNIQUE INDEX idx_machine_date ON printer_logs(machine_ip, log_date);
-- 索引
CREATE INDEX idx_printer_logs_date ON printer_logs(log_date);
CREATE INDEX idx_printer_logs_machine ON printer_logs(machine_name);
CREATE UNIQUE INDEX idx_printer_logs_unique ON printer_logs(machine_name, log_date);
```

**字段说明：** | 字段 | 类型 | 说明 | |------|------|------| | id | INTEGER | 自增主键 | | machine_name | TEXT | 打印机名称（别名） | | machine_ip | TEXT | 打印机 IP 地址 | | print_count | INTEGER | 当日打印数量 | | log_date | TEXT | 日期，格式 YYYY-MM-DD | | created_at | DATETIME | 记录创建时间 |

---

### 2. printers - 打印机配置表

存储打印机的基本配置信息。

```sql
CREATE TABLE printers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_name TEXT NOT NULL UNIQUE,  -- 打印机名称（别名），唯一
  machine_ip TEXT NOT NULL,           -- 打印机 IP 地址
  printer_type TEXT DEFAULT 'mono',   -- 打印机类型: mono=黑白机, color=彩机
  cost_per_page REAL DEFAULT 0.05,    -- 单张成本（元）
  price_per_page REAL DEFAULT 0.5,    -- 单张售价（元）
  status TEXT DEFAULT 'offline',      -- 状态: online/offline/error
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE UNIQUE INDEX idx_printers_name ON printers(machine_name);
```

**字段说明：** | 字段 | 类型 | 默认值 | 说明 | |------|------|--------|------| | id | INTEGER | - | 自增主键 | | machine_name | TEXT | - | 打印机名称（别名），唯一标识 | | machine_ip | TEXT | - | 打印机 IP 地址 | | printer_type | TEXT | 'mono' | 打印机类型：mono=黑白机, color=彩机 | | cost_per_page | REAL | 0.05 | 单张成本（元） | | price_per_page | REAL | 0.5 | 单张售价（元） | | status | TEXT | 'offline' | 打印机状态 | | created_at | DATETIME | CURRENT_TIMESTAMP | 创建时间 | | updated_at | DATETIME | CURRENT_TIMESTAMP | 更新时间 |

---

### 3. other_revenues - 其他收入表

存储除打印收入外的其他收入记录。

```sql
CREATE TABLE other_revenues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  revenue_date TEXT NOT NULL,         -- 日期 YYYY-MM-DD
  amount REAL NOT NULL,               -- 金额
  description TEXT,                   -- 描述/备注
  category TEXT DEFAULT '其他',       -- 分类
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_other_revenues_date ON other_revenues(revenue_date);
```

---

### 4. waste_records - 损耗记录表

存储每台打印机每天的损耗数量（卡纸、错打等）。

```sql
CREATE TABLE waste_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_ip TEXT NOT NULL,           -- 打印机 IP 地址
  waste_date TEXT NOT NULL,           -- 日期 YYYY-MM-DD
  waste_count INTEGER NOT NULL DEFAULT 0,  -- 损耗数量
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 唯一约束：每台打印机每天只有一条损耗记录
CREATE UNIQUE INDEX idx_waste_machine_date ON waste_records(machine_ip, waste_date);
```

**字段说明：** | 字段 | 类型 | 说明 | |------|------|------| | id | INTEGER | 自增主键 | | machine_ip | TEXT | 打印机 IP 地址 | | waste_date | TEXT | 日期，格式 YYYY-MM-DD | | waste_count | INTEGER | 损耗数量 | | created_at | DATETIME | 创建时间 |

**注意：** `printer_logs` 表中的 `print_count` 是累计值，实际当天打印量 = 当天累计值 - 前一天累计值

---

### 5. settings - 系统设置表

存储系统配置，如房租成本等。

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,   -- 设置键名
  setting_value TEXT NOT NULL,        -- 设置值
  description TEXT,                   -- 描述
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**预设配置：**
| setting_key | 默认值 | 说明 |
|-------------|--------|------|
| monthly_rent | 150 | 月租金（元） |

**字段说明：** | 字段 | 类型 | 说明 | |------|------|------| | id | INTEGER | 自增主键 | | revenue_date | TEXT | 日期，格式 YYYY-MM-DD | | amount | REAL | 金额（元） | | description | TEXT | 描述/备注 | | category | TEXT | 分类，默认"其他" | | created_at | DATETIME | 创建时间 |

---

## 初始化 SQL

在 Turso 控制台执行以下 SQL 创建表：

```sql
-- 1. 创建打印日志表
CREATE TABLE IF NOT EXISTS printer_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_name TEXT NOT NULL,
  machine_ip TEXT NOT NULL,
  print_count INTEGER NOT NULL,
  log_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_printer_logs_date ON printer_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_printer_logs_machine ON printer_logs(machine_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_printer_logs_unique ON printer_logs(machine_name, log_date);

-- 2. 创建打印机配置表
CREATE TABLE IF NOT EXISTS printers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_name TEXT NOT NULL UNIQUE,
  machine_ip TEXT NOT NULL,
  printer_type TEXT DEFAULT 'mono',
  cost_per_page REAL DEFAULT 0.05,
  price_per_page REAL DEFAULT 0.5,
  status TEXT DEFAULT 'offline',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_printers_name ON printers(machine_name);

-- 3. 创建其他收入表
CREATE TABLE IF NOT EXISTS other_revenues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  revenue_date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  category TEXT DEFAULT '其他',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_other_revenues_date ON other_revenues(revenue_date);

-- 4. 创建损耗记录表
CREATE TABLE IF NOT EXISTS waste_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_ip TEXT NOT NULL,
  waste_date TEXT NOT NULL,
  waste_count INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_waste_machine_date ON waste_records(machine_ip, waste_date);

-- 5. 创建系统设置表
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始化默认设置
INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES ('monthly_rent', '150', '月租金（元）');

-- 6. 创建代码备注表
CREATE TABLE IF NOT EXISTS code_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_type TEXT NOT NULL,            -- 代码类型: 'sp' 或 'error'
  code TEXT NOT NULL,                 -- 代码，如 SP5801, SC300
  note TEXT NOT NULL,                 -- 备注内容
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 唯一约束：每个代码类型+代码只有一条备注
CREATE UNIQUE INDEX IF NOT EXISTS idx_code_notes_unique ON code_notes(code_type, code);
```

---

## 环境配置

在项目根目录创建 `.env` 文件：

```env
# Turso 数据库配置
TURSO_DATABASE_URL=libsql://printbase-xxx.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
```

获取方式：

1. 登录 [Turso 控制台](https://turso.tech/)
2. 选择数据库 `printbase`
3. 点击 "Get connection URL" 获取 URL 和 Token
