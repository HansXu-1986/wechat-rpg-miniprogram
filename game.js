// 微信小游戏 - 梦幻战棋RPG v1.2.0
// 增加微信云开发存储每个玩家数据

console.log('=== 梦幻战棋RPG 启动 ===');

try {

// 获取 canvas
var canvas = wx.createCanvas();
var ctx = canvas.getContext('2d');

// 获取系统信息
var sysInfo = wx.getSystemInfoSync();
var width = sysInfo.windowWidth;
var height = sysInfo.windowHeight;

// 微信云开发初始化
var db = null;
var openid = null;
var dataLoaded = false;

console.log('初始化完成', { width: width, height: height });

// ========== 兼容性 polyfill ==========
if (!ctx.constructor.prototype.roundRect) {
  ctx.constructor.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') {
      r = {tl: r, tr: r, br: r, bl: r};
    }
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
    return this;
  };
}

// ========== 全局变量 ==========
var currentScene = 'loading'; // loading 就是正在加载数据
var selectedUnit = null; // 当前选中的单位（不管敌我）

// 游戏数据 - 默认初始数据
var gameData = {
  player: {
    name: '主角',
    level: 1,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    exp: 0,
    nextExp: 100,
    type: 'infantry', // 步兵
    // 兵种名称中文
    typeName: {
      infantry: '步兵',
      cavalry: '骑兵',
      archer: '弓箭手'
    },
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
  ],
  units: [ // 拥有的兵种列表 {type, level, ...}
    {type: 'infantry', count: 1}
  ]
};

// 地形类型 - 不同地形有不同加成
// 0=平地 1=森林 2=山地 3=城墙
var terrain = [
  [0,0,0,0,0,0,0,0,0,0],
  [0,1,1,0,0,0,0,0,0,0],
  [0,1,2,1,0,0,0,0,0,0],
  [0,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,0,0],
  [0,0,0,0,0,0,2,1,0,0]
];

function getTerrainDefenseBonus(t) {
  switch(t) {
    case 1: return 2; // 森林 +2防御
    case 2: return 4; // 山地 +4防御
    case 3: return 6; // 城墙 +6防御
    default: return 0;
  }
}

function getTerrainColor(t) {
  switch(t) {
    case 1: return '#2d5016'; // 森林深绿
    case 2: return '#5a4a42'; // 山地棕
    case 3: return '#666666'; // 城墙灰
    default: return 'transparent';
  }
}

function getTerrainName(t) {
  switch(t) {
    case 1: return '森林';
    case 2: return '山地';
    case 3: return '城墙';
    default: return '平地';
  }
}

// 兵种相克
// 步兵>弓箭手  骑兵>步兵  弓箭手>骑兵
var counterTable = {
  infantry: { cavalry: 1.2, archer: 0.9 },
  cavalry: { infantry: 1.2, archer: 1.0 },
  archer: { cavalry: 1.2, infantry: 0.9 }
};

function getDamageBonus(attackerType, defenderType) {
  if (counterTable[attackerType] && counterTable[attackerType][defenderType]) {
    return counterTable[attackerType][defenderType];
  }
  return 1.0;
}

// 战场数据
var battleData = {
  gridSize: 36, // 缩小一点给底部信息留空间
  mapWidth: 10,
  mapHeight: 8,
  units: [],
  selectedUnit: null,
  currentTurn: 'player',
  gameOver: false,
  gameWin: false
};

// ========== 云开发函数 ==========
function initCloud() {
  if (!wx.cloud) {
    console.error('请使用 2.2.3 以上基础库以使用云能力');
    dataLoaded = true;
    currentScene = 'index';
    return;
  }

  wx.cloud.init({
    env: 'your-env-id', // 需要用户替换成自己的云开发环境ID
    traceUser: true
  });

  db = wx.cloud.database();
  // 匿名登录获取openid
  wx.cloud.callFunction({
    name: 'login',
    success: function(res) {
      openid = res.result.openid;
      console.log('获取openid成功', openid);
      loadPlayerData();
    },
    fail: function(err) {
      console.error('登录失败', err);
      dataLoaded = true;
      currentScene = 'index';
    }
  });
}

