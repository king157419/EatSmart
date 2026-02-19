"""
RAG 知识库加载器 - 将 Markdown 知识库文件向量化并存储到 ChromaDB
"""

import os
import glob
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

KNOWLEDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge")
CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db")


def get_embedding_function():
    """获取 Embedding 函数 - 使用 DeepSeek 兼容的 OpenAI 格式"""
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    # DeepSeek 暂不支持 embedding，使用其兼容的方式
    # 如果有 OpenAI Key 可以用 OpenAI embedding
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if openai_key:
        return OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=openai_key,
        )
    else:
        # 使用 ChromaDB 内置的免费 embedding（基于 sentence-transformers）
        return None  # ChromaDB 默认使用 all-MiniLM-L6-v2


def load_markdown_files() -> list:
    """加载 knowledge 目录下所有 Markdown 文件并切分"""
    all_docs = []
    md_files = glob.glob(os.path.join(KNOWLEDGE_DIR, "*.md"))

    # Markdown 标题切分器
    headers_to_split = [
        ("#", "主标题"),
        ("##", "章节"),
        ("###", "小节"),
    ]
    md_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split)

    # 二次切分（防止单个 chunk 过大）
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", "。", "，", " "],
    )

    for md_file in md_files:
        filename = os.path.basename(md_file)
        print(f"  加载: {filename}")

        with open(md_file, "r", encoding="utf-8") as f:
            content = f.read()

        # 先按标题切分
        md_docs = md_splitter.split_text(content)

        # 再按长度切分
        for doc in md_docs:
            sub_docs = text_splitter.split_documents([doc])
            for sub_doc in sub_docs:
                # 添加来源 metadata
                sub_doc.metadata["source_file"] = filename
                sub_doc.metadata["source_path"] = md_file
            all_docs.extend(sub_docs)

    print(f"  共加载 {len(all_docs)} 个文档片段")
    return all_docs


def build_vector_store(force_rebuild: bool = False) -> Chroma:
    """构建或加载向量数据库"""
    os.makedirs(CHROMA_DIR, exist_ok=True)

    embedding_fn = get_embedding_function()

    # 检查是否已有向量库
    if not force_rebuild and os.path.exists(os.path.join(CHROMA_DIR, "chroma.sqlite3")):
        print("加载已有向量数据库...")
        if embedding_fn:
            return Chroma(persist_directory=CHROMA_DIR, embedding_function=embedding_fn)
        else:
            return Chroma(persist_directory=CHROMA_DIR)

    print("构建向量数据库...")
    docs = load_markdown_files()

    if not docs:
        print("警告：没有找到知识库文件！")
        if embedding_fn:
            return Chroma(persist_directory=CHROMA_DIR, embedding_function=embedding_fn)
        else:
            return Chroma(persist_directory=CHROMA_DIR)

    if embedding_fn:
        vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=embedding_fn,
            persist_directory=CHROMA_DIR,
        )
    else:
        vectorstore = Chroma.from_documents(
            documents=docs,
            persist_directory=CHROMA_DIR,
        )

    print(f"向量数据库构建完成，共 {len(docs)} 个文档片段")
    return vectorstore


# 当直接运行此文件时，构建向量数据库
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
    build_vector_store(force_rebuild=True)
