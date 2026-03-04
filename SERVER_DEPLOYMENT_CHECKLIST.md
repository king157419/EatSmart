# 服务器部署检查清单

## 📋 部署前准备

- [ ] 确认服务器已安装 Node.js (v18+)
- [ ] 确认服务器已安装 Python 3.8+
- [ ] 确认服务器已安装 PM2 (`npm install -g pm2`)
- [ ] 确认服务器已安装 Git
- [ ] 确认后端 `.env` 文件已配置 (DEEPSEEK_API_KEY)

## 🚀 部署步骤

### 第一步：清理现有进程

```bash
# 在服务器上执行
pm2 stop all
pm2 delete all

# 检查端口占用
lsof -i :8000
lsof -i :3000

# 如果有进程占用，杀掉它们
kill -9 <PID>

# 或强制杀掉所有相关进程
pkill -9 python3
pkill -9 node
```

- [ ] PM2 进程已全部停止
- [ ] 8000 端口已释放
- [ ] 3000 端口已释放

### 第二步：拉取最新代码

```bash
cd ~/EatSmart
git pull origin main
```

- [ ] 代码已更新到最新版本
- [ ] 确认看到 `ecosystem.config.js` 和 `DEPLOYMENT.md` 文件

### 第三步：安装前端依赖

```bash
cd ~/EatSmart/frontend

# 安装所有依赖
npm install

# 验证关键依赖
npm list react-swipeable recharts
```

- [ ] `npm install` 执行成功
- [ ] `react-swipeable` 已安装
- [ ] `recharts` 已安装
- [ ] 没有依赖错误

### 第四步：构建前端生产版本

```bash
cd ~/EatSmart/frontend
npm run build
```

- [ ] 构建成功（看到 "Compiled successfully"）
- [ ] `.next` 目录已生成
- [ ] 没有 TypeScript 错误

### 第五步：启动服务

```bash
cd ~/EatSmart
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 设置开机自启动
```

- [ ] PM2 启动成功
- [ ] 看到两个进程：`eatsmart-backend` 和 `eatsmart-frontend`

### 第六步：验证服务状态

```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs --lines 50
```

- [ ] `eatsmart-backend` 状态为 `online`
- [ ] `eatsmart-frontend` 状态为 `online`
- [ ] 后端日志显示 "Application startup complete"
- [ ] 前端日志显示 "ready started server on 0.0.0.0:3000"
- [ ] 没有错误日志

### 第七步：测试 API 端点

```bash
# 测试后端
curl http://localhost:8000/

# 测试前端
curl http://localhost:3000/

# 测试后端健康检查
curl http://localhost:8000/api/nutrition/today
```

- [ ] 后端返回 JSON 响应
- [ ] 前端返回 HTML 页面
- [ ] API 端点正常响应

### 第八步：浏览器测试

在浏览器中访问：`http://<服务器IP>:3000`

- [ ] 页面正常加载
- [ ] 可以发送聊天消息
- [ ] 营养面板显示正常
- [ ] 所有按钮功能正常
- [ ] 没有控制台错误

## ⚠️ 常见问题排查

### 问题 1：后端端口仍然被占用

```bash
# 查找占用进程
ps aux | grep uvicorn
ps aux | grep python

# 强制杀掉
kill -9 <PID>
```

### 问题 2：前端模块找不到

```bash
cd ~/EatSmart/frontend
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### 问题 3：PM2 进程频繁重启

```bash
# 查看详细错误日志
pm2 logs eatsmart-backend --err --lines 100
pm2 logs eatsmart-frontend --err --lines 100

# 检查后端 .env 文件
cat ~/EatSmart/backend/.env
```

### 问题 4：前端构建失败

```bash
# 检查 Node.js 版本
node --version  # 应该 >= 18

# 清理缓存
cd ~/EatSmart/frontend
rm -rf .next
npm cache clean --force
npm install
npm run build
```

## 📊 部署成功标志

✅ PM2 显示两个进程都是 `online` 状态
✅ 后端日志没有错误
✅ 前端日志没有错误
✅ 浏览器可以正常访问应用
✅ 所有功能正常工作

## 🔄 后续更新流程

每次代码更新后：

```bash
cd ~/EatSmart
git pull origin main

# 如果前端有变化
cd frontend
npm install
npm run build
cd ..

# 重启服务
pm2 restart all

# 或使用零停机重启
pm2 reload all
```

## 📝 维护命令

```bash
# 查看进程状态
pm2 status

# 查看实时日志
pm2 logs

# 查看特定进程日志
pm2 logs eatsmart-backend
pm2 logs eatsmart-frontend

# 重启服务
pm2 restart all

# 停止服务
pm2 stop all

# 监控资源使用
pm2 monit
```

## 🎯 完成确认

部署完成后，请在 `features.json` 中更新 F34：

```json
{
  "id": "F34",
  "name": "Server deployment configuration",
  "passes": 1,
  "notes": "Deployed successfully on <date>"
}
```
