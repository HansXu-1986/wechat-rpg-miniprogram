// 微信小游戏 - 梦幻战棋RPG v1.0.3
// 单文件完整版本 - 修复所有可能错误

console.log('=== 梦幻战棋RPG 启动 ===');

// 获取 canvas
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 获取系统信息
const sysInfo = wx.getSystemInfoSync();
const width = sysInfo.windowWidth;
const height = sysInfo.windowHeight;

console.log('初始化完成', { width, height });

// ========== 全局变量 ==========
let currentScene = 'index';

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
};

// 战场数据
const battleData = {
  gridSize: 40,
  mapWidth: 10,
  mapHeight: 8,
  units: [],
  currentTurn: 'player'
};

// ========== 兼容性 polyfill ==========
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
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

// ========== 事件绑定 ==========
canvas.addEventListener('touchstart', function(e) {
  const touch = e.touches[0];
  handleClick(touch.clientX, touch.clientY);
});

// ========== 主循环 ==========
function gameLoop() {
  // 清屏
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // 绘制当前场景
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
  ctx.fillText('v1.0.3', width / 2, height - 30);
}

function handleIndexClick(x, y) {
  const bx = width / 2 - 100;
  const by = height / 2 - 30;
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

  let y = 100;
  gameData.maps.forEach(function(map) {
    const color = map.unlocked ? '#4a90e2' : '#666666';
    drawButton(map.name, width / 2, y, 250, 60, color);
    y += 80;
  });

  drawButton('返回', 80, height - 50, 120, 50, '#888888');
}

function handleMapClick(x, y) {
  // 返回按钮
  if (inRect(x, y, 20, height - 75, 120, 50)) {
    enterScene('index');
    return;
  }

  // 关卡点击
  let y = 100;
  gameData.maps.forEach(function(map) {
    if (inRect(x, y, width/2 - 125, y - 30, 250, 60) && map.unlocked) {
      gameData.currentMap = map.id;
      enterScene('battle');
    }
    y += 80;
  });
}

// ========== 角色信息 ==========
function drawCharacter() {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('角色信息', width / 2, 40);

  const p = gameData.player;
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';

  let y = 100;
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

  const eq = gameData.player.equipment;
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';

  let y = 100;
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

  const gs = battleData.gridSize;
  const startX = 20;
  const startY = 60;

  // 网格
  ctx.strokeStyle = '#444';
  for (let x = 0; x < battleData.mapWidth; x++) {
    for (let y = 0; y < battleData.mapHeight; y++) {
      ctx.strokeRect(startX + x * gs, startY + y * gs, gs, gs);
    }
  }

  // 单位
  battleData.units.forEach(function(unit) {
    const px = startX + unit.x * gs;
    const py = startY + unit.y * gs;
    ctx.fillStyle = unit.team === 'player' ? '#4a90e2' : '#e74c3c';
    ctx.fillRect(px + 2, py + 2, gs - 4, gs - 4);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(unit.name[0], px + gs/2, py + gs/2 + 4);
  });

  // 回合信息
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((battleData.currentTurn === 'player' ? '我方' : '敌方') + '回合', 20, 30);

  // 退出按钮
  drawButton('退出', width - 80, height - 40, 100, 40, '#888888');
}

function handleBattleClick(x, y) {
  if (inRect(x, y, width - 130, height - 60, 100, 40)) {
    enterScene('map');
    return;
  }
}

function initBattle() {
  battleData.units = [
    { id: 1, name: '玩家', team: 'player', x: 2, y: 3, hp: 100 },
    { id: 2, name: '敌人', team: 'enemy', x: 7, y: 3, hp: 50 }
  ];
  battleData.currentTurn = 'player';
}

// ========== 工具函数 ==========
function drawButton(text, cx, cy, w, h, color) {
  const x = cx - w / 2;
  const y = cy - h / 2;

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
