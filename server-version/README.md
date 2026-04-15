# 服务器版本

这个文件夹是给服务器部署单独准备的，不会影响根目录本机版本。

## 目录说明

- `docker-compose.autodl.yml`
  - AutoDL / 服务器环境专用 Compose 文件
- `.env.autodl.example`
  - 服务器环境变量模板

## 本机版本怎么启动

继续用根目录原来的方式：

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

## 服务器版本怎么启动

先进入这个目录并复制环境变量：

```bash
cd server-version
cp .env.autodl.example .env.autodl
```

把 `.env.autodl` 里的这几项改成真实值：

- `JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_VISION_API_KEY`

然后启动：

```bash
docker compose --env-file .env.autodl -f docker-compose.autodl.yml up -d --build
```

## 首次初始化数据库

```bash
docker exec -e 'DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public' ai-math-backend pnpm exec prisma db push
docker exec -e 'DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_math?schema=public' ai-math-backend pnpm run seed
```

## AutoDL 推荐配置

- `NGINX_PORT=6008`
- `NEXT_PUBLIC_API_BASE_URL=/api/v1`

这样外部访问只走 Nginx，一个地址就能同时访问前端和后端接口。
