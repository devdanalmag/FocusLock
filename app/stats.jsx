import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getAppUsageStats, getDailyUsageTotals } from '../modules/expo-app-manager';
import { getBlockAttempts, getTodayTotalAttempts, shareText, getDailyUsageTime, getAppOpenCounts } from '../modules/expo-app-blocker';
import { getStreak, getTimeSavedToday } from '../utils/storage';

export default function StatsScreen() {
  const [usageStats, setUsageStats] = useState([]);
  const [dailyTotals, setDailyTotals] = useState([]);
  const [blockAttempts, setBlockAttempts] = useState([]);
  const [todayAttempts, setTodayAttempts] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('today');
  const [timeSavedMs, setTimeSavedMs] = useState(0);
  const [openCounts, setOpenCounts] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async () => {
    try {
      const [usage, daily, attempts, totalAttempts] = await Promise.all([
        getAppUsageStats(selectedTab === 'today' ? 1 : 7),
        getDailyUsageTotals(7),
        getBlockAttempts(7),
        getTodayTotalAttempts(),
      ]);
      setUsageStats(usage || []);
      setDailyTotals(daily || []);
      setBlockAttempts(attempts || []);
      setTodayAttempts(totalAttempts || 0);

      const [saved, opens] = await Promise.all([
        getTimeSavedToday(),
        getAppOpenCounts(),
      ]);
      setTimeSavedMs(saved || 0);
      setOpenCounts(opens || {});
    } catch (e) {
      console.warn('Failed to load stats:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatTime = (ms) => {
    if (!ms || ms <= 0) return '0m';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatTimeShort = (ms) => {
    if (!ms || ms <= 0) return '0h';
    const hours = (ms / (1000 * 60 * 60)).toFixed(1);
    return `${hours}h`;
  };

  const totalUsageMs = usageStats.reduce((sum, app) => sum + (app.totalTimeMs || 0), 0);
  const maxUsageMs = usageStats.length > 0 ? (usageStats[0]?.totalTimeMs || 1) : 1;

  // Group block attempts by package for today
  const today = new Date().toISOString().split('T')[0];
  const todayBlockAttempts = blockAttempts
    .filter(a => a.date === today)
    .sort((a, b) => b.count - a.count);

  // Get max daily total for scaling the chart
  const maxDailyMs = dailyTotals.reduce((max, d) => Math.max(max, d.totalTimeMs || 0), 1);

  const getDayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  };

  return (
    <View style={styles.container}>
      <View style={styles.bg}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#f1f5f9" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Usage Stats</Text>
            <Text style={styles.headerSubtitle}>
              Know your habits, change your habits
            </Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'today' && styles.tabActive]}
            onPress={() => setSelectedTab('today')}
          >
            <Text style={[styles.tabText, selectedTab === 'today' && styles.tabTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'week' && styles.tabActive]}
            onPress={() => setSelectedTab('week')}
          >
            <Text style={[styles.tabText, selectedTab === 'week' && styles.tabTextActive]}>
              This Week
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
              progressBackgroundColor="#1e1e3a"
            />
          }
        >
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="time-outline" size={20} color="#8b5cf6" />
              <Text style={styles.summaryValue}>{formatTime(totalUsageMs)}</Text>
              <Text style={styles.summaryLabel}>Screen Time</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardDanger]}>
              <Ionicons name="hand-left-outline" size={20} color="#f87171" />
              <Text style={[styles.summaryValue, { color: '#f87171' }]}>{todayAttempts}</Text>
              <Text style={styles.summaryLabel}>Blocked Today</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="apps-outline" size={20} color="#06b6d4" />
              <Text style={styles.summaryValue}>{usageStats.length}</Text>
              <Text style={styles.summaryLabel}>Apps Used</Text>
            </View>
            {timeSavedMs > 0 && (
              <View style={[styles.summaryCard, { borderColor: 'rgba(74, 222, 128, 0.15)', backgroundColor: 'rgba(74, 222, 128, 0.06)' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#4ade80" />
                <Text style={[styles.summaryValue, { color: '#4ade80' }]}>{formatTime(timeSavedMs)}</Text>
                <Text style={styles.summaryLabel}>Time Saved</Text>
              </View>
            )}
          </View>

          {/* Top Apps Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="chart-bar" size={18} color="#a78bfa" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Top Apps by Usage</Text>
            </View>
            <View style={styles.sectionCard}>
              {usageStats.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>No usage data available</Text>
                  <Text style={styles.emptySectionHint}>Ensure Usage Access permission is enabled</Text>
                </View>
              ) : (
                usageStats.slice(0, 8).map((app, index) => (
                  <View key={app.packageName} style={styles.appUsageRow}>
                    <View style={styles.appUsageLeft}>
                      <Text style={styles.appUsageRank}>{index + 1}</Text>
                      <View style={styles.appUsageInfo}>
                        <Text style={styles.appUsageName} numberOfLines={1}>
                          {app.appName}
                        </Text>
                        <Text style={styles.appUsageTime}>
                          {formatTime(app.totalTimeMs)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            width: `${Math.max(4, (app.totalTimeMs / maxUsageMs) * 100)}%`,
                            backgroundColor: index === 0 ? '#ef4444' :
                              index === 1 ? '#f59e0b' :
                              index === 2 ? '#8b5cf6' : '#334155',
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Block Attempts Section */}
          {todayBlockAttempts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="shield-outline" size={18} color="#f87171" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Blocked Attempts Today</Text>
              </View>
              <View style={[styles.sectionCard, styles.sectionCardDanger]}>
                {todayBlockAttempts.map((attempt) => (
                  <View key={attempt.packageName} style={styles.attemptRow}>
                    <View style={styles.attemptDot} />
                    <Text style={styles.attemptPackage} numberOfLines={1}>
                      {attempt.packageName.split('.').pop()}
                    </Text>
                    <View style={styles.attemptBadge}>
                      <Text style={styles.attemptCount}>{attempt.count}×</Text>
                    </View>
                  </View>
                ))}
                <View style={styles.attemptMessage}>
                  <MaterialCommunityIcons name="brain" size={16} color="#4ade80" style={{ marginRight: 8 }} />
                  <Text style={styles.attemptMessageText}>
                    Your brain is rewiring — stay strong 💪
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 7-Day Trend */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trending-down-outline" size={18} color="#06b6d4" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>7-Day Trend</Text>
            </View>
            <View style={styles.sectionCard}>
              {dailyTotals.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>No trend data yet</Text>
                </View>
              ) : (
                <View style={styles.chartContainer}>
                  <View style={styles.chartBars}>
                    {dailyTotals.map((day, index) => {
                      const heightPct = Math.max(4, (day.totalTimeMs / maxDailyMs) * 100);
                      const isToday = day.date === today;
                      return (
                        <View key={day.date} style={styles.chartBarCol}>
                          <Text style={styles.chartValue}>
                            {formatTimeShort(day.totalTimeMs)}
                          </Text>
                          <View style={styles.chartBarTrack}>
                            <View
                              style={[
                                styles.chartBar,
                                {
                                  height: `${heightPct}%`,
                                  backgroundColor: isToday ? '#8b5cf6' : '#334155',
                                },
                              ]}
                            />
                          </View>
                          <Text style={[
                            styles.chartLabel,
                            isToday && styles.chartLabelToday,
                          ]}>
                            {isToday ? 'Today' : getDayLabel(day.date)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Share Stats */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={async () => {
              const streak = await getStreak();
              const msg = `📊 FocusLock Report\n\n` +
                `📱 Screen Time: ${formatTime(totalUsageMs)}\n` +
                `✋ Blocked ${todayAttempts} temptations today\n` +
                `🔥 Focus Streak: ${streak.currentStreak || 0} days\n` +
                `📈 ${usageStats.length} apps used\n\n` +
                `I'm working on building better phone habits. Hold me accountable! 💪`;
              await shareText(msg);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={18} color="#06b6d4" style={{ marginRight: 8 }} />
            <Text style={styles.shareButtonText}>Share with Accountability Partner</Text>
          </TouchableOpacity>

          {/* App Open Counts */}
          {Object.keys(openCounts).length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="finger-print-outline" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>App Opens Today</Text>
              </View>
              <View style={styles.sectionCard}>
                {Object.entries(openCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([pkg, count]) => (
                    <View key={pkg} style={styles.attemptRow}>
                      <View style={[styles.attemptDot, { backgroundColor: '#f59e0b' }]} />
                      <Text style={styles.attemptPackage} numberOfLines={1}>
                        {pkg.split('.').pop()}
                      </Text>
                      <View style={[styles.attemptBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                        <Text style={[styles.attemptCount, { color: '#f59e0b' }]}>{count}×</Text>
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    top: -60,
    right: -40,
  },
  bgCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
    bottom: 120,
    left: -50,
  },

  content: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 55 : 70,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  tabTextActive: {
    color: '#a78bfa',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryCardDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.12)',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f5f9',
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  section: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionCardDanger: {
    borderColor: 'rgba(239, 68, 68, 0.1)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },

  emptySection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptySectionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  emptySectionHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 4,
  },

  appUsageRow: {
    marginBottom: 14,
  },
  appUsageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  appUsageRank: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    width: 20,
  },
  appUsageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  appUsageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1,
  },
  appUsageTime: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 8,
  },
  barContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    marginLeft: 20,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },

  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  attemptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f87171',
    marginRight: 12,
  },
  attemptPackage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f1f5f9',
    flex: 1,
    textTransform: 'capitalize',
  },
  attemptBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  attemptCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f87171',
  },
  attemptMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
  },
  attemptMessageText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
  },

  chartContainer: {
    paddingTop: 8,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 6,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartValue: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  chartBarTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBar: {
    borderRadius: 6,
    width: '100%',
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    marginTop: 6,
  },
  chartLabelToday: {
    color: '#a78bfa',
    fontWeight: '700',
  },

  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
    marginTop: 4,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06b6d4',
  },
});
