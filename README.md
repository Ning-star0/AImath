# 小学数学智能辅导系统

一个面向小学 1-6 年级学生的 AI 数学学习产品。当前版本已经打通学生端主链路，并提供教师端、管理端基础版，适合本地演示、课程项目交付和继续迭代。

项目重点不只是“做题”，而是把练习、AI 讲题、错题复习、学习报告、奖励成长做成一套更偏儿童学习产品的体验。

## 当前能力

### 学生端

- 登录 / 个人中心 / 年级切换
- 题库练习
  - 按年级、难度筛题
  - 只统计已填写答案的题
  - 提交后即时显示每题对错反馈
  - 嵌入式 AI 审题 / 提示一步 / 换种讲法
  - 冒险地图式练习入口
- AI 答疑
  - 支持文本输入
  - 选择题会自动带题型和选项
  - 分步讲解、最终答案、知识点、相似题
- 错题本
  - 按年级、题型筛选
  - 去重练
  - 去 AI 解答
  - AI 错因分析 / AI 出相似题
- 学习报告
  - 去重后总题数
  - 正确率 / 答对题 / 答错题
  - 知识点掌握情况
  - 最近学习趋势
  - AI 学习总结
- 游戏化成长
  - 星星奖励
  - 连续学习
  - 等级与称号
  - 小数老师学习伙伴

### 教师端

- 教师首页
- 学生列表基础版
- 学生报告占位入口

### 管理端

- 管理首页
- 用户列表基础版
- 题库管理
  - JSON 粘贴导入
  - `.json` 文件上传导入
  - 导入去重
  - 题目批量删除

### 后端

- JWT 登录鉴权
- 角色权限：`STUDENT / TEACHER / ADMIN`
- 题目、练习、错题本、学习报告、AI 答疑、教师端、管理端接口
- Swagger 文档
- OpenAI-compatible API 接入

## 技术栈

### 前端

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Axios
- Zustand
- React Hook Form

### 后端

- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- JWT
- bcryptjs
- class-validator
- Swagger

### 部署

- Docker
- Docker Compose
- Nginx

## 目录结构

```text
AImath/
├── frontend/
│   ├── src/app/                 # 页面与路由
│   ├── src/components/          # UI 组件
│   ├── src/services/            # 前端 API 封装
│   ├── src/lib/                 # 工具与奖励逻辑
│   ├── src/store/               # Zustand 会话状态
│   └── src/types/               # 前端类型
├── backend/
│   ├── prisma/                  # schema 与 seed
│   ├── src/modules/             # 业务模块
│   ├── src/common/              # 装饰器、守卫、过滤器等
│   └── src/shared/ai/           # OpenAI-compatible client
├── docker/                      # Dockerfile / Compose / Nginx
├── docs/                        # 需求、设计、数据库等文档
└── README.md
```

## 主要页面与路由

### 前端路由

- `/`：产品首页
- `/login`：登录页
- `/student`：学生首页
- `/student/practice`：练习页
- `/student/ai-qa`：AI 答疑页
- `/student/wrongbook`：错题本
- `/student/reports`：学习报告
- `/student/profile`：个人中心
- `/teacher`：教师首页
- `/teacher/students`：教师学生列表
- `/admin`：管理首页
- `/admin/users`：用户列表
- `/admin/questions`：题库管理

### 后端模块

- `auth`
- `questions`
- `exercises`
- `wrongbook`
- `reports`
- `ai-qa`
- `teacher`
- `admin`
- `health`

## 环境变量

### 1. Docker 根目录 `.env`

Docker 运行推荐先创建：

```bash
cp .env.example .env
```

最重要的配置：

```env
POSTGRES_DB=ai_math
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

BACKEND_PORT=3001
FRONTEND_PORT=3000
NGINX_PORT=80

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public
REDIS_URL=redis://redis:6379

JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=7d

OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=your-real-api-key
OPENAI_MODEL=deepseek-chat

NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
```

说明：

