import { W, H, C, SKINS } from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

export class SkinScene extends Phaser.Scene {
  constructor() { super('SkinScene'); }

  create() {
    const st = Storage.get();
    this.selectedSkin = st.selectedSkin || 'rage';

    this.add.image(W / 2, H / 2, 'bg_2').setDisplaySize(W, H);

    this.add.text(W / 2, 28, '🎨 SELECT SKIN', {
      fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#00e5ff',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    // Coin display
    this.coinDisplay = this.add.text(W - 12, 12, `💰 ${st.coins || 0}`, {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);

    const skinKeys = Object.keys(SKINS);
    const cols = 4;
    const cellW = 180;
    const cellH = 145;
    const startX = W / 2 - (cols * cellW) / 2 + cellW / 2;
    const startY = 95;

    this.cards = [];
    skinKeys.forEach((key, i) => {
      const skin = SKINS[key];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * cellW;
      const cy = startY + row * cellH;
      const owned = (st.ownedSkins || ['rage', 'cool']).includes(key);
      const selected = key === this.selectedSkin;

      const card = this.add.rectangle(cx, cy, 155, 125,
        selected ? 0x223333 : owned ? 0x1a1a30 : 0x0d0d18, 0.95);
      card.setStrokeStyle(3, selected ? C.accent : owned ? C.primary : 0x333355);

      const ball = this.add.image(cx, cy - 22, `ball_${key}`).setScale(1.8);
      if (!owned) ball.setTint(0x333355);

      this.add.text(cx, cy + 22, skin.name, {
        fontFamily: '"Press Start 2P"', fontSize: '7px',
        color: owned ? '#ffffff' : '#444466',
      }).setOrigin(0.5);

      if (owned) {
        const label = selected ? 'EQUIPPED' : 'EQUIP';
        const btn = this.add.text(cx, cy + 44, label, {
          fontFamily: '"Press Start 2P"', fontSize: '7px',
          color: selected ? '#00ff88' : '#aaaacc',
          backgroundColor: selected ? '#003322' : '#111122',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => { Audio.click(); btn.setColor('#ffffff'); });
        btn.on('pointerout',  () => btn.setColor(selected ? '#00ff88' : '#aaaacc'));
        btn.on('pointerdown', () => {
          if (key !== this.selectedSkin) {
            Audio.click();
            this.selectedSkin = key;
            Storage.selectSkin(key);
            this.scene.restart();
          }
        });
      } else {
        const priceBtn = this.add.text(cx, cy + 44, `💰 ${skin.price}`, {
          fontFamily: '"Press Start 2P"', fontSize: '7px',
          color: '#ffcc00',
          backgroundColor: '#221100',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        priceBtn.on('pointerover', () => { Audio.click(); priceBtn.setColor('#ffffff'); });
        priceBtn.on('pointerout',  () => priceBtn.setColor('#ffcc00'));
        priceBtn.on('pointerdown', () => {
          const cur = Storage.get().coins || 0;
          if (cur >= skin.price) {
            Storage.spendCoins(skin.price);
            Storage.ownSkin(key);
            Audio.coin();
            this.scene.restart();
          } else {
            this.showMsg(`Need ${skin.price - cur} more coins!`);
          }
        });
      }

      this.cards.push({ card, ball, key });
    });

    this.msgText = this.add.text(W / 2, H - 55, '', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ff4444',
    }).setOrigin(0.5);

    this.makeBackBtn();
    this.cameras.main.fadeIn(250);
  }

  showMsg(msg) {
    this.msgText.setText(msg);
    this.tweens.add({ targets: this.msgText, alpha: { from: 1, to: 0 }, duration: 2000, delay: 1000 });
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
