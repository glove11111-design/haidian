# 口袋记忆

iPhone 私人灵感收件箱 v1。文字 / 图 / 视频 / 音频 / 链接五种捕捉平权；入库按内容归类；本机立刻收下，云在后台同步。

## 运行

`package.json` 在 **pocket-memory/** 里。在仓库根目录直接 `npx expo start` 会报 package.json does not exist。

仓库根目录：

```bash
npm start
# 或
npx expo start pocket-memory
```

进入应用目录：

```bash
cd pocket-memory
npm install
npm run web          # 浏览器演示
npx expo start       # iPhone 用 Expo Go 扫码
```

Web 演示在桌面浏览器里会套一层手机框。相册多选、录像在 Web 上走文件选择；真机用 Expo Go 走相机 / 麦克风。

## 结构

主导航只有 **库** / **找**。捕捉是浮层，五个入口等大，不是第三个 Tab。
