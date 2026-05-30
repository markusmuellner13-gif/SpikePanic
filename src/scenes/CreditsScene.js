import { W, H, C } from '../constants.js';
import { Audio } from '../audio.js';

const FONT = '"Press Start 2P"';

export class CreditsScene extends Phaser.Scene {
  constructor() { super('CreditsScene'); }

  create() {
    this.add.image(W / 2, H / 2, 'bg_7').setDisplaySize(W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55);

    // Animated stars
    for (let i = 0; i < 40; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.05, 0.4)
      );
      this.tweens.add({
        targets: star, alpha: 0,
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    // Title
    this.add.text(W / 2, 36, 'CREDITS', {
      fontFamily: FONT, fontSize: '26px', color: '#00e5ff',
      stroke: '#000', strokeThickness: 6,
      shadow: { blur: 20, color: '#00aaff', fill: true },
    }).setOrigin(0.5);

    // Game identity
    this.add.text(W / 2, 90, 'SPIKE PANIC', {
      fontFamily: FONT, fontSize: '18px', color: '#ff4444',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(W / 2, 118, 'Dodge. Jump. Rage. Repeat.', {
      fontFamily: FONT, fontSize: '8px', color: '#884444',
    }).setOrigin(0.5);

    // Credits content
    const sections = [
      {
        label: 'DEVELOPMENT',
        lines: [
          'Game Design & Programming',
          'All Levels, Mechanics & Systems',
          '© 2024 markusmuellner13',
        ],
      },
      {
        label: 'ENGINE',
        lines: [
          'Phaser 3.60  —  MIT License',
          'phaser.io',
        ],
      },
      {
        label: 'BUILD TOOLS',
        lines: [
          'Vite 5  —  MIT License',
          'Electron 30  —  MIT License',
          'electron-builder  —  MIT License',
        ],
      },
      {
        label: 'TYPOGRAPHY',
        lines: [
          '"Press Start 2P" by CodeMan38',
          'SIL Open Font License 1.1',
          'fonts.google.com',
        ],
      },
      {
        label: 'AUDIO',
        lines: [
          'All sound effects: Web Audio API synthesis',
          'All music: Procedural generation',
          'No external audio samples used.',
        ],
      },
      {
        label: 'GRAPHICS',
        lines: [
          'All visuals: Procedurally generated',
          'via Phaser Canvas API.',
          'No external images used.',
        ],
      },
      {
        label: 'SPECIAL THANKS',
        lines: [
          'Every player who raged and came back.',
          'The spikes, for being unforgiving.',
          'You, for reading the credits.',
        ],
      },
    ];

    const colW = 440;
    let y = 155;
    let col = 0;

    sections.forEach((sec, idx) => {
      const xBase = col === 0 ? W / 2 - colW / 2 - 10 : W / 2 + 30;

      this.add.text(xBase, y, `── ${sec.label} ──`, {
        fontFamily: FONT, fontSize: '8px', color: '#00e5ff',
      });
      y += 22;

      sec.lines.forEach(line => {
        this.add.text(xBase + 8, y, line, {
          fontFamily: FONT, fontSize: '7px', color: '#888899',
        });
        y += 16;
      });

      y += 12;

      // Switch to right column after 3 sections
      if (idx === 2) {
        col = 1;
        y = 155;
      }
    });

    // Copyright line
    const yearNow = new Date().getFullYear();
    this.add.text(W / 2, H - 50, [
      `© ${yearNow} SPIKE PANIC  —  All rights reserved`,
      'All original content created for this game.',
      'Engine & tools used under their respective open-source licenses.',
    ].join('\n'), {
      fontFamily: FONT, fontSize: '6px', color: '#444466',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    // Version
    this.add.text(W - 8, H - 8, 'v1.0.0', {
      fontFamily: FONT, fontSize: '7px', color: '#222244',
    }).setOrigin(1, 1);

    this._makeBackBtn();
    this.cameras.main.fadeIn(300);
  }

  _makeBackBtn() {
    const b = this.add.text(70, H - 24, '◀  BACK', {
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
