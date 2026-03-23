// battle.js - 战棋战斗核心逻辑
const app = getApp()

Page({
  data: {
    gridSize: 40, // 格子大小，单位px
    map: [], // 战场网格
    mapWidth: 10,
    mapHeight: 8,
    turn: 1,
    currentTeam: 'player',
    selectedUnit: null,
    selectedX: -1,
    selectedY: -1,
    mode: 'select', // select|move|attack
    killCount: 0,
    totalEnemies: 0,
    showResult: false,
    resultTitle: '',
    resultRewards: [],
    canMove: false,
    canAttack: false,
    canWait: false
  },

  onLoad() {
    this.initBattle()
  },

  // 初始化战斗
  initBattle() {
    const gameData = app.globalData.gameData
    // 创建地图
    this.generateMap()
    // 放置我方单位
    this.placePlayerUnits(gameData.player.characters)
    // 放置敌方单位
    this.placeEnemyUnits()
    // 计数
    const enemies = this.countEnemies()
    this.setData({
      totalEnemies: enemies
    })
    this.updateButtons()
  },

  // 生成随机地图
  generateMap() {
    const width = 10
    const height = 8
    let map = []
    
    const terrains = ['plain', 'plain', 'plain', 'mountain', 'forest', 'river']
    for (let y = 0; y < height; y++) {
      map[y] = []
      for (let x = 0; x < width; x++) {
        const terrain = terrains[Math.floor(Math.random() * terrains.length)]
        map[y][x] = {
          x, y, terrain,
          unit: null,
          highlight: false
        }
      }
    }
    
    // 边缘留一些平原给部署
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        map[y][x].terrain = 'plain'
      }
    }
    for (let y = height - 2; y < height; y++) {
      for (let x = width - 3; x < width; x++) {
        map[y][x].terrain = 'plain'
      }
    }
    
    this.setData({
      map,
      mapWidth: width,
      mapHeight: height
    })
  },

  // 放置我方单位
  placePlayerUnits(characters) {
    let count = 0
    characters.forEach(char => {
      const x = count % 3
      const y = Math.floor(count / 3)
      if (this.data.map[y] && this.data.map[y][x]) {
        this.data.map[y][x].unit = {
          ...char,
          currentHp: char.hp,
          team: 'player',
          moved: false,
          attacked: false,
          cooldown: 0
        }
      }
      count++
    })
    this.setData({
      map: this.data.map
    })
  },

  // 放置敌方单位
  placeEnemyUnits() {
    const enemies = [
      { name: '骷髅兵', className: 'infantry', hp: 80, atk: 12, def: 8 },
      { name: '兽人', className: 'infantry', hp: 100, atk: 15, def: 10 },
      { name: '狼骑兵', className: 'cavalry', hp: 90, atk: 18, def: 6 },
      { name: '弓手', className: 'archer', hp: 60, atk: 20, def: 4 },
    ]
    
    const width = this.data.mapWidth
    const height = this.data.mapHeight
    let count = 0
    
    enemies.forEach(enemy => {
      const appData = app.globalData.data.classes[enemy.className]
      const x = width - 1 - (count % 3)
      const y = height - 1 - Math.floor(count / 3)
      
      if (this.data.map[y] && this.data.map[y][x]) {
        this.data.map[y][x].unit = {
          id: 'enemy_' + count,
          name: enemy.name,
          class: appData.name,
          className: enemy.className,
          hp: enemy.hp,
          maxHp: enemy.hp,
          atk: enemy.atk + appData.atk,
          def: enemy.def + appData.def,
          mov: appData.mov,
          range: appData.range || 1,
          team: 'enemy',
          moved: false,
          attacked: false,
          cooldown: 0,
          level: this.data.turn
        }
        count++
      }
    })
    
    this.setData({
      map: this.data.map
    })
  },

  // 统计敌人数量
  countEnemies() {
    let count = 0
    this.data.map.forEach(row => {
      row.forEach(cell => {
        if (cell.unit && cell.unit.team === 'enemy') {
          count++
        }
      })
    })
    return count
  },

  // 获取单位颜色
  getUnitColor(e) {
    return e.team === 'player' ? '#4facfe' : '#f5576c'
  },

  // 格子点击
  cellTap(e) {
    const x = parseInt(e.currentTarget.dataset.x)
    const y = parseInt(e.currentTarget.dataset.y)
    const cell = this.data.map[y][x]
    
    switch(this.data.mode) {
      case 'select':
        this.selectCell(x, y, cell)
        break
      case 'move':
        this.tryMove(x, y)
        break
      case 'attack':
        this.tryAttack(x, y)
        break
    }
  },

  // 选择格子
  selectCell(x, y, cell) {
    // 清除之前高亮
    this.clearHighlights()
    
    // 如果点击已有单位，且是己方
    if (cell.unit && cell.unit.team === this.data.currentTeam && !cell.unit.moved) {
      this.setData({
        selectedUnit: cell.unit,
        selectedX: x,
        selectedY: y,
        mode: 'select'
      })
      
      // 高亮可移动范围
      this.highlightReachable(x, y, cell.unit.mov)
      
      this.updateButtons()
    } else if (cell.unit && cell.unit.team !== this.data.currentTeam) {
      // 点击敌人， 如果已经选中我方，就可以攻击
      if (this.data.selectedUnit && this.canAttackEnemy(x, y)) {
        this.tryAttack(x, y)
      }
    }
  },

  // 高亮可到达区域
  highlightReachable(startX, startY, mov) {
    // 简单BFS找可移动范围
    const reachable = []
    const visited = {}
    
    const queue = [{x: startX, y: startY, steps: 0}]
    visited[`${startX},${startY}`] = true
    
    while (queue.length > 0) {
      const curr = queue.shift()
      if (curr.steps <= mov) {
        reachable.push(curr)
        // 四个方向
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
        dirs.forEach(d => {
          const nx = curr.x + d[0]
          const ny = curr.y + d[1]
          const key = `${nx},${ny}`
          if (nx >= 0 && nx < this.data.mapWidth && ny >=0 && ny < this.data.mapHeight) {
            if (!visited[key] && !this.data.map[ny][nx].unit) {
              visited[key] = true
              queue.push({x: nx, y: ny, steps: curr.steps + 1})
            }
          }
        })
      }
    }
    
    reachable.forEach(r => {
      this.data.map[r.y][r.x].highlight = true
    })
    
    this.setData({
      map: this.data.map
    })
  },

  // 进入移动模式
  moveMode() {
    this.clearHighlights()
    this.highlightReachable(this.data.selectedX, this.data.selectedY, this.data.selectedUnit.mov)
    this.setData({
      mode: 'move'
    })
  },

  // 尝试移动
  tryMove(targetX, targetY) {
    if (!this.data.map[targetY][targetX].highlight) {
      wx.showToast({ title: '不能移动到这里', icon: 'none' })
      return
    }
    
    if (this.data.map[targetY][targetX].unit) {
      wx.showToast({ title: '这里已有单位', icon: 'none' })
      return
    }
    
    // 移动单位
    const unit = this.data.map[this.data.selectedY][this.data.selectedX].unit
    this.data.map[targetY][targetX].unit = unit
    this.data.map[this.data.selectedY][this.data.selectedX].unit = null
    
    unit.moved = true
    
    this.clearHighlights()
    
    this.setData({
      map: this.data.map,
      selectedX: targetX,
      selectedY: targetY,
      mode: 'select'
    })
    
    this.updateButtons()
    wx.showToast({ title: '移动完成', icon: 'success' })
  },

  // 进入攻击模式
  attackMode() {
    this.clearHighlights()
    
    // 高亮攻击范围内敌人
    const unit = this.data.selectedUnit
    const range = unit.range || 1
    const attacks = this.getAttacksInRange(this.data.selectedX, this.data.selectedY, range)
    
    attacks.forEach(cell => {
      this.data.map[cell.y][cell.x].highlight = true
    })
    
    this.setData({
      mode: 'attack',
      map: this.data.map
    })
  },

  // 获取攻击范围内可攻击目标
  getAttacksInRange(x, y, range) {
    const targets = []
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < this.data.mapWidth && ny >=0 && ny < this.data.mapHeight) {
          const cell = this.data.map[ny][nx]
          if (cell.unit && cell.unit.team !== this.data.currentTeam) {
            targets.push(cell)
          }
        }
      }
    }
    return targets
  },

  // 检查是否可以攻击
  canAttackEnemy(x, y) {
    const unit = this.data.selectedUnit
    const range = unit.range || 1
    const dist = Math.abs(x - this.data.selectedX) + Math.abs(y - this.data.selectedY)
    return dist <= range && this.data.map[y][x].unit && this.data.map[y][x].unit.team !== this.data.currentTeam
  },

  // 尝试攻击
  tryAttack(targetX, targetY) {
    const targetCell = this.data.map[targetY][targetX]
    const attacker = this.data.selectedUnit
    
    if (!targetCell.unit || targetCell.unit.team === attacker.team) {
      wx.showToast({ title: '不能攻击这个目标', icon: 'none' })
      return
    }
    
    // 计算伤害 (梦幻模拟战公式简化)
    const atk = attacker.atk
    const def = targetCell.unit.def
    
    // 兵种克制系统 (简化)
    let dmgMultiplier = 1.0
    if (this.isCounter(attacker.className, targetCell.unit.className)) {
      dmgMultiplier = 1.5
    } else if (this.isCounter(targetCell.unit.className, attacker.className)) {
      dmgMultiplier = 0.7
    }
    
    // 地形防御加成
    const terrainBonus = this.getTerrainDefBonus(targetCell.terrain)
    const effectiveDef = def + terrainBonus
    
    let damage = Math.max(5, Math.floor(atk * dmgMultiplier - effectiveDef * 0.5))
    
    targetCell.unit.hp -= damage
    
    let resultText = `${attacker.name} 对 ${targetCell.unit.name} 造成 ${damage} 点伤害`
    
    // 检查敌人是否死亡
    if (targetCell.unit.hp <= 0) {
      resultText += `，击杀了敌人！`
      if (targetCell.unit.team === 'enemy') {
        this.data.killCount++
        this.setData({
          killCount: this.data.killCount
        })
      }
      targetCell.unit = null
      
      // 检查战斗结束
      this.checkBattleEnd()
    }
    
    attacker.attacked = true
    
    this.clearHighlights()
    this.updateButtons()
    
    this.setData({
      map: this.data.map,
      mode: 'select'
    })
    
    wx.showModal({
      title: '战斗结果',
      content: resultText,
      showCancel: false
    })
  },

  // 兵种克制判断 (简化版梦幻模拟战克制)
  isCounter(attackerClass, defenderClass) {
    const counters = {
      infantry: ['cavalry'],
      cavalry: ['flier', 'archer'],
      archer: ['flier', 'infantry'],
      flier: ['mage', 'infantry'],
      mage: ['cavalry', 'flier'],
      healer: []
    }
    
    return counters[attackerClass] && counters[attackerClass].includes(defenderClass)
  },

  // 获取地形防御加成
  getTerrainDefBonus(terrain) {
    const bonus = {
      plain: 0,
      mountain: 30,
      forest: 20,
      river: 0,
      castle: 40
    }
    return bonus[terrain] || 0
  },

  // 结束回合
  endTurn() {
    this.clearHighlights()
    this.setData({
      selectedUnit: null,
      selectedX: -1,
      selectedY: -1,
      mode: 'select'
    })
    
    if (this.data.currentTeam === 'player') {
      // 玩家回合结束，敌人回合开始
      this.setData({
        currentTeam: 'enemy'
      })
      this.enemyTurn()
    } else {
      this.setData({
        currentTeam: 'player',
        turn: this.data.turn + 1
      })
      this.resetPlayerMoves()
    }
    
    this.updateButtons()
  },

  // 敌人AI回合 (简单AI)
  enemyTurn() {
    let hasMoved = false
    
    // 找每个可行动的敌人，向最近玩家移动并攻击
    this.data.map.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.unit && cell.unit.team === 'enemy' && !cell.unit.moved) {
          hasMoved = true
          this.enemyAct(x, y, cell.unit)
        }
      })
    })
    
    // 所有敌人都行动完了，切换回合
    setTimeout(() => {
      this.resetEnemyMoves()
      this.setData({
        currentTeam: 'player',
        turn: this.data.turn + 1
      })
      this.updateButtons()
      this.checkBattleEnd()
    }, 500)
  },

  // 单个敌人行动 (简单AI：找最近玩家，移动，攻击)
  enemyAct(x, y, unit) {
    // 找最近玩家
    let nearest = null
    let minDist = 999
    
    this.data.map.forEach((row, ey) => {
      row.forEach((cell, ex) => {
        if (cell.unit && cell.unit.team === 'player') {
          const dist = Math.abs(ex - x) + Math.abs(ey - y)
          if (dist < minDist) {
            minDist = dist
            nearest = {x: ex, y: ey, unit: cell.unit}
          }
        }
      })
    })
    
    if (!nearest) return
    
    // 如果已经在攻击范围，直接攻击
    if (minDist <= (unit.range || 1)) {
      this.tryAttackEnemyAI(x, y, nearest.x, nearest.y, unit)
    } else {
      // 向玩家移动一步
      this.moveEnemyTowards(x, y, unit, nearest.x, nearest.y)
    }
    
    unit.moved = true
  },

  // 敌人攻击
  tryAttackEnemyAI(fromX, fromY, toX, toY, attacker) {
    const targetCell = this.data.map[toY][toX]
    if (!targetCell.unit) return
    
    const damage = Math.max(5, Math.floor(attacker.atk * 1.0 - targetCell.unit.def * 0.5))
    targetCell.unit.hp -= damage
    
    if (targetCell.unit.hp <= 0) {
      targetCell.unit = null
    }
    
    attacker.attacked = true
    this.setData({
      map: this.data.map
    })
  },

  // 敌人向玩家移动
  moveEnemyTowards(fromX, fromY, unit, targetX, targetY) {
    // BFS找最短路径一步
    let bestMove = null
    
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
    dirs.forEach(d => {
      const nx = fromX + d[0]
      const ny = fromY + d[1]
      
      if (nx >= 0 && nx < this.data.mapWidth && ny >= 0 && ny < this.data.mapHeight) {
        if (!this.data.map[ny][nx].unit) {
          const newDist = Math.abs(targetX - nx) + Math.abs(targetY - ny)
          const oldDist = Math.abs(targetX - fromX) + Math.abs(targetY - fromY)
          if (newDist < oldDist) {
            bestMove = {x: nx, y: ny}
          }
        }
      }
    })
    
    if (bestMove) {
      this.data.map[bestMove.y][bestMove.x].unit = unit
      this.data.map[fromY][fromX].unit = null
    }
  },

  // 重置玩家移动状态
  resetPlayerMoves() {
    this.data.map.forEach(row => {
      row.forEach(cell => {
        if (cell.unit && cell.unit.team === 'player') {
          cell.unit.moved = false
          cell.unit.attacked = false
        }
      })
    })
    this.setData({
      map: this.data.map
    })
  },

  // 重置敌人移动状态
  resetEnemyMoves() {
    this.data.map.forEach(row => {
      row.forEach(cell => {
        if (cell.unit && cell.unit.team === 'enemy') {
          cell.unit.moved = false
          cell.unit.attacked = false
        }
      })
    })
  },

  // 检查战斗是否结束
  checkBattleEnd() {
    const playerAlive = this.data.map.some(row => 
      row.some(cell => cell.unit && cell.unit.team === 'player')
    )
    
    const enemyAlive = this.data.map.some(row => 
      row.some(cell => cell.unit && cell.unit.team === 'enemy')
    )
    
    if (!playerAlive) {
      // 玩家战败
      this.showBattleResult(false)
    } else if (!enemyAlive) {
      // 玩家胜利
      this.showBattleResult(true)
    }
  },

  // 显示战斗结果
  showBattleResult(victory) {
    const rewards = this.calculateRewards()
    
    this.setData({
      showResult: true,
      resultTitle: victory ? '胜利！' : '战败',
      resultRewards: rewards
    })
    
    if (victory) {
      this.giveRewards(rewards)
    }
  },

  // 计算奖励
  calculateRewards() {
    const baseExp = 50 * this.data.killCount
    const baseGold = 30 * this.data.killCount
    const rewards = [
      `击杀敌人: ${this.data.killCount}`,
      `获得经验: ${baseExp}`,
      `获得金币: ${baseGold}`
    ]
    
    // 随机掉落装备
    if (Math.random() > 0.5) {
      rewards.push(`掉落了一件装备！`)
    }
    
    return rewards
  },

  // 发放奖励
  giveRewards(rewards) {
    const gameData = app.globalData.gameData
    let exp = 0
    let gold = 0
    
    rewards.forEach(r => {
      const expMatch = r.match(/经验: (\d+)/)
      const goldMatch = r.match(/金币: (\d+)/)
      if (expMatch) exp = parseInt(expMatch[1])
      if (goldMatch) gold = parseInt(goldMatch[1])
    })
    
    // 分给所有存活角色
    const alivePlayers = []
    this.data.map.forEach(row => {
      row.forEach(cell => {
        if (cell.unit && cell.unit.team === 'player') {
          alivePlayers.push(cell.unit)
        }
      })
    })
    
    const expPer = Math.floor(exp / Math.max(alivePlayers.length, 1))
    
    alivePlayers.forEach(unit => {
      // 在总数据里找对应角色更新
      gameData.player.characters.forEach(char => {
        if (char.id === unit.id) {
          char.exp += expPer
          // 检查升级
          const nextLevelExp = this.calculateExp(char.level + 1)
          while (char.exp >= nextLevelExp && char.level < 20) {
            char.exp -= nextLevelExp
            char.level++
            // 全属性提升
            char.hp += 10
            char.maxHp += 10
            char.atk += 3
            char.def += 2
          }
        }
      })
    })
    
    gameData.player.gold += gold
    app.globalData.gameData = gameData
    app.saveGameData()
  },

  calculateExp(level) {
    return level * 100 + (level - 1) * (level - 1) * 10
  },

  // 清除高亮
  clearHighlights() {
    this.data.map.forEach(row => {
      row.forEach(cell => {
        cell.highlight = false
      })
    })
    this.setData({
      map: this.data.map
    })
  },

  // 更新按钮状态
  updateButtons() {
    if (!this.data.selectedUnit) {
      this.setData({
        canMove: false,
        canAttack: false,
        canWait: false
      })
      return
    }
    
    this.setData({
      canMove: !this.data.selectedUnit.moved,
      canAttack: !this.data.selectedUnit.attacked && this.hasEnemyInRange(),
      canWait: true
    })
  },

  // 检查范围内是否有敌人
  hasEnemyInRange() {
    const unit = this.data.selectedUnit
    const range = unit.range || 1
    const x = this.data.selectedX
    const y = this.data.selectedY
    
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < this.data.mapWidth && ny >=0 && ny < this.data.mapHeight) {
          const cell = this.data.map[ny][nx]
          if (cell.unit && cell.unit.team !== this.data.currentTeam) {
            return true
          }
        }
      }
    }
    return false
  },

  // 关闭结果弹窗
  closeResult() {
    // 不关闭，必须返回主页
  },

  // 返回主页
  backToIndex() {
    wx.navigateBack()
  },

  // 退出战斗
  exitBattle() {
    wx.showModal({
      title: '确认退出',
      content: '退出战斗不会获得奖励，确定退出吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  }
})
