// 微信小游戏 - 梦幻战棋RPG v1.0.7
// 完善战斗机制：显示血量、正确攻击、不能重叠

console.log('=== 梦幻战棋RPG 启动 ===');

try {

// 获取 canvas
var canvas = wx.createCanvas();
var ctx = canvas.getContext('2d');

// 获取系统信息
var sysInfo = wx.getSystemInfoSync();
var width = sysInfo.windowWidth;
var height = sysInfo.windowHeight;

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
var currentScene = 'index';

// 游戏数据
var gameData = {
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
};

// 战场数据
var battleData = {
  gridSize: 40,
  mapWidth: 10,
  mapHeight: 8,
  units: [],
  selectedUnit: null,
  currentTurn: 'player'
};

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
    case 'index': drawIndex(); break;
    case 'map': drawMap(); break;
    case 'character': drawCharacter(); break;
    case 'equipment': drawEquipment(); break;
    case 'battle': drawBattle(); break;
  }
  requestAnimationFrame(gameLoop);
}

// ========== 场景切换 ==========
function enterScene(scene) {
  currentScene = scene;
  console.log('切换场景', scene);
  if (scene === 'battle') {
    initBattle();
  }
}

// ========== 点击处理 ==========
function handleClick(x, y) {
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
  ctx.fillText('梦幻战棋RPG', width / 2, height / 3);
  ctx.font = '16px sans-serif';
  ctx.fillText('回合制策略角色扮演游戏', width / 2, height / 3 + 50);
  drawButton('开始游戏', width / 2, height / 2, 200, 60, '#4a90e2');
  ctx.fillStyle = '#888888';
  ctx.font = '12px sans-serif';
  ctx.fillText('v1.0.7', width / 2, height - 30);
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
  drawButton('返回', 80, height - 50, 120, 50, '#888888');
}

function handleMapClick(x, y) {
  if (inRect(x, y, 20, height - 75, 120, 50)) {
    enterScene('index');
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
  ctx.fillRect(0, 0, width, height);

  var gs = battleData.gridSize;
  var startX = 20;
  var startY = 60;

  ctx.strokeStyle = '#444';
  for (var x = 0; x < battleData.mapWidth; x++) {
    for (var y = 0; y < battleData.mapHeight; y++) {
      ctx.strokeRect(startX + x * gs, startY + y * gs, gs, gs);
    }
  }

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
  if (battleData.selectedUnit) {
    ctx.fillText('选中: ' + battleData.selectedUnit.name, 20, 50);
  }

  drawButton('退出', width - 80, height - 40, 100, 40, '#888888');
}

function handleBattleClick(x, y) {
  if (inRect(x, y, width - 130, height - 60, 100, 40)) {
    enterScene('map');
    return;
  }

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

  // 点击己方单位 = 选中
  if (clickedUnit && clickedUnit.team === 'player') {
    battleData.selectedUnit = clickedUnit;
    console.log('选中单位', clickedUnit);
    return;
  }

  // 已经选中了己方单位
  if (battleData.selectedUnit) {
    var dx = Math.abs(gridX - battleData.selectedUnit.x);
    var dy = Math.abs(gridY - battleData.selectedUnit.y);

    // 只能移动/攻击相邻格子
    if (dx + dy > 1) {
      console.log('太远了，不能到达');
      return;
    }

    // 目标格子有单位
    if (clickedUnit) {
      // 敌人 = 攻击
      if (clickedUnit.team === 'enemy') {
        clickedUnit.hp -= battleData.selectedUnit.attack;
        console.log('攻击敌人', clickedUnit.name, '剩余血量', clickedUnit.hp);
        // 敌人死亡移除
        if (clickedUnit.hp <= 0) {
          var idx = battleData.units.indexOf(clickedUnit);
          battleData.units.splice(idx, 1);
          gameData.player.exp += 30;
        }
        battleData.selectedUnit = null;
        battleData.currentTurn = 'enemy';
        setTimeout(function() {
          enemyTurn();
        }, 800);
      }
      return;
    } else {
      // 己方单位 = 重新选中
      battleData.selectedUnit = clickedUnit;
      return;
    }
  }

  // 空格子 = 移动
  if (!clickedUnit && battleData.selectedUnit && dx + dy <= 1) {
    battleData.selectedUnit.x = gridX;
    battleData.selectedUnit.y = gridY;
    console.log('移动完成', battleData.selectedUnit);
    battleData.selectedUnit = null;
    battleData.currentTurn = 'enemy';
    setTimeout(function() {
      enemyTurn();
    }, 800);
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
    return;
  }

  // 找活的敌人
  var enemyList = battleData.units.filter(function(u) { return u.team === 'enemy' && u.hp > 0; });
  if (enemyList.length === 0) {
    battleData.currentTurn = 'player';
    // 过关
    return;
  }

  // 简单AI：第一个敌人向玩家移动/攻击
  var enemy = enemyList[0];
  var dx = player.x - enemy.x;
  var dy = player.y - enemy.y;
  var adx = Math.abs(dx);
  var ady = Math.abs(dy);

  // 如果已经相邻，攻击玩家
  if (adx + ady <= 1) {
    player.hp -= enemy.attack;
    if (player.hp <= 0) {
      var idx = battleData.units.indexOf(player);
      battleData.units.splice(idx, 1);
    }
  } else {
    // 向玩家移动一步
    if (adx > ady) {
      enemy.x += dx > 0 ? 1 : -1;
    } else if (ady !== 0) {
      enemy.y += dy > 0 ? 1 : -1;
    }
  }

  battleData.currentTurn = 'player';
}

function initBattle() {
  battleData.units = [
    { id: 1, name: '玩家', team: 'player', x: 2, y: 3, hp: 100, maxHp: 100, attack: 10 },
    { id: 2, name: '敌人', team: 'enemy', x: 7, y: 3, hp: 50, maxHp: 50, attack: 8 }
  ];
  battleData.selectedUnit = null;
  battleData.currentTurn = 'player';
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
}