function loadPlayerData() {
  if (!db) {
    dataLoaded = true;
    currentScene = 'index';
    return;
  }

  db.collection('gamePlayer').where({
    _openid: openid
  }).get().then(res => {
    console.log('加载数据', res.data);
    if (res.data.length > 0) {
      var data = res.data[0];
      // 加载保存的数据
      if (data.gameData) {
        gameData = data.gameData;
      }
    }
    dataLoaded = true;
    currentScene = 'index';
  }).catch(err => {
    console.error('加载失败', err);
    dataLoaded = true;
    currentScene = 'index';
  });
}

function savePlayerData() {
  if (!db || !openid) {
    console.log('没有云开发，不保存');
    return;
  }

  db.collection('gamePlayer').where({
    _openid: openid
  }).get().then(res => {
    if (res.data.length > 0) {
      // 更新
      var docId = res.data[0]._id;
      db.collection('gamePlayer').doc(docId).update({
        data: {
          gameData: gameData
        }
      }).then(() => {
        console.log('保存成功');
      }).catch(err => {
        console.error('保存失败', err);
      });
    } else {
      // 新增
      db.collection('gamePlayer').add({
        data: {
          gameData: gameData
        }
      }).then(() => {
        console.log('新增保存成功');
      }).catch(err => {
        console.error('新增失败', err);
      });
    }
  });
}

// 开局初始化云开发
initCloud();

// ========== 事件绑定 - 微信小游戏方式 ==========
wx.onTouchStart(function(e) {
  var touch = e.touches[0];
  handleClick(touch.clientX, touch.clientY);
});

// ========== 主循环 ==========
function gameLoop() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
  switch (currentScene) {
    case 'loading': drawLoading(); break;
    case 'index': drawIndex(); break;
    case 'map': drawMap(); break;
    case 'character': drawCharacter(); break;
    case 'equipment': drawEquipment(); break;
    case 'battle': drawBattle(); break;
    case 'win': drawWin(); break;
    case 'lose': drawLose(); break;
  }
  requestAnimationFrame(gameLoop);
}

function drawLoading() {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('加载玩家数据...', width/2, height/2);
}

// ========== 场景切换 ==========
function enterScene(scene) {
  currentScene = scene;
  selectedUnit = null;
  console.log('切换场景', scene);
  if (scene === 'battle') {
    initBattle();
  }
}

// ========== 点击处理 ==========
function handleClick(x, y) {
  if (currentScene === 'loading') return;

  // 胜负界面
  if (currentScene === 'win' || currentScene === 'lose') {
    if (inRect(x, y, width/2 - 100, height/2 + 50, 200, 60)) {
      enterScene('index');
      return;
    }
    return;
  }

  switch (currentScene) {
    case 'index': handleIndexClick(x, y); break;
    case 'map': handleMapClick(x, y); break;
    case 'character': handleCharacterClick(x, y); break;
    case 'equipment': handleEquipmentClick(x, y); break;
    case 'battle': handleBattleClick(x, y); break;
  }
}

