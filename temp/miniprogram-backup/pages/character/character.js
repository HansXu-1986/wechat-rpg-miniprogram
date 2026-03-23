// character.js - 角色管理
const app = getApp()

Page({
  data: {
    characters: []
  },

  onLoad() {
    this.loadCharacters()
  },

  onShow() {
    this.loadCharacters()
  },

  loadCharacters() {
    const gameData = app.globalData.gameData
    this.setData({
      characters: gameData.player.characters
    })
  },

  getHpPercent(item) {
    return (item.hp / item.maxHp) * 100
  },

  addRandomCharacter() {
    const gameData = app.globalData.gameData
    
    if (gameData.player.characters.length >= 6) {
      wx.showModal({
        title: '提示',
        content: '最多只能上阵6名角色',
        showCancel: false
      })
      return
    }
    
    // 花费金币招募
    if (gameData.player.gold < 500) {
      wx.showModal({
        title: '提示',
        content: '金币不足，招募需要500金币',
        showCancel: false
      })
      return
    }
    
    gameData.player.gold -= 500
    
    // 随机职业
    const classes = ['infantry', 'cavalry', 'archer', 'flier', 'mage', 'healer']
    const randomClass = classes[Math.floor(Math.random() * classes.length)]
    const classData = app.globalData.data.classes[randomClass]
    
    // 随机名字
    const firstNames = ['艾', '兰', '卡', '莉', '罗', '马', '克', '杰', '安', '尼']
    const lastNames = ['伦', '斯', '娜', '德', '克', '尔', '特', '莎', '恩', '菲']
    const name = firstNames[Math.floor(Math.random() * firstNames.length)] + 
                 lastNames[Math.floor(Math.random() * lastNames.length)]
    
    const newChar = {
      id: 'char_' + Date.now(),
      name: name,
      class: classData.name,
      className: randomClass,
      level: 1,
      exp: 0,
      hp: classData.hp,
      maxHp: classData.hp,
      atk: classData.atk,
      def: classData.def,
      mov: classData.mov,
      range: classData.range || 1
    }
    
    gameData.player.characters.push(newChar)
    app.globalData.gameData = gameData
    app.saveGameData()
    
    this.loadCharacters()
    
    wx.showToast({
      title: `招募成功: ${name}`,
      icon: 'success'
    })
  },

  canPromote(item) {
    // 检查是否已经转职过
    return !item.promoted
  },

  promote(e) {
    const id = e.currentTarget.dataset.id
    const gameData = app.globalData.gameData
    const char = gameData.player.characters.find(c => c.id === id)
    
    if (gameData.player.gold < 1000) {
      wx.showModal({
        title: '提示',
        content: '转职需要1000金币',
        showCancel: false
      })
      return
    }
    
    gameData.player.gold -= 1000
    
    // 转职全属性提升
    char.maxHp = Math.floor(char.maxHp * 1.5)
    char.hp = char.maxHp
    char.atk = Math.floor(char.atk * 1.4)
    char.def = Math.floor(char.def * 1.3)
    char.promoted = true
    char.class = '精英' + char.class
    
    app.globalData.gameData = gameData
    app.saveGameData()
    this.loadCharacters()
    
    wx.showToast({
      title: '转职成功!',
      icon: 'success'
    })
  },

  removeCharacter(e) {
    const id = e.currentTarget.dataset.id
    const gameData = app.globalData.gameData
    
    wx.showModal({
      title: '确认离队',
      content: '离队后角色信息会丢失，无法恢复，确定吗？',
      success: (res) => {
        if (res.confirm) {
          gameData.player.characters = gameData.player.characters.filter(c => c.id !== id)
          app.globalData.gameData = gameData
          app.saveGameData()
          this.loadCharacters()
        }
      }
    })
  }
})
