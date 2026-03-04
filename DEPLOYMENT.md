# EatSmart 服务器部署指南

## 问题诊断

### 当前错误

1. **后端端口被占用** (8000端口)
2. **前端缺少依赖包** (`react-swipeable`, `recharts`)
3. **前端缺少生产构建** (`.next` 目录不存在)

## 部署步骤

### 1. 停止所有进程并清理端口

```bash
# 停止所有 PM2 进程
pm2 stop all
pm2 delete all

# 查找占用 8000 端口的进程
lsof -i :8000
# 或
netstat -tulnp | grep :8000

# 如果有进程占用，杀掉它
kill -9 <PID>

# 强制杀掉所有 Python 进程（如果需要）
pkill -9 python3
```

### 2. 拉取最新代码

```bash
cd ~/EatSmart
git pull origin main
```

### 3. 安装前端依赖并构建

```bash
cd ~/EatSmart/frontend

# 安装所有依赖（包括新增的 react-swipeable 和 recharts）
npm install

# 确认关键依赖已安装
npm list react-swipeable recharts

# 构建生产版本
npm run build
```

**重要**: 这会生成 `.next` 目录，包含优化后的生产构建。

### 4. 使用 PM2 配置文件启动服务

```bash
cd ~/EatSmart

# 使用配置文件启动
pm2 start ecosystem.config.js

# 保存 PM2 进程列表
pm2 save

# 设置开机自启动（如果还没设置）
pm2 startup
```

### 5. 验证服务状态

```bash
# 查看进程状态
pm2 status

# 查看后端日志
pm2 logs eatsmart-backend --lines 50

# 查看前端日志
pm2 logs eatsmart-frontend --lines 50

# 测试后端 API
curl http://localhost:8000/

# 测试前端
curl http://localhost:3000/
```

## 故障排查

### 如果后端仍然端口冲突

```bash
# 强制杀掉所有 Python 进程
pkill -9 python3

# 或查找具体进程
ps aux | grep uvicorn
kill -9 <PID>
```

### 如果前端构建失败（缺少依赖）

```bash
cd ~/EatSmart/frontend

# 检查 package.json 是否包含所需依赖
cat package.json | grep -E "react-swipeable|recharts"

# 如果没有，手动安装
npm install react-swipeable recharts

# 清理缓存重新构建
rm -rf .next
npm run build
```

### 如果仍然有模块找不到错误

```bash
# 完全重新安装
cd ~/EatSmart/frontend
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### 如果 PM2 进程频繁重启

```bash
# 查看详细错误日志
pm2 logs eatsmart-backend --err --lines 100
pm2 logs eatsmart-frontend --err --lines 100
```

## 后续维护

### 每次代码更新后

```bash
cd ~/EatSmart
git pull origin main

# 如果前端有变化
cd frontend && npm install && npm run build && cd ..

# 重启服务
pm2 restart all
```

### 或使用 PM2 的 reload（零停机时间）

```bash
pm2 reload all
```

## PM2 常用命令

```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs
pm2 logs eatsmart-backend
pm2 logs eatsmart-frontend

# 重启服务
pm2 restart all
pm2 restart eatsmart-backend
pm2 restart eatsmart-frontend

# 停止服务
pm2 stop all

# 删除进程
pm2 delete all

# 监控
pm2 monit
```

## 预期结果

✅ 后端成功启动在 8000 端口
✅ 前端成功启动在 3000 端口
✅ PM2 显示两个进程都在运行（online 状态）
✅ 日志中没有错误信息
✅ 可以通过浏览器访问应用