// ========== 首页 ==========
function drawIndex() {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('梦幻战棋RPG', width / 2, 60);
  ctx.font = '16px sans-serif';
  ctx.fillText('回合制策略角色扮演游戏', width / 2, 95);
  ctx.fillText('梦幻模拟战风格', width / 2, 115);

  // 人物信息
  var p = gameData.player;
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('人物信息', 40, 180);
  ctx.font = '16px sans-serif';
  ctx.fillText(p.name, 40, 210);
  ctx.fillText('等级: Lv.' + p.level, 40, 235);
  ctx.fillText(p.typeName[p.type], 40, 260);
  ctx.fillText('经验: ' + p.exp + '/' + p.nextExp, 40, 285);

  // 兵种统计
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('兵种', width / 2 + 40, 180);
  ctx.font = '16px sans-serif';
  var y = 210;
  var unitCounts = {};
  gameData.units.forEach(function(u) {
    if (!unitCounts[u.type]) unitCounts[u.type] = 0;
    unitCounts[u.type] += u.count;
  });
  for (var type in unitCounts) {
    ctx.fillText(p.typeName[type] + ': ' + unitCounts[type], width / 2 + 40, y);
    y += 25;
  }

  drawButton('开始游戏', width / 2, height - 100, 200, 60, '#4a90e2');
  ctx.fillStyle = '#888888';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('v1.2.0', width / 2, height - 30);
}

function handleIndexClick(x, y) {
  var bx = width / 2 - 100;
  var by = height / 2 - 30;
  if (inRect(x, y, bx, by, 200, 60)) {
    enterScene('map');
  }
}

// ========== 地图选择 ==========
function drawMap() {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('选择关卡', width / 2, 40);
  var y = 100;
  gameData.maps.forEach(function(map) {
    var color = map.unlocked ? '#4a90e2' : '#666666';
    drawButton(map.name, width / 2, y, 250, 60, color);
    y += 80;
  });
  drawButton('角色', width/2 - 130, height - 50, 120, 50, '#4a90e2');
  drawButton('装备', width/2 + 10, height - 50, 120, 50, '#4a90e2');
  drawButton('返回', 80, height - 50, 120, 50, '#888888');
}

function handleMapClick(x, y) {
  if (inRect(x, y, 20, height - 75, 120, 50)) {
    enterScene('index');
    return;
  }
  if (inRect(x, y, width/2 - 130, height - 75, 120, 50)) {
    enterScene('character');
    return;
  }
  if (inRect(x, y, width/2 + 10, height - 75, 120, 50)) {
    enterScene('equipment');
    return;
  }
  var yy = 100;
  gameData.maps.forEach(function(map) {
    if (inRect(x, yy, width/2 - 125, yy - 30, 250, 60) && map.unlocked) {
      gameData.currentMap = map.id;
      enterScene('battle');
    }
    yy += 80;
  });
}

// ========== 角色信息 ==========
function drawCharacter() {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('角色信息', width / 2, 40);
  var p = gameData.player;
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  var y = 100;
  ctx.fillText('名称: ' + p.name, 40, y += 30);
  ctx.fillText('职业: ' + p.typeName[p.type], 40, y += 30);
  ctx.fillText('等级: Lv.' + p.level, 40, y += 30);
  ctx.fillText('生命: ' + p.hp + '/' + p.maxHp, 40, y += 30);
  ctx.fillText('攻击: ' + p.attack, 40, y += 30);
  ctx.fillText('防御: ' + p.defense, 40, y += 30);
  ctx.fillText('经验: ' + p.exp + '/' + p.nextExp, 40, y += 30);
  ctx.textAlign = 'center';
  drawButton('返回地图', width / 2, height - 60, 150, 50, '#888888');
}

function handleCharacterClick(x, y) {
  if (inRect(x, y, width/2 - 75, height - 85, 150, 50)) {
    enterScene('map');
    // 保存数据
    savePlayerData();
  }
}

// ========== 装备 ==========
function drawEquipment() {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('装备管理', width / 2, 40);
  var eq = gameData.player.equipment;
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  var y = 100;
  drawEquipmentSlot('武器', eq.weapon, 40, y += 50);
  drawEquipmentSlot('护甲', eq.armor, 40, y += 60);
  drawEquipmentSlot('饰品', eq.accessory, 40, y += 60);
  ctx.textAlign = 'center';
  drawButton('返回', width / 2, height - 60, 150, 50, '#888888');
}

