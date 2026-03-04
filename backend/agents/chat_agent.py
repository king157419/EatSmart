"""
主对话 Agent - 整合 RAG 知识库 + 记忆库 + 记录 Agent
"""

import os
import json
from datetime import date
from typing import AsyncGenerator
from rag.retriever import retrieve, RAGResult
from memory.database import get_recent_memory_summary, get_daily_nutrition_summary
from agents.record_agent import process_record
from pydantic import BaseModel

# 使用自定义的 requests 客户端（避免 httpx 在 Windows 上的兼容问题）
from agents.deepseek_client import get_deepseek_client


class ChatResponse(BaseModel):
    """聊天响应"""
    reply: str                          # AI 回复文本
    sources: list[dict]                 # RAG 引用来源
    nutrition_summary: dict | None      # 当日营养摘要（如果有更新）
    records: list[dict]                 # 本次记录的内容
    has_recording: bool                 # 是否有记录行为


SYSTEM_PROMPT = """你是"EatSmart 健康管家"，一个专为糖尿病合并急性胰腺炎康复期患者定制的 AI 健康助手。

## 关于用户
- 用户是一位 2 型糖尿病患者
- 去年夏天发生过急性胰腺炎，在 ICU 住了两周
- 目前处于康复期，需要严格控制饮食

## 你的核心职责
1. **饮食咨询**：回答用户关于"能不能吃XXX"的问题，基于知识库给出建议
2. **饮食记录确认**：当用户报告吃了什么，确认记录并给出即时反馈
3. **食谱推荐**：根据用户偏好和约束推荐合理的食谱
4. **健康提醒**：根据用户的记录数据，主动给出提醒和建议

## 回答规则
1. **始终基于知识库内容回答**。如果知识库有相关信息，引用它。
2. **脂肪是红线**：胰腺炎患者每日脂肪 < 30g，这是硬性限制。
3. **语气温和关怀**：这是给患者父亲用的，语气要像一个体贴的家人，不要冷冰冰。
4. **给出具体建议**：不要只说"不建议吃"，要告诉替代方案。
5. **提醒不是批评**：如果用户吃了不太合适的食物，温和提醒，不要批判。
6. **份量确认**：如果用户说的份量不明确（如"一条鱼"），提醒用户下次可以说更具体的份量，如"吃了大概100克"或"吃了一块手掌大小的"
7. **每条回复结尾**：如果涉及饮食建议，加上"具体请以医生指导为准 🏥"

## 知识库内容
以下是从知识库中检索到的相关信息（请基于此回答）：
{rag_context}

## 用户最近的健康记忆
{memory_context}
"""


async def chat(user_message: str, conversation_history: list[dict] = None) -> ChatResponse:
    """
    处理用户消息：
    1. 先调用记录 Agent 提取可能的健康数据
    2. 检索 RAG 知识库
    3. 获取最近记忆摘要
    4. 生成回复
    """
    today = date.today().isoformat()

    # Step 1: 调用记录 Agent（失败时跳过）
    try:
        record_result = await process_record(user_message)
    except Exception as e:
        print(f"[WARN] 记录 Agent 失败: {e}")
        record_result = {"recorded": False, "records": [], "nutrition_update": None}

    # Step 2: RAG 检索
    rag_result = retrieve(user_message, top_k=3)

    # Step 3: 获取记忆摘要
    memory_summary = await get_recent_memory_summary(days=7)

    # Step 4: 获取当日营养数据
    nutrition = await get_daily_nutrition_summary(today)

    # Step 5: 构建 system prompt
    system_prompt = SYSTEM_PROMPT.format(
        rag_context=rag_result.context_text,
        memory_context=memory_summary,
    )

    # 如果有记录，在用户消息后附加记录信息
    enhanced_message = user_message
    if record_result["recorded"]:
        record_summary_parts = []
        for rec in record_result["records"]:
            record_summary_parts.append(f"[系统: 已自动记录 {rec['type']}: {rec['data']}]")
        enhanced_message += "\n\n" + "\n".join(record_summary_parts)

        if nutrition:
            nut = nutrition
            enhanced_message += (
                f"\n[系统: 今日营养累计 - "
                f"热量{nut['total_calories']:.0f}/{nut['targets']['calories']}kcal "
                f"脂肪{nut['total_fat']:.1f}/{nut['targets']['fat']}g "
                f"碳水{nut['total_carbs']:.1f}/{nut['targets']['carbs']}g "
                f"蛋白质{nut['total_protein']:.1f}/{nut['targets']['protein']}g]"
            )

    # Step 6: 调用大模型生成回复
    messages = [{"role": "system", "content": system_prompt}]
    if conversation_history:
        messages.extend(conversation_history[-10:])  # 保留最近10轮对话
    messages.append({"role": "user", "content": enhanced_message})

    api_client = get_deepseek_client()
    response = api_client.chat_completion(
        model="deepseek-chat",
        messages=messages,
        temperature=0.7,
        max_tokens=1500,
    )

    reply_text = response["choices"][0]["message"]["content"]

    # 构建引用来源
    sources = [
        {
            "file": chunk.source_file,
            "content": chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
            "relevance": chunk.relevance_score,
        }
        for chunk in rag_result.chunks
    ]

    # 过滤低相关性来源（阈值 0.3）
    filtered_sources = [s for s in sources if s.get("relevance", 0) > 0.3]

    return ChatResponse(
        reply=reply_text,
        sources=filtered_sources,
        nutrition_summary=record_result.get("nutrition_update") or nutrition,
        records=record_result.get("records", []),
        has_recording=record_result["recorded"],
    )


