import {
  W, H, C, LEVELS, DEATH_MSGS, HIGH_DEATH_MSGS,
  BALL_R, BALL_R_VISUAL, GRAVITY, JUMP_VEL, MOVE_SPEED, MAX_VEL_X,
  DRIFT_MAX, COYOTE_MS, COINS_PER_LEVEL,
} from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.levelId      = data.levelId ?? 0;
    this.sessionDeaths = data.sessionDeaths ?? 0;
    this.isDead       = false;
    this.isComplete   = false;
    this.isFlipped    = false;
    this.coyoteTime   = 0;
    this.drift        = 0;
    this.driftTarget  = 0;
    this.driftTimer   = 0;
    this.onGround     = false;
    this.crumbles     = [];
    this.gravFlipped  = false;
    this.mobileLeft   = false;
    this.mobileRight  = false;
    this.mobileJump   = false;
  }

  create() {
    this.level = LEVELS[this.levelId];
    const lv = this.level;

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

    // Static platforms group
    this.platforms = this.physics.add.staticGroup();
    this.movingGroup = this.physics.add.group();
    this.hazardGroup = this.physics.add.staticGroup();
    this.windZones = [];
    this.gravZones = [];

    this.buildLevel(lv);

    // Goal
    this.goalSprite = this.add.image(lv.goal.x, lv.goal.y, 'goal').setScale(0.8);
    this.physics.add.existing(this.goalSprite, true);
    this.tweens.add({
      targets: this.goalSprite,
      angle: 360, duration: 3000,
      repeat: -1, ease: 'Linear',
    });
    this.tweens.add({
      targets: this.goalSprite,
      scaleX: { from: 0.75, to: 0.85 }, scaleY: { from: 0.75, to: 0.85 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Goal glow
    this.goalGlow = this.add.graphics();
    this.goalGlowAngle = 0;

    // Player
    const skinKey = Storage.get().selectedSkin || 'rage';
    this.player = this.physics.add.sprite(lv.start.x, lv.start.y, `ball_${skinKey}`);
    this.player.setCircle(BALL_R, BALL_R_VISUAL - BALL_R, BALL_R_VISUAL - BALL_R);
    this.player.setBounce(0.12);
    this.player.setDragX(700);
    this.player.setMaxVelocity(MAX_VEL_X, 950);
    this.player.setDepth(10);

    // Death trail (particles)
    this.trailParticles = this.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 80 },
      scale: { start: 0.4, end: 0 },
      lifespan: 250,
      alpha: { start: 0.7, end: 0 },
      tint: [0xff4444, 0xff9900, 0xffff00],
      frequency: -1,
    });

    // Walking dust
    this.dustParticles = this.add.particles(0, 0, 'particle', {
      speed: { min: 10, max: 40 },
      scale: { start: 0.3, end: 0 },
      lifespan: 200,
      alpha: { start: 0.5, end: 0 },
      tint: [0xaaaaaa, 0x888888],
      angle: { min: -150, max: -30 },
      frequency: -1,
    });

    // Colliders
    this.physics.add.collider(this.player, this.platforms, this.onPlatformCollide, null, this);
    this.physics.add.collider(this.player, this.movingGroup, this.onMovingCollide, null, this);
    this.physics.add.overlap(this.player, this.hazardGroup, this.hitHazard, null, this);
    this.physics.add.overlap(this.player, this.goalSprite, this.reachGoal, null, this);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, lv.width, lv.height);
    this.cameras.main.setBackgroundColor(C.bg);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // HUD (fixed to camera)
    this.createHUD();

    // Mobile controls
    this.createMobileControls();

    // Start timer
    this.startTime = this.time.now;
    this.elapsed   = 0;

    // Level tip toast
    if (Storage.get().settings.showTips && lv.tip) {
      this.showTip(lv.tip);
    }

    this.cameras.main.fadeIn(300);
  }

  buildLevel(lv) {
    // Static platforms
    lv.platforms.forEach(pd => {
      const tex = `plat_${pd.type}`;
      const cx = pd.x + pd.w / 2;
      const cy = pd.y + pd.h / 2;
      const p = this.platforms.create(cx, cy, tex).setDisplaySize(pd.w, pd.h).refreshBody();
      p.platformType = pd.type;
    });

    // Moving / crumble platforms (from level moving array)
    (lv.moving || []).forEach(md => {
      const tex = `plat_${md.type}`;
      const cx = md.x + md.w / 2;
      const cy = md.y + md.h / 2;

      if (md.type === 'crumble' || (md.rangeX === 0 && md.rangeY === 0)) {
        if (md.type === 'crumble') {
          const cp = this.platforms.create(cx, cy, tex).setDisplaySize(md.w, md.h).refreshBody();
          cp.platformType = md.type;
          cp.crumbling = false;
          cp.crumbleTimer = 0;
          this.crumbles.push(cp);
        } else {
          const sp = this.platforms.create(cx, cy, tex).setDisplaySize(md.w, md.h).refreshBody();
          sp.platformType = md.type;
        }
        return;
      }

      const mp = this.movingGroup.create(cx, cy, tex).setDisplaySize(md.w, md.h).setImmovable(true);
      mp.body.allowGravity = false;
      mp.platformType = md.type;
      mp.startX = cx;
      mp.startY = cy;
      mp.endX = cx + md.rangeX;
      mp.endY = cy + md.rangeY;
      mp.period = md.speed;
      mp.t = 0;
    });

    // Hazards (spikes)
    lv.hazards.forEach(hd => {
      const s = this.hazardGroup.create(hd.x + 15, hd.y + 15, 'spike').refreshBody();
      s.setDisplaySize(30, 30).refreshBody();
    });

    // Wind zones
    (lv.winds || []).forEach(wd => {
      this.windZones.push(new Phaser.Geom.Rectangle(wd.x, wd.y, wd.w, wd.h));
      this.windZones[this.windZones.length - 1].force = wd.force;
      if (wd.visual) {
        const tex = wd.force < 0 ? 'wind_left' : 'wind_right';
        this.add.image(wd.x + wd.w / 2, wd.y + wd.h / 2, tex)
          .setDisplaySize(wd.w, wd.h).setAlpha(0.4);
      }
    });

    // Gravity zones
    (lv.gravZones || []).forEach(gz => {
      const rect = new Phaser.Geom.Rectangle(gz.x, gz.y, gz.w, gz.h);
      rect.flip = gz.flip;
      this.gravZones.push(rect);
      this.add.image(gz.x + gz.w / 2, gz.y + gz.h / 2, 'grav_zone')
        .setDisplaySize(gz.w, gz.h).setAlpha(0.6);
    });
  }

  createHUD() {
    const cam = this.cameras.main;
    this.hudContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

    // Death counter
    this.deathBg = this.add.image(10, 10, 'hud_bg').setOrigin(0).setAlpha(0.8);
    this.deathLabel = this.add.text(20, 18, `💀 ${this.sessionDeaths}`, {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ff4444',
      stroke: '#000', strokeThickness: 3,
    });

    // Timer
    this.timerBg = this.add.image(W - 10, 10, 'hud_bg').setOrigin(1, 0).setAlpha(0.8);
    this.timerLabel = this.add.text(W - 20, 18, '00:00', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    // Level name
    this.add.text(W / 2, 14, `LEVEL ${this.levelId + 1}: ${this.level.name}`, {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#aaaacc',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // ESC / pause hint
    this.add.text(W / 2, H - 14, 'ESC = MENU', {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#333355',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100);

    // Pause key
    this.input.keyboard.on('keydown-ESC', () => {
      Audio.click();
      this.cameras.main.fade(250, 0, 0, 0, false, (_c, p) => {
        if (p === 1) { Audio.startMusic(); this.scene.start('LevelSelect'); }
      });
    });
  }

  createMobileControls() {
    const isTouch = this.sys.game.device.os.android || this.sys.game.device.os.iOS
      || this.sys.game.device.input.touch;
    if (!isTouch) return;

    const btnStyle = { fontSize: '28px', color: '#fff', alpha: 0.5 };
    const size = 80;

    const btnL = this.add.circle(size / 2 + 10, H - size / 2 - 10, size / 2, 0xffffff, 0.15)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this.add.text(size / 2 + 10, H - size / 2 - 10, '◀', { ...btnStyle }).setOrigin(0.5)
      .setScrollFactor(0).setDepth(201);

    const btnR = this.add.circle(size * 1.5 + 20, H - size / 2 - 10, size / 2, 0xffffff, 0.15)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this.add.text(size * 1.5 + 20, H - size / 2 - 10, '▶', { ...btnStyle }).setOrigin(0.5)
      .setScrollFactor(0).setDepth(201);

    const btnJ = this.add.circle(W - size / 2 - 10, H - size / 2 - 10, size / 2, 0xff4444, 0.2)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this.add.text(W - size / 2 - 10, H - size / 2 - 10, '▲', { ...btnStyle }).setOrigin(0.5)
      .setScrollFactor(0).setDepth(201);

    btnL.on('pointerdown', () => this.mobileLeft = true);
    btnL.on('pointerup', () => this.mobileLeft = false);
    btnL.on('pointerout', () => this.mobileLeft = false);
    btnR.on('pointerdown', () => this.mobileRight = true);
    btnR.on('pointerup', () => this.mobileRight = false);
    btnR.on('pointerout', () => this.mobileRight = false);
    btnJ.on('pointerdown', () => { this.mobileJump = true; });
    btnJ.on('pointerup', () => this.mobileJump = false);
    btnJ.on('pointerout', () => this.mobileJump = false);
  }

  update(time, delta) {
    if (this.isDead || this.isComplete) return;

    const dt = delta / 1000;
    this.elapsed = time - this.startTime;

    // Update timer display
    const secs = Math.floor(this.elapsed / 1000);
    const mins = Math.floor(secs / 60);
    this.timerLabel.setText(`${String(mins).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`);

    // Update drift
    this.driftTimer -= delta;
    if (this.driftTimer <= 0) {
      this.driftTimer = Phaser.Math.Between(2000, 5000);
      this.driftTarget = Phaser.Math.FloatBetween(-DRIFT_MAX, DRIFT_MAX);
    }
    this.drift = Phaser.Math.Linear(this.drift, this.driftTarget, 0.04);

    // Player on ground detection
    this.onGround = this.player.body.blocked.down;
    if (this.gravFlipped) this.onGround = this.player.body.blocked.up;

    // Coyote time
    if (this.onGround) {
      this.coyoteTime = COYOTE_MS;
    } else {
      this.coyoteTime = Math.max(0, this.coyoteTime - delta);
    }

    // Input
    this.handleInput(dt);

    // Apply wind
    this.applyWind();

    // Gravity zones
    this.checkGravZones();

    // Update moving platforms
    this.updateMovingPlatforms(dt);

    // Update crumbling platforms
    this.updateCrumbles(delta);

    // Goal glow animation
    this.goalGlowAngle = (this.goalGlowAngle + dt * 3) % (Math.PI * 2);
    const glowAlpha = 0.25 + Math.sin(this.goalGlowAngle) * 0.15;
    this.goalGlow.clear();
    this.goalGlow.fillStyle(C.goal, glowAlpha);
    this.goalGlow.fillCircle(this.level.goal.x, this.level.goal.y, 36);

    // Trail effect
    if (!this.onGround && Math.abs(this.player.body.velocity.x) > 100) {
      this.trailParticles.emitParticleAt(this.player.x, this.player.y);
    }

    // Dust on landing
    if (this.onGround && Math.abs(this.player.body.velocity.x) > 50) {
      this.dustParticles.emitParticleAt(this.player.x, this.player.y + BALL_R_VISUAL);
    }

    // Fall death
    if (this.player.y > this.level.height + 100 || this.player.y < -200) {
      this.die();
    }
    if (this.player.x < -60) {
      this.die();
    }
  }

  handleInput(dt) {
    const leftDown  = this.cursors.left.isDown  || this.wasd.left.isDown  || this.mobileLeft;
    const rightDown = this.cursors.right.isDown || this.wasd.right.isDown || this.mobileRight;
    const jumpJust  = Phaser.Input.Keyboard.JustDown(this.cursors.up)    ||
                      Phaser.Input.Keyboard.JustDown(this.wasd.up)       ||
                      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
                      this.mobileJump;

    // Horizontal movement
    if (leftDown)       this.player.setVelocityX(-MOVE_SPEED);
    else if (rightDown) this.player.setVelocityX(MOVE_SPEED);

    // Drift injection
    this.player.body.velocity.x = Phaser.Math.Clamp(
      this.player.body.velocity.x + this.drift,
      -MAX_VEL_X, MAX_VEL_X
    );

    // Clamped ice drag
    const cType = this.currentPlatType;
    if (cType === 'ice') {
      this.player.body.setDragX(30);
    } else {
      this.player.body.setDragX(leftDown || rightDown ? 400 : 700);
    }

    // Jump with slight height variation (rage inducing)
    if (jumpJust && this.coyoteTime > 0) {
      const jVar = 1 + Phaser.Math.FloatBetween(-0.08, 0.06);
      const jDir = this.gravFlipped ? 1 : -1;
      this.player.setVelocityY(JUMP_VEL * jVar * jDir);
      this.coyoteTime = 0;
      Audio.jump();
    }

    // Variable jump height (release = shorter jump)
    const upHeld = this.cursors.up.isDown || this.wasd.up.isDown;
    if (!upHeld && !this.gravFlipped && this.player.body.velocity.y < -200) {
      this.player.body.velocity.y *= 0.88;
    }
    if (!upHeld && this.gravFlipped && this.player.body.velocity.y > 200) {
      this.player.body.velocity.y *= 0.88;
    }

    // Reset mobile jump flag after consuming
    if (this.mobileJump && jumpJust) this.mobileJump = false;
  }

  onPlatformCollide(_player, platform) {
    this.currentPlatType = platform.platformType;

    if (platform.platformType === 'spring' && _player.body.blocked.down) {
      Audio.bounce();
      const jDir = this.gravFlipped ? 1 : -1;
      this.player.setVelocityY(JUMP_VEL * 1.7 * jDir);
    }

    if (platform.platformType === 'crumble' && !platform.crumbling && _player.body.blocked.down) {
      platform.crumbling = true;
      platform.crumbleTimer = 800;
      this.tweens.add({
        targets: platform,
        alpha: { from: 1, to: 0.4 },
        duration: 600,
        ease: 'Sine.easeIn',
      });
    }
  }

  onMovingCollide(_player, mp) {
    this.currentPlatType = mp.platformType;
    if (mp.platformType === 'ice') this.player.body.setDragX(30);
  }

  hitHazard() { this.die(); }

  reachGoal() {
    if (this.isComplete) return;
    this.isComplete = true;
    Audio.win();

    const elapsed = this.elapsed;
    const deaths  = this.sessionDeaths;
    const coins   = COINS_PER_LEVEL[this.levelId] + Math.max(0, 10 - deaths) * 2;

    Storage.completeLevel(this.levelId, deaths, elapsed);
    Storage.addCoins(coins);

    // Check achievements
    const st = Storage.get();
    if (deaths === 0) Storage.unlockAchievement('no_death_win');
    if (elapsed < 30000) Storage.unlockAchievement('speed_run');
    if (st.completedLevels.length >= 1)  Storage.unlockAchievement('level_1');
    if (st.completedLevels.length >= 5)  Storage.unlockAchievement('level_5');
    if (st.completedLevels.length >= 10) Storage.unlockAchievement('level_10');
    Storage.addScore({ levelId: this.levelId, name: st.playerName, deaths, time: elapsed });

    // Celebration
    this.cameras.main.flash(300, 255, 255, 0);
    this.cameras.main.shake(200, 0.01);

    // Fireworks
    for (let i = 0; i < 8; i++) {
      this.time.addEvent({
        delay: i * 150,
        callback: () => {
          this.trailParticles.emitParticleAt(
            this.player.x + Phaser.Math.Between(-60, 60),
            this.player.y + Phaser.Math.Between(-60, 60),
            20
          );
        }
      });
    }

    this.time.addEvent({ delay: 600, callback: () => this.showWinScreen(elapsed, deaths, coins) });
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.sessionDeaths++;

    Storage.recordDeath(this.levelId);
    const td = Storage.get().totalDeaths;

    // Update death counter
    this.deathLabel.setText(`💀 ${this.sessionDeaths}`);
    this.tweens.add({
      targets: this.deathLabel,
      scaleX: 1.4, scaleY: 1.4,
      duration: 150, yoyo: true,
    });

    // Check death achievements
    if (td >= 1)    Storage.unlockAchievement('first_death');
    if (td >= 10)   Storage.unlockAchievement('deaths_10');
    if (td >= 100)  Storage.unlockAchievement('deaths_100');
    if (td >= 1000) Storage.unlockAchievement('deaths_1000');

    // Explosion effect
    this.trailParticles.emitParticleAt(this.player.x, this.player.y, 30);
    this.player.setVisible(false);
    this.player.setActive(false);
    this.player.body.stop();

    // Screen effects
    this.cameras.main.shake(400, 0.025);
    this.cameras.main.flash(200, 255, 0, 0);

    Audio.die();

    // Select death message
    const settings = Storage.get().settings;
    let msg = 'DEAD';
    if (settings.rageMessages) {
      const pool = this.sessionDeaths > 20 ? HIGH_DEATH_MSGS : DEATH_MSGS;
      msg = pool[Phaser.Math.Between(0, pool.length - 1)];
    }

    this.time.addEvent({ delay: 600, callback: () => this.showDeathScreen(msg) });
  }

  showDeathScreen(msg) {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets: overlay, alpha: { from: 0, to: 0.7 }, duration: 200 });

    const skullText = this.add.text(W / 2, H / 2 - 100, '💀', { fontSize: '64px' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

    const deathText = this.add.text(W / 2, H / 2 - 30, 'YOU DIED', {
      fontFamily: '"Press Start 2P"', fontSize: '36px', color: '#ff2200',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

    const msgText = this.add.text(W / 2, H / 2 + 30, msg, {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ff8844',
      stroke: '#000', strokeThickness: 3,
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

    const deathNum = this.add.text(W / 2, H / 2 + 70, `Death #${this.sessionDeaths} this run`, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#555577',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

    this.tweens.add({ targets: [skullText, deathText, msgText, deathNum], alpha: 1, duration: 300 });

    // Retry button
    const retryBtn = this.add.image(W / 2 - 140, H / 2 + 120, 'btn_red').setScrollFactor(0).setDepth(201).setAlpha(0);
    const retryTxt = this.add.text(W / 2 - 140, H / 2 + 120, '🔁 RETRY', {
      fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);
    const menuBtn = this.add.image(W / 2 + 140, H / 2 + 120, 'btn_dark').setScrollFactor(0).setDepth(201).setAlpha(0);
    const menuTxt = this.add.text(W / 2 + 140, H / 2 + 120, '🏠 MENU', {
      fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);

    this.time.addEvent({
      delay: 900,
      callback: () => {
        this.tweens.add({ targets: [retryBtn, retryTxt, menuBtn, menuTxt], alpha: 1, duration: 300 });

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
          Audio.click();
          Audio.startMusic();
          this.cameras.main.fade(200, 0, 0, 0, false, (_c, p) => {
            if (p === 1) this.scene.start('LevelSelect');
          });
        });
      }
    });

    // R key to retry
    this.input.keyboard.once('keydown-R', () => {
      this.cameras.main.fade(200, 0, 0, 0, false, (_c, p) => {
        if (p === 1) this.scene.restart({ levelId: this.levelId, sessionDeaths: this.sessionDeaths });
      });
    });
  }

  showWinScreen(elapsed, deaths, coins) {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75)
      .setScrollFactor(0).setDepth(200);

    const panel = this.add.rectangle(W / 2, H / 2, 600, 400, C.ui_panel, 0.97)
      .setScrollFactor(0).setDepth(201).setAlpha(0);
    panel.setStrokeStyle(2, C.success);

    const texts = [
      this.add.text(W / 2, H / 2 - 160, '✨ LEVEL COMPLETE! ✨', {
        fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#00ff88',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0),

      this.add.text(W / 2, H / 2 - 100, `LEVEL ${this.levelId + 1}: ${this.level.name}`, {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#aaaacc',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0),

      this.add.text(W / 2, H / 2 - 50, [
        `⏱  TIME:   ${(elapsed / 1000).toFixed(2)}s`,
        `💀 DEATHS: ${deaths}`,
        `💰 COINS:  +${coins}`,
      ].join('\n'), {
        fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#ffffff',
        lineSpacing: 10, stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0),
    ];

    // Best time indicator
    const best = Storage.get().bestTimes[this.levelId];
    if (best && elapsed <= best + 100) {
      texts.push(this.add.text(W / 2, H / 2 + 60, '🏆 NEW BEST TIME!', {
        fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffcc00',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0));
    }

    this.tweens.add({ targets: [panel, ...texts], alpha: 1, duration: 400 });

    // Buttons
    const nextBtn = this.add.image(W / 2 - 140, H / 2 + 150, 'btn_green').setScrollFactor(0).setDepth(201).setAlpha(0);
    const nextTxt = this.add.text(W / 2 - 140, H / 2 + 150, this.levelId < 9 ? '▶ NEXT LEVEL' : '🏠 MENU', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);
    const menuBtn = this.add.image(W / 2 + 140, H / 2 + 150, 'btn_dark').setScrollFactor(0).setDepth(201).setAlpha(0);
    const menuTxt = this.add.text(W / 2 + 140, H / 2 + 150, '🏠 MENU', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0);

    this.tweens.add({ targets: [nextBtn, nextTxt, menuBtn, menuTxt], alpha: 1, duration: 400, delay: 300 });

    nextBtn.setInteractive({ useHandCursor: true });
    nextBtn.on('pointerover', () => { Audio.click(); nextBtn.setTint(0xaaffaa); });
    nextBtn.on('pointerout',  () => nextBtn.clearTint());
    nextBtn.on('pointerdown', () => {
      Audio.click();
      this.cameras.main.fade(300, 0, 0, 0, false, (_c, p) => {
        if (p === 1) {
          if (this.levelId < 9) {
            this.scene.start('GameScene', { levelId: this.levelId + 1 });
          } else {
            Audio.startMusic();
            this.scene.start('LevelSelect');
          }
        }
      });
    });

    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover', () => { Audio.click(); menuBtn.setTint(0xaaaaff); });
    menuBtn.on('pointerout',  () => menuBtn.clearTint());
    menuBtn.on('pointerdown', () => {
      Audio.click();
      Audio.startMusic();
      this.cameras.main.fade(300, 0, 0, 0, false, (_c, p) => {
        if (p === 1) this.scene.start('LevelSelect');
      });
    });
  }

  applyWind() {
    const px = this.player.x, py = this.player.y;
    this.windZones.forEach(wz => {
      if (wz.contains(px, py)) {
        this.player.body.velocity.x = Phaser.Math.Clamp(
          this.player.body.velocity.x + wz.force * 0.016,
          -MAX_VEL_X, MAX_VEL_X
        );
      }
    });
  }

  checkGravZones() {
    const px = this.player.x, py = this.player.y;
    let shouldFlip = false;
    this.gravZones.forEach(gz => {
      if (gz.contains(px, py) && gz.flip) shouldFlip = true;
    });
    if (shouldFlip !== this.gravFlipped) {
      this.gravFlipped = shouldFlip;
      const dir = shouldFlip ? -1 : 1;
      this.physics.world.gravity.y = Math.abs(this.level.gravity.y) * dir;
      this.cameras.main.shake(200, 0.008);
    }
  }

  updateMovingPlatforms(dt) {
    this.movingGroup.getChildren().forEach(mp => {
      mp.t = (mp.t + dt / (mp.period / 1000)) % 1;
      const ease = 0.5 - 0.5 * Math.cos(mp.t * Math.PI * 2);
      const nx = mp.startX + (mp.endX - mp.startX) * ease;
      const ny = mp.startY + (mp.endY - mp.startY) * ease;

      const velX = (nx - mp.x) / dt;
      const velY = (ny - mp.y) / dt;

      mp.body.reset(nx, ny);
      mp.body.velocity.x = velX;
      mp.body.velocity.y = velY;

      // Carry player
      if (this.player.body.blocked.down) {
        const dx = Math.abs(this.player.x - mp.x);
        const dy = Math.abs(this.player.y - mp.y);
        const halfW = mp.displayWidth / 2 + BALL_R;
        const halfH = mp.displayHeight / 2 + BALL_R + 4;
        if (dx < halfW && dy < halfH) {
          this.player.x += (nx - mp.x);
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
        // Restore after 5 seconds
        this.time.addEvent({
          delay: 5000,
          callback: () => {
            if (!cp.active) {
              cp.setActive(true).setVisible(true).setAlpha(1);
              if (cp.body) cp.body.enable = true;
              cp.crumbling = false;
              cp.crumbleTimer = 0;
            }
          }
        });
      }
    });
  }

  showTip(tip) {
    const bg = this.add.rectangle(W / 2, H - 40, 700, 36, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(150).setAlpha(0);
    const t = this.add.text(W / 2, H - 40, `💡 ${tip}`, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#aaaaff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(151).setAlpha(0);

    this.tweens.add({
      targets: [bg, t], alpha: 1, duration: 400,
      onComplete: () => {
        this.time.addEvent({
          delay: 3000,
          callback: () => this.tweens.add({ targets: [bg, t], alpha: 0, duration: 600 })
        });
      }
    });
  }
}