function drawEquipmentSlot(name, item, x, y) {
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name + ': ', x, y);
  if (item) {
    ctx.fillStyle = '#4a90e2';
    ctx.fillText(item.name, x + 60, y);
  } else {
    ctx.fillStyle = '#888';
    ctx.fillText('空', x + 60, y);
  }
}

function handleEquipmentClick(x, y) {
  if (inRect(x, y, width/2 - 75, height - 85, 150, 50)) {
    enterScene('map');
  }
}

// ========== 战场 ==========
function drawBattle() {
  ctx.fillStyle = '#2a2a3e';
  // 给底部信息栏留空间
  ctx.fillRect(0, 0, width, height - 80);

  var gs = battleData.gridSize;
  var startX = 20;
  var startY = 60;

  // 绘制地形
  for (var x = 0; x < battleData.mapWidth; x++) {
    for (var y = 0; y < battleData.mapHeight; y++) {
      var t = terrain[y][x];
      var color = getTerrainColor(t);
      if (color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(startX + x * gs + 1, startY + y * gs + 1, gs - 2, gs - 2);
      }
      ctx.strokeStyle = '#444';
      ctx.strokeRect(startX + x * gs, startY + y * gs, gs, gs);
    }
  }

  if (battleData.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, width, height - 80);
    if (battleData.gameWin) {
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('胜利！', width/2, (height - 80)/2 - 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('你击败了所有敌人', width/2, (height - 80)/2 - 10);
      drawButton('返回主页', width/2, (height - 80)/2 + 50, 200, 60, '#4a90e2');
    } else {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('失败', width/2, (height - 80)/2 - 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('你的角色倒下了', width/2, (height - 80)/2 - 10);
      drawButton('重新开始', width/2, (height - 80)/2 + 50, 200, 60, '#e74c3c');
    }
  } else {
    if (battleData.selectedUnit) {
      var px = startX + battleData.selectedUnit.x * gs;
      var py = startY + battleData.selectedUnit.y * gs;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, gs, gs);
      ctx.lineWidth = 1;
    }

    battleData.units.forEach(function(unit) {
      var px = startX + unit.x * gs;
      var py = startY + unit.y * gs;
      ctx.fillStyle = unit.team === 'player' ? '#4a90e2' : '#e74c3c';
      ctx.fillRect(px + 2, py + 2, gs - 4, gs - 4);
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(unit.name[0], px + gs/2, py + gs/2 + 4);
      // 显示血量
      ctx.font = '8px sans-serif';
      ctx.fillText(unit.hp + '/' + (unit.maxHp || 100), px + gs/2, py + gs - 2);
    });

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((battleData.currentTurn === 'player' ? '我方' : '敌方') + '回合', 20, 30);
    drawButton('退出', width - 80, height - 120, 100, 40, '#888888');

    // ========== 底部信息栏：显示选中单位详情 ==========
    drawUnitInfo();
  }
}

