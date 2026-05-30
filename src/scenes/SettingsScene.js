import { W, H, C } from '../constants.js';
import { Storage } from '../storage.js';
import { Audio } from '../audio.js';

const FONT = '"Press Start 2P"';
const TAB_Y = 65;
const CONTENT_Y = 100;

export class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  create() {
    const st = Storage.get();
    this.settings = { ...st.settings };
    this._groups = [];
    this._tabBtns = [];

    this.add.image(W / 2, H / 2, 'bg_5').setDisplaySize(W, H);
    // Dark overlay for readability
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45);

    this.add.text(W / 2, 24, '⚙  SETTINGS', {
      fontFamily: FONT, fontSize: '20px', color: '#00e5ff',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    const TABS = ['AUDIO', 'DISPLAY', 'CONTROLS', 'DATA'];
    TABS.forEach((name, i) => this._makeTab(name, i, TABS.length));

    this._groups = [
      this._buildAudio(),
      this._buildDisplay(),
      this._buildControls(),
      this._buildData(st),
    ];

    this._showTab(0);
    this._makeBackBtn();
    this.cameras.main.fadeIn(250);
  }

  // ─── Tab bar ────────────────────────────────────────────────
  _makeTab(name, idx, total) {
    const tabW = 200;
    const gap  = 8;
    const totalW = total * tabW + (total - 1) * gap;
    const x = W / 2 - totalW / 2 + idx * (tabW + gap) + tabW / 2;

    const bg = this.add.rectangle(x, TAB_Y, tabW, 30, 0x1a1a30, 1)
      .setStrokeStyle(1, 0x333355)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(x, TAB_Y, name, {
      fontFamily: FONT, fontSize: '8px', color: '#888888',
    }).setOrigin(0.5);

    bg.on('pointerover', () => { if (this._activeTab !== idx) bg.setFillStyle(0x22223a); });
    bg.on('pointerout',  () => { if (this._activeTab !== idx) bg.setFillStyle(0x1a1a30); });
    bg.on('pointerdown', () => { Audio.click(); this._showTab(idx); });

    this._tabBtns.push({ bg, txt });
  }

  _showTab(idx) {
    this._activeTab = idx;
    this._groups.forEach((group, i) => group.forEach(o => o.setVisible(i === idx)));
    this._tabBtns.forEach(({ bg, txt }, i) => {
      const active = i === idx;
      bg.setFillStyle(active ? 0x12122a : 0x1a1a30);
      bg.setStrokeStyle(active ? 2 : 1, active ? C.accent : 0x333355);
      txt.setColor(active ? '#00e5ff' : '#888888');
    });
  }

  // ─── AUDIO TAB ─────────────────────────────────────────────
  _buildAudio() {
    const objs = [];
    const add = (o) => { objs.push(o.setVisible(false)); return o; };

    let y = CONTENT_Y + 10;

    add(this._sectionHeader('MUSIC', y));
    y += 28;

    // Music enabled toggle + volume slider on same row
    const musicOn = this.settings.musicEnabled !== false;
    const [mTogObjs, , setMusicToggle] = this._addRowToggle(
      objs, 'ENABLED', y, musicOn, (v) => {
        this.settings.musicEnabled = v;
        Audio.setMusicMute(!v);
        Storage.saveSettings(this.settings);
      }
    );

    y += 36;
    add(this._rowLabel('VOLUME', y));
    const [mSlObjs] = this._addSliderRow(objs, y, this.settings.musicVol, (v) => {
      this.settings.musicVol = v;
      Audio.setMusicVol(v);
      Storage.saveSettings(this.settings);
    });
    y += 40;

    add(this._divider(y));
    y += 22;

    add(this._sectionHeader('SOUND EFFECTS', y));
    y += 28;

    const sfxOn = this.settings.sfxEnabled !== false;
    this._addRowToggle(objs, 'ENABLED', y, sfxOn, (v) => {
      this.settings.sfxEnabled = v;
      Audio.setSfxMute(!v);
      Storage.saveSettings(this.settings);
    });
    y += 36;

    add(this._rowLabel('VOLUME', y));
    this._addSliderRow(objs, y, this.settings.sfxVol, (v) => {
      this.settings.sfxVol = v;
      Audio.setSfxVol(v);
      Audio.click();
      Storage.saveSettings(this.settings);
    });

    return objs;
  }

  // ─── DISPLAY TAB ───────────────────────────────────────────
  _buildDisplay() {
    const objs = [];
    let y = CONTENT_Y + 10;

    objs.push(this._sectionHeader('DISPLAY OPTIONS', y).setVisible(false));
    y += 34;

    const toggles = [
      ['DEATH COUNTER',  'showDeaths',   'Show your death count on screen during play'],
      ['RAGE MESSAGES',  'rageMessages', 'Show taunting messages on death'],
      ['LEVEL TIPS',     'showTips',     'Show control tips at the start of each level'],
      ['SCREEN SHAKE',   'screenShake',  'Shake the screen on death'],
    ];

    toggles.forEach(([label, key, hint]) => {
      const val = this.settings[key] !== false;
      this._addFullToggle(objs, label, hint, y, val, (v) => {
        this.settings[key] = v;
        Storage.saveSettings(this.settings);
      });
      y += 52;
    });

    return objs;
  }

  // ─── CONTROLS TAB ──────────────────────────────────────────
  _buildControls() {
    const objs = [];
    const add = (o) => { objs.push(o.setVisible(false)); return o; };

    let y = CONTENT_Y + 10;

    add(this._sectionHeader('KEYBOARD CONTROLS', y));
    y += 34;

    const rows = [
      ['MOVE LEFT / RIGHT', 'Arrow Keys  or  A / D'],
      ['JUMP',              'Up Arrow  or  W  or  SPACE'],
      ['PAUSE / MENU',      'ESC'],
      ['RETRY (on death)',  'R'],
    ];

    rows.forEach(([action, keys]) => {
      add(this.add.text(W / 2 - 200, y, action, {
        fontFamily: FONT, fontSize: '8px', color: '#888899',
      }));
      add(this.add.text(W / 2 + 200, y, keys, {
        fontFamily: FONT, fontSize: '8px', color: '#ffffff',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0));
      add(this.add.rectangle(W / 2, y + 18, W - 100, 1, 0x222244, 0.8));
      y += 40;
    });

    y += 10;
    add(this._sectionHeader('GAMEPAD', y));
    y += 30;
    add(this.add.text(W / 2, y, 'Xbox / PS controller supported.\nLeft stick or D-Pad to move.  A / Cross to jump.', {
      fontFamily: FONT, fontSize: '7px', color: '#555577',
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5));

    return objs;
  }

  // ─── DATA TAB ──────────────────────────────────────────────
  _buildData(st) {
    const objs = [];
    const add = (o) => { objs.push(o.setVisible(false)); return o; };

    let y = CONTENT_Y + 10;

    add(this._sectionHeader('SAVE DATA', y));
    y += 30;

    const kb = Storage.getSaveSize();
    add(this.add.text(W / 2, y, `Storage used: ${kb} KB`, {
      fontFamily: FONT, fontSize: '8px', color: '#555577',
    }).setOrigin(0.5));
    y += 28;

    add(this.add.text(W / 2, y, `Player: ${st.playerName || 'SPIKE KING'}`, {
      fontFamily: FONT, fontSize: '8px', color: '#aaaacc',
    }).setOrigin(0.5));
    y += 22;

    add(this.add.text(W / 2, y, `Deaths: ${(st.totalDeaths || 0).toLocaleString()}   Levels: ${(st.completedLevels || []).length}/10   Coins: ${(st.coins || 0).toLocaleString()}`, {
      fontFamily: FONT, fontSize: '7px', color: '#666688',
    }).setOrigin(0.5));
    y += 32;

    add(this._divider(y));
    y += 22;

    // Export button
    const expBtn = this.add.image(W / 2 - 130, y, 'btn_dark').setScale(0.85, 0.75);
    add(expBtn);
    const expTxt = this.add.text(W / 2 - 130, y, '📥 EXPORT SAVE', {
      fontFamily: FONT, fontSize: '8px', color: '#aaddff',
    }).setOrigin(0.5);
    add(expTxt);
    expBtn.setInteractive({ useHandCursor: true });
    expBtn.on('pointerover', () => { Audio.click(); expBtn.setTint(0x7799bb); });
    expBtn.on('pointerout',  () => expBtn.clearTint());
    expBtn.on('pointerdown', () => this._exportSave());

    // Import button
    const impBtn = this.add.image(W / 2 + 130, y, 'btn_dark').setScale(0.85, 0.75);
    add(impBtn);
    const impTxt = this.add.text(W / 2 + 130, y, '📤 IMPORT SAVE', {
      fontFamily: FONT, fontSize: '8px', color: '#aaddff',
    }).setOrigin(0.5);
    add(impTxt);
    impBtn.setInteractive({ useHandCursor: true });
    impBtn.on('pointerover', () => { Audio.click(); impBtn.setTint(0x7799bb); });
    impBtn.on('pointerout',  () => impBtn.clearTint());
    impBtn.on('pointerdown', () => this._importSave());

    y += 60;

    add(this._divider(y));
    y += 22;

    // Account link
    const accBtn = this.add.image(W / 2, y, 'btn_dark').setScale(0.85, 0.75);
    add(accBtn);
    add(this.add.text(W / 2, y, '👤 EDIT PROFILE & ACHIEVEMENTS', {
      fontFamily: FONT, fontSize: '7px', color: '#00e5ff',
    }).setOrigin(0.5));
    accBtn.setInteractive({ useHandCursor: true });
    accBtn.on('pointerover', () => { Audio.click(); accBtn.setTint(0x224455); });
    accBtn.on('pointerout',  () => accBtn.clearTint());
    accBtn.on('pointerdown', () => {
      Audio.click();
      this.cameras.main.fade(200, 0, 0, 0, false, (_c, p) => {
        if (p === 1) this.scene.start('AccountScene');
      });
    });

    y += 55;

    // Reset button
    const resetBtn = this.add.image(W / 2, y, 'btn_red').setScale(0.85, 0.75);
    add(resetBtn);
    add(this.add.text(W / 2, y, '⚠  RESET ALL DATA', {
      fontFamily: FONT, fontSize: '9px', color: '#fff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5));
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on('pointerover', () => { Audio.click(); resetBtn.setTint(0xff6666); });
    resetBtn.on('pointerout',  () => resetBtn.clearTint());
    resetBtn.on('pointerdown', () => this._confirmReset());

    return objs;
  }

  // ─── Helpers ────────────────────────────────────────────────
  _sectionHeader(label, y) {
    return this.add.text(W / 2, y, `── ${label} ──`, {
      fontFamily: FONT, fontSize: '8px', color: '#00e5ff',
    }).setOrigin(0.5);
  }

  _rowLabel(label, y) {
    return this.add.text(W / 2 - 200, y + 2, label, {
      fontFamily: FONT, fontSize: '8px', color: '#aaaacc',
    });
  }

  _divider(y) {
    return this.add.rectangle(W / 2, y, W - 80, 1, 0x222244, 0.9);
  }

  _addRowToggle(objs, label, y, initial, onChange) {
    const add = (o) => { objs.push(o.setVisible(false)); return o; };

    add(this.add.text(W / 2 - 200, y + 2, label, {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff',
    }));

    let on = initial;
    const track = this.add.rectangle(W / 2 + 130, y + 2, 52, 22, on ? 0x00aa44 : 0x333355, 1)
      .setInteractive({ useHandCursor: true });
    add(track);
    const knob = this.add.circle(W / 2 + (on ? 144 : 117), y + 2, 10, 0xffffff);
    add(knob);

    const update = () => {
      track.setFillStyle(on ? 0x00aa44 : 0x333355);
      this.tweens.add({ targets: knob, x: W / 2 + (on ? 144 : 117), duration: 120 });
    };
    const setter = (val) => { on = val; update(); };

    track.on('pointerdown', () => {
      Audio.click();
      on = !on;
      update();
      onChange(on);
    });

    return [objs, knob, setter];
  }

  _addFullToggle(objs, label, hint, y, initial, onChange) {
    const add = (o) => { objs.push(o.setVisible(false)); return o; };

    const bg = this.add.rectangle(W / 2, y + 12, W - 80, 44, 0x111128, 0.7)
      .setStrokeStyle(1, 0x222244);
    add(bg);

    add(this.add.text(W / 2 - (W / 2 - 60), y + 4, label, {
      fontFamily: FONT, fontSize: '9px', color: '#ffffff',
    }));

    add(this.add.text(W / 2 - (W / 2 - 60), y + 22, hint, {
      fontFamily: FONT, fontSize: '6px', color: '#555577',
    }));

    let on = initial;
    const track = this.add.rectangle(W / 2 + 170, y + 12, 56, 24, on ? 0x00aa44 : 0x333355, 1)
      .setInteractive({ useHandCursor: true });
    add(track);
    const knob = this.add.circle(W / 2 + (on ? 185 : 157), y + 12, 11, 0xffffff);
    add(knob);

    const onTxt = this.add.text(W / 2 + (on ? 162 : 180), y + 12, on ? 'ON' : 'OFF', {
      fontFamily: FONT, fontSize: '6px', color: on ? '#ffffff' : '#666688',
    }).setOrigin(0.5);
    add(onTxt);

    const update = () => {
      track.setFillStyle(on ? 0x00aa44 : 0x333355);
      this.tweens.add({ targets: knob, x: W / 2 + (on ? 185 : 157), duration: 120 });
      onTxt.setText(on ? 'ON' : 'OFF');
      onTxt.setColor(on ? '#ffffff' : '#666688');
      this.tweens.add({ targets: onTxt, x: W / 2 + (on ? 162 : 180), duration: 120 });
    };

    track.on('pointerdown', () => {
      Audio.click();
      on = !on;
      update();
      onChange(on);
    });
  }

  _addSliderRow(objs, y, initial, onChange) {
    const add = (o) => { objs.push(o.setVisible(false)); return o; };
    const sliderX = W / 2 - 110;
    const sliderW = 280;
    const thumbX  = sliderX + initial * sliderW;

    add(this.add.rectangle(W / 2 + 30, y, sliderW + 4, 10, 0x111130).setOrigin(0.5));
    const fillBar = this.add.rectangle(sliderX + (initial * sliderW) / 2, y, initial * sliderW, 8, C.primary).setOrigin(0.5);
    add(fillBar);

    const thumb = this.add.circle(thumbX, y, 11, 0xffffff).setInteractive({ draggable: true });
    this.input.setDraggable(thumb);
    add(thumb);

    const valLbl = this.add.text(W / 2 + 185, y, `${Math.round(initial * 100)}%`, {
      fontFamily: FONT, fontSize: '8px', color: '#aaaacc',
    }).setOrigin(0, 0.5);
    add(valLbl);

    thumb.on('drag', (_p, dragX) => {
      const clamped = Phaser.Math.Clamp(dragX, sliderX, sliderX + sliderW);
      thumb.x = clamped;
      const v = (clamped - sliderX) / sliderW;
      fillBar.width = v * sliderW;
      fillBar.x = sliderX + v * sliderW / 2;
      valLbl.setText(`${Math.round(v * 100)}%`);
      onChange(v);
    });

    return [objs];
  }

  // ─── Data actions ───────────────────────────────────────────
  _exportSave() {
    Audio.click();
    try {
      const json = Storage.exportSave();
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = 'spikepanic_save.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this._toast('Save exported!', '#00ff88');
    } catch {
      this._toast('Export failed', '#ff4444');
    }
  }

  _importSave() {
    Audio.click();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ok = Storage.importSave(ev.target.result);
        if (ok) {
          this._toast('Save imported! Restarting...', '#00ff88');
          this.time.delayedCall(1500, () => this.scene.start('BootScene'));
        } else {
          this._toast('Invalid save file!', '#ff4444');
        }
      };
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  _toast(msg, color) {
    const t = this.add.text(W / 2, H / 2, msg, {
      fontFamily: FONT, fontSize: '12px', color,
      stroke: '#000', strokeThickness: 4,
      backgroundColor: '#111122', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(500);
    this.tweens.add({
      targets: t, alpha: 0, y: H / 2 - 40,
      delay: 1200, duration: 500,
      onComplete: () => t.destroy(),
    });
  }

  _confirmReset() {
    Audio.click();
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88).setDepth(200);
    const panel   = this.add.rectangle(W / 2, H / 2, 520, 300, C.ui_panel, 0.98).setDepth(201);
    panel.setStrokeStyle(2, C.danger);

    this.add.text(W / 2, H / 2 - 110, '⚠  RESET ALL DATA', {
      fontFamily: FONT, fontSize: '16px', color: '#ff2200',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(202);

    this.add.text(W / 2, H / 2 - 45, 'This will permanently delete:\nAll progress, skins, coins, and scores.\n\nAre you absolutely sure?', {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff',
      align: 'center', lineSpacing: 10,
    }).setOrigin(0.5).setDepth(202);

    const yes = this.add.image(W / 2 - 110, H / 2 + 90, 'btn_red').setDepth(201).setInteractive({ useHandCursor: true });
    this.add.text(W / 2 - 110, H / 2 + 90, '✓ RESET', {
      fontFamily: FONT, fontSize: '11px', color: '#fff',
    }).setOrigin(0.5).setDepth(202);

    const no = this.add.image(W / 2 + 110, H / 2 + 90, 'btn_dark').setDepth(201).setInteractive({ useHandCursor: true });
    this.add.text(W / 2 + 110, H / 2 + 90, '✗ CANCEL', {
      fontFamily: FONT, fontSize: '11px', color: '#fff',
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
      [overlay, panel, yes, no].forEach(o => o.destroy());
      this.children.list
        .filter(c => c.depth >= 202)
        .forEach(c => c.destroy());
    });
  }

  _makeBackBtn() {
    const b = this.add.text(60, H - 24, '◀ BACK', {
      fontFamily: FONT, fontSize: '11px', color: '#888',
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