- `OPENAI_*` 支持 OpenAI-compatible 服务，例如 OpenAI、DeepSeek 等
- `docker/docker-compose.yml` 会读取根目录 `.env`

### 2. 后端 `backend/.env`

本地直接启动后端时使用：

```bash
cp backend/.env.example backend/.env
```

示例：

```env
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_math?schema=public
REDIS_URL=redis://localhost:6379

JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=7d

OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=your-real-api-key
OPENAI_MODEL=deepseek-chat
```

### 3. 前端 `frontend/.env.local`

```bash
cp frontend/.env.example frontend/.env.local
```

示例：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
```

## 本地启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 准备环境变量

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 3. 启动 PostgreSQL 和 Redis

如果本地没有数据库，推荐直接用 Docker 启：

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
```

### 4. 生成 Prisma Client

```bash
pnpm --filter backend prisma:generate
```

### 5. 同步数据库结构

```bash
pnpm --filter backend exec prisma db push
```

### 6. 初始化演示数据

```bash
pnpm --filter backend seed
```

### 7. 启动后端

```bash
pnpm --filter backend start:dev
```

### 8. 启动前端

```bash
pnpm --filter frontend dev
```

### 9. 或者根目录同时启动前后端

```bash
pnpm dev
```

## Prisma / 数据库说明

### 常用命令

生成 Prisma Client：

```bash
pnpm --filter backend prisma:generate
```

开发环境直接推送结构：

```bash
pnpm --filter backend exec prisma db push
```

生成迁移：

```bash
pnpm --filter backend prisma:migrate
```

运行 seed：

```bash
pnpm --filter backend seed
```

### 当前数据库覆盖的核心模型

- `User`
- `Student`
- `Question`
- `ExerciseRecord`
- `ExerciseRecordDetail`
- `WrongQuestion`
- `AiQaRecord`

## Docker 启动

### 1. 创建根目录 `.env`

```bash
cp .env.example .env
```

### 2. 一键启动

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### 3. 首次同步数据库结构

如果是第一次启动，记得执行：

```bash
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm exec prisma db push
```

### 4. 初始化演示数据

```bash
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm run seed
```

### 5. 查看容器状态

```bash
docker ps
```

### 6. 停止服务

```bash
docker compose -f docker/docker-compose.yml down
```

### 7. 仅重建应用容器

```bash
docker compose -f docker/docker-compose.yml up -d --build backend frontend nginx
```

## 访问地址

### 本地开发

