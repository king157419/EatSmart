---
description: Long-running agent harness for the EatSmart project — read this at the start of every new context window
---

# EatSmart 长时间运行智能体工作流

> 基于 Anthropic "Effective harnesses for long-running agents" 原始模式。
> 原文: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
> 代码: https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding

## STEP 1: 了解当前状态 (MANDATORY)

每次新上下文窗口开始，必须先执行：

// turbo-all

```
1. 查看工作目录
   pwd

2. 读取进度日志，了解上次做到哪里
   cat D:\EatSmart\agent-progress.md

3. 读取 feature 列表，了解哪些 feature 还是 failing
   cat D:\EatSmart\agent-features.json

4. 查看最近 git 提交历史
   git log --oneline -20

5. 统计剩余未完成 feature 数量
   在 agent-features.json 中搜索 "passes": false 的数量
```

## STEP 2: 启动开发服务器

```
6. 启动后端(如果有 init.sh 就运行它)
   cd D:\EatSmart\backend
   uvicorn main:app --reload --port 8000

7. 启动前端
   cd D:\EatSmart\frontend
   npm run dev
```

## STEP 3: 验证已通过的 Feature (CRITICAL!)

```
8. 对所有标记为 passes: true 的 feature，选 1-2 个核心的重新验证
   如果发现问题 → 立即将该 feature 标记回 passes: false → 修复后再继续
```

## STEP 4: 选择一个 Feature 来实现

```
9. 从 agent-features.json 中选择优先级最高的 passes: false 的 feature
   一次只做一个 feature！
```

## STEP 5: 实现 Feature

```
10. 写代码实现
11. 按 feature 的 steps 逐步验证
```

## STEP 6: 验证 Feature

```
12. 用 curl 或浏览器实际测试 (不能只靠看代码)
13. 如果涉及前端，须在浏览器中操作验证
```

## STEP 7: 更新 feature_list.json

```
14. 只修改 "passes": false → "passes": true
    绝不删除、编辑描述、修改步骤
```

## STEP 8: Git 提交

```
15. git add .
16. git commit -m "Implement [feature name] - verified end-to-end"
```

## STEP 9: 更新进度日志

```
17. 在 agent-progress.md 中追加本次 session 的记录:
    - 完成了什么
    - 遇到了什么问题
    - 下一步应该做什么
    - 当前 passing/failing 计数
```

## STEP 10: 干净结束

```
18. 确保所有代码已提交
19. 确保 agent-progress.md 已更新
20. 确保 agent-features.json 已保存
21. 确保项目处于可运行状态（无破坏性更改）
```

## 关键原则

- **一次只做一个 feature** — 不要贪多
- **验证后才能标记 passing** — 不能只写代码就声称完成
- **修复已有问题优先于新功能** — 发现回退立即修
- **append-only 更新进度** — 进度日志只追加不覆盖
- **feature_list 只改 passes 字段** — 描述和步骤绝不修改
- **每个 feature 完成后 git commit** — 方便 revert
