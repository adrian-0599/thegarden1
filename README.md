# The Garden · 森林绿洲互动体验

高端餐饮空间互动 Web 应用 — 拍照、AI 风格化、问卷调研与纪念图保存。

## 功能

- **森林绿洲 UI**：深绿与自然大地色，Cormorant Garamond + 思源宋体
- **拍照交互**：居中取景框，支持前后摄像头切换
- **AI 风格化**：自动识别猫狗/人物/空画面，生成森林绿洲艺术图
- **问卷调研**：口味、最爱菜品、体验评分
- **结果合成**：The Garden 水印 + 问卷结果（右下角）
- **保存功能**：长按图片或点击「保存到相册」

## 快速启动

```bash
cd ~/Projects/the-garden
npm install
npm start
```

手机访问（需 HTTPS 才能调用摄像头）：

```
https://<你的局域网IP>:8443/
```

若已配置 `~/.garden-certs/`，服务会自动使用 SSL 证书。

## AI 配置（可选）

默认使用本地 Canvas 森林绿洲风格化处理，无需 API Key。

如需接入 OpenAI DALL·E 3：

```bash
export OPENAI_API_KEY=sk-...
npm start
```

## 项目结构

```
public/
  index.html          主页面
  css/styles.css      森林绿洲设计系统
  js/
    app.js            主流程
    detect.js         图像内容识别
    stylize.js        AI / 本地风格化
    composite.js      水印 + 问卷合成 + 下载
  assets/logo.svg     品牌水印
server/index.js       Express 服务 + AI API
```
