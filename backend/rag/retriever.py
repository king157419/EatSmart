"""
RAG 检索器 - 从向量数据库中检索相关知识并返回带来源的结果
"""

from typing import Optional
from pydantic import BaseModel
from rag.loader import build_vector_store


class RetrievedChunk(BaseModel):
    """检索到的知识片段"""
    content: str
    source_file: str
    relevance_score: float


class RAGResult(BaseModel):
    """RAG 检索结果"""
    chunks: list[RetrievedChunk]
    context_text: str  # 拼接好的上下文（注入到 prompt 中）


_vectorstore = None


def get_vectorstore():
    """懒加载向量数据库"""
    global _vectorstore
    if _vectorstore is None:
        _vectorstore = build_vector_store(force_rebuild=False)
    return _vectorstore


def retrieve(query: str, top_k: int = 3) -> RAGResult:
    """
    根据用户问题检索相关知识库内容。
    返回 top_k 个最相关的文档片段及来源。
    """
    vs = get_vectorstore()

    # 使用相似度搜索并返回分数
    results = vs.similarity_search_with_relevance_scores(query, k=top_k)

    chunks = []
    context_parts = []

    for doc, score in results:
        source_file = doc.metadata.get("source_file", "未知来源")
        chunk = RetrievedChunk(
            content=doc.page_content,
            source_file=source_file,
            relevance_score=round(score, 3),
        )
        chunks.append(chunk)
        context_parts.append(
            f"[来源: {source_file}]\n{doc.page_content}"
        )

    context_text = "\n\n---\n\n".join(context_parts) if context_parts else "未找到相关知识库内容。"

    return RAGResult(chunks=chunks, context_text=context_text)


def reload_vectorstore():
    """重新加载向量数据库（当知识库文件更新后调用）"""
    global _vectorstore
    _vectorstore = build_vector_store(force_rebuild=True)
