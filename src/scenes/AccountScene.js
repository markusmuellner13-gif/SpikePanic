import { W, H, C, ACHIEVEMENTS } from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

export class AccountScene extends Phaser.Scene {
  constructor() { super('AccountScene'); }

  create() {
    const st = Storage.get();
    this.add.image(W / 2, H / 2, 'bg_4').setDisplaySize(W, H);

    this.add.text(W / 2, 28, '👤 PROFILE', {
      fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#00e5ff',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    // Avatar (ball)
    const skin = st.selectedSkin || 'rage';
    const avatar = this.add.image(130, 120, `ball_${skin}`).setScale(3.5);
    this.tweens.add({
      targets: avatar,
      y: 110, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Player name
    this.add.text(260, 75, 'PLAYER NAME', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#888',
    });
    this.nameDisplay = this.add.text(260, 95, st.playerName || 'RAGE KING', {
      fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    });

    // Edit name button
    const editBtn = this.add.text(260, 130, '✏  EDIT NAME', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#aaaacc',
      backgroundColor: '#111122', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    editBtn.on('pointerover', () => { Audio.click(); editBtn.setColor('#ffffff'); });
    editBtn.on('pointerout',  () => editBtn.setColor('#aaaacc'));
    editBtn.on('pointerdown', () => this.showNameEdit(st));

    // Stats panel
    const stats = [
      ['💀 TOTAL DEATHS',     (st.totalDeaths || 0).toLocaleString()],
      ['🎯 LEVELS DONE',      `${(st.completedLevels || []).length} / 10`],
      ['💰 RAGE COINS',       (st.coins || 0).toLocaleString()],
      ['⏱  TOTAL TIME',      this.formatMs(st.totalTime || 0)],
      ['✨ FLAWLESS RUNS',    (st.flawlessCount || 0).toLocaleString()],
    ];

    stats.forEach(([label, val], i) => {
      const sx = (i % 3) * 270 + 80;
      const sy = 185 + Math.floor(i / 3) * 60;
      const box = this.add.rectangle(sx, sy, 240, 48, 0x1a1a30, 0.9).setStrokeStyle(1, 0x333355);
      this.add.text(sx, sy - 10, label, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#666688',
      }).setOrigin(0.5);
      this.add.text(sx, sy + 10, val, {
        fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ffffff',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);
    });

    // Achievements section
    this.add.text(W / 2, 310, 'ACHIEVEMENTS', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    const unlocked = st.achievements || {};
    const achW = 70;
    const achSpacing = 80;
    const achStartX = W / 2 - (ACHIEVEMENTS.length * achSpacing) / 2 + achSpacing / 2;

    ACHIEVEMENTS.forEach((ach, i) => {
      const ax = achStartX + i * achSpacing;
      const ay = 370;
      const done = !!unlocked[ach.id];
      this.add.circle(ax, ay, 26, done ? 0x224433 : 0x1a1a1a).setStrokeStyle(2, done ? C.success : 0x333333);
      this.add.text(ax, ay, ach.icon, { fontSize: done ? '22px' : '18px' }).setOrigin(0.5).setAlpha(done ? 1 : 0.3);
      this.add.text(ax, ay + 34, ach.name.substring(0, 10), {
        fontFamily: '"Press Start 2P"', fontSize: '5px',
        color: done ? '#00ff88' : '#333355',
        align: 'center', wordWrap: { width: 70 },
      }).setOrigin(0.5);
    });

    this.makeBackBtn();
    this.cameras.main.fadeIn(250);
  }

  formatMs(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  showNameEdit(st) {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(300);
    const panel   = this.add.rectangle(W / 2, H / 2, 500, 260, C.ui_panel, 0.98).setDepth(301);
    panel.setStrokeStyle(2, C.accent);

    this.add.text(W / 2, H / 2 - 90, 'ENTER YOUR NAME', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#00e5ff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(302);

    const maxLen = 16;
    let name = st.playerName || '';

    const nameTxt = this.add.text(W / 2, H / 2 - 30, name || '|', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ffffff',
      stroke: '#000', strokeThickness: 4,
      backgroundColor: '#111122', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(302);

    this.add.text(W / 2, H / 2 + 20, 'Type your name. Max 16 characters.', {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#555577',
    }).setOrigin(0.5).setDepth(302);

    const blink = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => nameTxt.setText(name + (name.length < maxLen ? '|' : '')),
    });

    const handleKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        this.input.keyboard.off('keydown', handleKey);
        blink.remove();
        if (name.trim()) {
          Storage.set('playerName', name.trim().substring(0, maxLen).toUpperCase());
        }
        overlay.destroy(); panel.destroy();
        this.scene.restart();
        return;
      }
      if (e.key === 'Backspace') {
        name = name.slice(0, -1);
      } else if (e.key.length === 1 && name.length < maxLen) {
        name += e.key.toUpperCase();
      }
      nameTxt.setText(name + '|');
    };

    this.input.keyboard.on('keydown', handleKey);

    const doneBtn = this.add.image(W / 2, H / 2 + 80, 'btn_green').setDepth(301).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, H / 2 + 80, '✓ SAVE', {
      fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#fff',
    }).setOrigin(0.5).setDepth(302);
    doneBtn.on('pointerdown', () => {
      this.input.keyboard.off('keydown', handleKey);
      blink.remove();
      if (name.trim()) Storage.set('playerName', name.trim().substring(0, maxLen).toUpperCase());
      overlay.destroy(); panel.destroy();
      this.scene.restart();
    });
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
