const KEY = 'rageball_save';

const DEFAULT = {
  playerName: 'RAGE KING',
  selectedSkin: 'rage',
  ownedSkins: ['rage', 'cool'],
  coins: 0,
  totalDeaths: 0,
  totalTime: 0,
  levelDeaths: {},
  bestTimes: {},
  unlockedLevels: [0],
  completedLevels: [],
  achievements: {},
  flawlessCount: 0,
  speedrunCount: 0,
  settings: {
    musicVol: 0.5,
    sfxVol: 0.8,
    showDeaths: true,
    showTips: true,
    rageMessages: true,
  },
  leaderboard: [],
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const data = JSON.parse(atob(raw));
    return { ...DEFAULT, ...data };
  } catch {
    return { ...DEFAULT };
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, btoa(JSON.stringify(data)));
  } catch { /* storage full or unavailable */ }
}

let _state = load();

export const Storage = {
  get: () => _state,
  set(key, val) { _state[key] = val; save(_state); },

  addCoins(n) {
    _state.coins = (_state.coins || 0) + n;
    save(_state);
    return _state.coins;
  },
  spendCoins(n) {
    if (_state.coins < n) return false;
    _state.coins -= n;
    save(_state);
    return true;
  },
  recordDeath(levelId) {
    _state.totalDeaths = (_state.totalDeaths || 0) + 1;
    _state.levelDeaths[levelId] = (_state.levelDeaths[levelId] || 0) + 1;
    save(_state);
  },
  recordTime(levelId, ms) {
    if (!_state.bestTimes[levelId] || ms < _state.bestTimes[levelId]) {
      _state.bestTimes[levelId] = ms;
    }
    _state.totalTime = (_state.totalTime || 0) + ms;
    save(_state);
  },
  completeLevel(levelId, deaths, ms) {
    if (!_state.completedLevels.includes(levelId)) {
      _state.completedLevels.push(levelId);
    }
    const next = levelId + 1;
    if (next < 10 && !_state.unlockedLevels.includes(next)) {
      _state.unlockedLevels.push(next);
    }
    this.recordTime(levelId, ms);
    if (deaths === 0) {
      _state.flawlessCount = (_state.flawlessCount || 0) + 1;
    }
    const best = _state.bestTimes[levelId];
    if (best && best < 30000) {
      _state.speedrunCount = (_state.speedrunCount || 0) + 1;
    }
    save(_state);
    return _state;
  },
  unlockAchievement(id) {
    if (_state.achievements[id]) return false;
    _state.achievements[id] = true;
    save(_state);
    return true;
  },
  ownSkin(skinKey) {
    if (!_state.ownedSkins.includes(skinKey)) {
      _state.ownedSkins.push(skinKey);
      save(_state);
    }
  },
  selectSkin(skinKey) {
    _state.selectedSkin = skinKey;
    save(_state);
  },
  saveSettings(settings) {
    _state.settings = { ..._state.settings, ...settings };
    save(_state);
  },
  addScore(entry) {
    _state.leaderboard = _state.leaderboard || [];
    _state.leaderboard.push(entry);
    _state.leaderboard.sort((a, b) => a.deaths - b.deaths || a.time - b.time);
    if (_state.leaderboard.length > 50) _state.leaderboard = _state.leaderboard.slice(0, 50);
    save(_state);
  },
  reset() {
    _state = { ...DEFAULT };
    save(_state);
  },
};
