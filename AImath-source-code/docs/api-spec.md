# api-spec

## 统一响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## 阶段 1 接口

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/questions`
- `GET /api/v1/questions/:id`
- `POST /api/v1/exercises/submit`
- `GET /api/v1/exercises/:id`
- `POST /api/v1/ai-qa/ask`
- `GET /api/v1/ai-qa/ocr-capability/:scene`
- `GET /api/v1/wrongbook`
- `GET /api/v1/wrongbook/stats`
- `PATCH /api/v1/wrongbook/:id/retry`
- `GET /api/v1/reports/overview`
