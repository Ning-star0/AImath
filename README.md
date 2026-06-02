# 爱因数学星球

面向小学 1-6 年级学生的 AI 数学智能学习平台。覆盖练习闯关、AI 讲题、错题复习、学习报告和学情分析，支持学生、教师、家长、管理员四种角色。

## 系统架构

```
浏览器 / 手机
    │
    ▼
┌────────────────────────────────────────────────┐
│  nginx (端口 80)                                │
│  ├─ /api/v1/*  →  backend:3001                  │
│  └─ 其他请求   →  frontend:3000                  │
└────────────────────────────────────────────────┘
    │                    │
    ▼                    ▼
┌──────────┐    ┌──────────────┐    ┌────────────┐
│ Next.js  │    │   NestJS     │    │ PostgreSQL │
│ :3000    │───▶│   :3001      │───▶│ :5432      │
│ 前端渲染  │    │   REST + SSE │    │            │
└──────────┘    │              │    └────────────┘
                │  ┌─────────┐ │    ┌────────────┐
                │  │ DeepSeek│ │    │   Redis    │
                │  │ 文本模型 │ │    │ :6379      │
                │  └─────────┘ │    └────────────┘
                │  ┌─────────┐ │
                │  │ 豆包视觉 │ │
                │  │ OCR模型  │ │
                │  └─────────┘ │
                └──────────────┘
```

## 功能概览

### 学生端

| 功能 | 说明 |
|------|------|
| 练习闯关 | 按年级/知识点筛题，提交后即时批改反馈，冒险地图式入口 |
| AI 讲题 | 文本输入或拍照上传，AI 分步讲解，支持 5 种教学模式 |
| 错题本 | 按题型/年级筛选，重练答对自动移除，支持归档 |
| 学习报告 | 总做题数/正确率/知识点掌握度/学习趋势，AI 学习总结 |
| 个人中心 | 年级切换、个人信息 |

#### AI 讲题特色

- **双模型协作**：DeepSeek 负责文本分步讲解，豆包视觉模型负责图片 OCR 识别题目
- **SSE 流式输出**：AI 逐字推送，学生实时看到讲解内容，不等全部生成完
- **5 种教学模式**：完整讲解 / 先审题不展开 / 只提示一步 / 换种讲法 / 错因分析
- **安全过滤**：自动拒绝暴力、色情、政治等不适合小学生的内容
- **结构化输出**：steps 分步讲解、finalAnswer 答案、knowledgePoints 知识点、similarQuestions 相似题推荐

### 教师端

- 查看班级学生列表
- 学生练习进度与正确率
- 审核状态管理

### 家长端

- 绑定孩子账号（输入学生学号和密码）
- 查看绑定孩子的做题数据、错题、AI 问答次数
- AI 学习建议

### 管理端

- 用户管理
- 题库管理（JSON 粘贴导入 / 文件上传导入 / 导入去重 / 批量删除）

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Next.js 15 (App Router) + React 19 |
| 前端语言 | TypeScript |
| UI | Tailwind CSS 3 |
| 状态管理 | Zustand |
| 表单 | React Hook Form |
| HTTP 客户端 | Axios + Fetch (SSE 流式) |
| 后端框架 | NestJS |
| ORM | Prisma |
| 数据库 | PostgreSQL |
| 缓存 | Redis |
| 认证 | JWT + bcryptjs |
| API 文档 | Swagger |
| AI 文本模型 | DeepSeek (OpenAI-compatible API) |
| AI 视觉模型 | 豆包 (Volcengine Ark) |
| 部署 | Docker + Docker Compose + Nginx |

## 目录结构

