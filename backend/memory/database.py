"""
SQLite 记忆库 - 存储饮食/运动/作息/血糖/用药记录
"""

import aiosqlite
import os
from datetime import datetime, date, timedelta
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "memory.db")


async def get_db() -> aiosqlite.Connection:
    """获取数据库连接"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """初始化数据库表"""
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS meals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                meal_date DATE NOT NULL,
                meal_type TEXT NOT NULL,
                food_name TEXT NOT NULL,
                portion TEXT,
                grams REAL,
                calories REAL DEFAULT 0,
                protein REAL DEFAULT 0,
                fat REAL DEFAULT 0,
                carbs REAL DEFAULT 0,
                fiber REAL DEFAULT 0,
                gi INTEGER,
                risk_tags TEXT,
                source TEXT DEFAULT 'ai_estimate'
            );

            CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                exercise_date DATE NOT NULL,
                exercise_type TEXT NOT NULL,
                duration_min INTEGER,
                intensity TEXT DEFAULT 'moderate',
                calories_burned REAL DEFAULT 0,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS sleep_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sleep_date DATE NOT NULL,
                bedtime TEXT,
                wake_time TEXT,
                quality TEXT,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS blood_sugar (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                measure_date DATE NOT NULL,
                measure_time TEXT,
                timing TEXT NOT NULL,
                value REAL NOT NULL,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS medications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                med_date DATE NOT NULL,
                med_name TEXT NOT NULL,
                taken INTEGER DEFAULT 1,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS body_feelings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                feeling_date DATE NOT NULL,
                description TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS nutrition_targets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                calories REAL DEFAULT 1800,
                fat REAL DEFAULT 30,
                carbs REAL DEFAULT 200,
                protein REAL DEFAULT 60,
                fiber REAL DEFAULT 25,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS saved_recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                recipe_date DATE NOT NULL,
                title TEXT DEFAULT '',
                content TEXT NOT NULL,
                is_favorite INTEGER DEFAULT 0
            );
        """)
        # 插入默认营养目标（如果不存在）
        cursor = await db.execute("SELECT COUNT(*) FROM nutrition_targets")
        count = (await cursor.fetchone())[0]
        if count == 0:
            await db.execute(
                "INSERT INTO nutrition_targets (calories, fat, carbs, protein, fiber) VALUES (?, ?, ?, ?, ?)",
                (1800, 30, 200, 60, 25)
            )
        await db.commit()
    finally:
        await db.close()


# ============================================================
# 饮食记录
# ============================================================

async def add_meal(meal_date: str, meal_type: str, food_name: str,
                   portion: str = "", grams: float = 0,
                   calories: float = 0, protein: float = 0,
                   fat: float = 0, carbs: float = 0,
                   fiber: float = 0, gi: int = 0,
                   risk_tags: str = "", source: str = "ai_estimate"):
    """添加饮食记录"""
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO meals (meal_date, meal_type, food_name, portion, grams,
               calories, protein, fat, carbs, fiber, gi, risk_tags, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (meal_date, meal_type, food_name, portion, grams,
             calories, protein, fat, carbs, fiber, gi, risk_tags, source)
        )
        await db.commit()
    finally:
        await db.close()


