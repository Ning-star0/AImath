# architecture

## 总体架构

- `frontend`：Next.js App Router 负责学生端页面与后续教师/管理端骨架
- `backend`：NestJS 提供 REST API、认证、练习、AI 答疑等服务
- `postgres`：核心业务数据存储
- `redis`：缓存、会话、限流等后续能力占位
- `nginx`：统一网关与反向代理

## 当前阶段重点

先打通 Monorepo、目录规范、接口边界与部署结构，后续阶段只在此基础上增量实现。

