import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getPausedApps, getStats, formatRemaining, getProgress, getDaysRemaining, updateStreak, getStreak, checkAchievements, BADGE_DEFINITIONS } from '../utils/storage';
import { getTodayTotalAttempts } from '../modules/expo-app-blocker';

export default function DashboardScreen() {
  const [pausedApps, setPausedApps] = useState([]);
  const [stats, setStats] = useState({ totalAppsPaused: 0, totalFocusDays: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [todayAttempts, setTodayAttempts] = useState(0);
  const [newBadges, setNewBadges] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
  const fabPulse = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        friction: 5,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(fabPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const apps = await getPausedApps();
    setPausedApps(apps);
    const s = await getStats();
    setStats(s);
    const streakData = await updateStreak();
    setStreak(streakData);
    const attempts = await getTodayTotalAttempts();
    setTodayAttempts(attempts);
    // Check achievements
    const newlyUnlocked = await checkAchievements();
    if (newlyUnlocked.length > 0) {
      setNewBadges(newlyUnlocked);
      setTimeout(() => setNewBadges([]), 5000);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderPausedApp = ({ item, index }) => {
    const remaining = getDaysRemaining(item.unlockTime);
    const progress = getProgress(item.pausedAt, item.unlockTime);

    return (
      <Animated.View
        style={[
          styles.appCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20 * (index + 1), 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.appCardLeft}>
          <View style={styles.appIconContainer}>
            {item.icon ? (
              <Image source={{ uri: item.icon }} style={styles.appIconImage} />
            ) : (
              <Text style={styles.appIconFallback}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.appInfo}>
            <Text style={styles.appName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.appTimeRow}>
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" style={{ marginRight: 4 }} />
              <Text style={styles.appPackage} numberOfLines={1}>
                {remaining.expired ? 'Unlocking...' : `${formatRemaining(item.unlockTime)} remaining`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.appCardRight}>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownNumber}>
              {remaining.expired ? '0' : remaining.days}
            </Text>
            <Text style={styles.countdownLabel}>days</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="flag" size={48} color="rgba(139,92,246,0.5)" />
      </View>
      <Text style={styles.emptyTitle}>No Apps Paused</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to pause a{'\n'}distracting app and start focusing
      </Text>
      <View style={styles.emptyTips}>
        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color="#a78bfa" style={{ marginRight: 12 }} />
          <Text style={styles.tipText}>
            Pause social media apps to reclaim your time
          </Text>
        </View>
        <View style={styles.tipCard}>
          <Ionicons name="trophy-outline" size={20} color="#f59e0b" style={{ marginRight: 12 }} />
          <Text style={styles.tipText}>
            Set longer lock periods for bigger goals
          </Text>
        </View>
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="brain" size={20} color="#06b6d4" style={{ marginRight: 12 }} />
          <Text style={styles.tipText}>
            No early unlock — stay committed to your focus
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.bg}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="lock-closed" size={22} color="#a78bfa" style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.headerTitle}>FocusLock</Text>
            <Text style={styles.headerSubtitle}>Stay focused, stay strong</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardStreak]}>
          <Text style={{ fontSize: 20, marginBottom: 2 }}>🔥</Text>
          <Text style={[styles.statNumber, styles.statNumberStreak]}>
            {streak.currentStreak || 0}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={[styles.statCard, styles.statCardAccent]}>
          <Ionicons name="lock-closed-outline" size={22} color="#a78bfa" style={{ marginBottom: 4 }} />
          <Text style={[styles.statNumber, styles.statNumberAccent]}>
            {pausedApps.length}
          </Text>
          <Text style={styles.statLabel}>Paused</Text>
        </View>
        <View style={[styles.statCard, todayAttempts > 0 && styles.statCardDanger]}>
          <Ionicons name="hand-left-outline" size={22} color={todayAttempts > 0 ? '#f87171' : '#f1f5f9'} style={{ marginBottom: 4 }} />
          <Text style={[styles.statNumber, todayAttempts > 0 && { color: '#f87171' }]}>
            {todayAttempts}
          </Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Locks</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.viewStatsButton}
            onPress={() => router.push('/achievements')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14 }}>🏆</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewStatsButton}
            onPress={() => router.push('/schedules')}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={14} color="#06b6d4" style={{ marginRight: 4 }} />
            <Text style={[styles.viewStatsText, { color: '#06b6d4' }]}>Schedules</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewStatsButton}
            onPress={() => router.push('/stats')}
            activeOpacity={0.7}
          >
            <Ionicons name="stats-chart" size={14} color="#a78bfa" style={{ marginRight: 4 }} />
            <Text style={styles.viewStatsText}>Stats</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Achievement Banner */}
      {newBadges.length > 0 && (
        <View style={styles.achievementBanner}>
          <Text style={styles.achievementBannerText}>
            🎉 New badge{newBadges.length > 1 ? 's' : ''} unlocked:{' '}
            {newBadges.map(id => {
              const badge = BADGE_DEFINITIONS.find(b => b.id === id);
              return badge ? `${badge.emoji} ${badge.title}` : '';
            }).join(', ')}
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={pausedApps}
        renderItem={renderPausedApp}
        keyExtractor={(item) => item.packageName}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
            colors={['#8b5cf6']}
            progressBackgroundColor="#1e1e3a"
          />
        }
      />

      {/* FAB */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [
              { scale: Animated.multiply(fabScale, fabPulse) },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-app')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.fabText}>Pause App</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  bgCircle1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    top: -60,
    right: -40,
  },
  bgCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
    bottom: 100,
    left: -40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 55 : 70,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
    fontWeight: '500',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statCardAccent: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  statCardStreak: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  statCardDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.12)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  statNumberAccent: {
    color: '#a78bfa',
  },
  statNumberStreak: {
    color: '#f59e0b',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  viewStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  viewStatsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a78bfa',
  },
  achievementBanner: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
  },
  achievementBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4ade80',
    textAlign: 'center',
  },

  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    flexGrow: 1,
  },

  appCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  appCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  appIconImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  appIconFallback: {
    fontSize: 22,
    fontWeight: '700',
    color: '#a78bfa',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 3,
  },
  appTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appPackage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  appCardRight: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  countdownBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  countdownNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f87171',
  },
  countdownLabel: {
    fontSize: 10,
    color: 'rgba(248, 113, 113, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.12)',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyTips: {
    width: '100%',
    gap: 10,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
    lineHeight: 18,
  },

  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 24,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
    }),
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