async def get_daily_meals(target_date: str) -> list[dict]:
    """获取某天的所有饮食记录"""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM meals WHERE meal_date = ? ORDER BY created_at",
            (target_date,)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_daily_nutrition_summary(target_date: str) -> dict:
    """获取某天的营养摄入汇总"""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT
                COALESCE(SUM(calories), 0) as total_calories,
                COALESCE(SUM(protein), 0) as total_protein,
                COALESCE(SUM(fat), 0) as total_fat,
                COALESCE(SUM(carbs), 0) as total_carbs,
                COALESCE(SUM(fiber), 0) as total_fiber,
                COUNT(*) as meal_count
            FROM meals WHERE meal_date = ?""",
            (target_date,)
        )
        row = await cursor.fetchone()

        # 获取目标值
        target_cursor = await db.execute(
            "SELECT * FROM nutrition_targets ORDER BY id DESC LIMIT 1"
        )
        target = await target_cursor.fetchone()

        summary = dict(row)
        if target:
            target_dict = dict(target)
            summary["targets"] = {
                "calories": target_dict["calories"],
                "fat": target_dict["fat"],
                "carbs": target_dict["carbs"],
                "protein": target_dict["protein"],
                "fiber": target_dict["fiber"],
            }
            # 计算百分比
            summary["percentages"] = {
                "calories": round(summary["total_calories"] / target_dict["calories"] * 100, 1) if target_dict["calories"] > 0 else 0,
                "fat": round(summary["total_fat"] / target_dict["fat"] * 100, 1) if target_dict["fat"] > 0 else 0,
                "carbs": round(summary["total_carbs"] / target_dict["carbs"] * 100, 1) if target_dict["carbs"] > 0 else 0,
                "protein": round(summary["total_protein"] / target_dict["protein"] * 100, 1) if target_dict["protein"] > 0 else 0,
                "fiber": round(summary["total_fiber"] / target_dict["fiber"] * 100, 1) if target_dict["fiber"] > 0 else 0,
            }
            # 生成警告
            warnings = []
            if summary["percentages"]["fat"] > 100:
                warnings.append("⚠️ 脂肪摄入超标！胰腺炎患者每日脂肪应<30g")
            if summary["percentages"]["carbs"] > 100:
                warnings.append("⚠️ 碳水摄入偏高，注意控制血糖")
            if summary["percentages"]["fat"] > 80:
                warnings.append("⚡ 脂肪摄入已达80%，晚餐请选择低脂食物")
            summary["warnings"] = warnings

        return summary
    finally:
        await db.close()


# ============================================================
# 运动记录
# ============================================================

async def add_exercise(exercise_date: str, exercise_type: str,
                       duration_min: int = 0, intensity: str = "moderate",
                       calories_burned: float = 0, notes: str = ""):
    """添加运动记录"""
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO exercises (exercise_date, exercise_type, duration_min,
               intensity, calories_burned, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (exercise_date, exercise_type, duration_min, intensity, calories_burned, notes)
        )
        await db.commit()
    finally:
        await db.close()


# ============================================================
# 作息记录
# ============================================================

async def add_sleep(sleep_date: str, bedtime: str = "",
                    wake_time: str = "", quality: str = "", notes: str = ""):
    """添加作息记录"""
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO sleep_records (sleep_date, bedtime, wake_time, quality, notes) VALUES (?, ?, ?, ?, ?)",
            (sleep_date, bedtime, wake_time, quality, notes)
        )
        await db.commit()
    finally:
        await db.close()


# ============================================================
# 血糖记录
# ============================================================

async def add_blood_sugar(measure_date: str, value: float,
                          timing: str = "空腹", measure_time: str = "", notes: str = ""):
    """添加血糖记录"""
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO blood_sugar (measure_date, measure_time, timing, value, notes) VALUES (?, ?, ?, ?, ?)",
            (measure_date, measure_time, timing, value, notes)
        )
        await db.commit()
    finally:
        await db.close()


# ============================================================
# 用药记录
# ============================================================

async def add_medication(med_date: str, med_name: str,
                         taken: bool = True, notes: str = ""):
    """添加用药记录"""
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO medications (med_date, med_name, taken, notes) VALUES (?, ?, ?, ?)",
            (med_date, med_name, 1 if taken else 0, notes)
        )
        await db.commit()
    finally:
        await db.close()


# ============================================================
# 身体感受记录
# ============================================================

async def add_body_feeling(feeling_date: str, description: str):
    """添加身体感受记录"""
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO body_feelings (feeling_date, description) VALUES (?, ?)",
            (feeling_date, description)
        )
        await db.commit()
    finally:
        await db.close()


# ============================================================
# 记忆摘要（给主对话 Agent 用）
# ============================================================

async def get_recent_memory_summary(days: int = 7) -> str:
    """
    获取最近 N 天的健康记忆摘要，供主对话 Agent 使用。
    返回格式化的文本。
    """
    db = await get_db()
    try:
        today = date.today()
        start_date = (today - timedelta(days=days)).isoformat()
        summary_parts = []

        # 今天的饮食
        today_str = today.isoformat()
        cursor = await db.execute(
            "SELECT meal_type, food_name, portion, calories, fat, carbs, protein FROM meals WHERE meal_date = ? ORDER BY created_at",
            (today_str,)
        )
        today_meals = await cursor.fetchall()
        if today_meals:
            summary_parts.append(f"【今日已吃】({today_str})")
            for m in today_meals:
                m = dict(m)
                summary_parts.append(
                    f"  {m['meal_type']}: {m['food_name']} {m['portion']} "
                    f"(热量{m['calories']}kcal 脂肪{m['fat']}g 碳水{m['carbs']}g)"
                )

        # 今日营养汇总
        cursor = await db.execute(
            "SELECT SUM(calories) as cal, SUM(fat) as fat, SUM(carbs) as carbs, SUM(protein) as prot FROM meals WHERE meal_date = ?",
            (today_str,)
        )
        totals = dict(await cursor.fetchone())
        if any(v for v in totals.values() if v):
            summary_parts.append(
                f"  📊 今日累计: 热量{totals['cal'] or 0:.0f}kcal "
                f"脂肪{totals['fat'] or 0:.1f}g 碳水{totals['carbs'] or 0:.1f}g "
                f"蛋白质{totals['prot'] or 0:.1f}g"
            )

        # 最近运动
        cursor = await db.execute(
            "SELECT exercise_date, exercise_type, duration_min FROM exercises WHERE exercise_date >= ? ORDER BY exercise_date DESC",
            (start_date,)
        )
        exercises = await cursor.fetchall()
        if exercises:
            summary_parts.append(f"\n【最近{days}天运动】")
            for e in exercises:
                e = dict(e)
                summary_parts.append(f"  {e['exercise_date']}: {e['exercise_type']} {e['duration_min']}分钟")

        # 最近血糖
        cursor = await db.execute(
            "SELECT measure_date, timing, value FROM blood_sugar WHERE measure_date >= ? ORDER BY measure_date DESC LIMIT 10",
            (start_date,)
        )
        sugars = await cursor.fetchall()
        if sugars:
            summary_parts.append(f"\n【最近血糖记录】")
            for s in sugars:
                s = dict(s)
                flag = ""
                if s["timing"] == "空腹" and s["value"] > 7.0:
                    flag = " ⚠️偏高"
                elif s["timing"] == "餐后" and s["value"] > 10.0:
                    flag = " ⚠️偏高"
                summary_parts.append(f"  {s['measure_date']} {s['timing']}: {s['value']} mmol/L{flag}")

        # 最近作息
        cursor = await db.execute(
            "SELECT sleep_date, bedtime, wake_time, quality FROM sleep_records WHERE sleep_date >= ? ORDER BY sleep_date DESC LIMIT 3",
            (start_date,)
        )
        sleeps = await cursor.fetchall()
        if sleeps:
            summary_parts.append(f"\n【最近作息】")
            for s in sleeps:
                s = dict(s)
                summary_parts.append(
                    f"  {s['sleep_date']}: {s['bedtime'] or '?'}-{s['wake_time'] or '?'} 质量:{s['quality'] or '未评'}"
                )

        # 最近身体感受
        cursor = await db.execute(
            "SELECT feeling_date, description FROM body_feelings WHERE feeling_date >= ? ORDER BY feeling_date DESC LIMIT 5",
            (start_date,)
        )
        feelings = await cursor.fetchall()
        if feelings:
            summary_parts.append(f"\n【最近身体感受】")
            for f in feelings:
                f_dict = dict(f)
                summary_parts.append(f"  {f_dict['feeling_date']}: {f_dict['description']}")

        if not summary_parts:
            return "暂无历史记录。"

        return "\n".join(summary_parts)
    finally:
        await db.close()


async def update_nutrition_targets(calories: float = None, fat: float = None,
                                    carbs: float = None, protein: float = None,
                                    fiber: float = None):
    """更新每日营养目标"""
    db = await get_db()
    try:
        current = await db.execute("SELECT * FROM nutrition_targets ORDER BY id DESC LIMIT 1")
        row = await current.fetchone()
        if row:
            row = dict(row)
            await db.execute(
                """UPDATE nutrition_targets SET
                   calories = ?, fat = ?, carbs = ?, protein = ?, fiber = ?,
                   updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (
                    calories or row["calories"],
                    fat or row["fat"],
                    carbs or row["carbs"],
                    protein or row["protein"],
                    fiber or row["fiber"],
                    row["id"]
                )
            )
            await db.commit()
    finally:
        await db.close()


