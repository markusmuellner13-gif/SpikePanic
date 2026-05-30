import {
  W, H, C, LEVELS, ACHIEVEMENTS, DEATH_MSGS, HIGH_DEATH_MSGS,
  BALL_R, BALL_R_VISUAL, GRAVITY, JUMP_VEL, MOVE_SPEED, MAX_VEL_X,
  DRIFT_MAX, COYOTE_MS, COINS_PER_LEVEL,
} from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.levelId       = data.levelId ?? 0;
    this.sessionDeaths = data.sessionDeaths ?? 0;
    this.isDead        = false;
    this.isComplete    = false;
    this.gravFlipped   = false;
    this.coyoteTime    = 0;
    this.drift         = 0;
    this.driftTarget   = 0;
    this.driftTimer    = 0;
    this.onGround      = false;
    this.crumbles      = [];
    this.mobileLeft    = false;
    this.mobileRight   = false;
    this.mobileJump    = false;
    this.cargoX        = 0;
    this.cargoY        = 0;
    this.cargoVelX     = 0;
    this.cargoVelY     = 0;
    this._achieveQueue = [];
  }

  create() {
    this.level = LEVELS[this.levelId];
    const lv   = this.level;

    this.physics.world.gravity.set(lv.gravity.x, lv.gravity.y);
    this.physics.world.setBounds(0, 0, lv.width, lv.height);

    // Background
    this.bg = this.add.image(0, 0, `bg_${this.levelId % 10}`)
      .setOrigin(0).setScrollFactor(0).setDisplaySize(W, H);

    // Parallax stars
    this.starsGfx = this.add.graphics().setScrollFactor(0.1);
    for (let i = 0; i < 80; i++) {
      this.starsGfx.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.05, 0.3));
      this.starsGfx.fillCircle(
        Phaser.Math.Between(0, lv.width),
        Phaser.Math.Between(0, lv.height),
        Phaser.Math.FloatBetween(0.5, 1.5)
      );
    }

    // Physics groups
    this.platforms  = this.physics.add.staticGroup();
    this.movingGroup = this.physics.add.group();
    this.hazardGroup = this.physics.add.staticGroup();
    this.windZones   = [];
    this.gravZones   = [];

    this.buildLevel(lv);

    // Goal
    this.goalSprite = this.add.image(lv.goal.x, lv.goal.y, 'goal').setScale(0.8);
    this.physics.add.existing(this.goalSprite, true);
    this.tweens.add({ targets: this.goalSprite, angle: 360, duration: 3000, repeat: -1, ease: 'Linear' });
    this.tweens.add({
      targets: this.goalSprite,
      scaleX: { from: 0.75, to: 0.85 }, scaleY: { from: 0.75, to: 0.85 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Goal label
    this.add.text(lv.goal.x, lv.goal.y - 48, 'DELIVER HERE', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#ffee00',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.goalGlow      = this.add.graphics();
    this.goalGlowAngle = 0;

    // Player
    const skinKey = Storage.get().selectedSkin || 'rage';
    this.player = this.physics.add.sprite(lv.start.x, lv.start.y, `ball_${skinKey}`);
    this.player.setCircle(BALL_R, BALL_R_VISUAL - BALL_R, BALL_R_VISUAL - BALL_R);
    this.player.setBounce(0.12);
    this.player.setDragX(700);
    this.player.setMaxVelocity(MAX_VEL_X, 950);
    this.player.setDepth(10);

    // Cargo orb (the precious cargo the player carries)
    this.createCargoOrb(lv.start.x, lv.start.y);

    // Particles
    this.trailParticles = this.add.particles(0, 0, 'particle', {
      speed: { min: 60, max: 200 },
      scale: { start: 0.5, end: 0 },
      lifespan: 400,
      alpha: { start: 0.9, end: 0 },
      tint: [0xff4444, 0xff9900, 0xffff44, 0xff2200],
      frequency: -1,
    });
    this.dustParticles = this.add.particles(0, 0, 'particle', {
      speed: { min: 10, max: 40 },
      scale: { start: 0.3, end: 0 },
      lifespan: 200,
      alpha: { start: 0.5, end: 0 },
      tint: [0xaaaaaa, 0x888888],
      angle: { min: -150, max: -30 },
      frequency: -1,
    });
    this.cargoParticles = this.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 80 },
      scale: { start: 0.35, end: 0 },
      lifespan: 300,
      alpha: { start: 0.8, end: 0 },
      tint: [0xffcc00, 0xffee88],
      frequency: -1,
    });

    // Colliders / overlaps
    this.physics.add.collider(this.player, this.platforms,   this.onPlatformCollide, null, this);
    this.physics.add.collider(this.player, this.movingGroup, this.onMovingCollide,   null, this);
    this.physics.add.overlap(this.player,  this.hazardGroup, this.hitHazard,         null, this);
    this.physics.add.overlap(this.player,  this.goalSprite,  this.reachGoal,         null, this);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, lv.width, lv.height);
    this.cameras.main.setBackgroundColor(C.bg);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd    = {
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Fullscreen toggle
    this.input.keyboard.on('keydown-F', () => this.toggleFullscreen());

    // HUD
    this.createHUD();
    this.createMobileControls();

    // Level tip
    this.startTime = this.time.now;
    this.elapsed   = 0;
    if (Storage.get().settings.showTips && lv.tip) this.showTip(lv.tip);

    this.cameras.main.fadeIn(300);
  }

  // ─── Cargo orb setup ────────────────────────────────────────
  createCargoOrb(sx, sy) {
    this.cargoX = sx;
    this.cargoY = sy - BALL_R_VISUAL - 10;

    this.cargoGlow = this.add.circle(this.cargoX, this.cargoY, 13, 0xffcc00, 0.28).setDepth(9);
    this.cargoOrb  = this.add.circle(this.cargoX, this.cargoY, 7,  0xffee44, 1.0).setDepth(11);

    this.tweens.add({
      targets: this.cargoGlow,
      alpha: { from: 0.18, to: 0.42 },
      radius: { from: 11, to: 16 },
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  updateCargoOrb(delta) {
    if (!this.cargoOrb || this.isComplete) return;

    const dt = delta / 1000;
    const SPRING  = 22;
    const DAMP    = 7;
    const WOBBLE  = 0.08;

    const targetX = this.player.x + this.player.body.velocity.x * WOBBLE;
    const targetY = this.player.y - BALL_R_VISUAL - 10;

    const dx = targetX - this.cargoX;
    const dy = targetY - this.cargoY;

    this.cargoVelX += (dx * SPRING - this.cargoVelX * DAMP) * dt;
    this.cargoVelY += (dy * SPRING - this.cargoVelY * DAMP) * dt;

    this.cargoX += this.cargoVelX * dt;
    this.cargoY += this.cargoVelY * dt;

    this.cargoOrb.setPosition(this.cargoX, this.cargoY);
    this.cargoGlow.setPosition(this.cargoX, this.cargoY);

    // Tiny sparkle trail while airborne
    if (!this.onGround && Math.random() < 0.15) {
      this.cargoParticles.emitParticleAt(this.cargoX, this.cargoY, 1);
    }
  }

  dropCargoOrb() {
    if (!this.cargoOrb) return;
    this.tweens.killTweensOf(this.cargoGlow);
    // Cargo flings upward and fades — the precious cargo escapes without the player
    this.tweens.add({
      targets: [this.cargoOrb, this.cargoGlow],
      y: this.cargoY - 120,
      alpha: 0,
      scaleX: { from: 1, to: 2.5 },
      scaleY: { from: 1, to: 2.5 },
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => { this.cargoOrb?.destroy(); this.cargoGlow?.destroy(); },
    });
    this.cargoParticles.emitParticleAt(this.cargoX, this.cargoY, 12);
  }

  deliverCargoOrb() {
    if (!this.cargoOrb) return;
    const gx = this.level.goal.x;
    const gy = this.level.goal.y;
    this.tweens.add({
      targets: [this.cargoOrb, this.cargoGlow],
      x: gx, y: gy,
      scaleX: 2, scaleY: 2,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeIn',
      onComplete: () => { this.cargoOrb?.destroy(); this.cargoGlow?.destroy(); },
    });
    for (let i = 0; i < 20; i++) {
      this.cargoParticles.emitParticleAt(gx, gy, 1);
    }
  }

  // ─── Level builder ──────────────────────────────────────────
  buildLevel(lv) {
    lv.platforms.forEach(pd => {
      const p = this.platforms.create(pd.x + pd.w / 2, pd.y + pd.h / 2, `plat_${pd.type}`)
        .setDisplaySize(pd.w, pd.h).refreshBody();
      p.platformType = pd.type;
    });

    (lv.moving || []).forEach(md => {
      const cx = md.x + md.w / 2;
      const cy = md.y + md.h / 2;
      if (md.type === 'crumble' || (md.rangeX === 0 && md.rangeY === 0)) {
        if (md.type === 'crumble') {
          const cp = this.platforms.create(cx, cy, 'plat_crumble').setDisplaySize(md.w, md.h).refreshBody();
          cp.platformType = 'crumble';
          cp.crumbling = false;
          cp.crumbleTimer = 0;
          this.crumbles.push(cp);
        } else {
          const sp = this.platforms.create(cx, cy, `plat_${md.type}`).setDisplaySize(md.w, md.h).refreshBody();
          sp.platformType = md.type;
        }
        return;
      }
      const mp = this.movingGroup.create(cx, cy, `plat_${md.type}`).setDisplaySize(md.w, md.h).setImmovable(true);
      mp.body.allowGravity = false;
      mp.platformType = md.type;
      mp.startX = cx;  mp.startY = cy;
      mp.endX   = cx + md.rangeX;
      mp.endY   = cy + md.rangeY;
      mp.period = md.speed;
      mp.t      = 0;
    });

    lv.hazards.forEach(hd => {
      const s = this.hazardGroup.create(hd.x + 15, hd.y + 15, 'spike').refreshBody();
      s.setDisplaySize(30, 30).refreshBody();
    });

    (lv.winds || []).forEach(wd => {
      const zone = new Phaser.Geom.Rectangle(wd.x, wd.y, wd.w, wd.h);
      zone.force = wd.force;
      this.windZones.push(zone);
      if (wd.visual) {
        this.add.image(wd.x + wd.w / 2, wd.y + wd.h / 2, wd.force < 0 ? 'wind_left' : 'wind_right')
          .setDisplaySize(wd.w, wd.h).setAlpha(0.4);
      }
    });

    (lv.gravZones || []).forEach(gz => {
      const rect  = new Phaser.Geom.Rectangle(gz.x, gz.y, gz.w, gz.h);
      rect.flip   = gz.flip;
      this.gravZones.push(rect);
      this.add.image(gz.x + gz.w / 2, gz.y + gz.h / 2, 'grav_zone').setDisplaySize(gz.w, gz.h).setAlpha(0.6);
    });
  }

  // ─── HUD ────────────────────────────────────────────────────
  createHUD() {
    // Death counter (top-left)
    this.add.image(10, 10, 'hud_bg').setOrigin(0).setAlpha(0.85).setScrollFactor(0).setDepth(100);
    this.deathLabel = this.add.text(18, 15, `💀 ${this.sessionDeaths}`, {
      fontFamily: '"Press Start 2P"', fontSize: '15px', color: '#ff4444',
      stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(101);
    this.deathSubLabel = this.add.text(18, 35, `ALL TIME: ${Storage.get().totalDeaths || 0}`, {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#884444',
      stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(101);

    // Timer (top-right)
    this.add.image(W - 10, 10, 'hud_bg').setOrigin(1, 0).setAlpha(0.85).setScrollFactor(0).setDepth(100);
    this.timerLabel = this.add.text(W - 18, 20, '00:00', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);

    // Level name (top-center)
    this.add.text(W / 2, 14, `LV${this.levelId + 1}: ${this.level.name}`, {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#aaaacc',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // ESC hint (bottom-center)
    this.add.text(W / 2, H - 14, 'ESC = MENU   F = FULLSCREEN', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#333355',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100);

    // ESC pause
    this.input.keyboard.on('keydown-ESC', () => {
      Audio.click();
      this.cameras.main.fade(250, 0, 0, 0, false, (_c, p) => {
        if (p === 1) { Audio.startMusic(); this.scene.start('LevelSelect'); }
      });
    });
  }

  // ─── Mobile controls ────────────────────────────────────────
  createMobileControls() {
    const isTouch = this.sys.game.device.os.android || this.sys.game.device.os.iOS
      || this.sys.game.device.input.touch;
    if (!isTouch) return;

    const S = 80;
    const btnL = this.add.circle(S / 2 + 10, H - S / 2 - 10, S / 2, 0xffffff, 0.15)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this.add.text(S / 2 + 10, H - S / 2 - 10, '◀', { fontSize: '28px', color: '#fff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const btnR = this.add.circle(S * 1.5 + 20, H - S / 2 - 10, S / 2, 0xffffff, 0.15)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this.add.text(S * 1.5 + 20, H - S / 2 - 10, '▶', { fontSize: '28px', color: '#fff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const btnJ = this.add.circle(W - S / 2 - 10, H - S / 2 - 10, S / 2, 0xff4444, 0.2)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this.add.text(W - S / 2 - 10, H - S / 2 - 10, '▲', { fontSize: '28px', color: '#fff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201);

    btnL.on('pointerdown', () => this.mobileLeft = true);
    btnL.on('pointerup',   () => this.mobileLeft = false);
    btnL.on('pointerout',  () => this.mobileLeft = false);
    btnR.on('pointerdown', () => this.mobileRight = true);
    btnR.on('pointerup',   () => this.mobileRight = false);
    btnR.on('pointerout',  () => this.mobileRight = false);
    btnJ.on('pointerdown', () => this.mobileJump = true);
    btnJ.on('pointerup',   () => this.mobileJump = false);
    btnJ.on('pointerout',  () => this.mobileJump = false);
  }

  // ─── Main loop ──────────────────────────────────────────────
  update(time, delta) {
    if (this.isDead || this.isComplete) return;

    const dt   = delta / 1000;
    this.elapsed = time - this.startTime;

    const secs = Math.floor(this.elapsed / 1000);
    this.timerLabel.setText(`${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`);

    // Drift wobble
    this.driftTimer -= delta;
    if (this.driftTimer <= 0) {
      this.driftTimer  = Phaser.Math.Between(2000, 5000);
      this.driftTarget = Phaser.Math.FloatBetween(-DRIFT_MAX, DRIFT_MAX);
    }
    this.drift = Phaser.Math.Linear(this.drift, this.driftTarget, 0.04);

    // Ground detection
    this.onGround = this.gravFlipped ? this.player.body.blocked.up : this.player.body.blocked.down;
    this.coyoteTime = this.onGround ? COYOTE_MS : Math.max(0, this.coyoteTime - delta);

    this.handleInput(dt);
    this.applyWind();
    this.checkGravZones();
    this.updateMovingPlatforms(dt);
    this.updateCrumbles(delta);
    this.updateCargoOrb(delta);

    // Goal glow pulse
    this.goalGlowAngle = (this.goalGlowAngle + dt * 3) % (Math.PI * 2);
    const glowAlpha = 0.25 + Math.sin(this.goalGlowAngle) * 0.15;
    this.goalGlow.clear();
    this.goalGlow.fillStyle(C.goal, glowAlpha);
    this.goalGlow.fillCircle(this.level.goal.x, this.level.goal.y, 38);

    // Trail
    if (!this.onGround && Math.abs(this.player.body.velocity.x) > 100) {
      this.trailParticles.emitParticleAt(this.player.x, this.player.y);
    }
    if (this.onGround && Math.abs(this.player.body.velocity.x) > 50) {
      this.dustParticles.emitParticleAt(this.player.x, this.player.y + BALL_R_VISUAL);
    }

    // Fall out of bounds
    if (this.player.y > this.level.height + 100 || this.player.y < -200 || this.player.x < -60) {
      this.die();
    }
  }

  // ─── Input ──────────────────────────────────────────────────
  handleInput(dt) {
    const leftDown  = this.cursors.left.isDown  || this.wasd.left.isDown  || this.mobileLeft;
    const rightDown = this.cursors.right.isDown || this.wasd.right.isDown || this.mobileRight;
    const jumpJust  = Phaser.Input.Keyboard.JustDown(this.cursors.up)    ||
                      Phaser.Input.Keyboard.JustDown(this.wasd.up)       ||
                      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
                      this.mobileJump;

    if (leftDown)       this.player.setVelocityX(-MOVE_SPEED);
    else if (rightDown) this.player.setVelocityX(MOVE_SPEED);

    this.player.body.velocity.x = Phaser.Math.Clamp(
      this.player.body.velocity.x + this.drift, -MAX_VEL_X, MAX_VEL_X
    );

    const cType = this.currentPlatType;
    this.player.body.setDragX(
      cType === 'ice' ? 30 : (leftDown || rightDown ? 400 : 700)
    );

    if (jumpJust && this.coyoteTime > 0) {
      const jDir = this.gravFlipped ? 1 : -1;
      this.player.setVelocityY(JUMP_VEL * (1 + Phaser.Math.FloatBetween(-0.08, 0.06)) * jDir);
      this.coyoteTime = 0;
      Audio.jump();
    }

    const upHeld = this.cursors.up.isDown || this.wasd.up.isDown;
    if (!upHeld && !this.gravFlipped && this.player.body.velocity.y < -200) this.player.body.velocity.y *= 0.88;
    if (!upHeld &&  this.gravFlipped && this.player.body.velocity.y > 200)  this.player.body.velocity.y *= 0.88;

    if (this.mobileJump && jumpJust) this.mobileJump = false;
  }

  // ─── Platform callbacks ─────────────────────────────────────
  onPlatformCollide(_player, platform) {
    this.currentPlatType = platform.platformType;
    if (platform.platformType === 'spring' && _player.body.blocked.down) {
      Audio.bounce();
      this.player.setVelocityY(JUMP_VEL * 1.7 * (this.gravFlipped ? 1 : -1));
    }
    if (platform.platformType === 'crumble' && !platform.crumbling && _player.body.blocked.down) {
      platform.crumbling     = true;
      platform.crumbleTimer  = 800;
      this.tweens.add({ targets: platform, alpha: { from: 1, to: 0.35 }, duration: 600, ease: 'Sine.easeIn' });
    }
  }

  onMovingCollide(_player, mp) {
    this.currentPlatType = mp.platformType;
    if (mp.platformType === 'ice') this.player.body.setDragX(30);
  }

  hitHazard() { this.die(); }

  // ─── DEATH SEQUENCE ─────────────────────────────────────────
  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.sessionDeaths++;

    Storage.recordDeath(this.levelId);
    const td = Storage.get().totalDeaths;

    // HUD pulse
    this.deathLabel.setText(`💀 ${this.sessionDeaths}`);
    this.deathSubLabel.setText(`ALL TIME: ${td}`);
    this.tweens.add({ targets: this.deathLabel, scaleX: 1.6, scaleY: 1.6, duration: 160, yoyo: true, ease: 'Back.easeOut' });

    // Achievements
    if (td >= 1)    this.tryAchievement('first_death');
    if (td >= 10)   this.tryAchievement('deaths_10');
    if (td >= 100)  this.tryAchievement('deaths_100');
    if (td >= 1000) this.tryAchievement('deaths_1000');

    Audio.die();

    const settings = Storage.get().settings;

    // ── Phase 1: Impact flash + shake ──────────────────────────
    this.cameras.main.flash(120, 255, 20, 20);
    if (settings.screenShake !== false) {
      this.cameras.main.shake(550, 0.03);
    }

    // Red vignette flash overlay
    const vignette = this.add.rectangle(W / 2, H / 2, W, H, 0xff0000, 0)
      .setScrollFactor(0).setDepth(50);
    this.tweens.add({
      targets: vignette,
      alpha: { from: 0, to: 0.25 },
      duration: 80, yoyo: true, repeat: 2,
      onComplete: () => vignette.destroy(),
    });

    // ── Phase 2: Ball squash-stretch-spin ──────────────────────
    this.player.body.stop();
    this.player.body.allowGravity = false;

    this.tweens.add({
      targets: this.player,
      scaleX: 1.9, scaleY: 0.35,
      duration: 70,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Burst particles at squash moment
        this.trailParticles.emitParticleAt(this.player.x, this.player.y, 25);

        this.tweens.add({
          targets: this.player,
          scaleX: 0.35, scaleY: 1.9,
          duration: 70,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.tweens.add({
              targets: this.player,
              scaleX: 0, scaleY: 0,
              angle: this.player.angle + 540,
              duration: 280,
              ease: 'Cubic.easeIn',
              onComplete: () => this.player.setVisible(false),
            });
          },
        });
      },
    });

    // ── Phase 3: Cargo orb drops (200ms) ──────────────────────
    this.time.delayedCall(200, () => this.dropCargoOrb());

    // ── Phase 4: Skull pop at world position (350ms) ───────────
    this.time.delayedCall(350, () => {
      const px = this.player.x;
      const py = this.player.y;

      const skullBg = this.add.circle(px, py, 30, 0x330000, 0.9).setDepth(60);
      const skull   = this.add.text(px, py, '💀', { fontSize: '36px' })
        .setOrigin(0.5).setDepth(61);

      this.tweens.add({
        targets: [skullBg, skull],
        y: py - 90,
        scaleX: { from: 0.2, to: 1.3 },
        scaleY: { from: 0.2, to: 1.3 },
        alpha:  { from: 1,   to: 0 },
        duration: 700,
        ease: 'Quad.easeOut',
        onComplete: () => { skullBg.destroy(); skull.destroy(); },
      });

      // Secondary particle burst
      this.trailParticles.emitParticleAt(px, py, 20);
    });

    // ── Phase 5: Rage message + death screen (700ms) ───────────
    const msg = this.getDeathMessage(settings);
    this.time.delayedCall(700, () => this.showDeathScreen(msg));
  }

  getDeathMessage(settings) {
    if (!settings || !settings.rageMessages) return 'TRY AGAIN';
    const pool = this.sessionDeaths > 20 ? HIGH_DEATH_MSGS : DEATH_MSGS;
    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  showDeathScreen(msg) {
    const td = Storage.get().totalDeaths;

    // Dark overlay
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets: overlay, alpha: 0.78, duration: 250 });

    // ── YOU DIED header ────────────────────────────────────────
    const diedText = this.add.text(W / 2, H / 2 - 135, 'YOU DIED', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '44px',
      color:      '#ff2200',
      stroke:     '#000',
      strokeThickness: 7,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff0000', blur: 24, fill: true },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202)
      .setScale(0.3).setAlpha(0);

    this.tweens.add({
      targets: diedText,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 320,
      ease: 'Back.easeOut',
    });

    // ── Rage message (the good part) ──────────────────────────
    const msgBox = this.add.rectangle(W / 2, H / 2 - 45, 680, 64, 0x1a0000, 0.85)
      .setScrollFactor(0).setDepth(201).setAlpha(0);
    msgBox.setStrokeStyle(2, 0xff3300, 0.6);

    const msgText = this.add.text(W / 2, H / 2 - 45, `"${msg}"`, {
      fontFamily: '"Press Start 2P"',
      fontSize:   '11px',
      color:      '#ffaa44',
      stroke:     '#000',
      strokeThickness: 3,
      wordWrap:   { width: 640 },
      align:      'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setAlpha(0);

    // ── Stats row ──────────────────────────────────────────────
    const statsText = this.add.text(W / 2, H / 2 + 20, [
      `DEATH #${this.sessionDeaths} THIS RUN  ·  ALL-TIME DEATHS: ${td.toLocaleString()}`,
    ].join(''), {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#666688',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);

    this.tweens.add({
      targets: [msgBox, msgText, statsText],
      alpha: 1, duration: 350, delay: 180,
    });

    // ── Buttons (appear after 900ms) ─────────────────────────
    const retryBtn  = this.add.image(W / 2 - 145, H / 2 + 110, 'btn_red')
      .setScrollFactor(0).setDepth(201).setAlpha(0);
    const retryTxt  = this.add.text(W / 2 - 145, H / 2 + 110, '🔁  RETRY', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);

    const menuBtn   = this.add.image(W / 2 + 145, H / 2 + 110, 'btn_dark')
      .setScrollFactor(0).setDepth(201).setAlpha(0);
    const menuTxt   = this.add.text(W / 2 + 145, H / 2 + 110, '🏠  MENU', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);

    this.time.delayedCall(900, () => {
      this.tweens.add({ targets: [retryBtn, retryTxt, menuBtn, menuTxt], alpha: 1, duration: 300, ease: 'Back.easeOut' });

      retryBtn.setInteractive({ useHandCursor: true });
      retryBtn.on('pointerover', () => { Audio.click(); retryBtn.setTint(0xffaaaa); });
      retryBtn.on('pointerout',  () => retryBtn.clearTint());
      retryBtn.on('pointerdown', () => {
        Audio.click();
        this.cameras.main.fade(200, 0, 0, 0, false, (_c, p) => {
          if (p === 1) this.scene.restart({ levelId: this.levelId, sessionDeaths: this.sessionDeaths });
        });
      });

      menuBtn.setInteractive({ useHandCursor: true });
      menuBtn.on('pointerover', () => { Audio.click(); menuBtn.setTint(0xaaaaff); });
      menuBtn.on('pointerout',  () => menuBtn.clearTint());
      menuBtn.on('pointerdown', () => {
        Audio.click(); Audio.startMusic();
        this.cameras.main.fade(200, 0, 0, 0, false, (_c, p) => {
          if (p === 1) this.scene.start('LevelSelect');
        });
      });
    });

    // R key shortcut
    this.input.keyboard.once('keydown-R', () => {
      this.cameras.main.fade(200, 0, 0, 0, false, (_c, p) => {
        if (p === 1) this.scene.restart({ levelId: this.levelId, sessionDeaths: this.sessionDeaths });
      });
    });
  }

  // ─── Win ────────────────────────────────────────────────────
  reachGoal() {
    if (this.isComplete) return;
    this.isComplete = true;
    Audio.win();

    const elapsed = this.elapsed;
    const deaths  = this.sessionDeaths;
    const coins   = COINS_PER_LEVEL[this.levelId] + Math.max(0, 10 - deaths) * 2;

    Storage.completeLevel(this.levelId, deaths, elapsed);
    Storage.addCoins(coins);

    const st = Storage.get();
    if (deaths === 0)                    this.tryAchievement('no_death_win');
    if (elapsed < 30000)                 this.tryAchievement('speed_run');
    if (st.completedLevels.length >= 1)  this.tryAchievement('level_1');
    if (st.completedLevels.length >= 5)  this.tryAchievement('level_5');
    if (st.completedLevels.length >= 10) this.tryAchievement('level_10');
    if (st.coins >= 100)                 this.tryAchievement('coins_100');
    Storage.addScore({ levelId: this.levelId, name: st.playerName, deaths, time: elapsed });

    // Deliver cargo orb to goal
    this.deliverCargoOrb();

    this.cameras.main.flash(350, 255, 255, 80);
    this.cameras.main.shake(200, 0.01);

    // Victory fireworks
    for (let i = 0; i < 12; i++) {
      this.time.addEvent({
        delay: i * 120,
        callback: () => {
          this.trailParticles.emitParticleAt(
            this.player.x + Phaser.Math.Between(-80, 80),
            this.player.y + Phaser.Math.Between(-80, 80),
            20
          );
        },
      });
    }

    this.time.addEvent({ delay: 700, callback: () => this.showWinScreen(elapsed, deaths, coins) });
  }

  showWinScreen(elapsed, deaths, coins) {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.78)
      .setScrollFactor(0).setDepth(200);

    const panel = this.add.rectangle(W / 2, H / 2, 640, 420, C.ui_panel, 0.97)
      .setScrollFactor(0).setDepth(201).setAlpha(0);
    panel.setStrokeStyle(2, C.success);

    const t = (d, txt, cfg) => this.add.text(d.x, d.y, txt, cfg)
      .setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);

    const winHeader = t(
      { x: W / 2, y: H / 2 - 175 },
      '📦  CARGO DELIVERED!', {
        fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#00ff88',
        stroke: '#000', strokeThickness: 4,
      }
    );
    const levelName = t(
      { x: W / 2, y: H / 2 - 130 },
      `LEVEL ${this.levelId + 1}: ${this.level.name}`, {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#aaaacc',
      }
    );
    const stats = t(
      { x: W / 2, y: H / 2 - 65 }, [
        `⏱  TIME:    ${(elapsed / 1000).toFixed(2)}s`,
        `💀 DEATHS:  ${deaths}`,
        `💰 EARNED:  +${coins} COINS`,
      ].join('\n'), {
        fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#ffffff',
        lineSpacing: 12, stroke: '#000', strokeThickness: 3,
      }
    );

    const extras = [panel, winHeader, levelName, stats];

    const bestTime = Storage.get().bestTimes[this.levelId];
    if (bestTime && elapsed <= bestTime + 100) {
      extras.push(t({ x: W / 2, y: H / 2 + 50 }, '🏆  NEW BEST TIME!', {
        fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#ffcc00',
        stroke: '#000', strokeThickness: 3,
      }));
    }
    if (deaths === 0) {
      extras.push(t({ x: W / 2, y: H / 2 + 75 }, '✨  FLAWLESS DELIVERY!', {
        fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#00ffaa',
        stroke: '#000', strokeThickness: 3,
      }));
    }

    this.tweens.add({ targets: extras, alpha: 1, duration: 450, ease: 'Back.easeOut' });

    // Next / Menu buttons
    const nextBtn = this.add.image(W / 2 - 150, H / 2 + 155, 'btn_green')
      .setScrollFactor(0).setDepth(201).setAlpha(0);
    const nextTxt = this.add.text(W / 2 - 150, H / 2 + 155, this.levelId < 9 ? '▶  NEXT LEVEL' : '🏠  MENU', {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);
    const menuBtn = this.add.image(W / 2 + 150, H / 2 + 155, 'btn_dark')
      .setScrollFactor(0).setDepth(201).setAlpha(0);
    const menuTxt = this.add.text(W / 2 + 150, H / 2 + 155, '🏠  MENU', {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);

    this.tweens.add({ targets: [nextBtn, nextTxt, menuBtn, menuTxt], alpha: 1, duration: 400, delay: 350 });

    nextBtn.setInteractive({ useHandCursor: true });
    nextBtn.on('pointerover', () => { Audio.click(); nextBtn.setTint(0xaaffaa); });
    nextBtn.on('pointerout',  () => nextBtn.clearTint());
    nextBtn.on('pointerdown', () => {
      Audio.click();
      this.cameras.main.fade(300, 0, 0, 0, false, (_c, p) => {
        if (p === 1) {
          if (this.levelId < 9) this.scene.start('GameScene', { levelId: this.levelId + 1 });
          else { Audio.startMusic(); this.scene.start('LevelSelect'); }
        }
      });
    });

    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover', () => { Audio.click(); menuBtn.setTint(0xaaaaff); });
    menuBtn.on('pointerout',  () => menuBtn.clearTint());
    menuBtn.on('pointerdown', () => {
      Audio.click(); Audio.startMusic();
      this.cameras.main.fade(300, 0, 0, 0, false, (_c, p) => {
        if (p === 1) this.scene.start('LevelSelect');
      });
    });
  }

  // ─── Achievement system ─────────────────────────────────────
  tryAchievement(id) {
    if (Storage.unlockAchievement(id)) {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) this.time.delayedCall(this._achieveQueue.length * 2800, () => this.showAchievementToast(ach));
      this._achieveQueue.push(id);
    }
  }

  showAchievementToast(ach) {
    const bg = this.add.rectangle(W / 2, -40, 580, 48, 0xffcc00, 0.95)
      .setScrollFactor(0).setDepth(400).setStrokeStyle(2, 0xffffff, 0.6);
    const icon = this.add.text(W / 2 - 220, 0, ach.icon, { fontSize: '24px' })
      .setScrollFactor(0).setDepth(401).setOrigin(0, 0.5).setAlpha(0);
    const txt  = this.add.text(W / 2 - 185, 0, `ACHIEVEMENT UNLOCKED: ${ach.name.toUpperCase()}`, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#000000',
    }).setScrollFactor(0).setDepth(401).setOrigin(0, 0.5).setAlpha(0);

    this.tweens.add({
      targets: [bg, icon, txt],
      y: 44, alpha: 1,
      duration: 400, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: [bg, icon, txt],
            y: -40, alpha: 0,
            duration: 300,
            onComplete: () => { bg.destroy(); icon.destroy(); txt.destroy(); },
          });
        });
      },
    });
  }

  // ─── Physics helpers ────────────────────────────────────────
  applyWind() {
    const px = this.player.x, py = this.player.y;
    this.windZones.forEach(wz => {
      if (wz.contains(px, py)) {
        this.player.body.velocity.x = Phaser.Math.Clamp(
          this.player.body.velocity.x + wz.force * 0.016, -MAX_VEL_X, MAX_VEL_X
        );
      }
    });
  }

  checkGravZones() {
    const px = this.player.x, py = this.player.y;
    let shouldFlip = false;
    this.gravZones.forEach(gz => { if (gz.contains(px, py) && gz.flip) shouldFlip = true; });
    if (shouldFlip !== this.gravFlipped) {
      this.gravFlipped = shouldFlip;
      this.physics.world.gravity.y = Math.abs(this.level.gravity.y) * (shouldFlip ? -1 : 1);
      this.cameras.main.shake(200, 0.008);
    }
  }

  updateMovingPlatforms(dt) {
    this.movingGroup.getChildren().forEach(mp => {
      mp.t = (mp.t + dt / (mp.period / 1000)) % 1;
      const ease = 0.5 - 0.5 * Math.cos(mp.t * Math.PI * 2);
      const nx = mp.startX + (mp.endX - mp.startX) * ease;
      const ny = mp.startY + (mp.endY - mp.startY) * ease;

      mp.body.reset(nx, ny);
      mp.body.velocity.x = (nx - mp.x) / dt;
      mp.body.velocity.y = (ny - mp.y) / dt;

      if (this.player.body.blocked.down) {
        const dx = Math.abs(this.player.x - mp.x);
        const dy = Math.abs(this.player.y - mp.y);
        if (dx < mp.displayWidth / 2 + BALL_R && dy < mp.displayHeight / 2 + BALL_R + 4) {
          this.player.x += nx - mp.x;
        }
      }
    });
  }

  updateCrumbles(delta) {
    this.crumbles.forEach(cp => {
      if (!cp.crumbling) return;
      cp.crumbleTimer -= delta;
      if (cp.crumbleTimer <= 0 && cp.active) {
        cp.setActive(false).setVisible(false);
        if (cp.body) cp.body.enable = false;
        this.time.addEvent({
          delay: 5000,
          callback: () => {
            if (!cp.active) {
              cp.setActive(true).setVisible(true).setAlpha(1);
              if (cp.body) cp.body.enable = true;
              cp.crumbling = false; cp.crumbleTimer = 0;
            }
          },
        });
      }
    });
  }

  // ─── Tip toast ──────────────────────────────────────────────
  showTip(tip) {
    const bg = this.add.rectangle(W / 2, H - 40, 720, 38, 0x000000, 0.72)
      .setScrollFactor(0).setDepth(150).setAlpha(0);
    const t  = this.add.text(W / 2, H - 40, `💡  ${tip}`, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaaff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(151).setAlpha(0);

    this.tweens.add({
      targets: [bg, t], alpha: 1, duration: 400,
      onComplete: () => {
        this.time.addEvent({
          delay: 3500,
          callback: () => this.tweens.add({ targets: [bg, t], alpha: 0, duration: 600 }),
        });
      },
    });
  }

  // ─── Fullscreen ─────────────────────────────────────────────
  toggleFullscreen() {
    try {
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('toggle-fullscreen');
      } else if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    } catch { /* ignore */ }
  }
}
