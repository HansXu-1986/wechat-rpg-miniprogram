# 微信小程序 - 战棋RPG游戏

梦幻模拟战风格的战棋回合制RPG微信小程序游戏。

## 功能特性

- 🎮 **完整战棋战斗系统** - 网格地图、单位移动、攻击、技能施放
- 👤 **角色培养系统** - 属性加点、装备更换、经验升级
- 🗺️ **多关卡地图** - 支持多张地图关卡选择
- 🎒 **装备系统** - 武器、防具、饰品等装备类型
- 💾 **云存档** - 使用微信云开发保存游戏进度

## 技术栈

- 微信小程序原生开发
- 微信云开发（云函数 + 数据库）
- 纯 JavaScript 实现战棋逻辑

## CI/CD 自动部署

本项目使用微信云开发 CI/CD 自动部署，推送到 `main` 分支后自动构建上传到微信小程序。

### 配置步骤

1. 在 [微信云开发控制台](https://console.cloud.tencent.com/weav) 创建云开发环境
2. 进入「持续集成」-> 关联 GitHub 仓库 `HansXu-1986/wechat-rpg-miniprogram`
3. 微信云开发会自动读取 `cloudbuild.yml` 配置进行部署
4. 构建完成后，登录 [微信公众平台](https://mp.weixin.qq.com/) 提交审核即可

## 本地开发

如果你需要本地开发：

```bash
git clone https://github.com/HansXu-1986/wechat-rpg-miniprogram.git
```

用微信开发者工具打开项目目录即可。

## 项目结构

```
├── cloudfunctions/       # 云函数
│   └── saveGame/        # 保存游戏存档云函数
├── miniprogram/         # 小程序前端代码
│   ├── pages/
│   │   ├── index/      # 首页
│   │   ├── battle/     # 战场战斗
│   │   ├── character/  # 角色属性
│   │   ├── map/        # 地图选择
│   │   └── equipment/  # 装备管理
│   ├── app.js          # 入口文件
│   ├── app.json        # 全局配置
│   └── app.wxss        # 全局样式
├── cloudbuild.yml      # CI/CD 配置
├── project.config.json # 项目配置
└── README.md           # 说明文档
```

## 游戏玩法

1. 选择地图关卡进入战场
2. 回合制移动你的单位到目标位置
3. 攻击敌方单位，击败所有敌人获胜
4. 战斗胜利后获得经验和奖励
5. 升级角色属性，更换更强装备
6. 挑战更多关卡

## 反馈与建议

欢迎在 [Issues](https://github.com/HansXu-1986/wechat-rpg-miniprogram/issues) 反馈问题或提建议。

## 许可证

MIT License
