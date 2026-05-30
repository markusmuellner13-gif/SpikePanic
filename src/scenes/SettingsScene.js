import { W, H, C } from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  create() {
    const st = Storage.get();
    this.settings = { ...st.settings };

    this.add.image(W / 2, H / 2, 'bg_5').setDisplaySize(W, H);

    this.add.text(W / 2, 28, '⚙  SETTINGS', {
      fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#00e5ff',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    let y = 95;

    // Music Volume
    y = this.addSlider('MUSIC VOLUME', y, this.settings.musicVol, (v) => {
      this.settings.musicVol = v;
      Audio.setMusicVol(v);
    });

    // SFX Volume
    y = this.addSlider('SFX VOLUME', y, this.settings.sfxVol, (v) => {
      this.settings.sfxVol = v;
      Audio.setSfxVol(v);
      Audio.click();
    });

    y += 10;

    // Toggles
    y = this.addToggle('DEATH COUNTER',  y, this.settings.showDeaths,   (v) => { this.settings.showDeaths   = v; });
    y = this.addToggle('RAGE MESSAGES',  y, this.settings.rageMessages,  (v) => { this.settings.rageMessages = v; });
    y = this.addToggle('LEVEL TIPS',     y, this.settings.showTips,      (v) => { this.settings.showTips     = v; });

    y += 20;

    // Controls info
    this.add.text(W / 2, y, 'CONTROLS', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#aaaacc',
    }).setOrigin(0.5);
    y += 24;
    this.add.text(W / 2, y, [
      'MOVE:  Arrow Keys / WASD',
      'JUMP:  Up / W / Space',
      'PAUSE: ESC (returns to menu)',
      'RETRY: R  (on death screen)',
    ].join('\n'), {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#666688',
      lineSpacing: 8, align: 'center',
    }).setOrigin(0.5);

    y += 80;

    // Reset data button
    const resetBtn = this.add.image(W / 2, y, 'btn_red').setScale(0.8, 0.85);
    this.add.text(W / 2, y, '⚠  RESET ALL DATA', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#fff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on('pointerover', () => { Audio.click(); resetBtn.setTint(0xff6666); });
    resetBtn.on('pointerout',  () => resetBtn.clearTint());
    resetBtn.on('pointerdown', () => this.confirmReset());

    this.makeBackBtn();
    this.cameras.main.fadeIn(250);
  }

  addSlider(label, y, initial, onChange) {
    this.add.text(W / 2, y, label, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff',
    }).setOrigin(0.5);
    y += 20;

    const sliderX = W / 2 - 160;
    const sliderW = 320;
    const thumbX = sliderX + initial * sliderW;

    // Track
    this.add.rectangle(W / 2, y, sliderW + 4, 10, 0x222244).setOrigin(0.5);
    const fill = this.add.rectangle(sliderX + (initial * sliderW) / 2, y, initial * sliderW, 8, C.primary).setOrigin(0.5);

    // Thumb
    const thumb = this.add.circle(thumbX, y, 12, 0xffffff).setInteractive({ draggable: true });
    this.input.setDraggable(thumb);

    // Value label
    const valLbl = this.add.text(W / 2 + 175, y, `${Math.round(initial * 100)}%`, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaacc',
    }).setOrigin(0, 0.5);

    thumb.on('drag', (_p, dragX) => {
      const clamped = Phaser.Math.Clamp(dragX, sliderX, sliderX + sliderW);
      thumb.x = clamped;
      const v = (clamped - sliderX) / sliderW;
      fill.width = v * sliderW;
      fill.x = sliderX + v * sliderW / 2;
      valLbl.setText(`${Math.round(v * 100)}%`);
      onChange(v);
      Storage.saveSettings(this.settings);
    });

    return y + 40;
  }

  addToggle(label, y, initial, onChange) {
    this.add.text(W / 2 - 180, y + 2, label, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff',
    });

    let on = initial;
    const track = this.add.rectangle(W / 2 + 120, y + 2, 52, 22, on ? 0x00aa44 : 0x333355, 1)
      .setInteractive({ useHandCursor: true });
    const knob = this.add.circle(W / 2 + (on ? 134 : 107), y + 2, 10, 0xffffff);

    const update = () => {
      track.setFillStyle(on ? 0x00aa44 : 0x333355);
      this.tweens.add({ targets: knob, x: W / 2 + (on ? 134 : 107), duration: 100 });
    };

    track.on('pointerdown', () => {
      Audio.click();
      on = !on;
      update();
      onChange(on);
      Storage.saveSettings(this.settings);
    });

    return y + 44;
  }

  confirmReset() {
    Audio.click();
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(200);
    const panel   = this.add.rectangle(W / 2, H / 2, 500, 280, C.ui_panel, 0.98).setDepth(201);
    panel.setStrokeStyle(2, C.danger);

    this.add.text(W / 2, H / 2 - 100, '⚠  WARNING', {
      fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#ff2200',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(202);

    this.add.text(W / 2, H / 2 - 40, 'This will delete ALL your\nprogress, skins, and coins!\n\nAre you sure?', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff',
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setDepth(202);

    const yes = this.add.image(W / 2 - 110, H / 2 + 80, 'btn_red').setDepth(201).setInteractive({ useHandCursor: true });
    this.add.text(W / 2 - 110, H / 2 + 80, '✓ RESET', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fff',
    }).setOrigin(0.5).setDepth(202);

    const no = this.add.image(W / 2 + 110, H / 2 + 80, 'btn_dark').setDepth(201).setInteractive({ useHandCursor: true });
    this.add.text(W / 2 + 110, H / 2 + 80, '✗ CANCEL', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fff',
    }).setOrigin(0.5).setDepth(202);

    yes.on('pointerdown', () => {
      Storage.reset();
      Audio.die();
      this.cameras.main.fade(300, 0, 0, 0, false, (_c, p) => {
        if (p === 1) this.scene.start('BootScene');
      });
    });
    no.on('pointerdown', () => {
      Audio.click();
      overlay.destroy(); panel.destroy(); yes.destroy(); no.destroy();
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
