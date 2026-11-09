# 光的切片 · Light Slices

一个无标题、无声音的交互玻璃网页。移动鼠标或触摸屏幕改变光照；左下角切换狗狗霓虹和灯下鱼缸，右下角使用中英双语面板调节玻璃材质。

- 夹丝、磨砂、长虹与清玻璃四种材质
- 实时凹凸、磨砂、光照与流动参数
- 保存当前画面为 PNG
- 适配手机和桌面；鱼缸单独调整全屏构图

## 本地运行

使用 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

## 构建

```sh
npm run build
npm run preview
```

构建文件位于 `dist/`，可部署到支持静态网页的服务；已使用相对资源路径，兼容 GitHub Pages 的项目子目录。

## 技术与来源

Three.js、GLSL 和 Vite。玻璃效果基于 [Johnlzx/glass-garden](https://github.com/Johnlzx/glass-garden) 的代码改编，增加照片切换、中文与英文控制、独立照片取景等调整。

照片资源为此个人项目提供。

## GitHub Pages

已经生成 `docs/` 静态网页。在仓库 Settings → Pages 中选择 **Deploy from a branch → main → /docs**，保存后即可部署。

预期网址：`https://yuxuandu7-spec.github.io/light-slices/`（需要先启用 Pages）。

以后修改源码时，运行 `npm run build`，再用 `dist/` 内容更新 `docs/`。
