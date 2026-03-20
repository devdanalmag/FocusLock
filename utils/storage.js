/**
 * Storage utilities for FocusLock
 * Manages paused apps data in AsyncStorage and SharedPreferences sync
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBlockedPackages, setDailyLimits as setNativeDailyLimits, getDailyLimits as getNativeDailyLimits, getDailyUsageTime, getAppOpenCounts } from '../modules/expo-app-blocker';
import { setBlockedNotificationPackages } from '../modules/expo-notification-policy';

const PAUSED_APPS_KEY = '@focuslock_paused_apps';
const STATS_KEY = '@focuslock_stats';
const ONBOARDING_KEY = '@focuslock_onboarding_complete';
const STREAK_KEY = '@focuslock_streak';

/**
 * Get all paused apps
 * @returns {Promise<Array>} Array of paused app objects
 */
export async function getPausedApps() {
  try {
    const data = await AsyncStorage.getItem(PAUSED_APPS_KEY);
    if (!data) return [];
    const apps = JSON.parse(data);
    
    // Filter out expired locks
    const now = Date.now();
    const activeApps = apps.filter(app => app.unlockTime > now);
    
    // If any expired, update storage
    if (activeApps.length !== apps.length) {
      await savePausedApps(activeApps);
    }
    
    return activeApps;
  } catch (e) {
    console.warn('Failed to get paused apps:', e);
    return [];
  }
}

/**
 * Save paused apps and sync to native modules
 */
export async function savePausedApps(apps) {
  try {
    await AsyncStorage.setItem(PAUSED_APPS_KEY, JSON.stringify(apps));
    
    // Sync blocked packages to native modules
    const packageNames = apps.map(a => a.packageName);
    await setBlockedPackages(packageNames);
    await setBlockedNotificationPackages(packageNames);
    
    // Also save to SharedPreferences for the BlockedAppActivity to read
    // This is done through the native module setBlockedPackages calls above
  } catch (e) {
    console.warn('Failed to save paused apps:', e);
  }
}

/**
 * Add a new paused app
 */
export async function pauseApp(app, days) {
  const currentApps = await getPausedApps();
  
  // Check if already paused
  const existingIndex = currentApps.findIndex(a => a.packageName === app.packageName);
  if (existingIndex >= 0) {
    return false; // Already paused
  }
  
  const pausedApp = {
    name: app.name,
    packageName: app.packageName,
    icon: app.icon,
    pausedAt: Date.now(),
    unlockTime: Date.now() + (days * 24 * 60 * 60 * 1000),
    days: days,
  };
  
  const updatedApps = [...currentApps, pausedApp];
  await savePausedApps(updatedApps);
  
  // Update stats
  await incrementStat('totalAppsPaused');
  
  // Update streak when a new app is paused
  await updateStreak();
  
  return true;
}

/**
 * Remove a paused app (emergency unlock)
 */
export async function unpauseApp(packageName) {
  const currentApps = await getPausedApps();
  const updatedApps = currentApps.filter(a => a.packageName !== packageName);
  await savePausedApps(updatedApps);
  return true;
}

/**
 * Get focus stats
 */
export async function getStats() {
  try {
    const data = await AsyncStorage.getItem(STATS_KEY);
    if (!data) return { totalAppsPaused: 0, totalFocusDays: 0, streak: 0 };
    return JSON.parse(data);
  } catch (e) {
    return { totalAppsPaused: 0, totalFocusDays: 0, streak: 0 };
  }
}

/**
 * Increment a stat counter
 */
export async function incrementStat(key) {
  try {
    const stats = await getStats();
    stats[key] = (stats[key] || 0) + 1;
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Failed to increment stat:', e);
  }
}

/**
 * Check if onboarding is complete
 */
export async function isOnboardingComplete() {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Mark onboarding as complete
 */
export async function setOnboardingComplete() {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (e) {
    console.warn('Failed to set onboarding complete:', e);
  }
}

/**
 * Calculate days remaining for a paused app
 */
export function getDaysRemaining(unlockTime) {
  const remaining = unlockTime - Date.now();
  if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, expired: false };
}

/**
 * Format remaining time as string
 */