```
AImath/
├── frontend/
│   ├── src/app/                  # Next.js App Router 页面
│   │   ├── (auth)/login/         #   登录/注册页
│   │   ├── student/              #   学生端
│   │   ├── teacher/              #   教师端
│   │   ├── family/               #   家长端
│   │   └── admin/                #   管理端
│   ├── src/components/
│   │   ├── base/page-shell.tsx   #   全局布局骨架（header + 导航）
│   │   ├── ai-qa/                #   AI 讲题组件
│   │   ├── brand/                #   品牌组件
│   │   └── states/               #   状态页（401/403/404等）
│   ├── src/services/             #   前端 API 调用层
│   ├── src/store/                #   Zustand 全局状态
│   ├── src/lib/                  #   工具函数 + axios 配置
│   └── src/types/                #   TypeScript 类型定义
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         #   数据库模型定义（20 张表）
│   │   └── seed.ts               #   种子数据脚本
│   ├── src/
│   │   ├── modules/              #   业务模块
│   │   │   ├── auth/             #     认证（登录、注册）
│   │   │   ├── ai-qa/            #     AI 讲题（含 Prompt 工程）
│   │   │   ├── exercises/        #     练习闯关
│   │   │   ├── questions/        #     题库管理
│   │   │   ├── wrongbook/        #     错题本
│   │   │   ├── reports/          #     学习报告
│   │   │   ├── teacher/          #     教师端
│   │   │   ├── family/           #     家长端
│   │   │   ├── admin/            #     管理后台
│   │   │   └── governance/       #     合规治理
│   │   ├── common/               #   守卫、装饰器、拦截器
│   │   └── shared/               #   共享服务
│   │       ├── ai/               #     AI 双模型客户端
│   │       └── student-memory/   #     学情记忆服务
│   └── src/main.ts               #   应用入口
│
├── docker/
│   ├── docker-compose.yml        #   5 容器编排
│   └── nginx/default.conf        #   反向代理配置
│
├── docs/                         #   设计文档
├── scripts/                      #   工具脚本
└── .env                          #   环境变量（Docker 用）
```

## 数据库设计

共 20 张表，按功能分为四组：

**认证组**：`User` (基表) — `Student` / `Teacher` (1:1 扩展) — `ParentBinding` (家长-学生绑定)

**题库组**：`Question` — `KnowledgePoint` (自引用知识点树) — `QuestionKnowledgePoint` (N:M 关联)

**练习组**：`ExerciseRecord` — `ExerciseRecordDetail` (1:N 批改明细) — `WrongQuestion` (错题独立管理)

**辅助组**：`AiQaRecord` (AI 问答记录) — `LearningReport` (学习报告) — `StudentMemorySnapshot` / `StudentMemoryHistory` (学情快照与历史) — `PilotFeedback` (用户反馈) — `SystemLog` (系统日志)

关键设计：
- User 与 Student/Teacher 采用单表继承，按角色拆字段
- WrongQuestion 独立于 ExerciseRecord，支持重练/归档生命周期
- StudentMemory 采用 Snapshot + History 双表设计，兼顾查询性能和变更追溯

## 快速开始

### Docker 部署（推荐）

```bash
# 1. 准备环境变量
cp .env.example .env

# 2. 一键启动所有服务
docker compose -f docker/docker-compose.yml up -d --build

# 3. 初始化数据库结构
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm exec prisma db push

# 4. 填充演示数据
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm run seed
```

### 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 准备环境变量
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. 启动数据库（用 Docker）
docker compose -f docker/docker-compose.yml up -d postgres redis

# 4. 初始化数据库
pnpm --filter backend prisma:generate
pnpm --filter backend exec prisma db push
pnpm --filter backend seed

# 5. 同时启动前后端
pnpm dev
```

## 访问地址

| 入口 | 本地开发 | Docker 部署 |
|------|---------|------------|
| 前端 | `http://localhost:3000` | `http://localhost` |
| API 健康检查 | `http://localhost:3001/api/v1/health` | `http://localhost/api/v1/health` |
| Swagger 文档 | `http://localhost:3001/api/docs` | `http://localhost/api/docs` |

## 演示账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 学生 | `S20260001` | `Study@123` |
| 教师 | `T20260001` | `Teach@123` |
| 管理员 | `admin_platform` | `Admin@123` |

## 环境变量

