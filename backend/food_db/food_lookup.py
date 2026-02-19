"""
本地食物营养数据库查询模块
先查本地数据库（精确匹配），查不到再返回 None 让 AI 估算
"""

import json
import os
from typing import Optional
from pydantic import BaseModel


class FoodNutrition(BaseModel):
    """单个食物的营养成分"""
    name: str
    calories: float  # kcal per 100g
    protein: float   # g per 100g
    fat: float       # g per 100g
    carbs: float     # g per 100g
    fiber: float     # g per 100g
    gi: Optional[int] = None  # 血糖生成指数


# 内置常见中式食物营养数据库（每100g的营养成分）
# 数据来源：《中国食物成分表》
FOOD_DATABASE: dict[str, dict] = {
    # === 主食类 ===
    "白米饭": {"calories": 116, "protein": 2.6, "fat": 0.3, "carbs": 25.9, "fiber": 0.3, "gi": 83},
    "糙米饭": {"calories": 111, "protein": 2.5, "fat": 0.9, "carbs": 23.5, "fiber": 1.6, "gi": 56},
    "杂粮饭": {"calories": 105, "protein": 3.0, "fat": 0.8, "carbs": 22.0, "fiber": 2.0, "gi": 55},
    "馒头": {"calories": 223, "protein": 7.0, "fat": 1.1, "carbs": 47.0, "fiber": 1.3, "gi": 88},
    "全麦馒头": {"calories": 210, "protein": 8.5, "fat": 1.5, "carbs": 42.0, "fiber": 3.5, "gi": 60},
    "面条": {"calories": 110, "protein": 3.5, "fat": 0.5, "carbs": 23.0, "fiber": 0.8, "gi": 55},
    "荞麦面": {"calories": 108, "protein": 4.5, "fat": 0.6, "carbs": 21.5, "fiber": 2.5, "gi": 46},
    "全麦面包": {"calories": 246, "protein": 9.0, "fat": 3.5, "carbs": 44.0, "fiber": 6.0, "gi": 51},
    "白粥": {"calories": 46, "protein": 1.1, "fat": 0.1, "carbs": 10.0, "fiber": 0.1, "gi": 92},
    "小米粥": {"calories": 46, "protein": 1.4, "fat": 0.7, "carbs": 8.4, "fiber": 0.5, "gi": 62},
    "燕麦粥": {"calories": 60, "protein": 2.5, "fat": 1.2, "carbs": 10.0, "fiber": 1.5, "gi": 55},
    "杂粮粥": {"calories": 50, "protein": 1.8, "fat": 0.5, "carbs": 10.0, "fiber": 1.2, "gi": 52},
    "南瓜粥": {"calories": 35, "protein": 0.8, "fat": 0.2, "carbs": 7.5, "fiber": 0.6, "gi": 60},
    "红薯": {"calories": 86, "protein": 1.6, "fat": 0.1, "carbs": 20.1, "fiber": 1.6, "gi": 55},
    "山药": {"calories": 57, "protein": 1.9, "fat": 0.2, "carbs": 12.4, "fiber": 0.8, "gi": 75},
    "玉米": {"calories": 112, "protein": 4.0, "fat": 1.2, "carbs": 22.8, "fiber": 2.9, "gi": 70},
    "油条": {"calories": 388, "protein": 6.9, "fat": 17.6, "carbs": 51.0, "fiber": 0.9, "gi": 75},

    # === 肉蛋类 ===
    "鸡胸肉": {"calories": 133, "protein": 31.0, "fat": 1.2, "carbs": 0, "fiber": 0, "gi": 0},
    "去皮鸡胸肉": {"calories": 120, "protein": 26.0, "fat": 1.0, "carbs": 0, "fiber": 0, "gi": 0},
    "鸡蛋": {"calories": 144, "protein": 13.3, "fat": 8.8, "carbs": 2.8, "fiber": 0, "gi": 0},
    "水煮蛋": {"calories": 144, "protein": 13.3, "fat": 8.8, "carbs": 2.8, "fiber": 0, "gi": 0},
    "蛋清": {"calories": 52, "protein": 11.0, "fat": 0.1, "carbs": 0.7, "fiber": 0, "gi": 0},
    "蛋黄": {"calories": 322, "protein": 15.2, "fat": 27.0, "carbs": 3.4, "fiber": 0, "gi": 0},
    "蒸蛋羹": {"calories": 72, "protein": 6.6, "fat": 4.4, "carbs": 1.4, "fiber": 0, "gi": 0},
    "瘦牛肉": {"calories": 106, "protein": 20.2, "fat": 2.3, "carbs": 0, "fiber": 0, "gi": 0},
    "瘦猪肉": {"calories": 143, "protein": 20.3, "fat": 6.2, "carbs": 0, "fiber": 0, "gi": 0},
    "五花肉": {"calories": 395, "protein": 14.0, "fat": 37.0, "carbs": 0, "fiber": 0, "gi": 0},
    "红烧肉": {"calories": 350, "protein": 12.0, "fat": 30.0, "carbs": 5.0, "fiber": 0, "gi": 0},
    "回锅肉": {"calories": 320, "protein": 11.0, "fat": 28.0, "carbs": 6.0, "fiber": 0.5, "gi": 0},

    # === 鱼虾类 ===
    "鲈鱼": {"calories": 105, "protein": 18.6, "fat": 3.4, "carbs": 0, "fiber": 0, "gi": 0},
    "清蒸鲈鱼": {"calories": 110, "protein": 19.0, "fat": 3.5, "carbs": 0.5, "fiber": 0, "gi": 0},
    "鳕鱼": {"calories": 88, "protein": 20.4, "fat": 0.8, "carbs": 0, "fiber": 0, "gi": 0},
    "清蒸鳕鱼": {"calories": 90, "protein": 20.0, "fat": 1.0, "carbs": 0.5, "fiber": 0, "gi": 0},
    "带鱼": {"calories": 127, "protein": 17.7, "fat": 4.9, "carbs": 0, "fiber": 0, "gi": 0},
    "三文鱼": {"calories": 139, "protein": 21.1, "fat": 6.0, "carbs": 0, "fiber": 0, "gi": 0},
    "虾仁": {"calories": 48, "protein": 10.4, "fat": 0.5, "carbs": 0, "fiber": 0, "gi": 0},
    "基围虾": {"calories": 87, "protein": 18.2, "fat": 0.8, "carbs": 0, "fiber": 0, "gi": 0},
    "白灼虾": {"calories": 90, "protein": 18.5, "fat": 1.0, "carbs": 0, "fiber": 0, "gi": 0},

    # === 豆制品 ===
    "豆腐": {"calories": 73, "protein": 8.1, "fat": 3.7, "carbs": 2.8, "fiber": 0.4, "gi": 15},
    "豆腐脑": {"calories": 15, "protein": 1.9, "fat": 0.8, "carbs": 0.3, "fiber": 0, "gi": 15},
    "豆腐干": {"calories": 140, "protein": 16.2, "fat": 7.2, "carbs": 2.8, "fiber": 0.5, "gi": 23},
    "豆浆": {"calories": 31, "protein": 2.9, "fat": 1.2, "carbs": 1.2, "fiber": 0.1, "gi": 30},
    "毛豆": {"calories": 131, "protein": 13.1, "fat": 5.0, "carbs": 10.5, "fiber": 4.0, "gi": 15},

    # === 蔬菜类 ===
    "菠菜": {"calories": 23, "protein": 2.6, "fat": 0.3, "carbs": 2.0, "fiber": 1.7, "gi": 15},
    "西兰花": {"calories": 34, "protein": 4.1, "fat": 0.6, "carbs": 4.3, "fiber": 1.6, "gi": 15},
    "白菜": {"calories": 17, "protein": 1.5, "fat": 0.2, "carbs": 2.2, "fiber": 0.8, "gi": 15},
    "冬瓜": {"calories": 12, "protein": 0.4, "fat": 0.2, "carbs": 2.6, "fiber": 0.7, "gi": 15},
    "黄瓜": {"calories": 15, "protein": 0.7, "fat": 0.1, "carbs": 2.9, "fiber": 0.5, "gi": 15},
    "苦瓜": {"calories": 19, "protein": 1.0, "fat": 0.1, "carbs": 3.5, "fiber": 1.4, "gi": 15},
    "番茄": {"calories": 19, "protein": 0.9, "fat": 0.2, "carbs": 4.0, "fiber": 0.5, "gi": 15},
    "芹菜": {"calories": 14, "protein": 0.7, "fat": 0.1, "carbs": 2.2, "fiber": 1.2, "gi": 15},
    "油麦菜": {"calories": 15, "protein": 1.7, "fat": 0.4, "carbs": 1.5, "fiber": 0.6, "gi": 15},
    "生菜": {"calories": 13, "protein": 1.3, "fat": 0.3, "carbs": 1.5, "fiber": 0.6, "gi": 15},
    "莴苣": {"calories": 14, "protein": 1.0, "fat": 0.1, "carbs": 2.2, "fiber": 0.6, "gi": 15},
    "南瓜": {"calories": 22, "protein": 0.7, "fat": 0.1, "carbs": 5.3, "fiber": 0.8, "gi": 65},
    "丝瓜": {"calories": 20, "protein": 1.0, "fat": 0.2, "carbs": 4.2, "fiber": 0.6, "gi": 15},
    "花椰菜": {"calories": 24, "protein": 2.1, "fat": 0.2, "carbs": 4.1, "fiber": 1.2, "gi": 15},
    "胡萝卜": {"calories": 37, "protein": 1.0, "fat": 0.2, "carbs": 8.1, "fiber": 1.1, "gi": 71},
    "青椒": {"calories": 22, "protein": 1.0, "fat": 0.2, "carbs": 4.7, "fiber": 0.9, "gi": 15},
    "海带": {"calories": 12, "protein": 1.2, "fat": 0.1, "carbs": 2.1, "fiber": 0.5, "gi": 17},
    "木耳": {"calories": 21, "protein": 1.5, "fat": 0.2, "carbs": 5.0, "fiber": 2.6, "gi": 15},
    "香菇": {"calories": 26, "protein": 2.2, "fat": 0.3, "carbs": 5.2, "fiber": 3.3, "gi": 15},
    "金针菇": {"calories": 32, "protein": 2.4, "fat": 0.4, "carbs": 6.0, "fiber": 2.7, "gi": 15},
    "豆芽": {"calories": 18, "protein": 2.1, "fat": 0.1, "carbs": 2.5, "fiber": 0.8, "gi": 15},
    "芦笋": {"calories": 22, "protein": 1.8, "fat": 0.1, "carbs": 4.1, "fiber": 1.9, "gi": 15},

    # === 水果类 ===
    "苹果": {"calories": 52, "protein": 0.3, "fat": 0.2, "carbs": 13.5, "fiber": 1.2, "gi": 36},
    "梨": {"calories": 51, "protein": 0.3, "fat": 0.1, "carbs": 13.3, "fiber": 3.1, "gi": 36},
    "柚子": {"calories": 42, "protein": 0.8, "fat": 0.2, "carbs": 9.5, "fiber": 0.4, "gi": 25},
    "橙子": {"calories": 47, "protein": 0.9, "fat": 0.1, "carbs": 11.1, "fiber": 0.6, "gi": 43},
    "猕猴桃": {"calories": 56, "protein": 0.8, "fat": 0.6, "carbs": 11.9, "fiber": 2.6, "gi": 52},
    "草莓": {"calories": 32, "protein": 1.0, "fat": 0.2, "carbs": 7.1, "fiber": 1.1, "gi": 40},
    "樱桃": {"calories": 46, "protein": 1.1, "fat": 0.2, "carbs": 10.2, "fiber": 0.3, "gi": 22},
    "香蕉": {"calories": 93, "protein": 1.4, "fat": 0.2, "carbs": 22.0, "fiber": 1.2, "gi": 55},
    "西瓜": {"calories": 31, "protein": 0.5, "fat": 0.1, "carbs": 6.8, "fiber": 0.3, "gi": 72},
    "芒果": {"calories": 35, "protein": 0.6, "fat": 0.2, "carbs": 8.3, "fiber": 1.3, "gi": 55},
    "葡萄": {"calories": 44, "protein": 0.5, "fat": 0.2, "carbs": 10.3, "fiber": 0.4, "gi": 43},

    # === 乳制品 ===
    "牛奶": {"calories": 54, "protein": 3.0, "fat": 3.2, "carbs": 3.4, "fiber": 0, "gi": 28},
    "脱脂牛奶": {"calories": 34, "protein": 3.4, "fat": 0.1, "carbs": 5.0, "fiber": 0, "gi": 32},
    "低脂牛奶": {"calories": 42, "protein": 3.2, "fat": 1.0, "carbs": 5.0, "fiber": 0, "gi": 30},
    "酸奶": {"calories": 72, "protein": 3.5, "fat": 2.7, "carbs": 9.3, "fiber": 0, "gi": 36},
    "无糖酸奶": {"calories": 57, "protein": 3.8, "fat": 3.1, "carbs": 4.0, "fiber": 0, "gi": 33},

    # === 坚果（少量）===
    "杏仁": {"calories": 578, "protein": 21.2, "fat": 50.6, "carbs": 19.7, "fiber": 11.8, "gi": 15},
    "核桃": {"calories": 654, "protein": 15.2, "fat": 65.2, "carbs": 13.7, "fiber": 6.7, "gi": 15},
    "花生": {"calories": 567, "protein": 25.8, "fat": 49.2, "carbs": 16.1, "fiber": 8.5, "gi": 14},
    "腰果": {"calories": 553, "protein": 18.2, "fat": 43.8, "carbs": 30.2, "fiber": 3.3, "gi": 22},

    # === 常见家常菜 ===
    "炒白菜": {"calories": 40, "protein": 1.8, "fat": 2.0, "carbs": 3.5, "fiber": 1.0, "gi": 15},
    "炒青菜": {"calories": 45, "protein": 2.0, "fat": 2.5, "carbs": 3.0, "fiber": 1.5, "gi": 15},
    "蒜蓉西兰花": {"calories": 55, "protein": 4.0, "fat": 2.5, "carbs": 5.0, "fiber": 1.8, "gi": 15},
    "凉拌黄瓜": {"calories": 25, "protein": 0.8, "fat": 0.5, "carbs": 3.5, "fiber": 0.5, "gi": 15},
    "凉拌木耳": {"calories": 35, "protein": 1.8, "fat": 1.0, "carbs": 5.5, "fiber": 2.5, "gi": 15},
    "番茄蛋花汤": {"calories": 30, "protein": 2.0, "fat": 1.0, "carbs": 3.5, "fiber": 0.4, "gi": 15},
    "冬瓜汤": {"calories": 15, "protein": 0.5, "fat": 0.3, "carbs": 2.8, "fiber": 0.5, "gi": 15},
    "紫菜蛋花汤": {"calories": 25, "protein": 2.0, "fat": 0.8, "carbs": 2.5, "fiber": 0.3, "gi": 15},
    "白菜豆腐汤": {"calories": 28, "protein": 2.5, "fat": 1.0, "carbs": 2.5, "fiber": 0.6, "gi": 15},
    "豆腐蔬菜汤": {"calories": 30, "protein": 2.5, "fat": 1.2, "carbs": 2.5, "fiber": 0.6, "gi": 15},
    "凉拌鸡丝": {"calories": 95, "protein": 15.0, "fat": 2.5, "carbs": 2.0, "fiber": 0.5, "gi": 0},
    "清炒苦瓜": {"calories": 40, "protein": 1.2, "fat": 2.0, "carbs": 4.0, "fiber": 1.5, "gi": 15},
    "凉拌海带丝": {"calories": 25, "protein": 1.5, "fat": 0.5, "carbs": 3.0, "fiber": 0.6, "gi": 17},

    # === 常见外卖/餐馆菜（高风险标记）===
    "兰州拉面": {"calories": 130, "protein": 5.0, "fat": 3.0, "carbs": 22.0, "fiber": 0.5, "gi": 60},
    "卤蛋": {"calories": 130, "protein": 12.0, "fat": 7.5, "carbs": 2.5, "fiber": 0, "gi": 0},
    "火锅": {"calories": 200, "protein": 10.0, "fat": 15.0, "carbs": 5.0, "fiber": 0.5, "gi": 0},
    "麻辣烫": {"calories": 150, "protein": 6.0, "fat": 10.0, "carbs": 8.0, "fiber": 1.0, "gi": 0},
    "炸鸡": {"calories": 260, "protein": 16.0, "fat": 16.0, "carbs": 12.0, "fiber": 0.3, "gi": 0},
    "烧烤": {"calories": 200, "protein": 15.0, "fat": 12.0, "carbs": 5.0, "fiber": 0, "gi": 0},
}

