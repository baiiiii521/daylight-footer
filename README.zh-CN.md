# daylight-footer 使用说明（中文）

**作用：** 生成「插画随当地时间变化」的网站页脚或横幅。早上是日出，中午是晴空，傍晚是日落，夜里是星空和月光。日出日落时间按城市经纬度实时计算，手机端会自动重新排版。

## 安装
在 claude.ai 的文件卡片上点「Save skill」，或把 `daylight-footer/` 文件夹放进项目的 `.claude/skills/` 目录。之后直接跟 Claude 说需求即可，不需要提 skill 的名字，例如：
- 「给 Auraphil 官网做一个随时间变化的页脚，城市用曼谷，Dreamcore 风格」
- 「把日出日落页脚接入我们的 Next.js 项目」
- 「做一个山湖场景的横幅，上海时间」

## 包含的文件
| 文件 | 用途 |
|---|---|
| `assets/daylight-scene.js` | 核心引擎（约 14 KB gzip，无依赖）：日出日落计算、配色、绘制、手机重排 |
| `assets/presets/lake.js` | 「山湖」场景预设（默认场景是「海岸」） |
| `assets/footer-template.html` | 正式上线用的页脚模板，需要修改的地方都标了 `EDIT:` |
| `scripts/preview.js` | 自动截图 4 个时刻 × 电脑/手机，并检查报错、横向溢出和画布空白 |
| `scripts/inline_engine.py` | 把引擎内联成单个 HTML 文件，用于 artifact 或 CMS |
| `references/*.md` | 框架接入、配色、自定义场景、AI 关键帧方案（提示词有中英对照） |

## 常用参数
```js
DaylightScene.create(el, {
  city: 'hcm',          // hcm 胡志明市 / hanoi 河内 / bkk 曼谷 / sha 上海 / bj 北京 / szx 深圳 / gz 广州 / hk 香港 / sg 新加坡 / 'viewer' 访客本地时间
  preset: 'coast',      // 'coast' 海岸 / 'lake' 山湖
  palette: 'painterly', // 'painterly' 水粉 / 'dreamcore' 梦核粉紫 / 'vintage' 复古胶片
  grain: true,          // 胶片颗粒
});
```
在浏览器控制台运行 `DaylightScene.instances[0].setHour(18)`，可以预览任意时刻。

## 选型建议
- **默认用代码绘制**：体积小、变化连续、换品牌只需几分钟，适合官网和对加载速度敏感的落地页。
- **需要精细插画时用 AI 关键帧**（见 `references/ai-keyframes.md`）：总体积约 0.6–1.8 MB，适合品牌活动页和主视觉。
- 想用数据验证效果：对页脚 CTA 做 A/B 测试，预先定好门槛，例如点击率提升 5%。达不到门槛，就把它定位为品牌体验，而不是转化工具。
