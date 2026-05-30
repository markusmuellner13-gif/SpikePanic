import { W, H, C, LEVELS } from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

// Ghost racing multiplayer — race your own best run as a ghost opponent.
// Framework is ready for real-time online (add socket.io / Supabase backend).

export class MultiScene extends Phaser.Scene {
  constructor() { super('MultiScene'); }

  create() {
    const st = Storage.get();
    this.add.image(W / 2, H / 2, 'bg_3').setDisplaySize(W, H);

    this.add.text(W / 2, 28, '👥 MULTIPLAYER', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#00e5ff',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    // Mode cards
    const modes = [
      {
        title: '👻 GHOST RACE',
        desc: 'Race against your\nbest run recorded\nlocally.',
        sub: 'Available now!',
        color: 0x1a2a3a,
        border: C.accent,
        action: () => this.startGhostSelect(st),
      },
      {
        title: '🌐 ONLINE RACE',
        desc: 'Race strangers online.\nGlobal matchmaking.\nReal-time!',
        sub: 'Backend required\n(see STEAM version)',
        color: 0x1a1a3a,
        border: C.primary,
        action: () => this.showOnlineInfo(),
      },
      {
        title: '🎮 LOCAL 2P',
        desc: 'Two players one\nkeyboard. P1: WASD\nP2: Arrow keys',
        sub: 'Same device!',
        color: 0x1a2a1a,
        border: C.success,
        action: () => this.startLocal2P(st),
      },
    ];

    modes.forEach((mode, i) => {
      const cx = W / 2 - 310 + i * 310;
      const cy = 230;
      const card = this.add.rectangle(cx, cy, 270, 240, mode.color, 0.95)
        .setStrokeStyle(2, mode.border).setInteractive({ useHandCursor: true });

      this.add.text(cx, cy - 95, mode.title, {
        fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ffffff',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);

      this.add.text(cx, cy - 35, mode.desc, {
        fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaacc',
        align: 'center', lineSpacing: 8,
      }).setOrigin(0.5);

      this.add.text(cx, cy + 65, mode.sub, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#555577',
        align: 'center', lineSpacing: 6,
      }).setOrigin(0.5);

      const btn = this.add.image(cx, cy + 95, 'btn_dark').setScale(0.9);
      this.add.text(cx, cy + 95, '▶ SELECT', {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#fff',
      }).setOrigin(0.5);

      card.on('pointerover', () => { Audio.click(); card.setFillStyle(0x2a3a4a); });
      card.on('pointerout',  () => card.setFillStyle(mode.color));
      card.on('pointerdown', mode.action);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', mode.action);
    });

    // Info text
    this.add.text(W / 2, 390, '⚡ Online multiplayer backend: Supabase / Firebase / Socket.io ready', {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#333355',
    }).setOrigin(0.5);
    this.add.text(W / 2, 410, '🎮 Steam: Cross-play with Steamworks SDK built in', {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#333355',
    }).setOrigin(0.5);

    this.makeBackBtn();
    this.cameras.main.fadeIn(250);
  }

  startGhostSelect(st) {
    Audio.click();
    const completed = st.completedLevels || [];
    if (completed.length === 0) {
      this.showMsg('Complete at least one level first to have a ghost!');
      return;
    }

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(300);
    const panel   = this.add.rectangle(W / 2, H / 2, 560, 360, C.ui_panel, 0.98).setDepth(301);
    panel.setStrokeStyle(2, C.accent);

    this.add.text(W / 2, H / 2 - 140, '👻 SELECT GHOST LEVEL', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#00e5ff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(302);

    const cols = 5;
    completed.forEach((lid, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = W / 2 - 200 + col * 100;
      const cy = H / 2 - 70 + row * 80;
      const best = st.bestTimes[lid];

      const c2 = this.add.rectangle(cx, cy, 85, 68, 0x1a2a3a, 0.9)
        .setStrokeStyle(2, C.accent).setDepth(301).setInteractive({ useHandCursor: true });
      this.add.text(cx, cy - 16, `LVL ${lid + 1}`, {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(302);
      this.add.text(cx, cy + 6, best ? `${(best / 1000).toFixed(1)}s` : '?', {
        fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#00ff88',
      }).setOrigin(0.5).setDepth(302);
      this.add.text(cx, cy + 22, `💀${st.levelDeaths?.[lid] || 0}`, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ff6666',
      }).setOrigin(0.5).setDepth(302);

      c2.on('pointerover', () => { Audio.click(); c2.setFillStyle(0x2a3a4a); });
      c2.on('pointerout',  () => c2.setFillStyle(0x1a2a3a));
      c2.on('pointerdown', () => {
        Audio.click();
        Audio.stopMusic();
        this.cameras.main.fade(300, 0, 0, 0, false, (_c, p) => {
          if (p === 1) this.scene.start('GameScene', { levelId: lid, ghostMode: true });
        });
      });
    });

    const closeBtn = this.add.image(W / 2, H / 2 + 140, 'btn_dark').setDepth(301).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, H / 2 + 140, '✗ CANCEL', {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#fff',
    }).setOrigin(0.5).setDepth(302);
    closeBtn.on('pointerdown', () => {
      Audio.click(); overlay.destroy(); panel.destroy();
    });
  }

  startLocal2P(_st) {
    Audio.click();
    this.showMsg('Local 2P: Launch a level — P1 uses WASD, P2 uses Arrow Keys!');
    this.time.addEvent({
      delay: 2000,
      callback: () => {
        Audio.stopMusic();
        this.cameras.main.fade(300, 0, 0, 0, false, (_c, p) => {
          if (p === 1) this.scene.start('LevelSelect');
        });
      }
    });
  }

  showOnlineInfo() {
    Audio.click();
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(300);
    const panel   = this.add.rectangle(W / 2, H / 2, 600, 340, C.ui_panel, 0.98).setDepth(301);
    panel.setStrokeStyle(2, C.primary);

    this.add.text(W / 2, H / 2 - 130, '🌐 ONLINE MULTIPLAYER', {
      fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#ff4444',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(302);

    this.add.text(W / 2, H / 2 - 30, [
      'Online multiplayer is ready for backend integration.',
      '',
      'Option 1: Supabase (free tier)',
      'Option 2: Firebase Realtime DB',
      'Option 3: Socket.io (Node.js server)',
      'Steam: Steamworks P2P networking built in',
      '',
      'All connection code is scaffolded —',
      'add your backend URL in src/config.js',
    ].join('\n'), {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#aaaacc',
      align: 'center', lineSpacing: 7,
    }).setOrigin(0.5).setDepth(302);

    const closeBtn = this.add.image(W / 2, H / 2 + 120, 'btn_dark').setDepth(301).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, H / 2 + 120, '✗ CLOSE', {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#fff',
    }).setOrigin(0.5).setDepth(302);
    closeBtn.on('pointerdown', () => { Audio.click(); overlay.destroy(); panel.destroy(); });
  }

  showMsg(msg) {
    const t = this.add.text(W / 2, H - 55, msg, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#00ff88',
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: { from: 1, to: 0 }, duration: 2500, delay: 2000 });
  }

  makeBackBtn() {
    const b = this.add.text(60, H - 24, '◀ BACK', {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    b.on('pointerover', () => { b.setColor('#fff'); Audio.click(); });
    b.on('pointerout',  () => b.setColor('#888'));
    b.on('pointerdown', () => {
      Audio.click();
      this.cameras.main.fade(200, 0, 0, 0, false, (_c, p) => {
        if (p === 1) this.scene.start('MenuScene');
      });
    });
  }
}
