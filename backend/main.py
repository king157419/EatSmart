"""
EatSmart 健康管家 - FastAPI 后端入口
"""

import os
import sys
from datetime import date
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 确保可以导入本地模块
sys.path.insert(0, os.path.dirname(__file__))

from memory.database import (
    init_db, get_daily_nutrition_summary, get_daily_meals,
    get_recent_memory_summary, update_nutrition_targets,
    save_recipe, get_saved_recipes, get_today_recipe, delete_recipe,
    add_meal,
    delete_meal_by_id, delete_exercise_by_id, delete_blood_sugar_by_id,
    # Chat history
    create_chat_session, save_chat_message, get_chat_sessions,
    get_chat_messages, delete_chat_session, get_today_session,
    # Nutrition trends
    get_nutrition_range, get_nutrition_stats,
)
from agents.chat_agent import chat, generate_recipe, ChatResponse, stream_chat
from rag.retriever import reload_vectorstore
from food_db.food_options import get_food_options, find_food_option, FoodOption


# ============================================================
# 应用生命周期
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动/关闭时的初始化"""
    print("[*] EatSmart 健康管家启动中...")
    await init_db()
    print("[OK] 数据库初始化完成")

    # 尝试初始化向量库（可能失败，不影响启动）
    try:
        from rag.loader import build_vector_store
        build_vector_store(force_rebuild=False)
        print("[OK] 知识库向量化完成")
    except Exception as e:
        print(f"[WARN] 知识库加载失败（首次运行请确认 embedding 配置）: {e}")

    yield
    print("[*] EatSmart 关闭")


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


class RecipeSaveRequest(BaseModel):
    content: str
    title: str = ""


class NutritionTargetUpdate(BaseModel):
    calories: float | None = None
    fat: float | None = None
    carbs: float | None = None
    protein: float | None = None
    fiber: float | None = None


class QuickRecordItem(BaseModel):
    name: str
    portion: str = "一份"


class QuickRecordRequest(BaseModel):
    meal_type: str
    foods: list[QuickRecordItem]


class AdminVerifyRequest(BaseModel):
    password: str


class ChatSessionCreate(BaseModel):
    session_date: str
    title: str = None


class ChatMessageSave(BaseModel):
    session_id: int
    role: str
    content: str
    sources: list = None
    has_recording: bool = False
    records: list = None


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


@app.post("/api/chat/stream")
async def api_chat_stream(request: ChatRequest):
    """
    流式对话接口 - 返回 SSE 格式的事件流。
    事件类型: prepare → sources → content (多次) → done
    """
    return StreamingResponse(
        stream_chat(
            user_message=request.message,
            conversation_history=request.conversation_history,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/recipe")
async def api_recipe(request: RecipeRequest):
    """
    获取或生成今日食谱
    - 自动保存生成的新食谱
    - 如果今天已有食谱，直接返回
    - preferences="new" 强制重新生成
    """
    try:
        today = date.today().isoformat()

        # 检查是否强制刷新
        force_new = request.preferences == "new"
        preferences = "" if force_new else request.preferences

        # 获取今天已保存的食谱
        existing = await get_today_recipe()

        # 如果强制刷新，删除旧的
        if force_new and existing:
            await delete_recipe(existing["id"])
            existing = None

        # 如果有今天的食谱，直接返回
        if existing:
            return {"recipe": existing["content"], "saved": True, "id": existing["id"]}

        # 生成新食谱并自动保存
        recipe = await generate_recipe(preferences=preferences)
        recipe_id = await save_recipe(recipe_date=today, content=recipe, title="今日食谱")

        return {"recipe": recipe, "saved": True, "id": recipe_id}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"食谱生成失败: {str(e)}")


@app.post("/api/recipe/save")
async def api_save_recipe(request: RecipeSaveRequest):
    """保存食谱"""
    try:
        today = date.today().isoformat()
        recipe_id = await save_recipe(
            recipe_date=today,
            content=request.content,
            title=request.title
        )
        return {"message": "食谱已保存", "id": recipe_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")


@app.get("/api/recipe/saved")
async def api_get_saved_recipes(limit: int = 10):
    """获取保存的食谱列表"""
    try:
        recipes = await get_saved_recipes(limit=limit)
        return {"recipes": recipes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/recipe/{recipe_id}")
async def api_delete_recipe(recipe_id: int):
    """删除食谱"""
    try:
        await delete_recipe(recipe_id)
        return {"message": "食谱已删除"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@app.delete("/api/meal/{meal_id}")
async def api_delete_meal(meal_id: int):
    """删除单条饮食记录"""
    try:
        success = await delete_meal_by_id(meal_id)
        if success:
            return {"message": "记录已删除", "id": meal_id}
        else:
            raise HTTPException(status_code=404, detail="记录不存在")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/exercise/{exercise_id}")
async def api_delete_exercise(exercise_id: int):
    """删除单条运动记录"""
    try:
        success = await delete_exercise_by_id(exercise_id)
        if success:
            return {"message": "记录已删除", "id": exercise_id}
        else:
            raise HTTPException(status_code=404, detail="记录不存在")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/blood-sugar/{record_id}")
async def api_delete_blood_sugar(record_id: int):
    """删除单条血糖记录"""
    try:
        success = await delete_blood_sugar_by_id(record_id)
        if success:
            return {"message": "记录已删除", "id": record_id}
        else:
            raise HTTPException(status_code=404, detail="记录不存在")
    except HTTPException:
        raise
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


@app.get("/api/food-options")
async def api_food_options():
    """获取推荐食物选项（按类别分组）"""
    try:
        options = get_food_options()
        return options.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quick-record")
async def api_quick_record(request: QuickRecordRequest):
    """
    快捷记录 - 批量记录多份食物
    返回记录结果和营养汇总
    """
    try:
        today = date.today().isoformat()
        recorded_foods = []
        total_calories = 0
        total_fat = 0
        total_carbs = 0
        total_protein = 0

        for item in request.foods:
            food_option = find_food_option(item.name)
            if food_option:
                # 使用食物选项的数据
                await add_meal(
                    meal_date=today,
                    meal_type=request.meal_type,
                    food_name=food_option.name,
                    portion=item.portion,
                    grams=food_option.portion_grams,
                    calories=food_option.calories,
                    protein=food_option.protein,
                    fat=food_option.fat,
                    carbs=food_option.carbs,
                    fiber=0,
                    gi=0,
                    risk_tags="",
                    source="quick_record"
                )
                recorded_foods.append({
                    "name": food_option.name,
                    "portion": item.portion,
                    "calories": food_option.calories,
                    "fat": food_option.fat
                })
                total_calories += food_option.calories
                total_fat += food_option.fat
                total_carbs += food_option.carbs
                total_protein += food_option.protein
            else:
                # 食物不在选项中，记录基本信息
                await add_meal(
                    meal_date=today,
                    meal_type=request.meal_type,
                    food_name=item.name,
                    portion=item.portion,
                    grams=150,
                    calories=0,
                    protein=0,
                    fat=0,
                    carbs=0,
                    fiber=0,
                    gi=0,
                    risk_tags="",
                    source="quick_record_unknown"
                )
                recorded_foods.append({
                    "name": item.name,
                    "portion": item.portion,
                    "calories": 0,
                    "fat": 0
                })

        # 获取更新后的今日营养汇总
        nutrition_summary = await get_daily_nutrition_summary(today)

        return {
            "recorded": True,
            "recorded_foods": recorded_foods,
            "nutrition_summary": {
                "calories": total_calories,
                "fat": total_fat,
                "carbs": total_carbs,
                "protein": total_protein
            },
            "today_totals": nutrition_summary
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"快捷记录失败: {str(e)}")


# ============================================================
# 对话历史 API
# ============================================================

@app.post("/api/chat/session")
async def api_create_chat_session(request: ChatSessionCreate):
    """创建新会话"""
    try:
        session_id = await create_chat_session(request.session_date, request.title)
        return {"session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/sessions")
async def api_get_chat_sessions(limit: int = 30):
    """获取会话列表"""
    try:
        sessions = await get_chat_sessions(limit)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/session/{session_id}")
async def api_get_chat_session(session_id: int):
    """获取会话详情（所有消息）"""
    try:
        messages = await get_chat_messages(session_id)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/chat/session/{session_id}")
async def api_delete_chat_session(session_id: int):
    """删除会话"""
    try:
        await delete_chat_session(session_id)
        return {"message": "会话已删除"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/message")
async def api_save_chat_message(request: ChatMessageSave):
    """保存单条消息"""
    try:
        await save_chat_message(
            session_id=request.session_id,
            role=request.role,
            content=request.content,
            sources=request.sources,
            has_recording=request.has_recording,
            records=request.records
        )
        return {"message": "消息已保存"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/session/today")
async def api_get_today_session():
    """获取今日会话（如果不存在则创建）"""
    try:
        session = await get_today_session()
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 营养趋势 API
# ============================================================

@app.get("/api/nutrition/range")
async def api_nutrition_range(start: str, end: str):
    """获取日期范围内的营养数据"""
    try:
        data = await get_nutrition_range(start, end)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/nutrition/stats")
async def api_nutrition_stats(days: int = 7):
    """获取营养统计数据"""
    try:
        stats = await get_nutrition_stats(days)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 管理员 API
# ============================================================

@app.post("/api/admin/verify")
async def api_admin_verify(request: AdminVerifyRequest):
    """验证管理员密码"""
    from config import ADMIN_PASSWORD
    return {"valid": request.password == ADMIN_PASSWORD}


@app.get("/api/admin/stats")
async def api_admin_stats(x_admin_password: str = None):
    """获取系统统计（需要密码验证）"""
    from config import ADMIN_PASSWORD
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        import os
        from memory.database import DB_PATH

        # 获取数据库大小
        db_size_mb = os.path.getsize(DB_PATH) / (1024 * 1024) if os.path.exists(DB_PATH) else 0

        # 获取记录统计
        from memory.database import get_db
        db = await get_db()
        try:
            cursor = await db.execute("SELECT COUNT(*) FROM meals")
            total_meals = (await cursor.fetchone())[0]

            cursor = await db.execute("SELECT COUNT(*) FROM exercises")
            total_exercises = (await cursor.fetchone())[0]

            cursor = await db.execute("SELECT COUNT(*) FROM chat_sessions")
            total_sessions = (await cursor.fetchone())[0]

            cursor = await db.execute("SELECT COUNT(*) FROM chat_messages")
            total_messages = (await cursor.fetchone())[0]
        finally:
            await db.close()

        return {
            "total_meals": total_meals,
            "total_exercises": total_exercises,
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "db_size_mb": round(db_size_mb, 2),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
