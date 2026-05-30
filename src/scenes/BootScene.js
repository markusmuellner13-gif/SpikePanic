import { W, H, C, SKINS, BALL_R_VISUAL } from '../constants.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    this.generateTextures();
    this.time.addEvent({ delay: 2200, callback: () => this.scene.start('MenuScene') });
    this.createSplash();
  }

  createSplash() {
    const bg = this.add.rectangle(0, 0, W, H, C.bg).setOrigin(0);

    // Animated particles
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const size = Phaser.Math.Between(1, 3);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.1, 0.6));
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: 0 },
        duration: Phaser.Math.Between(800, 2000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
      });
    }

    // Rage Ball title
    const title = this.add.text(W / 2, H / 2 - 80, 'RAGE BALL', {
      fontFamily: '"Press Start 2P"',
      fontSize: '52px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff0000', blur: 30, fill: true },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: { from: 0.95, to: 1.05 },
      scaleY: { from: 0.95, to: 1.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Tagline
    this.add.text(W / 2, H / 2 - 15, 'One ball.  Infinite rage.  Zero mercy.', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#888888',
    }).setOrigin(0.5);

    // Loading bar background
    const barX = W / 2 - 200;
    const barY = H / 2 + 50;
    this.add.rectangle(W / 2, barY + 15, 404, 24, 0x333355).setOrigin(0.5);
    const fill = this.add.rectangle(barX, barY + 3, 2, 20, C.primary).setOrigin(0, 0);

    this.tweens.add({
      targets: fill,
      width: 400,
      duration: 1800,
      ease: 'Cubic.easeIn',
    });

    // Loading text
    const tips = [
      'Tip: The physics is PERFECTLY fair.',
      'Tip: Getting angry is part of the fun!',
      'Tip: Skill issue.',
      'Tip: The spikes are your friends.',
      'Tip: Try not to die. (Good luck.)',
    ];
    this.add.text(W / 2, H / 2 + 100, tips[Phaser.Math.Between(0, tips.length - 1)], {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#555577',
    }).setOrigin(0.5);

    // Version
    this.add.text(W - 10, H - 10, 'v1.0.0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#333355',
    }).setOrigin(1, 1);

    // Signal HTML to hide pre-load screen
    window.dispatchEvent(new Event('RAGE_GAME_READY'));
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
    // ice shine
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

    // ── Particle (small circle for explosions) ───────────────
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('particle', 12, 12);

    // ── Ball skins ───────────────────────────────────────────
    Object.entries(SKINS).forEach(([key, skin]) => {
      const r = BALL_R_VISUAL;
      const size = r * 2;
      g.clear();

      // Shadow
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(r + 3, r + 3, r - 1);

      // Main body
      g.fillStyle(skin.color, 1);
      g.fillCircle(r, r, r);

      // Sheen / highlight
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(r - 5, r - 6, r * 0.42);

      // Outer edge shadow
      g.lineStyle(3, 0x000000, 0.25);
      g.strokeCircle(r, r, r - 1);

      // Eyes (white)
      g.fillStyle(0xffffff, 1);
      g.fillCircle(r - 6, r - 4, 6);
      g.fillCircle(r + 6, r - 4, 6);
      // Pupils
      g.fillStyle(0x111111, 1);
      g.fillCircle(r - 5, r - 3, 4);
      g.fillCircle(r + 7, r - 3, 4);
      // Eye shine
      g.fillStyle(0xffffff, 1);
      g.fillCircle(r - 3, r - 5, 2);
      g.fillCircle(r + 9, r - 5, 2);

      // Angry brows
      g.fillStyle(0x111111, 1);
      g.fillRect(r - 13, r - 13, 9, 3);
      g.fillRect(r + 4,  r - 13, 9, 3);

      // Angry mouth (line below center)
      g.lineStyle(3, 0x111111, 1);
      g.beginPath();
      g.arc(r, r + 6, 7, 0.35, Math.PI - 0.35, false);
      g.strokePath();

      g.generateTexture(`ball_${key}`, size + 6, size + 6);
    });

    // ── UI Button ────────────────────────────────────────────
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

    // ── Panel backgrounds ─────────────────────────────────────
    g.clear();
    g.fillStyle(C.ui_panel, 0.95);
    g.fillRoundedRect(0, 0, 400, 300, 16);
    g.lineStyle(2, C.primary, 0.4);
    g.strokeRoundedRect(0, 0, 400, 300, 16);
    g.generateTexture('panel', 400, 300);

    // ── Backgrounds ───────────────────────────────────────────
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