// 底部绘制选中单位详细信息
function drawUnitInfo() {
  if (!selectedUnit) {
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, height - 80, width, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击单位查看详细信息', width/2, height - 45);
    return;
  }

  ctx.fillStyle = '#333333';
  ctx.fillRect(0, height - 80, width, 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';

  var y = height - 65;
  var left = 20;
  var lineH = 20;

  ctx.fillText('名称: ' + selectedUnit.name, left, y); y += lineH;
  ctx.fillText('兵种: ' + gameData.player.typeName[selectedUnit.type] || selectedUnit.type, left + width/2, y); y -= lineH;

  ctx.fillText('生命: ' + selectedUnit.hp + '/' + (selectedUnit.maxHp || 100), left, y += lineH);
  var terrainBonus = 0;
  if (selectedUnit.x >= 0 && selectedUnit.y >= 0) {
    terrainBonus = getTerrainDefenseBonus(terrain[selectedUnit.y][selectedUnit.x]);
    ctx.fillText('防御: ' + selectedUnit.defense + '(+' + terrainBonus + '地形)', left + width/2, y);
  }
}

function handleBattleClick(x, y) {
  if (inRect(x, y, width - 130, height - 140, 100, 40)) {
    enterScene('map');
    // 过关后保存进度
    savePlayerData();
    return;
  }

  if (battleData.gameOver) return;
  if (battleData.currentTurn !== 'player') return;

  var gs = battleData.gridSize;
  var startX = 20;
  var startY = 60;
  var gridX = Math.floor((x - startX) / gs);
  var gridY = Math.floor((y - startY) / gs);

  if (gridX < 0 || gridX >= battleData.mapWidth || gridY < 0 || gridY >= battleData.mapHeight) {
    return;
  }

  // 看看点击的是谁
  var clickedUnit = null;
  for (var i = 0; i < battleData.units.length; i++) {
    var u = battleData.units[i];
    if (u.x === gridX && u.y === gridY) {
      clickedUnit = u;
      break;
    }
  }

  // 点击任何单位都选中，方便查看属性
  if (clickedUnit) {
    battleData.selectedUnit = clickedUnit;
    selectedUnit = clickedUnit;
    console.log('选中单位', clickedUnit);
    return;
  }

  // 已经选中了单位，目标空格，移动
  if (battleData.selectedUnit && !clickedUnit) {
    var dx = Math.abs(gridX - battleData.selectedUnit.x);
    var dy = Math.abs(gridY - battleData.selectedUnit.y);

    // 只能移动/攻击相邻格子
    if (dx + dy > 1) {
      console.log('太远了，不能到达');
      return;
    }

    // 空格子 = 移动
    battleData.selectedUnit.x = gridX;
    battleData.selectedUnit.y = gridY;
    console.log('移动完成', battleData.selectedUnit);
    battleData.selectedUnit = null;
    selectedUnit = null;
    checkGameOver();
    if (!battleData.gameOver) {
      battleData.currentTurn = 'enemy';
      setTimeout(function() {
        enemyTurn();
      }, 800);
    }
  }
}

function attackEnemy(attacker, defender) {
  var t = terrain[defender.y][defender.x];
  var defBonus = getTerrainDefenseBonus(t);
  var counter = getDamageBonus(attacker.type, defender.type);
  var damage = Math.max(1, Math.floor((attacker.attack - defender.defense - defBonus) * counter));
  defender.hp -= damage;
  console.log('攻击伤害', damage, attacker.name + '击中' + defender.name);
}

function checkGameOver() {
  // 检查玩家是否还有活的单位
  var playerAlive = false;
  for (var i = 0; i < battleData.units.length; i++) {
    if (battleData.units[i].team === 'player') {
      playerAlive = true;
      break;
    }
  }
  if (!playerAlive) {
    battleData.gameOver = true;
    battleData.gameWin = false;
    currentScene = 'lose';
    console.log('游戏失败');
    // 更新玩家血量
    gameData.player.hp = 0;
    savePlayerData();
    return;
  }
  // 检查敌人是否还有活的单位
  var enemyAlive = false;
  for (var i = 0; i < battleData.units.length; i++) {
    if (battleData.units[i].team === 'enemy') {
      enemyAlive = true;
      break;
    }
  }
  if (!enemyAlive) {
    battleData.gameOver = true;
    battleData.gameWin = true;
    // 解锁下一关
    var currentId = gameData.currentMap;
    gameData.maps[currentId].completed = true;
    if (currentId + 1 < gameData.maps.length) {
      gameData.maps[currentId + 1].unlocked = true;
    }
    // 玩家获得经验
    gameData.player.exp += 30;
    // 检查升级
    if (gameData.player.exp >= gameData.player.nextExp) {
      gameData.player.level++;
      gameData.player.exp -= gameData.player.nextExp;
      gameData.player.nextExp = Math.floor(gameData.player.nextExp * 1.5);
      gameData.player.maxHp += 20;
      gameData.player.hp = gameData.player.maxHp;
      gameData.player.attack += 3;
      gameData.player.defense += 2;
      // 增加兵种数量
      gameData.units.push({type: gameData.player.type, count: 1});
    } else {
      // 回血
      gameData.player.hp = gameData.player.maxHp;
    }
    // 保存进度
    savePlayerData();
    currentScene = 'win';
    console.log('游戏胜利');
    return;
  }
}

function enemyTurn() {
  // 找玩家
  var player = null;
  for (var i = 0; i < battleData.units.length; i++) {
    if (battleData.units[i].team === 'player') {
      player = battleData.units[i];
      break;
    }
  }
  if (!player) {
    battleData.currentTurn = 'player';
    selectedUnit = null;
    battleData.selectedUnit = null;
    return;
  }

  // 找活的敌人
  var enemyList = battleData.units.filter(function(u) { return u.team === 'enemy' && u.hp > 0; });
  if (enemyList.length === 0) {
    battleData.currentTurn = 'player';
    selectedUnit = null;
    battleData.selectedUnit = null;
    return;
  }

  // 每个敌人都走一步
  enemyList.forEach(function(enemy) {
    var dx = player.x - enemy.x;
    var dy = player.y - enemy.y;
    var adx = Math.abs(dx);
    var ady = Math.abs(dy);

    // 如果已经相邻，攻击玩家
    if (adx + ady <= 1) {
      attackEnemy(enemy, player);
    } else {
      // 向玩家移动一步
      if (adx > ady) {
        enemy.x += dx > 0 ? 1 : -1;
      } else if (ady !== 0) {
        enemy.y += dy > 0 ? 1 : -1;
      }
    }
  });

  checkGameOver();
  if (!battleData.gameOver) {
    battleData.currentTurn = 'player';
  }
  selectedUnit = null;
  battleData.selectedUnit = null;
  // 保存玩家最新血量
  if (player) {
    gameData.player.hp = player.hp;
    savePlayerData();
  }
}

function initBattle() {
  battleData.units = [
    { id: 1, name: gameData.player.name, team: 'player', x: 2, y: 3, hp: gameData.player.hp, maxHp: gameData.player.maxHp, attack: gameData.player.attack, defense: gameData.player.defense, type: gameData.player.type },
    { id: 2, name: '敌人', team: 'enemy', x: 7, y: 3, hp: 50, maxHp: 50, attack: 8, defense: 3, type: 'infantry' }
  ];
  battleData.selectedUnit = null;
  selectedUnit = null;
  battleData.currentTurn = 'player';
  battleData.gameOver = false;
  battleData.gameWin = false;
}

// ========== 胜利/失败 ==========
function drawWin() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#00ff00';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('胜利！', width/2, height/2 - 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText('你击败了所有敌人', width/2, height/2 - 10);
  if (gameData.currentMap + 1 < gameData.maps.length) {
    ctx.fillText('已解锁下一关', width/2, height/2 + 20);
  } else {
    ctx.fillText('你通关了整个游戏！', width/2, height/2 + 20);
  }
  drawButton('返回主页', width/2, height/2 + 50, 200, 60, '#4a90e2');
}

function drawLose() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ff0000';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('失败', width/2, height/2 - 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText('你的角色倒下了', width/2, height/2 - 10);
  drawButton('重新开始', width/2, height/2 + 50, 200, 60, '#e74c3c');
}

// ========== 工具函数 ==========
function drawButton(text, cx, cy, w, h, color) {
  var x = cx - w / 2;
  var y = cy - h / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, cy + 6);
}

function inRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

// ========== 启动游戏 ==========
console.log('开始游戏循环');
gameLoop();

} catch (err) {
  console.error('启动错误', err);
  if (typeof ctx !== 'undefined') {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('错误: ' + err.message, width/2, height/2);
  }
}1a