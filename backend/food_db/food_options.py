"""
食物选项推荐模块
按类别（主食/蔬菜/蛋白质）展示推荐选项，支持食堂估算
"""

from typing import Optional
from pydantic import BaseModel


class FoodOption(BaseModel):
    """单个食物选项"""
    name: str
    calories: float  # kcal per portion
    fat: float       # g per portion
    carbs: float     # g per portion
    protein: float   # g per portion
    portion_default: str
    portion_grams: float


class FoodCategory(BaseModel):
    """食物分类"""
    name: str
    emoji: str
    foods: list[FoodOption]


class FoodOptionsResponse(BaseModel):
    """食物选项 API 响应"""
    categories: list[FoodCategory]
    meal_types: list[str] = ["早餐", "午餐", "晚餐", "加餐"]


# 推荐食物选项（适合糖尿病+胰腺炎患者）
RECOMMENDED_FOODS: list[dict] = [
    # === 主食类 - 低GI优先 ===
    {
        "category": "主食类",
        "emoji": "🍚",
        "foods": [
            {"name": "糙米饭", "calories": 222, "fat": 1.8, "carbs": 47, "protein": 5.0, "portion_default": "一碗", "portion_grams": 200},
            {"name": "杂粮饭", "calories": 210, "fat": 1.6, "carbs": 44, "protein": 6.0, "portion_default": "一碗", "portion_grams": 200},
            {"name": "燕麦粥", "calories": 120, "fat": 2.4, "carbs": 20, "protein": 5.0, "portion_default": "一碗", "portion_grams": 200},
            {"name": "荞麦面", "calories": 162, "fat": 0.9, "carbs": 32, "protein": 6.8, "portion_default": "一份", "portion_grams": 150},
            {"name": "红薯", "calories": 172, "fat": 0.2, "carbs": 40, "protein": 3.2, "portion_default": "一个", "portion_grams": 200},
            {"name": "玉米", "calories": 112, "fat": 1.2, "carbs": 23, "protein": 4.0, "portion_default": "一根", "portion_grams": 100},
        ]
    },
    # === 蔬菜类 - 低脂高纤维 ===
    {
        "category": "蔬菜类",
        "emoji": "🥬",
        "foods": [
            {"name": "西兰花", "calories": 68, "fat": 1.2, "carbs": 8.6, "protein": 8.2, "portion_default": "一盘", "portion_grams": 200},
            {"name": "炒白菜", "calories": 80, "fat": 4.0, "carbs": 7.0, "protein": 3.6, "portion_default": "一盘", "portion_grams": 200},
            {"name": "冬瓜汤", "calories": 30, "fat": 0.6, "carbs": 5.6, "protein": 1.0, "portion_default": "一碗", "portion_grams": 200},
            {"name": "凉拌黄瓜", "calories": 50, "fat": 1.0, "carbs": 7.0, "protein": 1.6, "portion_default": "一盘", "portion_grams": 200},
            {"name": "菠菜", "calories": 46, "fat": 0.6, "carbs": 4.0, "protein": 5.2, "portion_default": "一盘", "portion_grams": 200},
            {"name": "苦瓜", "calories": 38, "fat": 0.2, "carbs": 7.0, "protein": 2.0, "portion_default": "一盘", "portion_grams": 200},
        ]
    },
    # === 蛋白质类 - 低脂优质蛋白 ===
    {
        "category": "蛋白质类",
        "emoji": "🐟",
        "foods": [
            {"name": "清蒸鱼", "calories": 110, "fat": 3.5, "carbs": 0.5, "protein": 19, "portion_default": "一份", "portion_grams": 100},
            {"name": "鸡胸肉", "calories": 133, "fat": 1.2, "carbs": 0, "protein": 31, "portion_default": "一份", "portion_grams": 100},
            {"name": "豆腐", "calories": 73, "fat": 3.7, "carbs": 2.8, "protein": 8.1, "portion_default": "一块", "portion_grams": 100},
            {"name": "水煮蛋", "calories": 144, "fat": 8.8, "carbs": 2.8, "protein": 13.3, "portion_default": "一个", "portion_grams": 100},
            {"name": "虾仁", "calories": 48, "fat": 0.5, "carbs": 0, "protein": 10.4, "portion_default": "一份", "portion_grams": 100},
            {"name": "瘦牛肉", "calories": 106, "fat": 2.3, "carbs": 0, "protein": 20.2, "portion_default": "一份", "portion_grams": 100},
        ]
    },
    # === 汤类 - 清淡为主 ===
    {
        "category": "汤类",
        "emoji": "🍲",
        "foods": [
            {"name": "番茄蛋花汤", "calories": 60, "fat": 2.0, "carbs": 7.0, "protein": 4.0, "portion_default": "一碗", "portion_grams": 200},
            {"name": "紫菜蛋花汤", "calories": 50, "fat": 1.6, "carbs": 5.0, "protein": 4.0, "portion_default": "一碗", "portion_grams": 200},
            {"name": "白菜豆腐汤", "calories": 56, "fat": 2.0, "carbs": 5.0, "protein": 5.0, "portion_default": "一碗", "portion_grams": 200},
            {"name": "冬瓜排骨汤", "calories": 80, "fat": 3.0, "carbs": 6.0, "protein": 7.0, "portion_default": "一碗", "portion_grams": 200},
        ]
    },
    # === 食堂选项 - 用平均值估算 ===
    {
        "category": "食堂选项",
        "emoji": "🍱",
        "foods": [
            {"name": "食堂米饭", "calories": 230, "fat": 0.6, "carbs": 51, "protein": 5.2, "portion_default": "一份", "portion_grams": 200},
            {"name": "食堂炒青菜", "calories": 90, "fat": 5.0, "carbs": 6.0, "protein": 3.0, "portion_default": "一份", "portion_grams": 150},
            {"name": "食堂清蒸鱼", "calories": 130, "fat": 5.0, "carbs": 2.0, "protein": 18, "portion_default": "一份", "portion_grams": 100},
            {"name": "食堂炒蛋", "calories": 160, "fat": 12, "carbs": 2.0, "protein": 11, "portion_default": "一份", "portion_grams": 100},
            {"name": "食堂炖豆腐", "calories": 100, "fat": 5.0, "carbs": 4.0, "protein": 9.0, "portion_default": "一份", "portion_grams": 150},
        ]
    },
]


def get_food_options() -> FoodOptionsResponse:
    """获取所有推荐食物选项"""
    categories = []
    for cat_data in RECOMMENDED_FOODS:
        foods = [FoodOption(**f) for f in cat_data["foods"]]
        categories.append(FoodCategory(
            name=cat_data["category"],
            emoji=cat_data["emoji"],
            foods=foods
        ))
    return FoodOptionsResponse(categories=categories)


def find_food_option(name: str) -> Optional[FoodOption]:
    """根据名称查找食物选项"""
    for cat_data in RECOMMENDED_FOODS:
        for food_data in cat_data["foods"]:
            if food_data["name"] == name:
                return FoodOption(**food_data)
    return None
