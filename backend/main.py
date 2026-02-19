"""
EatSmart 健康管家 - FastAPI 后端入口
"""

import os
import sys
from datetime import date
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 确保可以导入本地模块
sys.path.insert(0, os.path.dirname(__file__))

from memory.database import (
    init_db, get_daily_nutrition_summary, get_daily_meals,
    get_recent_memory_summary, update_nutrition_targets,
)
from agents.chat_agent import chat, generate_recipe, ChatResponse
from rag.retriever import reload_vectorstore


# ============================================================
# 应用生命周期
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动/关闭时的初始化"""
    print("🚀 EatSmart 健康管家启动中...")
    await init_db()
    print("✅ 数据库初始化完成")

    # 尝试初始化向量库（可能失败，不影响启动）
    try:
        from rag.loader import build_vector_store
        build_vector_store(force_rebuild=False)
        print("✅ 知识库向量化完成")
    except Exception as e:
        print(f"⚠️ 知识库加载失败（首次运行请确认 embedding 配置）: {e}")

    yield
    print("👋 EatSmart 关闭")


app = FastAPI(
    title="EatSmart 健康管家",
    description="为糖尿病+胰腺炎康复期患者定制的 AI 健康管理系统",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置（允许前端访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境要限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 请求/响应模型
# ============================================================

class ChatRequest(BaseModel):
    message: str
    conversation_history: list[dict] = []


class RecipeRequest(BaseModel):
    preferences: str = ""


class NutritionTargetUpdate(BaseModel):
    calories: float | None = None
    fat: float | None = None
    carbs: float | None = None
    protein: float | None = None
    fiber: float | None = None


# ============================================================
# API 端点
# ============================================================

@app.get("/")
async def root():
    return {"message": "EatSmart 健康管家 API", "status": "running"}


@app.post("/api/chat", response_model=ChatResponse)
async def api_chat(request: ChatRequest):
    """
    主对话接口 - 发送消息并获取 AI 回复。
    自动触发：意图判断 → 记录提取 → RAG检索 → 记忆注入 → 生成回复
    """
    try:
        response = await chat(
            user_message=request.message,
            conversation_history=request.conversation_history,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话处理失败: {str(e)}")


@app.post("/api/recipe")
async def api_recipe(request: RecipeRequest):
    """生成食谱推荐"""
    try:
        recipe = await generate_recipe(preferences=request.preferences)
        return {"recipe": recipe}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"食谱生成失败: {str(e)}")


@app.get("/api/nutrition/today")
async def api_today_nutrition():
    """获取今日营养摄入汇总（进度条数据来源）"""
    today = date.today().isoformat()
    try:
        summary = await get_daily_nutrition_summary(today)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/nutrition/{target_date}")
async def api_nutrition_by_date(target_date: str):
    """获取指定日期的营养摄入汇总"""
    try:
        summary = await get_daily_nutrition_summary(target_date)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/meals/today")
async def api_today_meals():
    """获取今日饮食记录列表"""
    today = date.today().isoformat()
    try:
        meals = await get_daily_meals(today)
        return {"date": today, "meals": meals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/meals/{target_date}")
async def api_meals_by_date(target_date: str):
    """获取指定日期的饮食记录列表"""
    try:
        meals = await get_daily_meals(target_date)
        return {"date": target_date, "meals": meals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memory/summary")
async def api_memory_summary():
    """获取最近 7 天的健康记忆摘要"""
    try:
        summary = await get_recent_memory_summary(days=7)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/nutrition/targets")
async def api_update_targets(targets: NutritionTargetUpdate):
    """更新每日营养目标"""
    try:
        await update_nutrition_targets(
            calories=targets.calories,
            fat=targets.fat,
            carbs=targets.carbs,
            protein=targets.protein,
            fiber=targets.fiber,
        )
        return {"message": "营养目标已更新"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/knowledge/reload")
async def api_reload_knowledge():
    """重新加载知识库（添加新知识文件后调用）"""
    try:
        reload_vectorstore()
        return {"message": "知识库重新加载完成"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
