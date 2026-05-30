import { W, H, C } from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

const COIN_PACKS = [
  { coins: 50,   label: '50 COINS',  price: '$0.99',  bonus: '', tex: 'btn_dark' },
  { coins: 250,  label: '250 COINS', price: '$3.99',  bonus: 'BEST VALUE', tex: 'btn_red' },
  { coins: 600,  label: '600 COINS', price: '$7.99',  bonus: 'MOST POPULAR', tex: 'btn_gold' },
  { coins: 1500, label: '1500 COINS',price: '$14.99', bonus: 'MEGADEAL', tex: 'btn_green' },
];

const EARN_OPTIONS = [
  { label: '🎬 Watch Ad = 15 Coins', action: 'ad', reward: 15 },
  { label: '🎯 Complete a Level = 10+ Coins', action: 'info' },
  { label: '💀 Die 10 times = 5 Coins', action: 'info' },
];

export class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    const st = Storage.get();
    this.add.image(W / 2, H / 2, 'bg_9').setDisplaySize(W, H);

    this.add.text(W / 2, 28, '🛒 SHOP', {
      fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    // Coin balance
    this.coinDisplay = this.add.text(W / 2, 62, `Your Balance: 💰 ${(st.coins || 0).toLocaleString()} Rage Coins`, {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Section: Buy Coins
    this.add.text(W / 2, 95, '── BUY RAGE COINS ──', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#aaaacc',
    }).setOrigin(0.5);

    COIN_PACKS.forEach((pack, i) => {
      const cx = (W / 2) - 330 + i * 225;
      const cy = 175;

      const card = this.add.rectangle(cx, cy, 200, 130, 0x1a1a30, 0.95)
        .setStrokeStyle(2, pack.bonus ? C.gold : 0x333355).setInteractive({ useHandCursor: true });

      if (pack.bonus) {
        this.add.text(cx, cy - 75, pack.bonus, {
          fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ffcc00',
          backgroundColor: '#443300', padding: { x: 6, y: 3 },
        }).setOrigin(0.5);
      }

      this.add.text(cx, cy - 35, '💰', { fontSize: '32px' }).setOrigin(0.5);
      this.add.text(cx, cy + 8, pack.label, {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff',
      }).setOrigin(0.5);
      this.add.text(cx, cy + 32, pack.price, {
        fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#ffcc00',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);
      this.add.text(cx, cy + 56, '(Steam / Web checkout)', {
        fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#444466',
      }).setOrigin(0.5);

      card.on('pointerover', () => { Audio.click(); card.setFillStyle(0x2a2a50); });
      card.on('pointerout',  () => card.setFillStyle(0x1a1a30));
      card.on('pointerdown', () => this.showPurchaseInfo(pack));
    });

    // Section: Earn Free Coins
    this.add.text(W / 2, 265, '── EARN FREE COINS ──', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#aaaacc',
    }).setOrigin(0.5);

    EARN_OPTIONS.forEach((opt, i) => {
      const btn = this.add.text(W / 2, 295 + i * 46, opt.label, {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff',
        backgroundColor: '#1a1a2e', padding: { x: 18, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => { Audio.click(); btn.setColor('#ffff88'); });
      btn.on('pointerout',  () => btn.setColor('#ffffff'));
      btn.on('pointerdown', () => {
        if (opt.action === 'ad') this.simulateAd(opt.reward);
      });
    });

    // Rage Pass teaser
    const passY = 420;
    const passCard = this.add.rectangle(W / 2, passY, 700, 60, 0x1a0a3a, 0.9)
      .setStrokeStyle(2, 0xaa44ff);
    this.add.text(W / 2 - 150, passY, '⚡ RAGE PASS  —  All skins + 500 bonus coins', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#cc88ff',
    }).setOrigin(0, 0.5);
    this.add.text(W / 2 + 260, passY, '$9.99', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    passCard.setInteractive({ useHandCursor: true });
    passCard.on('pointerover', () => { Audio.click(); passCard.setFillStyle(0x2a1050); });
    passCard.on('pointerout',  () => passCard.setFillStyle(0x1a0a3a));
    passCard.on('pointerdown', () => this.showPurchaseInfo({ label: 'RAGE PASS', price: '$9.99' }));

    this.msgText = this.add.text(W / 2, H - 55, '', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#00ff88',
    }).setOrigin(0.5);

    this.makeBackBtn();
    this.cameras.main.fadeIn(250);
  }

  simulateAd(reward) {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.9).setDepth(300);
    let countdown = 5;
    const cdTxt = this.add.text(W / 2, H / 2, `AD\nSkipping in ${countdown}s...`, {
      fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#ffcc00',
      align: 'center', lineSpacing: 12,
    }).setOrigin(0.5).setDepth(301);

    const timer = this.time.addEvent({
      delay: 1000, repeat: countdown - 1,
      callback: () => {
        countdown--;
        cdTxt.setText(countdown > 0 ? `AD\nSkipping in ${countdown}s...` : 'DONE!');
        if (countdown <= 0) {
          timer.remove();
          this.time.addEvent({ delay: 500, callback: () => {
            overlay.destroy(); cdTxt.destroy();
            Storage.addCoins(reward);
            Audio.coin();
            this.coinDisplay.setText(`Your Balance: 💰 ${Storage.get().coins.toLocaleString()} Rage Coins`);
            this.msgText.setText(`+${reward} Coins earned! Thanks for watching!`);
            this.tweens.add({ targets: this.msgText, alpha: { from: 1, to: 0 }, duration: 2500, delay: 1500 });
          }});
        }
      }
    });
  }

  showPurchaseInfo(pack) {
    Audio.click();
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(400);
    const panel   = this.add.rectangle(W / 2, H / 2, 520, 300, C.ui_panel, 0.98).setDepth(401);
    panel.setStrokeStyle(2, C.gold);

    this.add.text(W / 2, H / 2 - 110, '🛒 PURCHASE', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(402);

    this.add.text(W / 2, H / 2 - 60, `${pack.label}\n${pack.price}`, {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffffff',
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setDepth(402);

    this.add.text(W / 2, H / 2 + 0, [
      'Steam version: Purchase via Steam store',
      'Web version: Payment gateway',
      '(Integration ready for Stripe / PayPal)',
      '',
      'Contact: your@email.com to set up payments',
    ].join('\n'), {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#666688',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(402);

    const closeBtn = this.add.image(W / 2, H / 2 + 100, 'btn_dark').setDepth(401).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, H / 2 + 100, '✗ CLOSE', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fff',
    }).setOrigin(0.5).setDepth(402);
    closeBtn.on('pointerdown', () => {
      Audio.click(); overlay.destroy(); panel.destroy();
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
