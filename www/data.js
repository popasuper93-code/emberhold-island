// EMBERHOLD — DATA
const DATA = {
  saveVersion: 2,
  time: { dayLengthMin: 12, nightLengthMin: 5, decayScale: 0.35, growScale: 0.25 },
  world: { size: 800, chunkSize: 64, seed: 42 },
  survival: {
    maxHealth: 100, maxCalories: 500, maxHydration: 250, maxRadiation: 500,
    hungerRate: 0.6, thirstRate: 0.9, coldDamage: 1.8, bleedDps: 1.0,
    woundedDuration: 40, woundedChanceBase: 0.2
  },
  currency: { coins: 2500, slag: 0, emberCrystals: 0 },
  workbenches: { I: {cost:50}, II:{cost:500}, III:{cost:1250} },
  building: { twigHP: 10, timberHP: 250, stoneHP: 500, plateHP: 1000, starsteelHP: 2000, privilegeRadius: 40 },
  raid: { chargePackDmg: 550, siegeRocketDmg: 275, bundleChargeDmg: 85 },
  armor: {
    ironMask: [50,70,8,0,-4,8], metalChest:[25,20,3,0,-8,0],
    tinHelm:[35,50,8,5,0,8], radSuit:[30,30,8,50,5,5]
  },
  weapons: {
    stone:     { dmg: 12, rpm: 60,  mag: 1,  range: 2.5, name: 'Камень', type:'melee' },
    spear:     { dmg: 25, rpm: 45,  mag: 1,  range: 3.2, name: 'Копьё', type:'melee' },
    bow:       { dmg: 35, rpm: 40,  mag: 1,  range: 40,  name: 'Лук', type:'bow' },
    revolver:  { dmg: 45, rpm: 180, mag: 6,  range: 50,  name: 'Cobra Revolver', type:'gun' },
    smg:       { dmg: 28, rpm: 600, mag: 30, range: 45,  name: 'Hornet SMG', type:'gun' },
    ravager:   { dmg: 48, rpm: 450, mag: 30, range: 70,  name: 'Ravager AR', type:'gun' },
    scatter12: { dmg: 16, rpm: 55,  mag: 6,  range: 18,  name: 'Scatter-12', type:'shotgun' }
  },
  items: {
    wood: { name: 'Дерево', stack: 1000, icon: '🪵' },
    stone: { name: 'Камень', stack: 1000, icon: '🪨' },
    iron: { name: 'Осколки железа', stack: 1000, icon: '⚙️' },
    sulfur: { name: 'Кристалл пепла', stack: 1000, icon: '🔶' },
    fiber: { name: 'Ткань', stack: 100, icon: '🧵' },
    slag: { name: 'Шлак', stack: 1000, icon: '🔩' },
    bandage: { name: 'Бинт', stack: 10, icon: '🩹', heal: 15 },
    meat: { name: 'Сырое мясо', stack: 20, icon: '🥩', calories: 40 },
    cooked_meat: { name: 'Жареное мясо', stack: 20, icon: '🍖', calories: 120, water: 5 },
    berries: { name: 'Ягоды', stack: 20, icon: '🫐', calories: 40, water: 25 }
  },
  recipes: [
    { id: 'bandage', result: 'bandage', amount: 1, time: 3, station: null, cost: { fiber: 4 } },
    { id: 'spear', result: 'weapon:spear', amount: 1, time: 8, station: null, cost: { wood: 100, stone: 50 } },
    { id: 'bow', result: 'weapon:bow', amount: 1, time: 12, station: null, cost: { wood: 150, fiber: 20 } },
    { id: 'revolver', result: 'weapon:revolver', amount: 1, time: 25, station: 'I', cost: { iron: 80, slag: 40 } },
    { id: 'smg', result: 'weapon:smg', amount: 1, time: 40, station: 'II', cost: { iron: 150, slag: 120 } },
    { id: 'ravager', result: 'weapon:ravager', amount: 1, time: 60, station: 'III', cost: { iron: 250, slag: 300 } },
    { id: 'campfire', result: 'deploy:campfire', amount: 1, time: 5, station: null, cost: { wood: 50 } },
    { id: 'bedroll', result: 'deploy:bedroll', amount: 1, time: 10, station: null, cost: { fiber: 30 } },
    { id: 'foundation', result: 'build:foundation', amount: 1, time: 2, station: null, cost: { wood: 50 } },
    { id: 'wall', result: 'build:wall', amount: 1, time: 2, station: null, cost: { wood: 40 } },
    { id: 'door', result: 'build:door', amount: 1, time: 4, station: null, cost: { wood: 80 } }
  ],
  gyro: {
    mode: 'ads', sensHip: 1.0, sensAds: 0.55, multX: 1.0, multY: 1.0,
    invertX: false, invertY: false, deadzone: 0.4, smoothing: 0.25, preciseMode: true
  },
  graphics: { quality: 'medium', fpsLimit: 60, fov: 75, showFps: true },
  player: { nickname: 'AshWalker', level: 1, rank: 'Новичок', island: 1, equippedSkin: 'default' },
  rarities: {
    common: { chance: 0.55, color: '#9e9e9e' }, uncommon: { chance: 0.25, color: '#4caf50' },
    rare: { chance: 0.12, color: '#2196f3' }, epic: { chance: 0.06, color: '#9c27b0' },
    legendary: { chance: 0.02, color: '#ff9800' }
  },
  skins: [
    { id: 'default', name: 'Стандарт', rarity: 'common' },
    { id: 'lava', name: 'Лава', rarity: 'legendary' },
    { id: 'ice', name: 'Лёд', rarity: 'epic' },
    { id: 'neon', name: 'Неон', rarity: 'rare' }
  ],
  cases: [
    { id: 'basic', name: 'Базовый ящик', price: 100, pool: ['common','uncommon'] },
    { id: 'military', name: 'Военный', price: 400, pool: ['uncommon','rare','epic'] },
    { id: 'elite', name: 'Элитный', price: 1000, pool: ['rare','epic','legendary'] }
  ],
  lang: 'ru'
};

const Save = {
  key: 'emberhold_v2',
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e) { return null; }
  },
  save(state) {
    try {
      localStorage.setItem(this.key, JSON.stringify({
        saveVersion: DATA.saveVersion,
        ...state,
        ts: Date.now()
      }));
    } catch(e) {}
  }
};
