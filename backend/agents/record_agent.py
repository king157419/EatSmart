"""
记录 Agent - 使用 Function Calling 从用户对话中提取结构化健康数据
"""

import json
import os
from datetime import date
from food_db.food_lookup import calculate_nutrition, lookup_food
from memory import database as db

# 使用自定义的 requests 客户端（避免 httpx 在 Windows 上的兼容问题）
from agents.deepseek_client import get_deepseek_client


# ============================================================
# Function Calling 工具定义
# ============================================================

RECORD_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "record_meal",
            "description": "记录饮食，当用户说吃了什么食物时调用",
            "parameters": {
                "type": "object",
                "properties": {
                    "meal_type": {"type": "string", "description": "餐型：早餐/午餐/晚餐/加餐"},
                    "food": {"type": "string", "description": "食物名称"},
                    "portion": {"type": "string", "description": "份量，如：一碗、一个、100克"}
                },
                "required": ["food"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_exercise",
            "description": "记录运动，当用户说做了什么运动时调用",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "description": "运动类型：跑步/散步/游泳/骑车等"},
                    "duration_min": {"type": "integer", "description": "运动时长（分钟）"}
                },
                "required": ["type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_blood_sugar",
            "description": "记录血糖，当用户说血糖数值时调用",
            "parameters": {
                "type": "object",
                "properties": {
                    "value": {"type": "number", "description": "血糖值 mmol/L"},
                    "timing": {"type": "string", "description": "测量时间：空腹/餐后/随机"}
                },
                "required": ["value"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_meal_by_name",
            "description": "删除包含指定食物的记录。当用户说删掉XX（指定食物名）时调用",
            "parameters": {
                "type": "object",
                "properties": {
                    "food_name": {"type": "string", "description": "食物名称或关键词"}
                },
                "required": ["food_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_last_meal",
            "description": "删除最近一条饮食记录，当用户说删掉刚才的/最后一条记录（未指定食物）时调用",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_last_exercise",
            "description": "删除最近一条运动记录",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_last_blood_sugar",
            "description": "删除最近一条血糖记录，当用户说血糖记错了时调用",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]


RECORD_SYSTEM_PROMPT = """你是一个智能健康数据助手。分析用户消息，执行相应操作。

## 记录规则（重要！必须严格执行）
- 用户提到吃、吃了、喝了、品尝、食用任何食物 → 必须调用 record_meal
- 食物包括：米饭、面条、鱼、肉、蔬菜、水果、饮料、零食等所有可食用物品
- 用户提到运动、锻炼、跑步、散步、游泳等 → 调用 record_exercise
- 用户提到血糖数值 → 调用 record_blood_sugar

## 份量处理规则（非常重要！）
- 如果用户明确说了份量（如"一碗"、"100克"、"半份"），使用用户说的份量
- 如果用户没说份量，根据食物类型使用合理默认值：
  - 米饭/面条/粥 → "一碗"
  - 苹果/香蕉/鸡蛋 → "一个"
  - 肉/鱼/蔬菜（菜品）→ "一份"
- 特殊情况："一条鱼"、"一头猪" 这种显然不是一餐的量，使用 "一份" 并让系统提醒用户
- 不要猜测克数，只使用常见份量描述

## 关键触发词（看到这些词必须记录）
- 食物触发词：吃了、吃、喝了、喝、吃了、尝了、点了、买了...吃的
- 数量词：一个、一碗、一杯、一份、一块、少量、一些、半碗、半个

## 删除规则（重要！严格按规则选择删除函数）
- 用户说"删掉XX"、"把XX删掉"、"去掉XX"（XX是具体食物名）→ delete_meal_by_name(food_name="XX")
- 用户说"删掉刚才的"、"删掉最后一条"、"撤销记录"（未指定食物）→ delete_last_meal()
- 用户说"血糖记错了"、"删掉血糖"、"撤销血糖" → delete_last_blood_sugar()
- 用户说"运动记错了"、"删掉运动" → delete_last_exercise()

## 删除示例（必须严格遵守）
- "把刚才记的苹果删掉" → delete_meal_by_name(food_name="苹果")
- "删掉鱼" → delete_meal_by_name(food_name="鱼")
- "把粥去掉" → delete_meal_by_name(food_name="粥")
- "删掉刚才的记录" → delete_last_meal()
- "撤销刚才记的" → delete_last_meal()
- "血糖记错了" → delete_last_blood_sugar()
- "运动删掉" → delete_last_exercise()

## 记录示例
- "我中午吃了一碗米饭" → record_meal(food="米饭", meal_type="午餐", portion="一碗")
- "吃了一条鱼" → record_meal(food="鱼", meal_type="加餐", portion="一份")  # 注意："一条鱼"太大了，用"一份"
- "吃了点三文鱼" → record_meal(food="三文鱼", meal_type="加餐", portion="一份")
- "吃了100克三文鱼" → record_meal(food="三文鱼", meal_type="加餐", portion="100克")
- "刚吃了苹果" → record_meal(food="苹果", meal_type="加餐", portion="一个")
- "刚跑了30分钟" → record_exercise(type="跑步", duration_min=30)
- "血糖7.5" → record_blood_sugar(value=7.5)
- "你好" → 不调用任何函数

注意：如果用户消息不包含健康相关信息，不要调用任何函数，直接回复。"""


async def process_record(user_message: str) -> dict:
    """
    处理用户消息，尝试提取并记录健康数据。
    返回记录结果（如果有的话）。
    """
    today = date.today().isoformat()

    # 获取今日记录摘要，帮助 AI 做更智能的判断
    today_records = await db.get_today_records()
    records_context = f"\n\n今日已记录：\n"
    if today_records["meals"]:
        for m in today_records["meals"][:5]:
            records_context += f"- {m['meal_type']}: {m['food_name']}\n"
    if today_records["exercises"]:
        for e in today_records["exercises"][:3]:
            records_context += f"- 运动: {e['exercise_type']} {e['duration_min']}分钟\n"
    if today_records["blood_sugars"]:
        for b in today_records["blood_sugars"][:3]:
            records_context += f"- 血糖: {b['value']} mmol/L\n"

    api_client = get_deepseek_client()
    response = api_client.chat_completion(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": RECORD_SYSTEM_PROMPT + records_context},
            {"role": "user", "content": f"当前日期: {today}\n用户说: {user_message}"}
        ],
        tools=RECORD_TOOLS,
        tool_choice="auto",
    )

    message = response["choices"][0]["message"]
    results = {
        "recorded": False,
        "records": [],
        "nutrition_update": None,
    }

    # 检查是否有 tool_calls
    tool_calls = message.get("tool_calls")
    if not tool_calls:
        return results

    results["recorded"] = True

    for tool_call in tool_calls:
        fn_name = tool_call["function"]["name"]
        args = json.loads(tool_call["function"]["arguments"])
        record_info = {"type": fn_name, "data": args}

        if fn_name == "record_meal":
            meal_type = args.get("meal_type", "加餐")
            food = args.get("food", "")
            portion = args.get("portion", "一份")

            # 查本地数据库获取营养信息
            local_data = calculate_nutrition(food, portion)
            if local_data:
                calories = local_data["calories"]
                protein = local_data["protein"]
                fat = local_data["fat"]
                carbs = local_data["carbs"]
                fiber = local_data["fiber"]
            else:
                # 没有本地数据，使用默认估算
                calories = 200
                protein = 5
                fat = 5
                carbs = 30
                fiber = 2

            await db.add_meal(
                meal_date=today,
                meal_type=meal_type,
                food_name=food,
                portion=portion,
                calories=calories,
                protein=protein,
                fat=fat,
                carbs=carbs,
                fiber=fiber
            )
            record_info["nutrition"] = {"calories": calories, "protein": protein, "fat": fat, "carbs": carbs}
            record_info["message"] = f"已记录: {meal_type} - {food}"

        elif fn_name == "record_exercise":
            exercise_type = args.get("type", "运动")
            duration = args.get("duration_min", 30)
            await db.add_exercise(
                exercise_date=today,
                exercise_type=exercise_type,
                duration_min=duration,
                intensity="moderate",
                calories_burned=duration * 5  # 简单估算
            )
            record_info["message"] = f"已记录运动: {exercise_type} {duration}分钟"

        elif fn_name == "record_blood_sugar":
            value = args.get("value", 0)
            timing = args.get("timing", "随机")
            await db.add_blood_sugar(
                measure_date=today,
                value=value,
                timing=timing
            )
            record_info["message"] = f"已记录血糖: {value} mmol/L ({timing})"

        elif fn_name == "delete_last_meal":
            deleted = await db.delete_last_meal(today)
            if deleted:
                record_info["message"] = "已删除最近一条饮食记录"
            else:
                record_info["message"] = "没有找到可删除的饮食记录"

        elif fn_name == "delete_last_exercise":
            deleted = await db.delete_last_exercise(today)
            if deleted:
                record_info["message"] = "已删除最近一条运动记录"
            else:
                record_info["message"] = "没有找到可删除的运动记录"

        elif fn_name == "delete_last_blood_sugar":
            deleted = await db.delete_last_blood_sugar(today)
            if deleted:
                record_info["message"] = "已删除最近一条血糖记录"
            else:
                record_info["message"] = "没有找到可删除的血糖记录"

        elif fn_name == "delete_meal_by_name":
            food_name = args.get("food_name", "")
            deleted, deleted_food = await db.delete_meal_by_name(food_name, today)
            if deleted:
                record_info["message"] = f"已删除: {deleted_food}"
            else:
                record_info["message"] = f"没有找到包含「{food_name}」的记录"

        results["records"].append(record_info)

    # 获取更新后的营养摘要
    nutrition = await db.get_daily_nutrition_summary(today)
    results["nutrition_update"] = nutrition

    return results