# 常见分量映射（将自然语言分量转换为克数）
PORTION_MAP: dict[str, float] = {
    "一碗": 200,
    "1碗": 200,
    "半碗": 100,
    "小碗": 150,
    "大碗": 300,
    "一小碗": 150,
    "一大碗": 300,
    "一盘": 200,
    "1盘": 200,
    "半盘": 100,
    "一小盘": 150,
    "一大盘": 300,
    "一份": 150,
    "1份": 150,
    "一块": 50,
    "一片": 20,
    "一个": 100,
    "1个": 100,
    "半个": 50,
    "两个": 200,
    "2个": 200,
    "一根": 100,
    "一把": 25,
    "一小把": 15,
    "少量": 30,
    "适量": 50,
}


def lookup_food(name: str) -> Optional[FoodNutrition]:
    """
    查询食物营养数据。先精确匹配，再模糊匹配。
    返回 None 表示数据库中没有，需要 AI 估算。
    """
    # 精确匹配
    if name in FOOD_DATABASE:
        data = FOOD_DATABASE[name]
        return FoodNutrition(name=name, **data)

    # 模糊匹配：检查食物名是否包含数据库中的关键词
    for db_name, data in FOOD_DATABASE.items():
        if db_name in name or name in db_name:
            return FoodNutrition(name=db_name, **data)

    return None


def estimate_grams(portion_desc: str) -> float:
    """
    根据分量描述估算克数。
    返回默认 150g 如果无法匹配。
    """
    for key, grams in PORTION_MAP.items():
        if key in portion_desc:
            return grams
    return 150.0  # 默认一份约150g


def calculate_nutrition(food_name: str, portion_desc: str = "一份") -> Optional[dict]:
    """
    计算一份食物的营养成分。
    返回 None 如果食物不在数据库中。
    """
    food = lookup_food(food_name)
    if food is None:
        return None

    grams = estimate_grams(portion_desc)
    ratio = grams / 100.0

    return {
        "food_name": food.name,
        "portion": portion_desc,
        "grams": grams,
        "calories": round(food.calories * ratio, 1),
        "protein": round(food.protein * ratio, 1),
        "fat": round(food.fat * ratio, 1),
        "carbs": round(food.carbs * ratio, 1),
        "fiber": round(food.fiber * ratio, 1),
        "gi": food.gi,
        "source": "local_db",
    }
