import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDailyUsageTime, getAppOpenCounts } from '../modules/expo-app-blocker';
import { getAppDailyLimits, removeAppDailyLimit } from '../utils/storage';

export default function AppLimitsScreen() {
  const [limits, setLimits] = useState({});
  const [usage, setUsage] = useState({});
  const [opens, setOpens] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => { loadData(); }, [])
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async () => {
    const [l, u, o] = await Promise.all([
      getAppDailyLimits(),
      getDailyUsageTime(),
      getAppOpenCounts(),
    ]);
    setLimits(l || {});
    setUsage(u || {});
    setOpens(o || {});
  };

  const handleDelete = (pkg, name) => {
    Alert.alert('Remove Limit', `Remove daily limit for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await removeAppDailyLimit(pkg);
        loadData();
      }},
    ]);
  };

  const formatMs = (ms) => {
    if (!ms || ms <= 0) return '0m';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const entries = Object.entries(limits);

  return (
    <View style={styles.container}>
      <View style={styles.bg}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#f1f5f9" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Daily Limits</Text>
            <Text style={styles.headerSub}>
              {entries.length} app{entries.length !== 1 ? 's' : ''} limited
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>⏱️</Text>
              <Text style={styles.emptyTitle}>No limits set</Text>
              <Text style={styles.emptySub}>
                Set daily time limits on apps to control usage
              </Text>
            </View>
          ) : (
            entries.map(([pkg, val]) => {
              const usedMs = usage[pkg] || 0;
              const limitMs = val.limitMinutes * 60000;
              const progress = Math.min(usedMs / limitMs, 1);
              const isOver = usedMs >= limitMs;
              const openCount = opens[pkg] || 0;

              return (
                <View key={pkg} style={[styles.card, isOver && styles.cardOver]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {val.appName || pkg.split('.').pop()}
                      </Text>
                      <Text style={styles.cardPkg} numberOfLines={1}>{pkg}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(pkg, val.appName)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color="#f87171" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardStats}>
                    <View style={styles.cardStat}>
                      <Text style={[styles.cardStatVal, isOver && { color: '#f87171' }]}>
                        {formatMs(usedMs)}
                      </Text>
                      <Text style={styles.cardStatLabel}>Used</Text>
                    </View>
                    <Text style={styles.cardStatSep}>/</Text>
                    <View style={styles.cardStat}>
                      <Text style={styles.cardStatVal}>{formatMs(limitMs)}</Text>
                      <Text style={styles.cardStatLabel}>Limit</Text>
                    </View>
                    <View style={styles.cardStat}>
                      <Text style={styles.cardStatVal}>{openCount}</Text>
                      <Text style={styles.cardStatLabel}>Opens</Text>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <View style={[
                      styles.progressFill,
                      { width: `${progress * 100}%` },
                      isOver ? { backgroundColor: '#f87171' } : { backgroundColor: '#8b5cf6' },
                    ]} />
                  </View>

                  {isOver && (
                    <Text style={styles.overText}>⛔ Limit reached — blocked until midnight</Text>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-limit')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Add Limit</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  bg: { ...StyleSheet.absoluteFillObject },
  bgCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.05)', top: -50, right: -30,
  },
  bgCircle2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(245, 158, 11, 0.04)', bottom: 100, left: -40,
  },
  content: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 55 : 70, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginTop: 16 },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 6, textAlign: 'center' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardOver: {
    borderColor: 'rgba(248, 113, 113, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 10 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#f1f5f9' },
  cardPkg: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  deleteBtn: { padding: 6 },

  cardStats: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  cardStat: { alignItems: 'center' },
  cardStatVal: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  cardStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', marginTop: 1 },
  cardStatSep: { fontSize: 16, color: 'rgba(255,255,255,0.15)', marginBottom: 12 },

  progressTrack: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, marginTop: 14, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  overText: { fontSize: 12, color: '#f87171', fontWeight: '600', marginTop: 8, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 30, right: 24,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#8b5cf6', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 18,
    elevation: 10,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: '#fff', marginLeft: 6 },
});