async def stream_chat(
    user_message: str,
    conversation_history: list[dict] = None
) -> AsyncGenerator[str, None]:
    """
    流式处理用户消息，返回 SSE 格式的事件流。

    事件格式：
    - data: {"type": "prepare", "message": "正在思考..."}
    - data: {"type": "sources", "sources": [...]}
    - data: {"type": "content", "delta": "文本片段"}
    - data: {"type": "done", "nutrition_summary": {...}, "records": [...]}
    """
    today = date.today().isoformat()

    # Step 1: 发送准备状态
    yield f'data: {json.dumps({"type": "prepare", "message": "正在分析..."}, ensure_ascii=False)}\n\n'

    # Step 2: 调用记录 Agent（失败时跳过）
    try:
        record_result = await process_record(user_message)
    except Exception as e:
        print(f"[WARN] 记录 Agent 失败: {e}")
        record_result = {"recorded": False, "records": [], "nutrition_update": None}

    # Step 3: RAG 检索
    rag_result = retrieve(user_message, top_k=3)

    # Step 4: 获取记忆摘要
    memory_summary = await get_recent_memory_summary(days=7)

    # Step 5: 获取当日营养数据
    nutrition = await get_daily_nutrition_summary(today)

    # Step 6: 构建 system prompt
    system_prompt = SYSTEM_PROMPT.format(
        rag_context=rag_result.context_text,
        memory_context=memory_summary,
    )

    # 构建增强消息
    enhanced_message = user_message
    if record_result["recorded"]:
        record_summary_parts = []
        for rec in record_result["records"]:
            record_summary_parts.append(f"[系统: 已自动记录 {rec['type']}: {rec['data']}]")
        enhanced_message += "\n\n" + "\n".join(record_summary_parts)

        if nutrition:
            nut = nutrition
            enhanced_message += (
                f"\n[系统: 今日营养累计 - "
                f"热量{nut['total_calories']:.0f}/{nut['targets']['calories']}kcal "
                f"脂肪{nut['total_fat']:.1f}/{nut['targets']['fat']}g "
                f"碳水{nut['total_carbs']:.1f}/{nut['targets']['carbs']}g "
                f"蛋白质{nut['total_protein']:.1f}/{nut['targets']['protein']}g]"
            )

    # Step 7: 发送引用来源（过滤低相关性）
    sources = [
        {
            "file": chunk.source_file,
            "content": chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
            "relevance": chunk.relevance_score,
        }
        for chunk in rag_result.chunks
        if chunk.relevance_score > 0.3  # 过滤低相关性
    ]
    yield f'data: {json.dumps({"type": "sources", "sources": sources}, ensure_ascii=False)}\n\n'

    # Step 8: 流式调用大模型（失败时回退到阻塞模式）
    messages = [{"role": "system", "content": system_prompt}]
    if conversation_history:
        messages.extend(conversation_history[-10:])
    messages.append({"role": "user", "content": enhanced_message})

    api_client = get_deepseek_client()

    try:
        # 尝试流式调用
        stream = api_client.stream_completion(
            model="deepseek-chat",
            messages=messages,
            temperature=0.7,
            max_tokens=1500,
        )

        for chunk in stream:
            if chunk.get("choices") and chunk["choices"][0].get("delta", {}).get("content"):
                delta = chunk["choices"][0]["delta"]["content"]
                yield f'data: {json.dumps({"type": "content", "delta": delta}, ensure_ascii=False)}\n\n'
    except Exception as e:
        # 流式失败，回退到阻塞模式并模拟流式输出
        print(f"[WARN] 流式调用失败，回退到阻塞模式: {e}")
        response = api_client.chat_completion(
            model="deepseek-chat",
            messages=messages,
            temperature=0.7,
            max_tokens=1500,
        )

        if response.get("choices") and response["choices"][0].get("message", {}).get("content"):
            full_reply = response["choices"][0]["message"]["content"]
            # 模拟流式输出，每次发送几个字符
            chunk_size = 5
            for i in range(0, len(full_reply), chunk_size):
                delta = full_reply[i:i+chunk_size]
                yield f'data: {json.dumps({"type": "content", "delta": delta}, ensure_ascii=False)}\n\n'

    # Step 9: 发送完成事件
    done_data = {
        "type": "done",
        "nutrition_summary": record_result.get("nutrition_update") or nutrition,
        "records": record_result.get("records", []),
        "has_recording": record_result["recorded"],
    }
    yield f'data: {json.dumps(done_data, ensure_ascii=False)}\n\n'


async def generate_recipe(preferences: str = "") -> str:
    """
    生成个性化食谱推荐。
    """
    memory = await get_recent_memory_summary(days=3)
    today = date.today().isoformat()
    nutrition = await get_daily_nutrition_summary(today)

    prompt = f"""请为这位糖尿病+胰腺炎康复期患者推荐明天的三餐食谱。

严格约束：
- 每日总脂肪 < 30g（这是胰腺炎患者的硬限制）
- 每日碳水 150-250g（糖尿病控制）
- 每日蛋白质 50-70g
- 禁止：油炸、动物内脏、酒、肥肉、奶油
- 烹饪方式限：清蒸、水煮、凉拌、少油炒

用户最近的饮食记录：
{memory}

用户偏好：{preferences if preferences else '暂无特殊偏好'}

请给出：
1. 早餐、午餐、晚餐各2-3个菜品
2. 每餐的预估营养（热量、脂肪、碳水、蛋白质）
3. 全天合计
4. 一个简短的饮食小贴士

格式要求：
- 用 emoji 让内容更友好
- 提供替换选项（标注 🔄 可替换为XXX）
"""

    api_client = get_deepseek_client()
    response = api_client.chat_completion(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "你是一个专业的营养师，擅长为糖尿病和胰腺炎康复期患者设计低脂低GI食谱。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.8,
        max_tokens=2000,
    )

    return response["choices"][0]["message"]["content"]
