// 微信小游戏入口
// 这是微信小游戏标准写法

// 获取 canvas
const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')

// 获取系统信息
const { windowWidth, windowHeight } = wx.getSystemInfoSync()
const width = windowWidth
const height = windowHeight

console.log('Init game', { width, height })

// ========== 游戏逻辑引入 ==========
require('./js/game.js')

// 初始化开始
initCanvas(ctx, width, height)
startGame()
