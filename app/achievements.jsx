import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BADGE_DEFINITIONS, getAchievements, checkAchievements } from '../utils/storage';

export default function AchievementsScreen() {
  const [unlocked, setUnlocked] = useState({});
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
    await checkAchievements();
    const data = await getAchievements();
    setUnlocked(data);
  };

  const unlockedCount = Object.keys(unlocked).length;
  const totalCount = BADGE_DEFINITIONS.length;
  const progress = totalCount > 0 ? unlockedCount / totalCount : 0;

  const categories = [
    { key: 'streak', label: '🔥 Streak', color: '#f59e0b' },
    { key: 'blocks', label: '✋ Blocks', color: '#f87171' },
    { key: 'apps', label: '🔒 Apps', color: '#8b5cf6' },
    { key: 'features', label: '⚙️ Features', color: '#06b6d4' },
  ];

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
            <Text style={styles.headerTitle}>Achievements</Text>
            <Text style={styles.headerSubtitle}>
              {unlockedCount}/{totalCount} unlocked
            </Text>
          </View>
        </View>

        {/* Progress Ring */}
        <View style={styles.progressContainer}>
          <View style={styles.progressRing}>
            <View style={styles.progressInner}>
              <Text style={styles.progressPercent}>
                {Math.round(progress * 100)}%
              </Text>
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
            <View style={[
              styles.progressArc,
              { transform: [{ rotate: `${progress * 360}deg` }] },
            ]} />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {categories.map((cat) => {
            const badges = BADGE_DEFINITIONS.filter(b => b.category === cat.key);
            if (badges.length === 0) return null;

            return (
              <View key={cat.key} style={styles.categorySection}>
                <Text style={[styles.categoryTitle, { color: cat.color }]}>
                  {cat.label}
                </Text>
                <View style={styles.badgeGrid}>
                  {badges.map((badge) => {
                    const isUnlocked = !!unlocked[badge.id];
                    return (
                      <View
                        key={badge.id}
                        style={[
                          styles.badgeCard,
                          isUnlocked && styles.badgeCardUnlocked,
                          isUnlocked && { borderColor: cat.color + '30' },
                        ]}
                      >
                        <Text style={[
                          styles.badgeEmoji,
                          !isUnlocked && styles.badgeEmojiLocked,
                        ]}>
                          {badge.emoji}
                        </Text>
                        <Text style={[
                          styles.badgeTitle,
                          !isUnlocked && styles.badgeTitleLocked,
                        ]}>
                          {badge.title}
                        </Text>
                        <Text style={styles.badgeDesc}>
                          {badge.desc}
                        </Text>
                        {isUnlocked && (
                          <View style={[styles.unlockedBadge, { backgroundColor: cat.color + '20' }]}>
                            <Ionicons name="checkmark" size={10} color={cat.color} />
                          </View>
                        )}
                        {!isUnlocked && (
                          <View style={styles.lockedOverlay}>
                            <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.15)" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Motivational Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerEmoji}>
              {unlockedCount === 0 ? '🌱' :
               unlockedCount < 5 ? '🌿' :
               unlockedCount < 10 ? '🌳' : '🏆'}
            </Text>
            <Text style={styles.footerText}>
              {unlockedCount === 0
                ? 'Start your journey — pause your first app!'
                : unlockedCount < totalCount
                ? `${totalCount - unlockedCount} more to unlock. Keep going!`
                : 'You unlocked everything! True focus master 👑'}
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  bg: { ...StyleSheet.absoluteFillObject },
  bgCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(245, 158, 11, 0.05)', top: -50, right: -30,
  },
  bgCircle2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(139, 92, 246, 0.04)', bottom: 100, left: -40,
  },
  content: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 55 : 70, paddingBottom: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  progressContainer: { alignItems: 'center', paddingVertical: 16 },
  progressRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  progressInner: { alignItems: 'center' },
  progressPercent: { fontSize: 22, fontWeight: '800', color: '#f59e0b' },
  progressLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600', marginTop: -2 },
  progressArc: {
    position: 'absolute', top: -4, left: -4,
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 4, borderColor: '#f59e0b',
    borderTopColor: 'transparent', borderRightColor: 'transparent',
  },

  scrollContent: { paddingHorizontal: 20 },

  categorySection: { marginBottom: 24 },
  categoryTitle: {
    fontSize: 14, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },

  badgeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  badgeCard: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, padding: 14, position: 'relative',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  badgeCardUnlocked: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  badgeEmoji: { fontSize: 28, marginBottom: 6 },
  badgeEmojiLocked: { opacity: 0.2, filter: 'grayscale(1)' },
  badgeTitle: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', marginBottom: 2 },
  badgeTitleLocked: { color: 'rgba(255,255,255,0.2)' },
  badgeDesc: { fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 15 },
  unlockedBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  lockedOverlay: {
    position: 'absolute', top: 10, right: 10,
  },

  footer: {
    alignItems: 'center', paddingVertical: 24,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', marginTop: 8,
  },
  footerEmoji: { fontSize: 32, marginBottom: 8 },
  footerText: {
    fontSize: 14, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', fontWeight: '500',
  },
});
