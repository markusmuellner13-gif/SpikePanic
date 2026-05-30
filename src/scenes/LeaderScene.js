import { W, H, C, LEVELS } from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

export class LeaderScene extends Phaser.Scene {
  constructor() { super('LeaderScene'); }

  create() {
    const st = Storage.get();
    this.add.image(W / 2, H / 2, 'bg_7').setDisplaySize(W, H);

    this.add.text(W / 2, 28, '🏆 LEADERBOARD', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, 58, '(Local High Scores)', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#555577',
    }).setOrigin(0.5);

    // Level selector tabs
    this.selectedLevel = 0;
    this.tabs = [];
    for (let i = 0; i < 10; i++) {
      const tx = 55 + i * 88;
      const tab = this.add.rectangle(tx, 90, 80, 28, i === 0 ? C.primary : 0x222244, 0.9)
        .setInteractive({ useHandCursor: true });
      const tt = this.add.text(tx, 90, `LVL ${i + 1}`, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#fff',
      }).setOrigin(0.5);

      tab.on('pointerdown', () => {
        Audio.click();
        this.selectedLevel = i;
        this.refreshBoard(st);
        this.tabs.forEach((t, j) => t.card.setFillStyle(j === i ? C.primary : 0x222244));
      });
      this.tabs.push({ card: tab, label: tt });
    }

    this.boardContainer = this.add.container(0, 0);
    this.refreshBoard(st);

    // Personal bests
    this.add.text(W / 2, 440, 'YOUR PERSONAL BESTS', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaacc',
    }).setOrigin(0.5);

    let pbX = 50;
    for (let i = 0; i < 10; i++) {
      const best = st.bestTimes[i];
      const deaths = st.levelDeaths?.[i] || 0;
      const done = (st.completedLevels || []).includes(i);
      const c = this.add.rectangle(pbX + 42, 480, 84, 42, done ? 0x1a2a1a : 0x1a1a2a, 0.9)
        .setStrokeStyle(1, done ? C.success : 0x333355);
      this.add.text(pbX + 42, 466, `L${i + 1}`, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: done ? '#00ff88' : '#333355',
      }).setOrigin(0.5);
      if (done && best) {
        this.add.text(pbX + 42, 480, `${(best / 1000).toFixed(1)}s`, {
          fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffffff',
        }).setOrigin(0.5);
        this.add.text(pbX + 42, 493, `💀${deaths}`, {
          fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ff6666',
        }).setOrigin(0.5);
      } else {
        this.add.text(pbX + 42, 480, '---', {
          fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#333355',
        }).setOrigin(0.5);
      }
      pbX += 90;
    }

    this.makeBackBtn();
    this.cameras.main.fadeIn(250);
  }

  refreshBoard(st) {
    this.boardContainer.removeAll(true);
    const lid = this.selectedLevel;
    const all = (st.leaderboard || []).filter(e => e.levelId === lid);

    if (all.length === 0) {
      const t = this.add.text(W / 2, 270, 'No scores yet!\nComplete this level to appear here.', {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#333355',
        align: 'center', lineSpacing: 10,
      }).setOrigin(0.5);
      this.boardContainer.add(t);
      return;
    }

    const headers = ['RANK', 'PLAYER', 'DEATHS', 'TIME'];
    const colX = [80, 280, 520, 700];
    headers.forEach((h, i) => {
      const t = this.add.text(colX[i], 118, h, {
        fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#666688',
      }).setOrigin(0.5);
      this.boardContainer.add(t);
    });

    this.add.rectangle(W / 2, 128, W - 100, 1, 0x333355).setScrollFactor(0);

    all.slice(0, 10).forEach((entry, i) => {
      const ry = 145 + i * 36;
      const rowBg = this.add.rectangle(W / 2, ry, W - 80, 30,
        i === 0 ? 0x332200 : i < 3 ? 0x221a00 : 0x111122, 0.8);
      this.boardContainer.add(rowBg);

      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
      const cells = [medal, entry.name || 'PLAYER', String(entry.deaths), `${(entry.time / 1000).toFixed(2)}s`];
      cells.forEach((cell, j) => {
        const ct = this.add.text(colX[j], ry, cell, {
          fontFamily: '"Press Start 2P"', fontSize: i < 3 ? '11px' : '9px',
          color: i === 0 ? '#ffcc00' : i < 3 ? '#aaaacc' : '#666688',
          stroke: '#000', strokeThickness: i < 3 ? 3 : 0,
        }).setOrigin(0.5);
        this.boardContainer.add(ct);
      });
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
