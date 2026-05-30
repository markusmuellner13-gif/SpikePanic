import { W, H, C, SKINS, BALL_R_VISUAL } from '../constants.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    this.generateTextures();
    this.time.addEvent({ delay: 3600, callback: () => this.scene.start('MenuScene') });
    this.createSplash();
  }

  createSplash() {
    // ── Dark sky background ─────────────────────────────────────
    this.add.rectangle(0, 0, W, H, C.bg).setOrigin(0);

    // ── Distant star field ──────────────────────────────────────
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.75);
      const size = Phaser.Math.Between(1, 2);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.05, 0.35));
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: 0 },
        duration: Phaser.Math.Between(900, 2500),
        yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    // ── Game world scenery (background silhouette) ──────────────
    this._buildScenery();

    // ── Animated ball rolling through the scene ─────────────────
    this._buildBallAnimation();

    // ── UI overlay: title, bar, tips ───────────────────────────
    this._buildUI();

    // Signal HTML to hide pre-load screen
    window.dispatchEvent(new Event('RAGE_GAME_READY'));
  }

  _buildScenery() {
    const ALPHA = 0.38;

    // Ground
    const ground = this.add.rectangle(W / 2, 476, W, 32, C.platform, ALPHA);

    // Platforms (using generated textures scaled and tinted)
    const platforms = [
      { x: 155,  y: 418, w: 170, tex: 'plat_normal' },
      { x: 370,  y: 365, w: 150, tex: 'plat_ice' },
      { x: 585,  y: 305, w: 150, tex: 'plat_spring' },
      { x: 800,  y: 248, w: 140, tex: 'plat_normal' },
    ];

    platforms.forEach(({ x, y, w, tex }) => {
      const scaleX = w / 100;
      this.add.image(x, y, tex).setScale(scaleX, 1).setAlpha(ALPHA);
    });

    // Spikes on the ground between platform 1 and 2
    [270, 296, 322].forEach(sx => {
      this.add.image(sx, 456, 'spike').setScale(0.75).setAlpha(ALPHA + 0.1);
    });

    // Spikes between platform 2 and 3
    [490, 516].forEach(sx => {
      this.add.image(sx, 456, 'spike').setScale(0.75).setAlpha(ALPHA + 0.1);
    });

    // Goal orb near far platform
    const goalGlow = this.add.circle(870, 224, 22, C.goal, 0.12);
    const goalOrb  = this.add.image(870, 224, 'goal').setScale(0.55).setAlpha(ALPHA + 0.2);
    this.tweens.add({
      targets: [goalGlow, goalOrb],
      alpha: { from: ALPHA + 0.2, to: ALPHA + 0.45 },
      scale: { from: goalOrb.scale, to: goalOrb.scale * 1.1 },
      duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Floating coin above platform 3
    const coin = this.add.image(585, 268, 'coin').setScale(0.8).setAlpha(ALPHA + 0.15);
    this.tweens.add({
      targets: coin,
      y: 260, alpha: { from: coin.alpha, to: ALPHA + 0.35 },
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Subtle horizontal scan-line atmosphere
    for (let y = 0; y < H; y += 6) {
      this.add.rectangle(W / 2, y, W, 1, 0x000000, 0.04).setOrigin(0.5, 0);
    }
  }

  _buildBallAnimation() {
    const ball = this.add.image(155, 398, 'ball_rage').setScale(0.7).setAlpha(0.55);

    // Waypoints: [x, y, delay before moving to this point]
    // Ball rolls left → right across the platforms then resets
    const path = [
      { x: 155, y: 398,  dur: 0 },      // platform 1 start
      { x: 220, y: 398,  dur: 500 },     // slide right on plat 1
      { x: 370, y: 345,  dur: 450 },     // jump to plat 2
      { x: 430, y: 345,  dur: 400 },     // slide right on plat 2
      { x: 585, y: 285,  dur: 420 },     // jump to plat 3 (spring)
      { x: 640, y: 285,  dur: 380 },     // slide right on plat 3
      { x: 800, y: 228,  dur: 440 },     // jump to plat 4
      { x: 840, y: 228,  dur: 300 },     // roll toward goal
    ];

    let step = 0;

    const moveNext = () => {
      if (step >= path.length - 1) {
        // Flash at goal then reset
        this.tweens.add({
          targets: ball,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            ball.setPosition(155, 398);
            ball.setAlpha(0.55);
            step = 0;
            this.time.delayedCall(600, moveNext);
          },
        });
        return;
      }
      step++;
      const { x, y, dur } = path[step];
      const isJump = y < path[step - 1].y;
      ball.setFlipX(false);

      this.tweens.add({
        targets: ball,
        x, y,
        duration: dur,
        ease: isJump ? 'Quad.easeOut' : 'Linear',
        onComplete: () => {
          if (isJump) {
            this.tweens.add({
              targets: ball,
              y: y + 6,
              duration: 80,
              yoyo: true,
              onComplete: () => this.time.delayedCall(80, moveNext),
            });
          } else {
            // Spin roll while sliding
            this.tweens.add({
              targets: ball,
              angle: ball.angle + 180,
              duration: dur,
              ease: 'Linear',
            });
            this.time.delayedCall(50, moveNext);
          }
        },
      });
    };

    this.time.delayedCall(800, moveNext);
  }

  _buildUI() {
    // Dark gradient overlay on upper portion to ensure text legibility
    const grad = this.add.rectangle(W / 2, H / 2 - 60, W, H * 0.5, 0x0d0d1a, 0.55).setOrigin(0.5);

    // SPIKE PANIC title
    const title = this.add.text(W / 2, H / 2 - 95, 'SPIKE PANIC', {
      fontFamily: '"Press Start 2P"',
      fontSize: '48px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff0000', blur: 28, fill: true },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: { from: 0.96, to: 1.04 },
      scaleY: { from: 0.96, to: 1.04 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Tagline
    this.add.text(W / 2, H / 2 - 38, 'Dodge. Jump. Rage. Repeat.', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#884444',
    }).setOrigin(0.5);

    // Loading bar background
    const barY = H / 2 + 30;
    this.add.rectangle(W / 2, barY + 12, 404, 24, 0x111130).setOrigin(0.5);
    this.add.rectangle(W / 2, barY + 12, 402, 22, 0x1a1a3a).setOrigin(0.5);
    const fill = this.add.rectangle(W / 2 - 199, barY + 3, 2, 18, C.primary).setOrigin(0, 0);

    this.tweens.add({
      targets: fill,
      width: 400,
      duration: 3000,
      ease: 'Cubic.easeInOut',
    });

    // Percentage counter
    const pct = this.add.text(W / 2, barY + 40, '0%', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#555577',
    }).setOrigin(0.5);
    this.tweens.addCounter({
      from: 0, to: 100,
      duration: 3000,
      ease: 'Cubic.easeInOut',
      onUpdate: (t) => pct.setText(`${Math.floor(t.getValue())}%`),
    });

    // Random loading tip
    const tips = [
      'TIP: The physics is PERFECTLY fair.',
      'TIP: Getting angry is part of the fun!',
      'TIP: Skill issue.',
      'TIP: The spikes are your friends.',
      'TIP: Try not to die. (Good luck.)',
      'TIP: Ice platforms have no mercy.',
      'TIP: Spring platforms launch you HIGH.',
      'TIP: Crumble platforms fall fast. MOVE.',
    ];
    this.add.text(W / 2, barY + 62, tips[Phaser.Math.Between(0, tips.length - 1)], {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#444466',
    }).setOrigin(0.5);

    // Version
    this.add.text(W - 8, H - 8, 'v1.0.0', {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#2a2a44',
    }).setOrigin(1, 1);
  }

  generateTextures() {
    const g = this.make.graphics({ add: false });

    // ── Normal platform ──────────────────────────────────────
    g.clear();
    g.fillStyle(C.platform, 1);
    g.fillRoundedRect(0, 0, 100, 22, 4);
    g.fillStyle(0x5a5a7c, 1);
    g.fillRoundedRect(0, 0, 100, 6, { tl: 4, tr: 4, bl: 0, br: 0 });
    g.fillStyle(0x2a2a44, 1);
    g.fillRoundedRect(0, 18, 100, 4, { tl: 0, tr: 0, bl: 4, br: 4 });
    g.generateTexture('plat_normal', 100, 22);

    // ── Ice platform ─────────────────────────────────────────
    g.clear();
    g.fillStyle(0x5588bb, 1);
    g.fillRoundedRect(0, 0, 100, 22, 4);
    g.fillStyle(0x88ccff, 1);
    g.fillRoundedRect(0, 0, 100, 6, { tl: 4, tr: 4, bl: 0, br: 0 });
    g.fillStyle(0xaaddff, 0.7);
    for (let i = 5; i < 100; i += 20) {
      g.fillRect(i, 2, 6, 2);
    }
    g.generateTexture('plat_ice', 100, 22);

    // ── Spring platform ──────────────────────────────────────
    g.clear();
    g.fillStyle(0x226633, 1);
    g.fillRoundedRect(0, 0, 100, 22, 4);
    g.fillStyle(C.spring, 1);
    g.fillRoundedRect(0, 0, 100, 8, { tl: 4, tr: 4, bl: 0, br: 0 });
    g.fillStyle(0xffff44, 1);
    for (let i = 8; i < 92; i += 18) {
      g.fillRect(i, 8, 8, 12);
      g.fillStyle(0xff9900, 1);
      g.fillRect(i + 2, 16, 4, 4);
      g.fillStyle(0xffff44, 1);
    }
    g.generateTexture('plat_spring', 100, 22);

    // ── Crumble platform ─────────────────────────────────────
    g.clear();
    g.fillStyle(C.crumble, 1);
    g.fillRoundedRect(0, 0, 100, 22, 4);
    g.fillStyle(0x6b4020, 1);
    g.fillRoundedRect(0, 0, 100, 6, { tl: 4, tr: 4, bl: 0, br: 0 });
    g.lineStyle(2, 0x000000, 0.4);
    g.lineBetween(15, 4, 25, 18);
    g.lineBetween(40, 2, 52, 20);
    g.lineBetween(65, 5, 75, 17);
    g.lineBetween(82, 3, 92, 19);
    g.generateTexture('plat_crumble', 100, 22);

    // ── Moving platform ──────────────────────────────────────
    g.clear();
    g.fillStyle(C.moving, 1);
    g.fillRoundedRect(0, 0, 100, 22, 4);
    g.fillStyle(0x8855bb, 1);
    g.fillRoundedRect(0, 0, 100, 6, { tl: 4, tr: 4, bl: 0, br: 0 });
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0xaa77dd, 0.5);
      g.fillRect(8 + i * 18, 9, 10, 6);
    }
    g.generateTexture('plat_moving', 100, 22);

    // ── Spike ────────────────────────────────────────────────
    g.clear();
    g.fillStyle(0x888899, 1);
    g.fillTriangle(0, 30, 15, 0, 30, 30);
    g.fillStyle(0xaaaacc, 0.6);
    g.fillTriangle(5, 30, 15, 5, 20, 30);
    g.generateTexture('spike', 30, 30);

    // ── Goal orb ─────────────────────────────────────────────
    g.clear();
    g.fillStyle(C.goal, 0.3);
    g.fillCircle(30, 30, 30);
    g.fillStyle(C.goal, 0.7);
    g.fillCircle(30, 30, 22);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(30, 30, 14);
    g.fillStyle(C.goal, 1);
    g.fillCircle(30, 30, 10);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(26, 26, 5);
    g.generateTexture('goal', 60, 60);

    // ── Wind zone visual ─────────────────────────────────────
    g.clear();
    g.fillStyle(0x0044aa, 0.18);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('wind_left', 1, 1);
    g.clear();
    g.fillStyle(0xaa4400, 0.18);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('wind_right', 1, 1);

    // ── Gravity zone visual ───────────────────────────────────
    g.clear();
    g.fillStyle(0x00ffaa, 0.12);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('grav_zone', 1, 1);

    // ── Coin ─────────────────────────────────────────────────
    g.clear();
    g.fillStyle(C.gold, 1);
    g.fillCircle(14, 14, 14);
    g.fillStyle(0xffee88, 1);
    g.fillCircle(12, 12, 8);
    g.fillStyle(C.gold, 1);
    g.fillText('$', 10, 8);
    g.generateTexture('coin', 28, 28);

    // ── HUD bg ───────────────────────────────────────────────
    g.clear();
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(0, 0, 200, 44, 8);
    g.generateTexture('hud_bg', 200, 44);

    // ── Particle ─────────────────────────────────────────────
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('particle', 12, 12);

    // ── Ball skins ───────────────────────────────────────────
    Object.entries(SKINS).forEach(([key, skin]) => {
      const r = BALL_R_VISUAL;
      const size = r * 2;
      g.clear();

      g.fillStyle(0x000000, 0.3);
      g.fillCircle(r + 3, r + 3, r - 1);

      g.fillStyle(skin.color, 1);
      g.fillCircle(r, r, r);

      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(r - 5, r - 6, r * 0.42);

      g.lineStyle(3, 0x000000, 0.25);
      g.strokeCircle(r, r, r - 1);

      g.fillStyle(0xffffff, 1);
      g.fillCircle(r - 6, r - 4, 6);
      g.fillCircle(r + 6, r - 4, 6);
      g.fillStyle(0x111111, 1);
      g.fillCircle(r - 5, r - 3, 4);
      g.fillCircle(r + 7, r - 3, 4);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(r - 3, r - 5, 2);
      g.fillCircle(r + 9, r - 5, 2);

      g.fillStyle(0x111111, 1);
      g.fillRect(r - 13, r - 13, 9, 3);
      g.fillRect(r + 4,  r - 13, 9, 3);

      g.lineStyle(3, 0x111111, 1);
      g.beginPath();
      g.arc(r, r + 6, 7, 0.35, Math.PI - 0.35, false);
      g.strokePath();

      g.generateTexture(`ball_${key}`, size + 6, size + 6);
    });

    // ── UI Buttons ───────────────────────────────────────────
    g.clear();
    g.fillStyle(C.primary, 1);
    g.fillRoundedRect(0, 0, 260, 52, 10);
    g.fillStyle(0xff6666, 1);
    g.fillRoundedRect(0, 0, 260, 10, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(0xcc2222, 1);
    g.fillRoundedRect(0, 44, 260, 8, { tl: 0, tr: 0, bl: 10, br: 10 });
    g.generateTexture('btn_red', 260, 52);

    g.clear();
    g.fillStyle(0x334455, 1);
    g.fillRoundedRect(0, 0, 260, 52, 10);
    g.fillStyle(0x556677, 1);
    g.fillRoundedRect(0, 0, 260, 10, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(0x223344, 1);
    g.fillRoundedRect(0, 44, 260, 8, { tl: 0, tr: 0, bl: 10, br: 10 });
    g.generateTexture('btn_dark', 260, 52);

    g.clear();
    g.fillStyle(0x1a6632, 1);
    g.fillRoundedRect(0, 0, 260, 52, 10);
    g.fillStyle(0x2a8842, 1);
    g.fillRoundedRect(0, 0, 260, 10, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.generateTexture('btn_green', 260, 52);

    g.clear();
    g.fillStyle(0x664400, 1);
    g.fillRoundedRect(0, 0, 260, 52, 10);
    g.fillStyle(C.gold, 1);
    g.fillRoundedRect(0, 0, 260, 10, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.generateTexture('btn_gold', 260, 52);

    // ── Panel background ─────────────────────────────────────
    g.clear();
    g.fillStyle(C.ui_panel, 0.95);
    g.fillRoundedRect(0, 0, 400, 300, 16);
    g.lineStyle(2, C.primary, 0.4);
    g.strokeRoundedRect(0, 0, 400, 300, 16);
    g.generateTexture('panel', 400, 300);

    // ── Level backgrounds ─────────────────────────────────────
    const BGTEXTURES = [
      [0x0d0d1a, 0x1a0a2e],
      [0x0a0a2e, 0x000a1a],
      [0x1a0a00, 0x2e1a00],
      [0x0a001a, 0x1a0040],
      [0x001a1a, 0x000a0a],
      [0x1a0800, 0x2e0d00],
      [0x000a18, 0x001830],
      [0x100010, 0x200030],
      [0x001010, 0x003030],
      [0x18000a, 0x300010],
    ];
    BGTEXTURES.forEach(([top, bot], i) => {
      g.clear();
      g.fillGradientStyle(top, top, bot, bot, 1);
      g.fillRect(0, 0, W, H);
      g.generateTexture(`bg_${i}`, W, H);
    });

    g.destroy();
  }
}