export function formatRemaining(unlockTime) {
  const { days, hours, minutes, expired } = getDaysRemaining(unlockTime);
  if (expired) return 'Expired';
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Get progress percentage (0-1) — how much of the pause period has elapsed
 */
export function getProgress(pausedAt, unlockTime) {
  const total = unlockTime - pausedAt;
  const elapsed = Date.now() - pausedAt;
  return Math.min(1, Math.max(0, elapsed / total));
}

// ============== STREAK TRACKING ==============

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the streak data
 * @returns {Promise<{currentStreak: number, longestStreak: number, lastActiveDate: string}>}
 */
export async function getStreak() {
  try {
    const data = await AsyncStorage.getItem(STREAK_KEY);
    if (!data) return { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
    return JSON.parse(data);
  } catch (e) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
  }
}

/**
 * Update the focus streak.
 * Call this when the dashboard loads or when an app is paused.
 * Rules:
 *  - If there are active locks today → streak continues/starts
 *  - If lastActiveDate was yesterday → streak increments
 *  - If lastActiveDate was today → no change (already counted)
 *  - If lastActiveDate was >1 day ago → streak resets to 1
 */
export async function updateStreak() {
  try {
    const apps = await getPausedApps();
    const streak = await getStreak();
    const today = getTodayStr();

    // No active locks → don't increment, don't reset yet
    // (we only reset if user opens app on a new day with 0 locks)
    if (apps.length === 0) {
      if (streak.lastActiveDate && streak.lastActiveDate !== today) {
        // New day with no locks → reset streak
        streak.currentStreak = 0;
        await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(streak));
      }
      return streak;
    }

    // There are active locks
    if (streak.lastActiveDate === today) {
      // Already counted today
      return streak;
    }

    // Check if yesterday was the last active date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (streak.lastActiveDate === yesterdayStr) {
      // Consecutive day — increment streak
      streak.currentStreak += 1;
    } else if (!streak.lastActiveDate) {
      // First time ever
      streak.currentStreak = 1;
    } else {
      // Streak broken (gap > 1 day) — restart
      streak.currentStreak = 1;
    }

    // Update longest
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    streak.lastActiveDate = today;
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(streak));
    return streak;
  } catch (e) {
    console.warn('Failed to update streak:', e);
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
  }
}

// ============== SCHEDULE MANAGEMENT ==============

const SCHEDULES_KEY = '@focuslock_schedules';

/**
 * Get all schedules from AsyncStorage
 */