核心配置项（Docker 在根目录 `.env`，本地开发在 `backend/.env` 和 `frontend/.env.local`）：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `REDIS_URL` | Redis 连接字符串 |
| `JWT_SECRET` | JWT 签名密钥（生产环境务必修改） |
| `JWT_EXPIRES_IN` | Token 过期时间 |
| `OPENAI_BASE_URL` | AI 文本模型 API 地址 |
| `OPENAI_API_KEY` | AI 文本模型 API 密钥 |
| `OPENAI_MODEL` | AI 文本模型名称 |
| `OPENAI_VISION_BASE_URL` | AI 视觉模型 API 地址 |
| `OPENAI_VISION_API_KEY` | AI 视觉模型 API 密钥 |
| `OPENAI_VISION_MODEL` | AI 视觉模型名称 |
| `NEXT_PUBLIC_API_BASE_URL` | 前端调用的 API 地址 |

## 主要 API

| 接口 | 说明 | 鉴权 |
|------|------|------|
| `POST /auth/login` | 用户登录 | 无 |
| `POST /auth/register` | 用户注册 | 无 |
| `GET /auth/me` | 获取当前用户信息 | JWT |
| `GET /questions` | 获取题目列表 | JWT |
| `POST /questions/import-json` | 批量导入题目 | 管理员 |
| `POST /exercises/submit` | 提交练习答案 | JWT |
| `GET /exercises/:id` | 查看练习详情 | JWT |
| `POST /ai-qa/ask` | AI 讲题（普通） | JWT |
| `POST /ai-qa/stream` | AI 讲题（流式 SSE） | JWT |
| `POST /ai-qa/ocr-preview` | 图片 OCR 识别 | JWT |
| `GET /wrongbook` | 错题列表 | JWT |
| `POST /wrongbook/:id/retry` | 重练错题 | JWT |
| `POST /wrongbook/:id/archive` | 归档错题 | JWT |
| `GET /reports/overview` | 学习报告 | JWT |
| `GET /health` | 健康检查 | 无 |

完整 API 文档见 Swagger 页面。

## 题库导入格式

```json
{
  "batchName": "三年级-加法练习",
  "knowledgePoints": [
    { "code": "GRADE3-ADD-001", "name": "万以内加法", "grade": 3 }
  ],
  "questions": [
    {
      "id": "q-001",
      "title": "加法选择题",
      "stem": "计算 36 + 14 = ?",
      "questionType": "SINGLE_CHOICE",
      "grade": 3,
      "difficulty": 1,
      "answer": "B",
      "options": [
        { "label": "A", "value": "40" },
        { "label": "B", "value": "50" }
      ],
      "analysis": "个位 6+4=10 进位，十位 3+1+1=5，结果是 50。",
      "tags": ["加法"],
      "knowledgePointCodes": ["GRADE3-ADD-001"]
    }
  ]
}
```

`questionType` 可选：`SINGLE_CHOICE` | `MULTIPLE_CHOICE` | `FILL_BLANK` | `SHORT_ANSWER`

## 常用命令

```bash
# 查看 Docker 容器状态
docker compose -f docker/docker-compose.yml ps

# 重启前端（代码修改后）
docker compose -f docker/docker-compose.yml up -d --build frontend

# 停止所有服务
docker compose -f docker/docker-compose.yml down

# 重新运行种子数据
docker exec ai-math-backend pnpm run seed

# Prisma Studio（数据库可视化管理）
cd backend && npx prisma studio
```

## 常见问题

| 问题 | 排查方向 |
|------|---------|
| 前端能打开但接口请求失败 | 后端是否启动；`NEXT_PUBLIC_API_BASE_URL` 是否正确 |
| Docker 启动后页面是旧样式 | `docker compose up -d --build frontend nginx`，然后强制刷新 |
| 登录成功但接口提示未授权 | 检查 localStorage 是否有 token；token 是否过期 |
| AI 没有真实回答 | `OPENAI_API_KEY` 是否正确；api 地址是否可达 |
| 数据库结构不一致 | `prisma generate` + `prisma db push` |

## 后续规划

- [ ] e2e 测试覆盖
- [ ] Excel/CSV 题库导入
- [ ] 完整的教师端班级管理
- [ ] 成长系统（徽章、连击、升级弹窗）
- [ ] AI 多轮对话上下文
- [ ] 语音输入与语音播报