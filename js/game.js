// 战棋RPG游戏核心 - 微信小游戏版本

// 全局变量，由入口初始化
let ctx = null
let width = 0
let height = 0
let currentScene = 'index' // index, map, character, equipment, battle

// 游戏数据
const gameData = {
  player: {
    level: 1,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    exp: 0,
    nextExp: 100,
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    }
  },
  currentMap: 0,
  maps: [
    { id: 0, name: '第一关 - 初入战场', unlocked: true, completed: false },
    { id: 1, name: '第二关 - 森林伏击', unlocked: false, completed: false },
    { id: 2, name: '第三关 - 城堡攻坚战', unlocked: false, completed: false }
  ]
}

// 战场数据
const battleData = {
  gridSize: 40,
  mapWidth: 10,
  mapHeight: 8,
  units: [],
  currentTurn: 'player',
  selectedUnit: null,
  moving: false
}

// 对外暴露初始化
function initCanvas(c, w, h) {
  ctx = c
  width = w
  height = h
  
  console.log('游戏核心初始化', { width, height })
  
  // 增加 roundRect 兼容性
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
      if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius}
      }
      this.moveTo(x + radius.tl, y)
      this.lineTo(x + width - radius.tr, y)
      this.quadraticCurveTo(x + width, y, x + width, y + radius.tr)
      this.lineTo(x + width, y + height - radius.br)
      this.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height)
      this.lineTo(x + radius.bl, y + height)
      this.quadraticCurveTo(x, y + height, x, y + height - radius.bl)
      this.lineTo(x, y + radius.tl)
      this.quadraticCurveTo(x, y, x + radius.tl, y)
      this.closePath()
    }
  }
}

function startGame() {
  // 首次绘制
  gameLoop()
  
  // 绑定触摸事件 - canvas已经在入口获取了
  const canvas = ctx.canvas
  canvas.addEventListener('touchstart', onTouchStart)
  canvas.addEventListener('touchend', onTouchEnd)
}

// 游戏循环
function gameLoop() {
  // 清空画布
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, width, height)
  
  // 根据当前场景绘制
  switch (currentScene) {
    case 'index':
      drawIndex()
      break
    case 'map':
      drawMap()
      break
    case 'character':
      drawCharacter()
      break
    case 'equipment':
      drawEquipment()
      break
    case 'battle':
      drawBattle()
      break
  }
  
  requestAnimationFrame(gameLoop)
}

// 触摸事件处理
function onTouchStart(e) {
  const touch = e.touches[0]
  const x = touch.clientX
  const y = touch.clientY
  
  // 根据当前场景处理点击
  switch (currentScene) {
    case 'index':
      handleIndexClick(x, y)
      break
    case 'map':
      handleMapClick(x, y)
      break
    case 'character':
      handleCharacterClick(x, y)
      break
    case 'equipment':
      handleEquipmentClick(x, y)
      break
    case 'battle':
      handleBattleClick(x, y)
      break
  }
}

function onTouchEnd(e) {
  // 可按需实现
}

// 场景切换
function enterScene(scene) {
  currentScene = scene
  console.log('切换场景:', scene)
  if (scene === 'battle') {
    initBattle()
  }
}

// ========== 首页绘制 ==========
function drawIndex() {
  // 标题
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('梦幻战棋RPG', width / 2, height / 3)
  
  // 副标题
  ctx.font = '16px sans-serif'
  ctx.fillText('回合制策略角色扮演游戏', width / 2, height / 3 + 50)
  
  // 开始按钮
  drawButton('开始游戏', width / 2, height / 2, 200, 60, '#4a90e2')
  
  // 版本信息
  ctx.fillStyle = '#888888'
  ctx.font = '12px sans-serif'
  ctx.fillText('v1.0.2', width / 2, height - 30)
}

function handleIndexClick(x, y) {
  // 检查是否点击了开始按钮
  const buttonX = width / 2 - 100
  const buttonY = height / 2 - 30
  const buttonW = 200
  const buttonH = 60
  
  if (x >= buttonX && x <= buttonX + buttonW &&
      y >= buttonY && y <= buttonY + buttonH) {
    enterScene('map')
  }
}

// ========== 地图选择绘制 ==========
function drawMap() {
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('选择关卡', width / 2, 40)
  
  // 绘制地图列表
  let startY = 100
  gameData.maps.forEach((map, index) => {
    const y = startY + index * 80
    let buttonColor = map.unlocked ? '#4a90e2' : '#666666'
    
    drawButton(map.name, width / 2, y, 250, 60, buttonColor)
  })
  
  // 返回按钮
  drawButton('返回', 80, height - 50, 120, 50, '#888888')
}

function handleMapClick(x, y) {
  // 返回按钮
  const backX = 20
  const backY = height - 75
  const backW = 120
  const backH = 50
  if (x >= backX && x <= backX + backW &&
      y >= backY && y <= backY + backH) {
    enterScene('index')
    return
  }
  
  // 检查关卡点击
  let startY = 100
  gameData.maps.forEach((map, index) => {
    const cy = startY + index * 80
    const buttonX = width / 2 - 125
    const buttonY = cy - 30
    const buttonW = 250
    const buttonH = 60
    
    if (x >= buttonX && x <= buttonX + buttonW &&
        y >= buttonY && y <= buttonY + buttonH &&
        map.unlocked) {
      gameData.currentMap = map.id
      enterScene('battle')
    }
  })
}