export async function getSchedules() {
  try {
    const data = await AsyncStorage.getItem(SCHEDULES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.warn('Failed to get schedules:', e);
    return [];
  }
}

/**
 * Save schedules to AsyncStorage and sync to native SharedPreferences
 */
export async function saveSchedules(schedules) {
  try {
    await AsyncStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
    // Sync to native for the AccessibilityService to read
    const { setNativeSchedules } = require('../modules/expo-app-blocker');
    await setNativeSchedules(JSON.stringify(schedules));
  } catch (e) {
    console.warn('Failed to save schedules:', e);
  }
}

/**
 * Add a new schedule
 * schedule: { id, name, packages[], startHour, startMinute, endHour, endMinute, daysOfWeek[], enabled }
 */
export async function addSchedule(schedule) {
  const schedules = await getSchedules();
  schedule.id = Date.now().toString();
  schedule.enabled = true;
  schedules.push(schedule);
  await saveSchedules(schedules);
  return schedule;
}

/**
 * Delete a schedule by id
 */
export async function deleteSchedule(id) {
  const schedules = await getSchedules();
  const filtered = schedules.filter(s => s.id !== id);
  await saveSchedules(filtered);
}

/**
 * Toggle a schedule on/off
 */
export async function toggleSchedule(id) {
  const schedules = await getSchedules();
  const schedule = schedules.find(s => s.id === id);
  if (schedule) {
    schedule.enabled = !schedule.enabled;
    await saveSchedules(schedules);
  }
}

// ============== ACHIEVEMENTS ==============

const ACHIEVEMENTS_KEY = '@focuslock_achievements';

/**
 * Badge definitions
 */
export const BADGE_DEFINITIONS = [
  { id: 'first_lock', emoji: '🔒', title: 'First Lock', desc: 'Paused your first app', category: 'apps' },
  { id: 'five_locks', emoji: '🛡️', title: 'Shield Up', desc: 'Paused 5 apps', category: 'apps' },
  { id: 'streak_3', emoji: '🔥', title: 'On Fire', desc: '3-day focus streak', category: 'streak' },
  { id: 'streak_7', emoji: '⚡', title: 'Unstoppable', desc: '7-day focus streak', category: 'streak' },
  { id: 'streak_14', emoji: '💎', title: 'Diamond Focus', desc: '14-day focus streak', category: 'streak' },
  { id: 'streak_30', emoji: '👑', title: 'Focus King', desc: '30-day focus streak', category: 'streak' },
  { id: 'blocks_1', emoji: '✋', title: 'First Block', desc: 'Blocked a temptation', category: 'blocks' },
  { id: 'blocks_50', emoji: '💪', title: 'Willpower', desc: '50 total blocks', category: 'blocks' },
  { id: 'blocks_100', emoji: '🧠', title: 'Rewired', desc: '100 total blocks', category: 'blocks' },
  { id: 'blocks_500', emoji: '🏆', title: 'Champion', desc: '500 total blocks', category: 'blocks' },
  { id: 'schedule_1', emoji: '📅', title: 'Planner', desc: 'Created first schedule', category: 'features' },
  { id: 'nudge_on', emoji: '🧘', title: 'Self-Aware', desc: 'Enabled reality check nudges', category: 'features' },
  { id: 'bedtime_on', emoji: '🌙', title: 'Sleep Guardian', desc: 'Enabled bedtime mode', category: 'features' },
];

/**
 * Get unlocked achievements
 */
export async function getAchievements() {
  try {
    const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    if (!data) return {};
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

/**
 * Check and unlock achievements based on current stats.
 * Returns array of newly unlocked badge IDs.
 */
export async function checkAchievements() {
  try {
    const unlocked = await getAchievements();
    const newlyUnlocked = [];

    // Get current stats
    const apps = await getPausedApps();
    const streak = await getStreak();
    const schedules = await getSchedules();
    const stats = await getStats();

    // Get total blocks from stats
    const totalBlocks = stats.totalBlockAttempts || 0;

    // Check app milestones
    if (apps.length >= 1 && !unlocked.first_lock) {
      unlocked.first_lock = Date.now();
      newlyUnlocked.push('first_lock');
    }
    if (apps.length >= 5 && !unlocked.five_locks) {
      unlocked.five_locks = Date.now();
      newlyUnlocked.push('five_locks');
    }

    // Check streak milestones
    const currentStreak = streak.longestStreak || 0;
    if (currentStreak >= 3 && !unlocked.streak_3) {
      unlocked.streak_3 = Date.now();
      newlyUnlocked.push('streak_3');
    }
    if (currentStreak >= 7 && !unlocked.streak_7) {
      unlocked.streak_7 = Date.now();
      newlyUnlocked.push('streak_7');
    }
    if (currentStreak >= 14 && !unlocked.streak_14) {
      unlocked.streak_14 = Date.now();
      newlyUnlocked.push('streak_14');
    }
    if (currentStreak >= 30 && !unlocked.streak_30) {
      unlocked.streak_30 = Date.now();
      newlyUnlocked.push('streak_30');
    }

    // Check block milestones
    if (totalBlocks >= 1 && !unlocked.blocks_1) {
      unlocked.blocks_1 = Date.now();
      newlyUnlocked.push('blocks_1');
    }
    if (totalBlocks >= 50 && !unlocked.blocks_50) {
      unlocked.blocks_50 = Date.now();
      newlyUnlocked.push('blocks_50');
    }
    if (totalBlocks >= 100 && !unlocked.blocks_100) {
      unlocked.blocks_100 = Date.now();
      newlyUnlocked.push('blocks_100');
    }
    if (totalBlocks >= 500 && !unlocked.blocks_500) {
      unlocked.blocks_500 = Date.now();
      newlyUnlocked.push('blocks_500');
    }

    // Check feature milestones
    if (schedules.length >= 1 && !unlocked.schedule_1) {
      unlocked.schedule_1 = Date.now();
      newlyUnlocked.push('schedule_1');
    }

    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
    return newlyUnlocked;
  } catch (e) {
    console.warn('Failed to check achievements:', e);
    return [];
  }
}

/**
 * Manually unlock an achievement by ID (for features like nudge/bedtime)
 */
export async function unlockAchievement(id) {
  try {
    const unlocked = await getAchievements();
    if (!unlocked[id]) {
      unlocked[id] = Date.now();
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// ============== BEDTIME MODE ==============

const BEDTIME_KEY = '@focuslock_bedtime';

/**
 * Get bedtime mode settings
 */
export async function getBedtimeMode() {
  try {
    const data = await AsyncStorage.getItem(BEDTIME_KEY);
    if (!data) return { enabled: false, startHour: 22, endHour: 7 };
    return JSON.parse(data);
  } catch (e) {
    return { enabled: false, startHour: 22, endHour: 7 };
  }
}

/**
 * Set bedtime mode — creates/updates a special schedule that blocks ALL installed apps
 */
export async function setBedtimeMode(startHour, endHour, enabled) {
  try {
    // Save bedtime settings
    const bedtime = { enabled, startHour, endHour };
    await AsyncStorage.setItem(BEDTIME_KEY, JSON.stringify(bedtime));

    // Update schedules
    const schedules = await getSchedules();
    const bedtimeIdx = schedules.findIndex(s => s.isBedtime === true);

    if (enabled) {
      // Get all installed apps
      const { getInstalledApps } = require('../modules/expo-app-manager');
      const apps = await getInstalledApps();
      const allPackages = apps.map(a => a.packageName);

      const bedtimeSchedule = {
        id: bedtimeIdx >= 0 ? schedules[bedtimeIdx].id : 'bedtime_' + Date.now(),
        name: '🌙 Bedtime Mode',
        isBedtime: true,
        packages: allPackages,
        startHour: startHour,
        startMinute: 0,
        endHour: endHour,
        endMinute: 0,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7], // Every day
        enabled: true,
      };

      if (bedtimeIdx >= 0) {
        schedules[bedtimeIdx] = bedtimeSchedule;
      } else {
        schedules.push(bedtimeSchedule);
      }

      // Unlock achievement
      await unlockAchievement('bedtime_on');
    } else {
      // Remove bedtime schedule
      if (bedtimeIdx >= 0) {
        schedules.splice(bedtimeIdx, 1);
      }
    }

    await saveSchedules(schedules);
  } catch (e) {
    console.warn('Failed to set bedtime mode:', e);
  }
}

// ============== DAILY APP LIMITS ==============

const DAILY_LIMITS_KEY = '@focuslock_daily_limits';

/**
 * Get all daily app limits { packageName: { limitMinutes, appName } }
 */
export async function getAppDailyLimits() {
  try {
    const data = await AsyncStorage.getItem(DAILY_LIMITS_KEY);
    if (!data) return {};
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

/**
 * Set/update a daily limit for an app
 */
export async function setAppDailyLimit(packageName, limitMinutes, appName) {
  try {
    const limits = await getAppDailyLimits();
    limits[packageName] = { limitMinutes, appName };
    await AsyncStorage.setItem(DAILY_LIMITS_KEY, JSON.stringify(limits));

    // Sync to native: { package: minutes }
    const nativeLimits = {};
    for (const [pkg, val] of Object.entries(limits)) {
      nativeLimits[pkg] = val.limitMinutes;
    }
    await setNativeDailyLimits(nativeLimits);
  } catch (e) {
    console.warn('Failed to set daily limit:', e);
  }
}

/**
 * Remove a daily limit for an app
 */
export async function removeAppDailyLimit(packageName) {
  try {
    const limits = await getAppDailyLimits();
    delete limits[packageName];
    await AsyncStorage.setItem(DAILY_LIMITS_KEY, JSON.stringify(limits));

    const nativeLimits = {};
    for (const [pkg, val] of Object.entries(limits)) {
      nativeLimits[pkg] = val.limitMinutes;
    }
    await setNativeDailyLimits(nativeLimits);
  } catch (e) {
    console.warn('Failed to remove daily limit:', e);
  }
}

/**
 * Calculate time saved today (difference between limit and actual usage for over-limit apps)
 */
export async function getTimeSavedToday() {
  try {
    const limits = await getAppDailyLimits();
    const usage = await getDailyUsageTime();
    let savedMs = 0;

    for (const [pkg, val] of Object.entries(limits)) {
      const limitMs = val.limitMinutes * 60 * 1000;
      const usedMs = usage[pkg] || 0;
      if (usedMs >= limitMs) {
        // Time saved = estimated usage without limit - actual limit
        // Conservative estimate: they would have used 2x more without the block
        savedMs += limitMs;
      }
    }
    return savedMs;
  } catch (e) {
    return 0;
  }
}
