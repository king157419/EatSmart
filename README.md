# 🥗 EatSmart 健康管家

为糖尿病 + 急性胰腺炎康复期患者定制的 AI 健康管理系统。

## 功能特性

- 🤖 **AI 饮食问答** — 基于 RAG 知识库，回答"我能不能吃XXX"
- 📝 **智能记录** — 说句话就能记录饮食/运动/作息/血糖
- 📊 **营养进度条** — 实时追踪每日脂肪/碳水/蛋白质摄入
- 📎 **引用溯源** — 每条建议标注来自哪篇医学知识
- 🍽️ **食谱推荐** — 基于约束和偏好生成每日低脂低GI食谱
- 📱 **PWA 支持** — 添加到手机桌面，体验如原生 App

## 技术栈

| 层 | 技术 |
|:---|:---|
| 大模型 | DeepSeek API |
| RAG | LangChain + ChromaDB |
| 后端 | Python FastAPI |
| 记忆库 | SQLite |
| 前端 | Next.js + TypeScript |

## 快速开始

### 1. 后端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # 填入你的 DeepSeek API Key
python -m rag.loader  # 构建知识库向量
uvicorn main:app --reload --port 8000
```

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000 即可使用。

## 📱 手机使用

在手机浏览器打开部署后的地址 → 点击"添加到主屏幕" → 像 App 一样使用！

## ⚠️ 免责声明

本系统生成的建议仅供参考，不能替代专业医疗建议。具体饮食方案请遵循主治医生的医嘱。