// ========== 角色信息绘制 ==========
function drawCharacter() {
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('角色信息', width / 2, 40)
  
  const p = gameData.player
  ctx.font = '18px sans-serif'
  ctx.textAlign = 'left'
  
  let y = 100
  ctx.fillText(`等级: Lv.${p.level}`, 40, y += 30)
  ctx.fillText(`生命: ${p.hp}/${p.maxHp}`, 40, y += 30)
  ctx.fillText(`攻击: ${p.attack}`, 40, y += 30)
  ctx.fillText(`防御: ${p.defense}`, 40, y += 30)
  ctx.fillText(`经验: ${p.exp}/${p.nextExp}`, 40, y += 30)
  
  // 返回按钮
  ctx.textAlign = 'center'
  drawButton('返回地图', width / 2, height - 60, 150, 50, '#888888')
}

function handleCharacterClick(x, y) {
  const buttonX = width / 2 - 75
  const buttonY = height - 85
  const buttonW = 150
  const buttonH = 50
  
  if (x >= buttonX && x <= buttonX + buttonW &&
      y >= buttonY && y <= buttonY + buttonH) {
    enterScene('map')
  }
}

// ========== 装备绘制 ==========
function drawEquipment() {
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('装备管理', width / 2, 40)
  
  const eq = gameData.player.equipment
  
  ctx.font = '16px sans-serif'
  ctx.textAlign = 'left'
  let y = 100
  
  drawEquipmentSlot('武器', eq.weapon, 40, y += 50)
  drawEquipmentSlot('护甲', eq.armor, 40, y += 60)
  drawEquipmentSlot('饰品', eq.accessory, 40, y += 60)
  
  // 返回按钮
  ctx.textAlign = 'center'
  drawButton('返回', width / 2, height - 60, 150, 50, '#888888')
}

function drawEquipmentSlot(name, item, x, y) {
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`${name}: `, x, y)
  if (item) {
    ctx.fillStyle = '#4a90e2'
    ctx.fillText(item.name, x + 60, y)
  } else {
    ctx.fillStyle = '#888'
    ctx.fillText('空', x + 60, y)
  }
}

function handleEquipmentClick(x, y) {
  const buttonX = width / 2 - 75
  const buttonY = height - 85
  const buttonW = 150
  const buttonH = 50
  
  if (x >= buttonX && x <= buttonX + buttonW &&
      y >= buttonY && y <= buttonY + buttonH) {
    enterScene('map')
  }
}

// ========== 战场绘制 ==========
function drawBattle() {
  ctx.fillStyle = '#2a2a3e'
  ctx.fillRect(0, 0, width, height)
  
  // 绘制网格
  const gs = battleData.gridSize
  const startX = 20
  const startY = 60
  
  for (let x = 0; x < battleData.mapWidth; x++) {
    for (let y = 0; y < battleData.mapHeight; y++) {
      ctx.strokeStyle = '#444'
      ctx.strokeRect(startX + x * gs, startY + y * gs, gs, gs)
    }
  }
  
  // 绘制单位
  battleData.units.forEach(unit => {
    const px = startX + unit.x * gs
    const py = startY + unit.y * gs
    
    if (unit.team === 'player') {
      ctx.fillStyle = '#4a90e2'
    } else {
      ctx.fillStyle = '#e74c3c'
    }
    
    ctx.fillRect(px + 2, py + 2, gs - 4, gs - 4)
    
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(unit.name[0], px + gs/2, py + gs/2 + 4)
  })
  
  // 回合信息
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${battleData.currentTurn === 'player' ? '我方' : '敌方'}回合`, 20, 30)
  
  // 返回按钮
  drawButton('退出', width - 80, height - 40, 100, 40, '#888888')
}

function handleBattleClick(x, y) {
  // 退出按钮
  const buttonX = width - 130
  const buttonY = height - 60
  const buttonW = 100
  const buttonH = 40
  
  if (x >= buttonX && x <= buttonX + buttonW &&
      y >= buttonY && y <= buttonY + buttonH) {
    enterScene('map')
    return
  }
}

// ========== 工具函数 ==========
function drawButton(text, cx, cy, w, h, color) {
  const x = cx - w / 2
  const y = cy - h / 2
  
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 8)
  ctx.fill()
  
  ctx.fillStyle = '#ffffff'
  ctx.font = '16px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, cx, cy + 6)
}

// 初始化战场 - 示例单位
function initBattle() {
  battleData.units = [
    { id: 1, name: '玩家', team: 'player', x: 2, y: 3, hp: 100, maxHp: 100, attack: 10 },
    { id: 2, name: '敌人', team: 'enemy', x: 7, y: 3, hp: 50, maxHp: 50, attack: 8 }
  ]
  battleData.currentTurn = 'player'
}

// 导出接口
module.exports = {
  initCanvas,
  startGame
}
