(function initializeMysteryAchievements(global) {
  'use strict';

  const ACHIEVEMENTS_KEY = 'mystery-archive-achievements-v1';
  const ACHIEVEMENT_DEFINITIONS = {
    'tuesday-night-club': {
      title: 'A Seat at the Table',
      caseTitle: 'The Tuesday Night Club',
      description: 'Solved the mystery of Mrs Jones and completed the first case of the Tuesday Night Club.',
      notification: 'You solved the first mystery of the Tuesday Night Club.',
      caseNumber: '01',
      badge: 'assets/achievements/tuesday-night-club.png',
      caseUrl: 'cases/tuesday-night-club/index.html'
    }
  };

  function loadAchievements() {
    try {
      const stored = JSON.parse(global.localStorage.getItem(ACHIEVEMENTS_KEY) || '{}');
      return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveAchievements(achievements) {
    global.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
    return achievements;
  }

  function unlockAchievement(id) {
    if (!ACHIEVEMENT_DEFINITIONS[id]) return { unlocked: false, isNew: false, achievement: null };
    const achievements = loadAchievements();
    if (achievements[id]?.unlocked === true) {
      return { unlocked: true, isNew: false, achievement: achievements[id] };
    }
    achievements[id] = { unlocked: true, unlockedAt: new Date().toISOString() };
    saveAchievements(achievements);
    return { unlocked: true, isNew: true, achievement: achievements[id] };
  }

  function isAchievementUnlocked(id) {
    return loadAchievements()[id]?.unlocked === true;
  }

  function getAchievementDefinition(id) {
    return ACHIEVEMENT_DEFINITIONS[id] || null;
  }

  function getAchievementBadgeUrl(id) {
    const definition = getAchievementDefinition(id);
    if (!definition) return '';
    const script = document.querySelector('script[src$="achievements.js"]');
    return new URL(definition.badge, script?.src || document.baseURI).href;
  }

  global.MysteryAchievements = {
    key: ACHIEVEMENTS_KEY,
    definitions: ACHIEVEMENT_DEFINITIONS,
    loadAchievements,
    saveAchievements,
    unlockAchievement,
    isAchievementUnlocked,
    getAchievementDefinition,
    getAchievementBadgeUrl
  };
  global.loadAchievements = loadAchievements;
  global.saveAchievements = saveAchievements;
  global.unlockAchievement = unlockAchievement;
  global.isAchievementUnlocked = isAchievementUnlocked;
})(window);
