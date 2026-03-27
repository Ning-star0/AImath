# database-design

## 阶段 1 最小模型

- `User`
- `Student`
- `Question`
- `AiQaRecord`

## 设计约束

- 主键统一 `cuid`
- 全表保留 `createdAt`、`updatedAt`
- 角色、题型枚举提前固定
- 为题目知识点关系、练习记录、错题本、学习报告预留扩展空间

