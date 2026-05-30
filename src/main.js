import Phaser from 'phaser';
import { BootScene }      from './scenes/BootScene.js';
import { MenuScene, LevelSelectScene } from './scenes/MenuScene.js';
import { GameScene }      from './scenes/GameScene.js';
import { SkinScene }      from './scenes/SkinScene.js';
import { SettingsScene }  from './scenes/SettingsScene.js';
import { AccountScene }   from './scenes/AccountScene.js';
import { ShopScene }      from './scenes/ShopScene.js';
import { LeaderScene }    from './scenes/LeaderScene.js';
import { MultiScene }     from './scenes/MultiScene.js';
import { Audio }          from './audio.js';
import { Storage }        from './storage.js';

const st = Storage.get();

const config = {
  type: Phaser.AUTO,
  width:  960,
  height: 540,
  backgroundColor: '#0d0d1a',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 900 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MenuScene,
    LevelSelectScene,
    GameScene,
    SkinScene,
    SettingsScene,
    AccountScene,
    ShopScene,
    LeaderScene,
    MultiScene,
  ],
};

const game = new Phaser.Game(config);

// Apply saved audio settings once context is available
document.addEventListener('click', () => {
  Audio.resume();
  const settings = st.settings || {};
  Audio.setMusicVol(settings.musicVol ?? 0.5);
  Audio.setSfxVol(settings.sfxVol ?? 0.8);
}, { once: true });

// Expose for Electron / Steam bridge
window.__RAGE_GAME = game;
window.__RAGE_STORAGE = Storage;
window.__RAGE_AUDIO = Audio;
