# deployment

## 容器规划

- `frontend`
- `backend`
- `postgres`
- `redis`
- `nginx`

## 部署原则

当前提供完整容器编排骨架，建议部署顺序：

1. 启动 `postgres` 与 `redis`
2. 执行后端 Prisma 迁移与 Client 生成
3. 启动 `backend`
4. 启动 `frontend`
5. 通过 `nginx` 暴露统一入口

生产环境建议继续补充：

- HTTPS 证书
- 镜像仓库与 CI/CD
- 日志采集与监控
- AI 调用限流与审计
