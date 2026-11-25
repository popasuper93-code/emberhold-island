// EMBERHOLD — gyro.js
const Gyro = {
  enabled: false, mode: 'ads',
  profile: {
    90:  { yawAxis:'beta', yawSign:1, pitchAxis:'gamma', pitchSign:1, bias:{alpha:0,beta:0,gamma:0} },
    270: { yawAxis:'beta', yawSign:-1, pitchAxis:'gamma', pitchSign:-1, bias:{alpha:0,beta:0,gamma:0} }
  },
  sensHip:1.0, sensAds:0.55, multX:1.0, multY:1.0,
  invertX:false, invertY:false, deadzone:0.4, smoothing:0.25, preciseMode:true,
  accYaw:0, accPitch:0, lastTs:0, smoothed:{yaw:0,pitch:0},
  isPaused:false, isHoldActive:false, permissionGranted:false, available:false,
  calibrating:false, calibStep:0, calibSamples:[], currentAngle:90,

  async requestPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const res = await DeviceMotionEvent.requestPermission();
        this.permissionGranted = (res === 'granted');
        return this.permissionGranted;
      } catch(e) { this.permissionGranted = false; return false; }
    }
    this.permissionGranted = true;
    return true;
  },

  init() {
    this.available = !!(window.DeviceMotionEvent);
    const s = Save.load();
    if (s && s.gyro) Object.assign(this, s.gyro);
    if (s && s.gyroProfiles) {
      if (s.gyroProfiles[90]) this.profile[90] = s.gyroProfiles[90];
      if (s.gyroProfiles[270]) this.profile[270] = s.gyroProfiles[270];
    }
    this._onMotionBound = this.onMotion.bind(this);
  },

  start() {
    if (!this.permissionGranted || this.enabled) return;
    this.enabled = true;
    this.lastTs = performance.now();
    window.addEventListener('devicemotion', this._onMotionBound);
    this._updateAngle();
  },

  stop() {
    this.enabled = false;
    window.removeEventListener('devicemotion', this._onMotionBound);
    this.accYaw = 0; this.accPitch = 0;
  },

  _updateAngle() {
    let angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    if (angle === 90 || angle === -270) this.currentAngle = 90;
    else if (angle === -90 || angle === 270) this.currentAngle = 270;
    else this.currentAngle = 90;
  },

  onMotion(e) {
    if (!this.enabled || this.isPaused || this.calibrating) return;
    const rr = e.rotationRate; if (!rr) return;
    let a = rr.alpha||0, b = rr.beta||0, g = rr.gamma||0;
    const maxAbs = Math.max(Math.abs(a), Math.abs(b), Math.abs(g));
    if (maxAbs < 10 && maxAbs > 0.01) { a*=57.2958; b*=57.2958; g*=57.2958; }
    const prof = this.profile[this.currentAngle] || this.profile[90];
    const rates = { alpha:a, beta:b, gamma:g };
    a -= (prof.bias.alpha||0); b -= (prof.bias.beta||0); g -= (prof.bias.gamma||0);
    let rateYaw = rates[prof.yawAxis] * (prof.yawSign||1);
    let ratePitch = rates[prof.pitchAxis] * (prof.pitchSign||1);
    const dz = this.deadzone;
    if (Math.abs(rateYaw) < dz) rateYaw = 0; else rateYaw = rateYaw > 0 ? rateYaw - dz : rateYaw + dz;
    if (Math.abs(ratePitch) < dz) ratePitch = 0; else ratePitch = ratePitch > 0 ? ratePitch - dz : ratePitch + dz;
    const sm = this.smoothing;
    this.smoothed.yaw = this.smoothed.yaw * sm + rateYaw * (1-sm);
    this.smoothed.pitch = this.smoothed.pitch * sm + ratePitch * (1-sm);
    const now = performance.now();
    const dt = Math.min((now - this.lastTs)/1000, 0.05);
    this.lastTs = now;
    this.accYaw += this.smoothed.yaw * dt;
    this.accPitch += this.smoothed.pitch * dt;
  },

  consume(dt, isAds, zoom) {
    if (!this.enabled || this.isPaused) { this.accYaw=0; this.accPitch=0; return {yaw:0,pitch:0}; }
    let active = false;
    if (this.mode === 'always') active = true;
    else if (this.mode === 'ads') active = !!isAds;
    else if (this.mode === 'hold') active = this.isHoldActive;
    else if (this.mode === 'ads_fire') active = !!isAds;
    if (!active) { this.accYaw=0; this.accPitch=0; return {yaw:0,pitch:0}; }
    let sens = isAds ? this.sensAds : this.sensHip;
    if (isAds && zoom > 1) sens /= Math.sqrt(zoom);
    let yaw = this.accYaw * sens * this.multX * (this.invertX ? -1 : 1);
    let pitch = this.accPitch * sens * this.multY * (this.invertY ? -1 : 1);
    this.accYaw = 0; this.accPitch = 0;
    return { yaw, pitch };
  },

  setPaused(v) { this.isPaused = !!v; },
  setHold(v) { this.isHoldActive = !!v; },

  startCalibration(onStep, onDone) {
    this.calibrating = true; this.calibStep = 1; this.calibSamples = [];
    if (onStep) onStep(1, 'Медленно поверни телефон вправо');
  },
  calibTick(e) {
    if (!this.calibrating) return;
    const rr = e.rotationRate; if (!rr) return;
    this.calibSamples.push({ alpha:rr.alpha||0, beta:rr.beta||0, gamma:rr.gamma||0 });
  },
  calibNextStep(onStep, onDone) {
    if (this.calibStep === 1) {
      const axis = this._findDominant(this.calibSamples);
      const p = this.profile[this.currentAngle];
      p.yawAxis = axis.name; p.yawSign = axis.sign;
      this.calibSamples = []; this.calibStep = 2;
      if (onStep) onStep(2, 'Наклони верх телефона вверх');
    } else if (this.calibStep === 2) {
      const axis = this._findDominant(this.calibSamples);
      const p = this.profile[this.currentAngle];
      p.pitchAxis = axis.name === p.yawAxis ? (axis.name==='beta'?'gamma':'beta') : axis.name;
      p.pitchSign = axis.sign;
      this.calibSamples = []; this.calibStep = 3;
      if (onStep) onStep(3, 'Держи телефон неподвижно…');
      setTimeout(() => {
        this._collectBias(() => {
          this.calibrating = false; this.calibStep = 0;
          this._save(); if (onDone) onDone(true);
        });
      }, 1000);
    }
  },
  _findDominant(samples) {
    if (!samples.length) return {name:'beta', sign:1};
    let sa=0,sb=0,sg=0;
    samples.forEach(s => { sa+=Math.abs(s.alpha); sb+=Math.abs(s.beta); sg+=Math.abs(s.gamma); });
    const max = Math.max(sa,sb,sg);
    let name = max===sa ? 'alpha' : (max===sg ? 'gamma' : 'beta');
    let avg = 0; samples.forEach(s => avg += s[name]); avg /= samples.length;
    return { name, sign: avg>=0 ? 1 : -1 };
  },
  _collectBias(cb) {
    const samples = [];
    const h = e => { const rr=e.rotationRate; if(rr) samples.push({alpha:rr.alpha||0,beta:rr.beta||0,gamma:rr.gamma||0}); };
    window.addEventListener('devicemotion', h);
    setTimeout(() => {
      window.removeEventListener('devicemotion', h);
      const p = this.profile[this.currentAngle];
      if (samples.length) {
        let a=0,b=0,g=0; samples.forEach(s=>{a+=s.alpha;b+=s.beta;g+=s.gamma;});
        const n=samples.length; p.bias={alpha:a/n,beta:b/n,gamma:g/n};
      }
      cb();
    }, 900);
  },
  _save() {
    const st = Save.load() || {};
    st.gyro = { mode:this.mode, sensHip:this.sensHip, sensAds:this.sensAds, multX:this.multX, multY:this.multY,
      invertX:this.invertX, invertY:this.invertY, deadzone:this.deadzone, smoothing:this.smoothing, preciseMode:this.preciseMode };
    st.gyroProfiles = this.profile;
    Save.save(st);
  },
  getLiveRates() { return { yaw:this.smoothed.yaw, pitch:this.smoothed.pitch, angle:this.currentAngle }; }
};
Gyro.init();