- 前端：[http://localhost:3000](http://localhost:3000)
- 后端健康检查：[http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)
- Swagger：[http://localhost:3001/api/docs](http://localhost:3001/api/docs)

### Docker + Nginx

- 统一入口：[http://localhost](http://localhost)
- API 健康检查：[http://localhost/api/v1/health](http://localhost/api/v1/health)
- Swagger：[http://localhost/api/docs](http://localhost/api/docs)

## 演示账号

- 学生：`S20260001 / 123456`
- 教师：`T20260001 / 123456`
- 管理员：`admin_demo / 123456`

## 管理员题库导入

管理员登录后可进入：

- [http://localhost:3000/admin/questions](http://localhost:3000/admin/questions)

当前支持：

- 直接粘贴 JSON
- 上传 `.json` 文件
- 导入去重
- 批量删除题目

后端接口：

- `POST /api/v1/questions/import-json`

### 题库 JSON 基本格式

```json
{
  "batchName": "grade3-demo-batch",
  "knowledgePoints": [
    {
      "code": "GRADE3-ADD-001",
      "name": "万以内加法",
      "grade": 3,
      "chapter": "整数加法",
      "description": "理解两位数和三位数加法的计算方法。"
    }
  ],
  "questions": [
    {
      "id": "grade3-choice-001",
      "title": "三年级加法选择题",
      "stem": "计算 36 + 14，正确答案是哪一个？",
      "questionType": "SINGLE_CHOICE",
      "grade": 3,
      "difficulty": 1,
      "answer": "B",
      "options": [
        { "label": "A", "value": "40" },
        { "label": "B", "value": "50" },
        { "label": "C", "value": "52" },
        { "label": "D", "value": "60" }
      ],
      "analysis": "个位 6 + 4 = 10，写 0 进 1；十位 3 + 1 + 1 = 5，所以结果是 50。",
      "tags": ["加法", "选择题"],
      "knowledgePointCodes": ["GRADE3-ADD-001"],
      "source": "manual-json-import"
    }
  ]
}
```

### `questionType` 可选值

- `SINGLE_CHOICE`
- `MULTIPLE_CHOICE`
- `FILL_BLANK`
- `SHORT_ANSWER`

## Swagger

项目已经接入 Swagger，入口：

- 本地：[http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- Docker + Nginx：[http://localhost/api/docs](http://localhost/api/docs)

建议后续继续补充：

- DTO 示例
- 认证接口请求体说明
- 角色权限接口分组

## 推荐测试方式

### 手工联调

建议最少验证以下链路：

1. 学生登录
2. 题库练习
3. AI 答疑
4. 错题本
5. 学习报告
6. 管理员导入题库

### 重点接口

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me/student-profile`
- `GET /api/v1/questions`
- `POST /api/v1/questions/import-json`
- `POST /api/v1/exercises/submit`
- `POST /api/v1/ai-qa/ask`
- `GET /api/v1/wrongbook`
- `GET /api/v1/reports/overview`

### 单元测试建议

优先覆盖：

- `auth.service.ts`
- `exercises.service.ts`
- `questions.service.ts`
- `wrongbook.service.ts`
- `reports.service.ts`
- `ai-qa.service.ts`

重点关注：

- 登录与密码校验
- 客观题判题
- 错题写入 / 归档
- 报告聚合
- AI 结构化结果兜底
- 角色权限

### 压测建议

优先压测：

- 登录接口
- 题目列表接口
- 练习提交接口
- AI 答疑接口

基础方案：

1. 使用 `k6` 或 `JMeter`
2. 从 20 / 50 / 100 并发阶梯压测
3. 重点看：
   - 后端响应时间
   - PostgreSQL 查询耗时
   - AI 接口延迟与错误率
   - 容器 CPU / 内存占用

## 常见问题

### 1. 前端能打开，但接口请求失败

先检查：

- 后端是否启动
- `NEXT_PUBLIC_API_BASE_URL` 是否正确
- 浏览器 `localStorage` 中是否存在 `accessToken`

### 2. Prisma 类型或数据库结构不一致

执行：

```bash
pnpm --filter backend prisma:generate
pnpm --filter backend exec prisma db push
```

### 3. Docker 已启动，但页面仍是旧样式

执行：

```bash
docker compose -f docker/docker-compose.yml up -d --build frontend nginx
```

然后浏览器强制刷新：

```text
Command + Shift + R
```

### 4. 登录成功但接口仍提示未授权

检查：

- 浏览器 `localStorage` 是否有 token
- token 是否过期
- 前端请求是否经过 `frontend/src/lib/api.ts`

### 5. AI 没有真实回答

检查：

- `OPENAI_API_KEY` 是否真实可用
- `OPENAI_BASE_URL` 是否指向可用服务
- 未正确配置时系统会返回 fallback 结构化结果

## 当前交付状态

当前版本已经达到：

- 可运行
- 可构建
- 可 Docker 部署
- 可本地演示
- 学生端主链路可用
- 教师端 / 管理端具备基础版边界

## 后续建议

如果继续迭代，建议优先补：

- e2e 测试
- 生产迁移脚本
- 更完整的教师端/管理端
- Excel / CSV 题库导入
- AI 生成相似题直接入练习链路
- 更完整的成长系统（徽章、连击、升级弹窗）

cd C:\Users\n2356\Downloads\AImath\AImath
docker compose -f .\docker\docker-compose.yml up -d

C:\Users\n2356\Downloads\AImath\AImath\docker\docker-compose.yml up -d