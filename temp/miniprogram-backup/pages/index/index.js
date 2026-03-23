// index.js
const app = getApp()

Page({
  data: {
    gameData: null,
    nextLevelExp: 0,
    expPercent: 0
  },

  onLoad() {
    this.loadGameData()
  },

  onShow() {
    this.loadGameData()
  },

  loadGameData() {
    const gameData = app.globalData.gameData
    const nextLevelExp = this.calculateExp(gameData.player.level + 1)
    const expPercent = Math.floor((gameData.player.exp / nextLevelExp) * 100)
    
    this.setData({
      gameData,
      nextLevelExp,
      expPercent
    })
  },

  calculateExp(level) {
    return level * 100 + (level - 1) * (level - 1) * 10
  },

  startBattle() {
    if (this.data.gameData.player.characters.length === 0) {
      wx.showModal({
        title: '提示',
        content: '请先添加角色',
        showCancel: false
      })
      return
    }
    wx.navigateTo({
      url: '/pages/battle/battle'
    })
  },

  goToCharacters() {
    wx.navigateTo({
      url: '/pages/character/character'
    })
  },

  goToMap() {
    wx.navigateTo({
      url: '/pages/map/map'
    })
  },

  goToEquipment() {
    wx.navigateTo({
      url: '/pages/equipment/equipment'
    })
  }
})
