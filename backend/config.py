"""
EatSmart 配置管理 — 所有配置集中在这里
"""

import os
from dotenv import load_dotenv

# 加载 .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class Config:
    """应用配置"""
    # DeepSeek API
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # 数据库路径
    DB_PATH: str = os.path.join(os.path.dirname(__file__), "data", "memory.db")

    # ChromaDB 路径
    CHROMA_DIR: str = os.path.join(os.path.dirname(__file__), "data", "chroma_db")

    # 知识库目录
    KNOWLEDGE_DIR: str = os.path.join(os.path.dirname(__file__), "knowledge")

    # 默认营养目标
    DEFAULT_CALORIES: float = 1800
    DEFAULT_FAT: float = 30        # 胰腺炎患者硬限制
    DEFAULT_CARBS: float = 200
    DEFAULT_PROTEIN: float = 60
    DEFAULT_FIBER: float = 25

    # 服务器
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = ["*"]  # 生产环境要限制


config = Config()
