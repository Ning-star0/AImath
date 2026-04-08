# 小组交付与启动说明

本文档用于组内交付《小学数学智能辅导系统》源码，帮助组员在本地快速启动、初始化数据库并完成基础验证。

## 1. 项目说明

本项目是一个面向小学生的 AI 数学学习系统，包含：

- 学生端：练习、AI 答疑、错题本、学习报告、成长系统
- 教师端：教师首页、学生列表、学习概览占位
- 管理端：用户列表、题库管理、JSON 导入题目
- 后端：NestJS + Prisma + PostgreSQL + Redis + JWT + Swagger
- 前端：Next.js + TypeScript + Tailwind CSS
- 部署：Docker Compose + Nginx

## 2. 推荐启动方式

组内统一推荐使用 Docker 启动。

优点：

- 不需要自己单独配置 Node、PostgreSQL、Redis
- 启动方式统一
- 环境更接近演示和交付状态

## 3. 启动前准备

请先安装：

- Docker Desktop

并确认 Docker 已启动。

## 4. 获取项目

如果拿到的是压缩包：

1. 解压项目
2. 进入项目目录

```bash
cd AImath
```

如果拿到的是 Git 仓库源码，同样进入项目目录即可。

## 5. 环境变量说明

### 情况 A：拿到的是测试版交付包

如果交付包中已经包含：

- `/.env`
- `/backend/.env`
- `/frontend/.env.local`

则可以直接启动，无需再手动配置。

### 情况 B：拿到的是不带真实环境变量的版本

需要先复制示例配置：

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

然后至少补齐以下配置：

- `OPENAI_API_KEY`
- `JWT_SECRET`

如果使用 DeepSeek，通常配置如下：

```env
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

## 6. Docker 启动步骤

在项目根目录执行：

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

这条命令会启动：

- `frontend`
- `backend`
- `postgres`
- `redis`
- `nginx`

## 7. 第一次初始化数据库

首次启动必须执行下面两条命令：

```bash
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm exec prisma db push
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm run seed
```

说明：

- 第一条：同步 Prisma 数据表结构
- 第二条：插入演示账号和基础题目数据

## 8. 启动成功后访问地址

- 前端页面：`http://localhost:3000`
- Nginx 统一入口：`http://localhost`
- Swagger 文档：`http://localhost:3001/api/docs`
- 后端健康检查：`http://localhost:3001/api/v1/health`

## 9. 演示账号

- 学生：`S20260001 / 123456`
- 教师：`T20260001 / 123456`
- 管理员：`admin_demo / 123456`

## 10. 推荐测试顺序

### 学生端

1. 登录学生账号
2. 进入学生首页
3. 进入练习页完成几道题
4. 查看练习反馈与星星奖励
5. 进入 AI 答疑页提问
6. 进入错题本查看错题
7. 进入学习报告查看成长情况

### 管理端

1. 登录管理员账号
2. 进入题库管理页
3. 使用 JSON 导入题目
4. 查看题库列表

### 教师端

1. 登录教师账号
2. 查看教师首页
3. 查看学生列表页

## 11. 题库 JSON 导入说明

管理员可以在题库管理页导入 JSON 文件。

入口：

- `http://localhost:3000/admin/questions`

最小示例：

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
      "analysis": "36 + 14 = 50，所以选择 B。",
      "tags": ["加法", "选择题"],
      "knowledgePointCodes": ["GRADE3-ADD-001"],
      "source": "manual-json-import"
    }
  ]
}
```

## 12. 常见问题

### 12.1 页面打不开

先检查容器状态：

```bash
docker ps
```

确认以下容器处于运行中：

- `ai-math-frontend`
- `ai-math-backend`
- `ai-math-postgres`
- `ai-math-redis`
- `ai-math-nginx`

### 12.2 后端启动了，但 AI 不可用

先检查环境变量是否正确，尤其是：

- `OPENAI_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

如果使用 DeepSeek，推荐：

```env
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

### 12.3 数据库字段不一致

重新执行：

```bash
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm exec prisma db push
```

### 12.4 想重置演示数据

可以重新执行：

```bash
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm run seed
```

### 12.5 想重启服务

```bash
docker compose -f docker/docker-compose.yml restart
```

## 13. 一键启动命令

如果想快速复制执行，按顺序运行这三条：

```bash
cd AImath
docker compose -f docker/docker-compose.yml up -d --build
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm exec prisma db push
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public ai-math-backend pnpm run seed
```

## 14. 组内说明

- 当前版本适合演示、课程汇报和组内联调
- 如果需要对外发布，请不要附带真实 `.env`
- 如果真实 API Key 已经在多人之间流转，建议结项前主动更换一次