# ============================================================
# 食谱保存
# ============================================================

async def save_recipe(recipe_date: str, content: str, title: str = "") -> int:
    """保存食谱"""
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO saved_recipes (recipe_date, title, content)
               VALUES (?, ?, ?)""",
            (recipe_date, title, content)
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def get_saved_recipes(recipe_date: str = None, limit: int = 10) -> list[dict]:
    """获取保存的食谱"""
    db = await get_db()
    try:
        if recipe_date:
            cursor = await db.execute(
                """SELECT * FROM saved_recipes
                   WHERE recipe_date = ?
                   ORDER BY created_at DESC LIMIT ?""",
                (recipe_date, limit)
            )
        else:
            cursor = await db.execute(
                """SELECT * FROM saved_recipes
                   ORDER BY created_at DESC LIMIT ?""",
                (limit,)
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_today_recipe() -> Optional[dict]:
    """获取今天的食谱（如果已保存）"""
    today = date.today().isoformat()
    recipes = await get_saved_recipes(recipe_date=today, limit=1)
    return recipes[0] if recipes else None


async def delete_recipe(recipe_id: int):
    """删除食谱"""
    db = await get_db()
    try:
        await db.execute("DELETE FROM saved_recipes WHERE id = ?", (recipe_id,))
        await db.commit()
    finally:
        await db.close()


async def delete_last_meal(meal_date: str = None):
    """删除最近的一条饮食记录"""
    if not meal_date:
        meal_date = date.today().isoformat()
    db = await get_db()
    try:
        # 获取最近一条记录
        cursor = await db.execute(
            "SELECT id FROM meals WHERE meal_date = ? ORDER BY created_at DESC LIMIT 1",
            (meal_date,)
        )
        row = await cursor.fetchone()
        if row:
            await db.execute("DELETE FROM meals WHERE id = ?", (row[0],))
            await db.commit()
            return True
        return False
    finally:
        await db.close()


async def delete_meal_by_name(food_keyword: str, meal_date: str = None) -> tuple[bool, str]:
    """
    按食物名称删除最近一条匹配的记录。
    返回 (是否删除成功, 被删除的食物名称)
    """
    if not meal_date:
        meal_date = date.today().isoformat()
    db = await get_db()
    try:
        # 模糊匹配：包含关键词即可
        cursor = await db.execute(
            """SELECT id, food_name FROM meals
               WHERE meal_date = ? AND food_name LIKE ?
               ORDER BY created_at DESC LIMIT 1""",
            (meal_date, f"%{food_keyword}%")
        )
        row = await cursor.fetchone()
        if row:
            deleted_name = row[1]
            await db.execute("DELETE FROM meals WHERE id = ?", (row[0],))
            await db.commit()
            return True, deleted_name
        return False, ""
    finally:
        await db.close()


async def delete_last_exercise(exercise_date: str = None):
    """删除最近的一条运动记录"""
    if not exercise_date:
        exercise_date = date.today().isoformat()
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM exercises WHERE exercise_date = ? ORDER BY created_at DESC LIMIT 1",
            (exercise_date,)
        )
        row = await cursor.fetchone()
        if row:
            await db.execute("DELETE FROM exercises WHERE id = ?", (row[0],))
            await db.commit()
            return True
        return False
    finally:
        await db.close()


async def delete_last_blood_sugar(measure_date: str = None):
    """删除最近的一条血糖记录"""
    if not measure_date:
        measure_date = date.today().isoformat()
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM blood_sugar WHERE measure_date = ? ORDER BY created_at DESC LIMIT 1",
            (measure_date,)
        )
        row = await cursor.fetchone()
        if row:
            await db.execute("DELETE FROM blood_sugar WHERE id = ?", (row[0],))
            await db.commit()
            return True
        return False
    finally:
        await db.close()


# ============================================================
# 按 ID 删除记录（用于前端手动删除）
# ============================================================

async def delete_meal_by_id(meal_id: int) -> bool:
    """按 ID 删除饮食记录"""
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM meals WHERE id = ?", (meal_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def delete_exercise_by_id(exercise_id: int) -> bool:
    """按 ID 删除运动记录"""
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM exercises WHERE id = ?", (exercise_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def delete_blood_sugar_by_id(record_id: int) -> bool:
    """按 ID 删除血糖记录"""
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM blood_sugar WHERE id = ?", (record_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def get_today_records():
    """获取今日所有记录（用于智能删除）"""
    today = date.today().isoformat()
    db = await get_db()
    try:
        # 获取今日饮食
        meals_cursor = await db.execute(
            "SELECT id, meal_type, food_name, created_at FROM meals WHERE meal_date = ? ORDER BY created_at DESC",
            (today,)
        )
        meals = [dict(row) for row in await meals_cursor.fetchall()]

        # 获取今日运动
        exercises_cursor = await db.execute(
            "SELECT id, exercise_type, duration_min, created_at FROM exercises WHERE exercise_date = ? ORDER BY created_at DESC",
            (today,)
        )
        exercises = [dict(row) for row in await exercises_cursor.fetchall()]

        # 获取今日血糖
        bs_cursor = await db.execute(
            "SELECT id, value, timing, created_at FROM blood_sugar WHERE measure_date = ? ORDER BY created_at DESC",
            (today,)
        )
        blood_sugars = [dict(row) for row in await bs_cursor.fetchall()]

        return {
            "meals": meals,
            "exercises": exercises,
            "blood_sugars": blood_sugars
        }
    finally:
        await db.close()
