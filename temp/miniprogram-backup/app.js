// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 初始化游戏数据
    this.initGameData()
  },

  // 初始化游戏数据
  initGameData() {
    let gameData = wx.getStorageSync('gameData')
    if (!gameData) {
      gameData = {
        player: {
          name: '指挥官',
          level: 1,
          exp: 0,
          gold: 1000,
          characters: [],
          currentMap: 1
        }
      }
      wx.setStorageSync('gameData', gameData)
    }
    this.globalData.gameData = gameData
  },

  // 保存游戏数据
  saveGameData() {
    wx.setStorageSync('gameData', this.globalData.gameData)
  },

  globalData: {
    userInfo: null,
    gameData: null,
    // 游戏核心数据
    data: {
      // 角色职业数据
      classes: {
        infantry: { name: '步兵', hp: 100, atk: 15, def: 10, mov: 3 },
        cavalry: { name: '骑兵', hp: 120, atk: 20, def: 8, mov: 6 },
        archer: { name: '弓兵', hp: 80, atk: 25, def: 5, mov: 3, range: 2 },
        flier: { name: '飞兵', hp: 90, atk: 18, def: 7, mov: 7 },
        mage: { name: '法师', hp: 70, atk: 30, def: 4, mov: 3, range: 2 },
        healer: { name: '奶妈', hp: 75, atk: 10, def: 6, mov: 3 }
      },
      // 地形数据
      terrains: {
        plain: { name: '平原', defBonus: 0 },
        mountain: { name: '山地', defBonus: 30 },
        forest: { name: '森林', defBonus: 20 },
        river: { name: '河流', movCost: 2 },
        castle: { name: '城墙', defBonus: 40 }
      }
    }
  }
})
