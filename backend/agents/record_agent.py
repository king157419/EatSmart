"""
记录 Agent - 使用 Function Calling 从用户对话中提取结构化健康数据
"""

import json
import os
from datetime import date
from openai import OpenAI
from food_db.food_lookup import calculate_nutrition, lookup_food
from memory import database as db

# DeepSeek API 客户端
client = None


def get_client() -> OpenAI:
    global client
    if client is None:
        client = OpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com",
        )
    return client


# ============================================================
# Function Calling 工具定义
# ============================================================

RECORD_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "record_meal",
            "description": "记录用户的饮食信息。当用户提到吃了什么食物时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "meal_type": {
                        "type": "string",
                        "enum": ["早餐", "午餐", "晚餐", "加餐", "夜宵"],
                        "description": "餐次类型。根据当前时间或用户描述推断。"
                    },
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string", "description": "食物名称"},
                                "portion": {"type": "string", "description": "分量描述，如'一碗'、'一盘'、'两个'"},
                                "calories": {"type": "number", "description": "估算热量(kcal)"},
                                "protein": {"type": "number", "description": "估算蛋白质(g)"},
                                "fat": {"type": "number", "description": "估算脂肪(g)"},
                                "carbs": {"type": "number", "description": "估算碳水化合物(g)"},
                            },
                            "required": ["name", "portion", "calories", "protein", "fat", "carbs"]
                        },
                        "description": "食物列表"
                    },
                },
                "required": ["meal_type", "items"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_exercise",
            "description": "记录用户的运动信息。当用户提到运动或锻炼时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "exercise_type": {"type": "string", "description": "运动类型，如'散步'、'慢跑'、'太极拳'"},
                    "duration_min": {"type": "integer", "description": "运动时长（分钟）"},
                    "intensity": {
                        "type": "string",
                        "enum": ["light", "moderate", "vigorous"],
                        "description": "运动强度"
                    },
                },
                "required": ["exercise_type", "duration_min"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_sleep",
            "description": "记录用户的作息信息。当用户提到睡觉时间或睡眠质量时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "bedtime": {"type": "string", "description": "入睡时间，如'23:00'"},
                    "wake_time": {"type": "string", "description": "起床时间，如'07:00'"},
                    "quality": {
                        "type": "string",
                        "enum": ["好", "一般", "差"],
                        "description": "睡眠质量"
                    },
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_blood_sugar",
            "description": "记录用户的血糖值。当用户提到测了血糖时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "value": {"type": "number", "description": "血糖值（mmol/L）"},
                    "timing": {
                        "type": "string",
                        "enum": ["空腹", "餐后", "随机"],
                        "description": "测量时机"
                    },
                },
                "required": ["value", "timing"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_medication",
            "description": "记录用户的用药情况。当用户提到吃药或用药时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "med_name": {"type": "string", "description": "药物名称"},
                    "taken": {"type": "boolean", "description": "是否已服用"},
                },
                "required": ["med_name", "taken"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_feeling",
            "description": "记录用户的身体感受。当用户提到身体不舒服或感觉时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "description": {"type": "string", "description": "身体感受描述"},
                },
                "required": ["description"]
            }
        }
    },
]


RECORD_SYSTEM_PROMPT = """你是一个健康记录助手。你的任务是从用户的对话中提取健康相关的结构化数据。

用户是一位2型糖尿病合并急性胰腺炎康复期的患者。

当用户描述以下内容时，调用对应的工具：
1. 吃了什么 → record_meal（根据当前时间自动推断餐次）
2. 运动了 → record_exercise
3. 睡觉信息 → record_sleep
4. 血糖值 → record_blood_sugar
5. 吃药了 → record_medication
6. 身体感受（头晕、胃痛等）→ record_feeling

营养估算指南：
- 对于常见中式食物，按"每100g"的标准营养数据乘以估算分量
- "一碗"约200g, "一盘"约200g, "一份"约150g, "一个"约100g
- 注意估算时要考虑烹饪方式：清蒸<少油炒<红烧<油炸

如果用户的消息不包含任何需要记录的健康信息，不要调用任何工具。
"""


async def process_record(user_message: str) -> dict:
    """
    处理用户消息，尝试提取并记录健康数据。
    返回记录结果（如果有的话）。
    """
    today = date.today().isoformat()

    api_client = get_client()
    response = api_client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": RECORD_SYSTEM_PROMPT},
            {"role": "user", "content": f"当前日期: {today}\n用户说: {user_message}"}
        ],
        tools=RECORD_TOOLS,
        tool_choice="auto",
    )

    message = response.choices[0].message
    results = {
        "recorded": False,
        "records": [],
        "nutrition_update": None,
    }

    if not message.tool_calls:
        return results

    results["recorded"] = True

    for tool_call in message.tool_calls:
        fn_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        record_info = {"type": fn_name, "data": args}

        if fn_name == "record_meal":
            meal_type = args["meal_type"]
            for item in args.get("items", []):
                # 先查本地数据库
                local_data = calculate_nutrition(item["name"], item.get("portion", "一份"))
                if local_data:
                    # 用本地数据覆盖 AI 估算
                    calories = local_data["calories"]
                    protein = local_data["protein"]
                    fat = local_data["fat"]
                    carbs = local_data["carbs"]
                    fiber = local_data["fiber"]
                    source = "local_db"
                else:
                    # 使用 AI 估算
                    calories = item.get("calories", 0)
                    protein = item.get("protein", 0)
                    fat = item.get("fat", 0)
                    carbs = item.get("carbs", 0)
                    fiber = 0
                    source = "ai_estimate"

                # 生成风险标签
                risk_tags = []
                if fat > 10:
                    risk_tags.append("高脂⚠️")
                if carbs > 50:
                    risk_tags.append("高碳水⚠️")

                await db.add_meal(
                    meal_date=today,
                    meal_type=meal_type,
                    food_name=item["name"],
                    portion=item.get("portion", ""),
                    grams=local_data["grams"] if local_data else 0,
                    calories=calories,
                    protein=protein,
                    fat=fat,
                    carbs=carbs,
                    fiber=fiber,
                    gi=local_data["gi"] if local_data else 0,
                    risk_tags=",".join(risk_tags),
                    source=source,
                )

            # 获取更新后的营养摘要
            results["nutrition_update"] = await db.get_daily_nutrition_summary(today)

        elif fn_name == "record_exercise":
            # 估算消耗热量（简单公式）
            duration = args.get("duration_min", 0)
            intensity_map = {"light": 3, "moderate": 5, "vigorous": 8}
            cal_per_min = intensity_map.get(args.get("intensity", "moderate"), 5)
            calories_burned = duration * cal_per_min

            await db.add_exercise(
                exercise_date=today,
                exercise_type=args["exercise_type"],
                duration_min=duration,
                intensity=args.get("intensity", "moderate"),
                calories_burned=calories_burned,
            )

        elif fn_name == "record_sleep":
            await db.add_sleep(
                sleep_date=today,
                bedtime=args.get("bedtime", ""),
                wake_time=args.get("wake_time", ""),
                quality=args.get("quality", ""),
            )

        elif fn_name == "record_blood_sugar":
            await db.add_blood_sugar(
                measure_date=today,
                value=args["value"],
                timing=args.get("timing", "随机"),
            )

        elif fn_name == "record_medication":
            await db.add_medication(
                med_date=today,
                med_name=args["med_name"],
                taken=args.get("taken", True),
            )

        elif fn_name == "record_feeling":
            await db.add_body_feeling(
                feeling_date=today,
                description=args["description"],
            )

        results["records"].append(record_info)

    return results
