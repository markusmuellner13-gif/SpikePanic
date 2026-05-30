import { W, H, C, SKINS, LEVELS } from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

const BTN_STYLE = {
  fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#fff',
  stroke: '#000', strokeThickness: 3,
};
const SMALL = { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#aaa' };

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const st = Storage.get();
    Audio.startMusic();

    // Background
    const bgIdx = st.unlockedLevels.length % 10;
    this.add.image(W / 2, H / 2, `bg_${bgIdx}`).setDisplaySize(W, H);

    // Stars
    this.stars = [];
    for (let i = 0; i < 60; i++) this.addStar();

    // Floating ball decoration
    const skin = st.selectedSkin || 'rage';
    this.decorBall = this.add.image(W - 100, H / 2 + 20, `ball_${skin}`)
      .setAlpha(0.15).setScale(5);
    this.tweens.add({
      targets: this.decorBall,
      y: H / 2 - 20, angle: 10,
      duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // RAGE BALL Title
    const title = this.add.text(W / 2, 80, 'RAGE BALL', {
      fontFamily: '"Press Start 2P"',
      fontSize: '54px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff2200', blur: 30, fill: true },
    }).setOrigin(0.5);
    this.tweens.add({
      targets: title,
      scaleX: { from: 0.97, to: 1.03 }, scaleY: { from: 0.97, to: 1.03 },
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(W / 2, 130, 'One ball.  Infinite rage.  Zero mercy.', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#884444',
    }).setOrigin(0.5);

    // Coin display (top right)
    const coins = st.coins || 0;
    this.coinText = this.add.text(W - 12, 12, `💰 ${coins}`, {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    // Player name (top left)
    this.add.text(12, 12, st.playerName || 'RAGE KING', {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    });

    // Main buttons
    const buttons = [
      { label: '▶  PLAY',        scene: 'LevelSelect', tex: 'btn_red',   y: 220 },
      { label: '👥 MULTIPLAYER', scene: 'MultiScene',  tex: 'btn_dark',  y: 283 },
      { label: '🏆 LEADERBOARD', scene: 'LeaderScene', tex: 'btn_dark',  y: 346 },
      { label: '🎨 SKINS',       scene: 'SkinScene',   tex: 'btn_dark',  y: 409 },
      { label: '🛒 SHOP',        scene: 'ShopScene',   tex: 'btn_gold',  y: 472 },
    ];

    buttons.forEach(({ label, scene, tex, y }) => {
      const btn = this.add.image(W / 2, y, tex).setScale(1, 1).setInteractive({ useHandCursor: true });
      const txt = this.add.text(W / 2, y, label, BTN_STYLE).setOrigin(0.5);
      btn.on('pointerover', () => {
        this.tweens.add({ targets: [btn, txt], scaleX: 1.04, scaleY: 1.04, duration: 80 });
        Audio.click();
      });
      btn.on('pointerout', () => {
        this.tweens.add({ targets: [btn, txt], scaleX: 1, scaleY: 1, duration: 80 });
      });
      btn.on('pointerdown', () => {
        Audio.click();
        this.cameras.main.fade(300, 0, 0, 0, false, (_c, p) => {
          if (p === 1) this.scene.start(scene);
        });
      });
    });

    // Settings + Account icons (bottom row)
    const iconBtns = [
      { label: '⚙ SETTINGS', scene: 'SettingsScene', x: W / 2 - 140 },
      { label: '👤 ACCOUNT',  scene: 'AccountScene',  x: W / 2 + 140 },
    ];
    iconBtns.forEach(({ label, scene, x }) => {
      const t = this.add.text(x, H - 24, label, {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#555577',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { t.setColor('#aaaadd'); Audio.click(); });
      t.on('pointerout',  () => t.setColor('#555577'));
      t.on('pointerdown', () => {
        Audio.click();
        this.cameras.main.fade(250, 0, 0, 0, false, (_c, p) => {
          if (p === 1) this.scene.start(scene);
        });
      });
    });

    // Total deaths
    const td = st.totalDeaths || 0;
    if (td > 0) {
      this.add.text(W / 2, H - 24, `Total deaths: ${td.toLocaleString()}`, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#332233',
      }).setOrigin(0.5);
    }

    this.cameras.main.fadeIn(400);
  }

  addStar() {
    const x = Phaser.Math.Between(0, W);
    const y = Phaser.Math.Between(0, H);
    const r = Phaser.Math.FloatBetween(0.5, 2);
    const a = Phaser.Math.FloatBetween(0.1, 0.5);
    const star = this.add.circle(x, y, r, 0xffffff, a);
    this.tweens.add({
      targets: star,
      alpha: { from: a, to: 0 },
      duration: Phaser.Math.Between(1500, 4000),
      yoyo: true, repeat: -1,
      delay: Phaser.Math.Between(0, 3000),
    });
  }
}

// ── Level Select ─────────────────────────────────────────────────────────────
export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  create() {
    const st = Storage.get();
    this.add.image(W / 2, H / 2, 'bg_0').setDisplaySize(W, H);

    this.add.text(W / 2, 40, 'SELECT LEVEL', {
      fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ff4444',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    const cols = 5;
    const rows = 2;
    const cellW = 160;
    const cellH = 120;
    const startX = W / 2 - (cols * cellW) / 2 + cellW / 2;
    const startY = 130;

    for (let i = 0; i < 10; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * cellW;
      const cy = startY + row * cellH;
      const unlocked = st.unlockedLevels.includes(i);
      const completed = st.completedLevels.includes(i);

      const card = this.add.rectangle(cx, cy, 140, 100,
        completed ? 0x1a3322 : unlocked ? 0x1a1a30 : 0x0d0d18, 0.95);
      this.add.rectangle(cx, cy, 140, 100, 0x000000, 0).setStrokeStyle(
        2, completed ? C.success : unlocked ? C.primary : 0x333333
      );

      this.add.text(cx, cy - 20, `${i + 1}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: unlocked ? '28px' : '22px',
        color: completed ? '#00ff88' : unlocked ? '#ff4444' : '#333355',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5);

      this.add.text(cx, cy + 10, LEVELS[i].name, {
        fontFamily: '"Press Start 2P"', fontSize: '6px',
        color: unlocked ? '#aaaacc' : '#333355',
        wordWrap: { width: 120 },
      }).setOrigin(0.5);

      if (completed) {
        const best = st.bestTimes[i];
        const deaths = st.levelDeaths[i] || 0;
        this.add.text(cx, cy + 32, `⏱ ${best ? (best / 1000).toFixed(1) + 's' : '?'}`, {
          fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#44ff88',
        }).setOrigin(0.5);
        this.add.text(cx, cy + 45, `💀 ${deaths}`, {
          fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ff6666',
        }).setOrigin(0.5);
      }

      if (!unlocked) {
        this.add.text(cx, cy + 30, '🔒', { fontSize: '20px' }).setOrigin(0.5);
      }

      if (unlocked) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => {
          this.tweens.add({ targets: card, scaleX: 1.05, scaleY: 1.05, duration: 80 });
          Audio.click();
        });
        card.on('pointerout', () => {
          this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 80 });
        });
        card.on('pointerdown', () => {
          Audio.click();
          Audio.stopMusic();
          this.cameras.main.fade(300, 0, 0, 0, false, (_c, p) => {
            if (p === 1) this.scene.start('GameScene', { levelId: i });
          });
        });
      }
    }

    this.makeBackBtn();
    this.cameras.main.fadeIn(300);
  }

  makeBackBtn() {
    const b = this.add.text(60, H - 30, '◀ BACK', {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    b.on('pointerover', () => { b.setColor('#fff'); Audio.click(); });
    b.on('pointerout',  () => b.setColor('#888'));
    b.on('pointerdown', () => {
      Audio.click();
      this.cameras.main.fade(250, 0, 0, 0, false, (_c, p) => {
        if (p === 1) this.scene.start('MenuScene');
      });
    });
  }
}
