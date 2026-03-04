"""
个性化营养目标计算器
根据用户的身高、体重、年龄、性别、活动水平计算每日营养需求
"""

from typing import Dict


def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str = "male") -> float:
    """
    计算基础代谢率 (BMR) - 使用 Mifflin-St Jeor 公式

    Args:
        weight_kg: 体重（公斤）
        height_cm: 身高（厘米）
        age: 年龄
        gender: 性别 ("male" 或 "female")

    Returns:
        基础代谢率（千卡/天）
    """
    if gender.lower() == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    return bmr


def calculate_tdee(bmr: float, activity_level: str = "sedentary") -> float:
    """
    计算每日总能量消耗 (TDEE)

    Args:
        bmr: 基础代谢率
        activity_level: 活动水平
            - "sedentary": 久坐（很少运动）
            - "light": 轻度活动（每周1-3天轻度运动）
            - "moderate": 中度活动（每周3-5天中等强度运动）
            - "active": 高度活动（每周6-7天高强度运动）
            - "very_active": 非常活跃（每天高强度运动或体力劳动）

    Returns:
        每日总能量消耗（千卡/天）
    """
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }

    multiplier = activity_multipliers.get(activity_level.lower(), 1.2)
    return bmr * multiplier


def calculate_nutrition_targets(
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: str = "male",
    activity_level: str = "light",
    has_diabetes: bool = True,
    has_pancreatitis: bool = True
) -> Dict[str, float]:
    """
    计算个性化营养目标

    Args:
        weight_kg: 体重（公斤）
        height_cm: 身高（厘米）
        age: 年龄
        gender: 性别
        activity_level: 活动水平
        has_diabetes: 是否有糖尿病
        has_pancreatitis: 是否有胰腺炎病史

    Returns:
        营养目标字典 {calories, protein, fat, carbs, fiber}
    """
    # 1. 计算基础代谢率和总能量消耗
    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    tdee = calculate_tdee(bmr, activity_level)

    # 2. 根据疾病情况调整热量
    # 胰腺炎恢复期：略低于 TDEE，避免消化负担
    # 糖尿病：控制总热量
    target_calories = tdee * 0.9  # 略低于维持水平，有助于控制体重

    # 3. 计算蛋白质需求
    # 推荐：1.0-1.2 g/kg 体重（老年人需要更多蛋白质维持肌肉）
    protein_per_kg = 1.1
    target_protein = weight_kg * protein_per_kg

    # 4. 计算脂肪需求
    # 胰腺炎患者：严格限制脂肪 < 30g/天（硬性限制）
    if has_pancreatitis:
        target_fat = 25.0  # 保守值，留有余地
    else:
        # 正常人：20-30% 热量来自脂肪
        target_fat = (target_calories * 0.25) / 9  # 1g 脂肪 = 9 千卡

    # 5. 计算碳水化合物需求
    # 糖尿病患者：控制碳水，推荐 45-60% 热量来自碳水
    if has_diabetes:
        carb_calories = target_calories * 0.50  # 50% 热量
    else:
        carb_calories = target_calories * 0.55  # 55% 热量

    # 减去蛋白质和脂肪的热量
    protein_calories = target_protein * 4  # 1g 蛋白质 = 4 千卡
    fat_calories = target_fat * 9
    remaining_calories = target_calories - protein_calories - fat_calories

    target_carbs = max(remaining_calories / 4, 150)  # 至少 150g 碳水（大脑需求）

    # 糖尿病患者：碳水上限 250g
    if has_diabetes:
        target_carbs = min(target_carbs, 250)

    # 6. 计算膳食纤维需求
    # 推荐：25-30g/天（有助于血糖控制和消化健康）
    target_fiber = 25.0

    return {
        "calories": round(target_calories, 1),
        "protein": round(target_protein, 1),
        "fat": round(target_fat, 1),
        "carbs": round(target_carbs, 1),
        "fiber": round(target_fiber, 1)
    }


def get_bmi(weight_kg: float, height_cm: float) -> Dict[str, any]:
    """
    计算 BMI 和体重状态

    Args:
        weight_kg: 体重（公斤）
        height_cm: 身高（厘米）

    Returns:
        BMI 信息字典
    """
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)

    # BMI 分类（中国标准）
    if bmi < 18.5:
        status = "偏瘦"
        recommendation = "建议适当增加营养摄入"
    elif 18.5 <= bmi < 24:
        status = "正常"
        recommendation = "保持当前体重"
    elif 24 <= bmi < 28:
        status = "超重"
        recommendation = "建议适当控制饮食，增加运动"
    else:
        status = "肥胖"
        recommendation = "建议咨询医生，制定减重计划"

    return {
        "bmi": round(bmi, 1),
        "status": status,
        "recommendation": recommendation
    }


# 示例使用
if __name__ == "__main__":
    # 示例：65岁男性，身高170cm，体重70kg，轻度活动
    targets = calculate_nutrition_targets(
        weight_kg=70,
        height_cm=170,
        age=65,
        gender="male",
        activity_level="light",
        has_diabetes=True,
        has_pancreatitis=True
    )

    print("个性化营养目标：")
    print(f"热量：{targets['calories']} 千卡")
    print(f"蛋白质：{targets['protein']} 克")
    print(f"脂肪：{targets['fat']} 克（胰腺炎限制）")
    print(f"碳水化合物：{targets['carbs']} 克")
    print(f"膳食纤维：{targets['fiber']} 克")

    bmi_info = get_bmi(70, 170)
    print(f"\nBMI：{bmi_info['bmi']} ({bmi_info['status']})")
    print(f"建议：{bmi_info['recommendation']}")
