// equipment.js - 装备系统
const app = getApp()

Page({
  data: {
    gameData: null,
    equipment: [],
    shopItems: []
  },

  onLoad() {
    this.refreshShop()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const gameData = app.globalData.gameData
    if (!gameData.player.equipment) {
      gameData.player.equipment = []
    }
    this.setData({
      gameData,
      equipment: gameData.player.equipment
    })
  },

  // 出售装备
  sellItem(e) {
    const id = e.currentTarget.dataset.id
    const eq = this.data.equipment.find(item => item.id === id)
    
    wx.showModal({
      title: '确认出售',
      content: `出售 ${eq.name} 获得 ${eq.price} 金币`,
      success: (res) => {
        if (res.confirm) {
          const gameData = app.globalData.gameData
          gameData.player.gold += eq.price
          gameData.player.equipment = gameData.player.equipment.filter(item => item.id !== id)
          app.globalData.gameData = gameData
          app.saveGameData()
          this.loadData()
          wx.showToast({ title: '出售成功', icon: 'success' })
        }
      }
    })
  },

  // 装备到角色（简化版）
  equipItem(e) {
    // 简化版：装备在背包里就生效，不用指定角色
    wx.showToast({ 
      title: '已装备，属性已生效', 
      icon: 'success' 
    })
  },

  // 刷新商店
  refreshShop() {
    const gameData = app.globalData.gameData
    
    if (gameData.player.gold < 50) {
      wx.showModal({
        title: '提示',
        content: '金币不足，刷新需要50金币',
        showCancel: false
      })
      return
    }
    
    gameData.player.gold -= 50
    
    // 随机生成3件装备
    const items = []
    for (let i = 0; i < 3; i++) {
      items.push(this.generateRandomEquipment())
    }
    
    this.setData({
      shopItems: items
    })
    
    app.globalData.gameData = gameData
    app.saveGameData()
    this.loadData()
  },

  // 购买装备
  buyItem(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.shopItems.find(i => i.id === id)
    const gameData = app.globalData.gameData
    
    if (gameData.player.gold < item.price) {
      wx.showToast({ title: '金币不足', icon: 'none' })
      return
    }
    
    gameData.player.gold -= item.price
    if (!gameData.player.equipment) {
      gameData.player.equipment = []
    }
    gameData.player.equipment.push({...item})
    app.globalData.gameData = gameData
    app.saveGameData()
    this.loadData()
    
    wx.showToast({ title: '购买成功', icon: 'success' })
  },

  // 生成随机装备
  generateRandomEquipment() {
    const types = ['武器', '铠甲', '头盔', '鞋子', '戒指']
    const rarities = [
      { name: 'common', rate: 0.5, bonus: 1 },
      { name: 'rare', rate: 0.3, bonus: 2 },
      { name: 'epic', rate: 0.15, bonus: 3 },
      { name: 'legendary', rate: 0.05, bonus: 5 }
    ]
    
    const prefixes = ['锋利的', '坚固的', '轻盈的', '古老的', '魔法的', '神圣的', '恶魔的']
    const baseNames = {
      武器: ['剑', '斧', '弓', '杖', '匕首'],
      铠甲: ['铠甲', '胸甲', '披风', '布甲'],
      头盔: ['头盔', '帽子', '皇冠'],
      鞋子: ['鞋子', '靴子', '护胫'],
      戒指: ['戒指', '项链', '护身符']
    }
    
    //  Roll rarity
    const roll = Math.random()
    let rarity = rarities[0]
    let acc = 0
    for (let r of rarities) {
      acc += r.rate
      if (roll <= acc) {
        rarity = r
        break
      }
    }
    
    const type = types[Math.floor(Math.random() * types.length)]
    const baseNameList = baseNames[type]
    const baseName = baseNameList[Math.floor(Math.random() * baseNameList.length)]
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const name = prefix + baseName
    
    const level = rarity.bonus * (1 + Math.floor(Math.random() * 3))
    let stats = {}
    if (type === '武器') {
      stats.atk = Math.floor(level * 2 + Math.random() * level)
    } else if (type === '铠甲' || type === '头盔') {
      stats.def = Math.floor(level * 1.5 + Math.random() * level)
    } else {
      stats.hp = Math.floor(level * 3 + Math.random() * level * 2)
    }
    
    const price = Math.floor(level * 30 + Math.random() * 50)
    
    return {
      id: 'eq_' + Date.now() + Math.floor(Math.random() * 1000),
      name,
      type,
      rarity: rarity.name,
      price,
      ...stats
    }
  }
})
