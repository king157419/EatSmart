"""
DeepSeek API 客户端 - 使用 http.client（绕过 requests 库的问题）
"""

import json
import http.client
import ssl
import time
from config import config

# 最后一次 API 调用的时间
_last_call_time = 0
_MIN_INTERVAL = 1.0  # 最小调用间隔（秒）


def call_deepseek_api(
    messages: list[dict],
    model: str = "deepseek-chat",
    temperature: float = 0.7,
    max_tokens: int = 1500,
    tools: list[dict] | None = None,
    tool_choice: str = "auto",
    max_retries: int = 3,
) -> dict:
    """
    使用 http.client 调用 DeepSeek API（带重试）
    """
    global _last_call_time

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = tool_choice

    headers = {
        "Authorization": f"Bearer {config.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    last_error = None
    for attempt in range(max_retries):
        # 速率限制
        elapsed = time.time() - _last_call_time
        if elapsed < _MIN_INTERVAL:
            wait_time = _MIN_INTERVAL - elapsed
            time.sleep(wait_time)
        _last_call_time = time.time()

        # 创建 SSL 上下文
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        ssl_context.load_default_certs()

        conn = http.client.HTTPSConnection(
            "api.deepseek.com",
            context=ssl_context,
            timeout=90
        )

        try:
            conn.request("POST", "/chat/completions", json.dumps(payload), headers)
            response = conn.getresponse()
            data = response.read()
            return json.loads(data)
        except (ssl.SSLError, ConnectionError, http.client.HTTPException) as e:
            last_error = e
            print(f"[WARN] API call failed (attempt {attempt + 1}/{max_retries}): {e}")
            time.sleep(2)  # 等待后重试
        finally:
            conn.close()

    # 所有重试都失败，返回空响应
    print(f"[ERROR] API call failed after {max_retries} attempts: {last_error}")
    return {"choices": [{"message": {"content": "", "role": "assistant"}}], "error": str(last_error)}


def stream_deepseek_api(
    messages: list[dict],
    model: str = "deepseek-chat",
    temperature: float = 0.7,
    max_tokens: int = 1500,
):
    """
    使用 http.client 流式调用 DeepSeek API
    """
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }

    # 创建全新的 SSL 上下文，避免被其他模块污染
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = True
    ssl_context.verify_mode = ssl.CERT_REQUIRED
    ssl_context.load_default_certs()
    conn = http.client.HTTPSConnection(
        "api.deepseek.com",
        context=ssl_context,
        timeout=90
    )

    headers = {
        "Authorization": f"Bearer {config.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        conn.request("POST", "/chat/completions", json.dumps(payload), headers)
        response = conn.getresponse()

        # 使用字节缓冲区，避免 UTF-8 多字节字符截断问题
        byte_buffer = b""
        text_buffer = ""

        while True:
            chunk = response.read(1024)
            if not chunk:
                break

            byte_buffer += chunk
            # 尝试解码，忽略末尾可能的不完整字节
            try:
                decoded = byte_buffer.decode('utf-8')
                byte_buffer = b""  # 成功解码，清空字节缓冲
            except UnicodeDecodeError:
                # 可能是不完整的多字节字符，保留最后一个字节
                decoded = byte_buffer[:-1].decode('utf-8', errors='ignore')
                byte_buffer = byte_buffer[-1:]

            text_buffer += decoded
            while '\n' in text_buffer:
                line, text_buffer = text_buffer.split('\n', 1)
                line = line.strip()
                if line.startswith('data: '):
                    data = line[6:]
                    if data == '[DONE]':
                        return
                    try:
                        yield json.loads(data)
                    except json.JSONDecodeError:
                        continue
    finally:
        conn.close()


# 为了保持向后兼容
class DeepSeekClient:
    """兼容旧代码的客户端类"""

    def chat_completion(self, *args, **kwargs) -> dict:
        return call_deepseek_api(*args, **kwargs)

    def stream_completion(self, *args, **kwargs):
        return stream_deepseek_api(*args, **kwargs)


def get_deepseek_client() -> DeepSeekClient:
    """获取客户端实例"""
    return DeepSeekClient()
