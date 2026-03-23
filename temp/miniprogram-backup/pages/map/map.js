// map.js - 章节地图
const app = getApp()

Page({
  data: {
    chapters: [
      {
        id: 1,
        name: '初入战场',
        description: '这是你的第一场战斗，熟悉战棋规则，击败所有敌人吧！',
        enemyCount: 2,
        recommendLevel: 1,
        locked: false
      },
      {
        id: 2,
        name: '山贼巢穴',
        description: '山贼占据了村庄，快把他们赶出去！敌人数量更多，小心应对。',
        enemyCount: 3,
        recommendLevel: 2,
        locked: false
      },
      {
        id: 3,
        name: '要塞攻防',
        description: '敌方要塞防御坚固，利用地形和兵种克制突破防线',
        enemyCount: 4,
        recommendLevel: 3,
        locked: false
      },
      {
        id: 4,
        name: '暗黑森林',
        description: '森林地形复杂，敌人埋伏在暗处，提高警惕',
        enemyCount: 4,
        recommendLevel: 5,
        locked: true
      },
      {
        id: 5,
        name: '王城决战',
        description: '最终决战，击败魔王拯救王国',
        enemyCount: 5,
        recommendLevel: 10,
        locked: true
      }
    ],
    selectedChapter: null
  },

  onLoad() {
    const gameData = app.globalData.gameData
    this.unlockChapters(gameData.player.currentMap)
  },

  unlockChapters(currentMap) {
    const chapters = this.data.chapters
    chapters.forEach(c => {
      if (c.id <= currentMap + 1) {
        c.locked = false
      }
    })
    this.setData({
      chapters
    })
  },

  selectChapter(e) {
    const id = parseInt(e.currentTarget.dataset.id)
    const chapter = this.data.chapters.find(c => c.id === id)
    this.setData({
      selectedChapter: chapter
    })
  },

  startChapter() {
    if (this.data.selectedChapter.locked) {
      wx.showToast({
        title: '该章节尚未解锁',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/battle/battle'
    })
  }
})
