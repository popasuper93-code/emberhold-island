// EMBERHOLD — main.js (ядро игры)
const Game = {
  mode: 'lobby',
  scene: null, camera: null, renderer: null, clock: null,
  player: null, inventory: null,
  keys: {}, touches: {}, mouse: {x:0,y:0,dx:0,dy:0,locked:false},
  isAds: false, yaw: 0, pitch: 0,
  animals: [], trees: [], ores: [], loot: [],
  dayTime: 0.3, fps: 0, frameCount: 0, lastFps: 0,
  craftQueue: [], message: '', messageTimer: 0,

  init() {
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setClearColor(0x87a0c0);
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x87a0c0, 0.008);
    this.camera = new THREE.PerspectiveCamera(DATA.graphics.fov, innerWidth/innerHeight, 0.1, 400);
    this.camera.position.set(0, 1.7, 0);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.1);
    this.sun.position.set(50, 80, 30);
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0x405060, 0.45));
    this.hemi = new THREE.HemisphereLight(0x87a0c0, 0x3a2a1a, 0.35);
    this.scene.add(this.hemi);
    this._buildLobbyScene();
    this._initInput();
    window.addEventListener('resize', () => this._onResize());
    this._loop();
  },

  _onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  },

  _buildLobbyScene() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: 0x2a1e14 }));
    ground.rotation.x = -Math.PI/2; this.scene.add(ground);
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a3228 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 2.5, 0.5), mat);
    wall.position.set(0, 1.25, -6); this.scene.add(wall);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 2), mat);
    tower.position.set(4, 2.5, -5); this.scene.add(tower);
    this.lobbyChar = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1, 8), new THREE.MeshLambertMaterial({color:0x3a3228}));
    body.position.y = 1.1; this.lobbyChar.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshLambertMaterial({color:0xc4a882}));
    head.position.y = 1.8; this.lobbyChar.add(head);
    this.lobbyChar.position.set(0, 0, 1); this.scene.add(this.lobbyChar);
    this.fireLight = new THREE.PointLight(0xff6622, 1.3, 10);
    this.fireLight.position.set(2, 0.8, 1); this.scene.add(this.fireLight);
    this.camera.position.set(0, 1.8, 5); this.camera.lookAt(0, 1.2, 0);
  },

  startGame() {
    this.mode = 'playing';
    while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    this.scene.fog = new THREE.FogExp2(0x87a0c0, 0.006);
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0x405060, 0.4));
    this.scene.add(this.hemi);
    this._generateWorld();
    this._spawnPlayer();
    this._spawnAnimals();
    this._spawnLoot();
    document.getElementById('lobby-ui').classList.remove('visible');
    document.getElementById('hud').classList.add('visible');
    this.msg('Добро пожаловать на Остров Пепла. Выживи.');
  },

  _generateWorld() {
    const size = DATA.world.size;
    const geo = new THREE.PlaneGeometry(size, size, 64, 64);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = Math.sin(x*0.02)*3 + Math.cos(z*0.015)*2 + (Math.random()-0.5)*0.8;
      pos.setY(i, Math.max(0, h));
    }
    geo.computeVertexNormals();
    this.terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x3d6b3a }));
    this.terrain.rotation.x = -Math.PI/2; this.scene.add(this.terrain);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(size*1.5, size*1.5), new THREE.MeshLambertMaterial({ color: 0x1a4a6a, transparent: true, opacity: 0.75 }));
    water.rotation.x = -Math.PI/2; water.position.y = -0.3; this.scene.add(water);
    this.trees = [];
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d4a1e });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    for (let i = 0; i < 120; i++) {
      const x = (Math.random()-0.5)*size*0.85, z = (Math.random()-0.5)*size*0.85;
      if (Math.abs(x)<15 && Math.abs(z)<15) continue;
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.5, 5), trunkMat);
      trunk.position.y = 1.25; g.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.4, 6, 5), treeMat);
      crown.position.y = 3.2; g.add(crown);
      g.position.set(x, 0, z);
      g.userData = { type: 'tree', hp: 100, maxHp: 100, wood: 80 + Math.random()*40 };
      this.scene.add(g); this.trees.push(g);
    }
    this.ores = [];
    const oreMat = new THREE.MeshLambertMaterial({ color: 0x6a6a6a });
    for (let i = 0; i < 40; i++) {
      const x = (Math.random()-0.5)*size*0.8, z = (Math.random()-0.5)*size*0.8;
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), oreMat);
      mesh.position.set(x, 0.5, z);
      mesh.userData = { type: 'ore', hp: 80, maxHp: 80, resource: Math.random()>0.6 ? 'sulfur' : (Math.random()>0.4?'iron':'stone'), amount: 40+Math.random()*30 };
      this.scene.add(mesh); this.ores.push(mesh);
    }
  },

  _spawnPlayer() {
    this.player = {
      pos: new THREE.Vector3(0, 1.7, 0), vel: new THREE.Vector3(),
      health: DATA.survival.maxHealth, calories: 350, hydration: 180, radiation: 0, bleed: 0,
      wounded: false, woundedTimer: 0, speed: 5.5, onGround: true, weapon: 'stone',
      buildingMode: false
    };
    this.inventory = { slots: new Array(24).fill(null), hotbar: new Array(6).fill(null), selected: 0 };
    this._addItem('wood', 50); this._addItem('stone', 30); this._addItem('fiber', 10);
    this.inventory.hotbar[0] = { id: 'weapon:stone', amount: 1 };
    this.camera.position.copy(this.player.pos);
  },

  _spawnAnimals() {
    this.animals = [];
    const colors = [0x8a6a4a, 0x4a3a2a, 0xc4a882];
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.6), new THREE.MeshLambertMaterial({color: colors[i%3]}));
      body.position.y = 0.5; g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.45), new THREE.MeshLambertMaterial({color: colors[i%3]}));
      head.position.set(0.7, 0.6, 0); g.add(head);
      const x = (Math.random()-0.5)*DATA.world.size*0.7, z = (Math.random()-0.5)*DATA.world.size*0.7;
      g.position.set(x, 0, z);
      g.userData = { type: Math.random()>0.7 ? 'wolf' : (Math.random()>0.5?'boar':'deer'), hp: 80 + Math.random()*60, maxHp: 100, state: 'idle', timer: Math.random()*5, speed: 3 + Math.random()*2 };
      this.scene.add(g); this.animals.push(g);
    }
  },

  _spawnLoot() {
    this.loot = [];
    for (let i = 0; i < 25; i++) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.7, 8), new THREE.MeshLambertMaterial({ color: 0x5a4a2a }));
      const x = (Math.random()-0.5)*DATA.world.size*0.75, z = (Math.random()-0.5)*DATA.world.size*0.75;
      mesh.position.set(x, 0.35, z);
      mesh.userData = { type: 'barrel', looted: false, items: this._randomLoot() };
      this.scene.add(mesh); this.loot.push(mesh);
    }
  },

  _randomLoot() {
    const pool = ['wood','stone','iron','fiber','slag','bandage','berries'];
    const items = [];
    for (let i=0;i<2+Math.floor(Math.random()*3);i++) {
      const id = pool[Math.floor(Math.random()*pool.length)];
      items.push({ id, amount: 5 + Math.floor(Math.random()*20) });
    }
    return items;
  },

  _initInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this._interact();
      if (e.code === 'KeyB') this._toggleBuild();
      if (e.code === 'Tab') { e.preventDefault(); this._toggleInventory(); }
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.replace('Digit','')) - 1;
        if (n >= 0 && n < 6) this.inventory.selected = n;
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', () => { if (this.mode === 'playing' && !this.mouse.locked) canvas.requestPointerLock(); });
    document.addEventListener('pointerlockchange', () => { this.mouse.locked = document.pointerLockElement === canvas; });
    document.addEventListener('mousemove', e => { if (this.mouse.locked) { this.mouse.dx += e.movementX; this.mouse.dy += e.movementY; } });
    document.addEventListener('mousedown', e => { if (e.button === 0) this._fire(); if (e.button === 2) this.isAds = true; });
    document.addEventListener('mouseup', e => { if (e.button === 2) this.isAds = false; });
    document.addEventListener('contextmenu', e => e.preventDefault());

    const joy = document.getElementById('joystick');
    const joyKnob = document.getElementById('joy-knob');
    let joyOrigin = null;
    if (joy) {
      joy.addEventListener('touchstart', e => { e.preventDefault(); const r = joy.getBoundingClientRect(); joyOrigin = { x: r.left + r.width/2, y: r.top + r.height/2 }; this.touches.move = { x:0, y:0 }; }, {passive:false});
      joy.addEventListener('touchmove', e => { e.preventDefault(); if (!joyOrigin) return; const t = e.touches[0]; let dx = (t.clientX - joyOrigin.x)/50, dy = (t.clientY - joyOrigin.y)/50; const len = Math.hypot(dx,dy); if (len>1){dx/=len;dy/=len;} this.touches.move = {x:dx,y:dy}; if(joyKnob) joyKnob.style.transform = `translate(${dx*40}px,${dy*40}px)`; }, {passive:false});
      joy.addEventListener('touchend', () => { this.touches.move = null; joyOrigin = null; if(joyKnob) joyKnob.style.transform = 'translate(0,0)'; });
    }
    const look = document.getElementById('look-area');
    if (look) {
      let lastX, lastY;
      look.addEventListener('touchstart', e => { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }, {passive:true});
      look.addEventListener('touchmove', e => { const t = e.touches[0]; this.mouse.dx += (t.clientX-lastX)*1.8; this.mouse.dy += (t.clientY-lastY)*1.8; lastX=t.clientX; lastY=t.clientY; }, {passive:true});
    }
    document.getElementById('btn-fire')?.addEventListener('touchstart', e => { e.preventDefault(); this._fire(); });
    document.getElementById('btn-ads')?.addEventListener('touchstart', e => { e.preventDefault(); this.isAds = true; });
    document.getElementById('btn-ads')?.addEventListener('touchend', () => { this.isAds = false; });
    document.getElementById('btn-jump')?.addEventListener('touchstart', e => { e.preventDefault(); this.keys['Space'] = true; setTimeout(()=>this.keys['Space']=false, 200); });
    document.getElementById('btn-use')?.addEventListener('touchstart', e => { e.preventDefault(); this._interact(); });
    document.getElementById('btn-inv')?.addEventListener('touchstart', e => { e.preventDefault(); this._toggleInventory(); });
    document.getElementById('btn-build')?.addEventListener('touchstart', e => { e.preventDefault(); this._toggleBuild(); });
  },

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.frameCount++;
    if (this.clock.elapsedTime - this.lastFps > 0.5) {
      this.fps = Math.round(this.frameCount / (this.clock.elapsedTime - this.lastFps));
      this.frameCount = 0; this.lastFps = this.clock.elapsedTime;
    }
    if (this.mode === 'lobby') this._updateLobby(dt);
    else if (this.mode === 'playing') this._updatePlaying(dt);
    this.renderer.render(this.scene, this.camera);
    this._updateHUD();
  },

  _updateLobby(dt) {
    if (this.lobbyChar) this.lobbyChar.rotation.y += dt * 0.3;
    if (this.fireLight) this.fireLight.intensity = 1.1 + Math.sin(this.clock.elapsedTime*8)*0.3;
  },

  _updatePlaying(dt) {
    this.dayTime = (this.dayTime + dt / (DATA.time.dayLengthMin * 60)) % 1;
    const isNight = this.dayTime < 0.25 || this.dayTime > 0.75;
    this.sun.intensity = isNight ? 0.15 : 1.0;
    this.scene.fog.color.set(isNight ? 0x0a1020 : 0x87a0c0);
    this.renderer.setClearColor(isNight ? 0x0a1020 : 0x87a0c0);

    const sens = this.isAds ? 0.0012 : 0.0022;
    this.yaw -= this.mouse.dx * sens;
    this.pitch -= this.mouse.dy * sens;
    this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
    this.mouse.dx = 0; this.mouse.dy = 0;

    const g = Gyro.consume(dt, this.isAds, this.isAds ? 1.5 : 1);
    this.yaw -= g.yaw * 0.02;
    this.pitch -= g.pitch * 0.02;
    this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));

    const p = this.player;
    if (!p.wounded) {
      let mx = 0, mz = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) mz -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) mz += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
      if (this.touches.move) { mx += this.touches.move.x; mz += this.touches.move.y; }
      const len = Math.hypot(mx, mz); if (len > 0) { mx/=len; mz/=len; }
      const speed = p.speed * (this.keys['ShiftLeft'] ? 1.6 : 1) * (this.isAds ? 0.55 : 1);
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      p.vel.x = (forward.x * -mz + right.x * mx) * speed;
      p.vel.z = (forward.z * -mz + right.z * mx) * speed;
      if (this.keys['Space'] && p.onGround) { p.vel.y = 7; p.onGround = false; }
      p.vel.y -= 18 * dt;
      p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt; p.pos.z += p.vel.z * dt;
      if (p.pos.y < 1.7) { p.pos.y = 1.7; p.vel.y = 0; p.onGround = true; }
      const half = DATA.world.size/2 - 5;
      p.pos.x = Math.max(-half, Math.min(half, p.pos.x));
      p.pos.z = Math.max(-half, Math.min(half, p.pos.z));
    }
    this.camera.position.copy(p.pos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    p.calories = Math.max(0, p.calories - DATA.survival.hungerRate * dt);
    p.hydration = Math.max(0, p.hydration - DATA.survival.thirstRate * dt);
    if (p.calories <= 0 || p.hydration <= 0) p.health -= 2 * dt;
    if (p.bleed > 0) { p.health -= DATA.survival.bleedDps * dt; p.bleed = Math.max(0, p.bleed - dt*0.3); }
    if (p.wounded) {
      p.woundedTimer -= dt;
      if (p.woundedTimer <= 0) { p.wounded = false; p.health = 10; }
    }
    if (p.health <= 0 && !p.wounded) {
      if (Math.random() < DATA.survival.woundedChanceBase) {
        p.wounded = true; p.woundedTimer = DATA.survival.woundedDuration; p.health = 1;
        this.msg('Вы ранены!');
      } else this._die();
    }

    this.animals.forEach(a => {
      const ud = a.userData;
      ud.timer -= dt;
      if (ud.timer <= 0) {
        ud.timer = 2 + Math.random()*4;
        if ((ud.type === 'wolf' || ud.type === 'boar') && a.position.distanceTo(p.pos) < 25) ud.state = 'chase';
        else ud.state = 'wander';
      }
      if (ud.state === 'wander') {
        a.rotation.y += (Math.random()-0.5)*dt*2;
        a.position.x += Math.sin(a.rotation.y) * ud.speed * 0.3 * dt;
        a.position.z += Math.cos(a.rotation.y) * ud.speed * 0.3 * dt;
      } else if (ud.state === 'chase') {
        const dir = p.pos.clone().sub(a.position).setY(0).normalize();
        a.position.add(dir.multiplyScalar(ud.speed * dt));
        a.lookAt(p.pos.x, a.position.y, p.pos.z);
        if (a.position.distanceTo(p.pos) < 2.2) { p.health -= 12 * dt; p.bleed += 0.5 * dt; }
      }
    });

    if (this.craftQueue.length) {
      const c = this.craftQueue[0];
      c.left -= dt;
      if (c.left <= 0) {
        this._giveCraftResult(c.recipe);
        this.craftQueue.shift();
        this.msg('Скрафчено');
      }
    }
    if (this.messageTimer > 0) this.messageTimer -= dt;
  },

  _fire() {
    if (this.mode !== 'playing' || this.player.wounded) return;
    const slot = this.inventory.hotbar[this.inventory.selected];
    if (!slot) return;
    const wid = slot.id.replace('weapon:','');
    const w = DATA.weapons[wid];
    if (!w) return;
    if (w.type === 'melee') {
      for (const t of this.trees) {
        if (t.position.distanceTo(this.player.pos) < 4) {
          t.userData.hp -= 18;
          if (t.userData.hp <= 0) {
            this._addItem('wood', Math.floor(t.userData.wood));
            this.scene.remove(t); this.trees = this.trees.filter(x => x !== t);
            this.msg('+ дерево');
          }
          return;
        }
      }
      for (const o of this.ores) {
        if (o.position.distanceTo(this.player.pos) < 3.5) {
          o.userData.hp -= 15;
          if (o.userData.hp <= 0) {
            this._addItem(o.userData.resource, Math.floor(o.userData.amount));
            this.scene.remove(o); this.ores = this.ores.filter(x => x !== o);
            this.msg('+ ' + o.userData.resource);
          }
          return;
        }
      }
      for (const a of this.animals) {
        if (a.position.distanceTo(this.player.pos) < w.range + 0.5) {
          a.userData.hp -= w.dmg;
          if (a.userData.hp <= 0) {
            this._addItem('meat', 3 + Math.floor(Math.random()*4));
            this._addItem('fiber', 2);
            this.scene.remove(a); this.animals = this.animals.filter(x => x !== a);
            this.msg('Животное убито');
          }
          return;
        }
      }
      return;
    }
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
    dir.x += (Math.random()-0.5)*0.04; dir.y += (Math.random()-0.5)*0.04;
    this.pitch += 0.04 + Math.random()*0.03;
    this.yaw += (Math.random()-0.5)*0.025;
    for (const a of this.animals) {
      const to = a.position.clone().add(new THREE.Vector3(0,0.5,0)).sub(this.camera.position);
      if (to.length() > w.range) continue;
      if (dir.angleTo(to.normalize()) < 0.12) {
        a.userData.hp -= w.dmg;
        if (a.userData.hp <= 0) {
          this._addItem('meat', 3 + Math.floor(Math.random()*4));
          this.scene.remove(a); this.animals = this.animals.filter(x => x !== a);
        }
        break;
      }
    }
  },

  _interact() {
    for (const l of this.loot) {
      if (!l.userData.looted && l.position.distanceTo(this.player.pos) < 3) {
        l.userData.looted = true; l.material.color.set(0x2a2a2a);
        l.userData.items.forEach(it => this._addItem(it.id, it.amount));
        this.msg('Обыскано'); return;
      }
    }
    const slot = this.inventory.hotbar[this.inventory.selected];
    if (slot) {
      if (slot.id === 'bandage') {
        this.player.health = Math.min(DATA.survival.maxHealth, this.player.health + 15);
        this.player.bleed = 0; slot.amount--;
        if (slot.amount <= 0) this.inventory.hotbar[this.inventory.selected] = null;
        this.msg('+HP');
      } else if (['berries','cooked_meat','meat'].includes(slot.id)) {
        const it = DATA.items[slot.id];
        if (it.calories) this.player.calories = Math.min(DATA.survival.maxCalories, this.player.calories + it.calories);
        if (it.water) this.player.hydration = Math.min(DATA.survival.maxHydration, this.player.hydration + it.water);
        slot.amount--; if (slot.amount <= 0) this.inventory.hotbar[this.inventory.selected] = null;
        this.msg('Съедено');
      }
    }
  },

  _toggleBuild() { this.player.buildingMode = !this.player.buildingMode; this.msg(this.player.buildingMode ? 'Строительство' : 'Строительство выкл'); },
  _toggleInventory() { document.getElementById('inv-panel')?.classList.toggle('open'); },

  _die() {
    this.msg('Вы погибли. Респавн…');
    setTimeout(() => {
      this.player.health = DATA.survival.maxHealth;
      this.player.calories = 200; this.player.hydration = 150;
      this.player.bleed = 0; this.player.wounded = false;
      this.player.pos.set((Math.random()-0.5)*30, 1.7, (Math.random()-0.5)*30);
      this.yaw = 0; this.pitch = 0;
    }, 2000);
  },

  _addItem(id, amount) {
    for (let i=0;i<6;i++) { const s = this.inventory.hotbar[i]; if (s && s.id === id) { s.amount += amount; return; } }
    for (let i=0;i<6;i++) { if (!this.inventory.hotbar[i]) { this.inventory.hotbar[i] = {id, amount}; return; } }
    for (let i=0;i<24;i++) { const s = this.inventory.slots[i]; if (s && s.id === id) { s.amount += amount; return; } }
    for (let i=0;i<24;i++) { if (!this.inventory.slots[i]) { this.inventory.slots[i] = {id, amount}; return; } }
  },

  _hasItems(cost) {
    for (const [id, need] of Object.entries(cost)) {
      let have = 0;
      [...this.inventory.hotbar, ...this.inventory.slots].forEach(s => { if (s && s.id === id) have += s.amount; });
      if (have < need) return false;
    }
    return true;
  },

  _consumeItems(cost) {
    for (const [id, need] of Object.entries(cost)) {
      let left = need;
      for (const s of [...this.inventory.hotbar, ...this.inventory.slots]) {
        if (!s || s.id !== id) continue;
        const take = Math.min(s.amount, left); s.amount -= take; left -= take;
        if (left <= 0) break;
      }
    }
    this.inventory.hotbar = this.inventory.hotbar.map(s => s && s.amount > 0 ? s : null);
    this.inventory.slots = this.inventory.slots.map(s => s && s.amount > 0 ? s : null);
  },

  craft(recipeId) {
    const recipe = DATA.recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    if (!this._hasItems(recipe.cost)) { this.msg('Не хватает ресурсов'); return; }
    this._consumeItems(recipe.cost);
    this.craftQueue.push({ recipe, left: recipe.time });
    this.msg('Крафт…');
  },

  _giveCraftResult(recipe) {
    if (recipe.result.startsWith('weapon:') || !recipe.result.startsWith('build:')) {
      this._addItem(recipe.result.startsWith('weapon:') ? recipe.result : recipe.result, recipe.amount || 1);
    }
  },

  msg(t) { this.message = t; this.messageTimer = 3; },

  _updateHUD() {
    if (this.mode !== 'playing') return;
    const p = this.player;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('hud-hp', Math.ceil(p.health)); set('hud-cal', Math.ceil(p.calories)); set('hud-hyd', Math.ceil(p.hydration)); set('hud-fps', this.fps);
    const msgEl = document.getElementById('hud-msg');
    if (msgEl) { msgEl.textContent = this.messageTimer > 0 ? this.message : ''; msgEl.style.opacity = this.messageTimer > 0 ? '1' : '0'; }
    for (let i=0;i<6;i++) {
      const el = document.getElementById('hb-'+i); if (!el) continue;
      el.classList.toggle('selected', i === this.inventory.selected);
      const s = this.inventory.hotbar[i];
      el.innerHTML = s ? (DATA.items[s.id]?.icon || '⚔️') + (s.amount>1?'<small>'+s.amount+'</small>':'') : '';
    }
  }
};

window.addEventListener('load', () => {
  Game.init();
  document.getElementById('btn-continue')?.addEventListener('click', () => Game.startGame());
  document.getElementById('btn-settings')?.addEventListener('click', () => document.getElementById('modal-settings')?.classList.add('open'));
  document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', e => e.target.closest('.modal-overlay')?.classList.remove('open')));
  document.getElementById('craft-list')?.addEventListener('click', e => { const id = e.target.dataset.craft; if (id) Game.craft(id); });
});
