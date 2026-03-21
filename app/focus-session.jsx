import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { startFocusSession, stopFocusSession, getActiveFocusSession } from '../utils/storage';

const PRESETS = [
  { label: '25m', minutes: 25, desc: 'Pomodoro' },
  { label: '1h', minutes: 60, desc: 'Deep Work' },
  { label: '2h', minutes: 120, desc: 'Extended' },
  { label: '4h', minutes: 240, desc: 'Marathon' },
];

export default function FocusSessionScreen() {
  const [activeSession, setActiveSession] = useState(null);
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [customHours, setCustomHours] = useState(1);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [])
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!activeSession) return;

    // Start pulse animation for active session
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = activeSession.endTime - now;

      if (remaining <= 0) {
        setActiveSession(null);
        stopFocusSession();
        clearInterval(interval);
        Alert.alert('🎯 Focus Complete!', 'Great job! Your focus session has ended.');
        return;
      }

      const totalDuration = activeSession.endTime - activeSession.startTime;
      const elapsed = now - activeSession.startTime;
      setProgress(Math.min(1, elapsed / totalDuration));

      const hrs = Math.floor(remaining / (1000 * 60 * 60));
      const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hrs > 0) {
        setCountdown(`${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      } else {
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      pulse.stop();
    };
  }, [activeSession]);

  const loadSession = async () => {
    const session = await getActiveFocusSession();
    setActiveSession(session);
  };

  const handleStart = async () => {
    Alert.alert(
      '🎯 Start Focus Session',
      `Block ALL apps for ${formatDuration(selectedMinutes)}?\n\nExcepted apps will still be accessible.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Focus',
          onPress: async () => {
            const session = await startFocusSession(selectedMinutes);
            if (session) {
              setActiveSession(session);
            }
          },
        },
      ]
    );
  };

  const handleStop = () => {
    Alert.alert(
      'End Focus Session?',
      'Are you sure you want to end your focus session early? Stay committed!',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            await stopFocusSession();
            setActiveSession(null);
            setProgress(0);
          },
        },
      ]
    );
  };

  const formatDuration = (mins) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  const adjustCustom = (field, direction) => {
    if (field === 'hours') {
      const newVal = Math.max(0, Math.min(8, customHours + direction));
      setCustomHours(newVal);
      setSelectedMinutes(newVal * 60 + customMinutes);
    } else {
      const newVal = (customMinutes + (direction * 15) + 60) % 60;
      setCustomMinutes(newVal);
      setSelectedMinutes(customHours * 60 + newVal);
    }
  };

  // Active session view
  if (activeSession) {
    return (
      <View style={styles.container}>
        <View style={styles.bg}>
          <View style={[styles.bgCircle1, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]} />
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#f1f5f9" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Focus Active</Text>
              <Text style={styles.headerSubtitle}>Stay in the zone</Text>
            </View>
          </View>

          <View style={styles.activeContainer}>
            {/* Main countdown */}
            <Animated.View style={[styles.countdownCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.countdownIcon}>🎯</Text>
              <Text style={styles.countdownTime}>{countdown}</Text>
              <Text style={styles.countdownLabel}>remaining</Text>
            </Animated.View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progress * 100)}% complete</Text>
            </View>

            {/* Motivational text */}
            <View style={styles.motivationCard}>
              <MaterialCommunityIcons name="meditation" size={24} color="#10b981" />
              <Text style={styles.motivationText}>
                All apps are blocked.{'\n'}Focus on what matters most.
              </Text>
            </View>

            {/* End session button */}
            <TouchableOpacity
              style={styles.endButton}
              onPress={handleStop}
              activeOpacity={0.7}
            >
              <Ionicons name="stop-circle-outline" size={18} color="#f87171" style={{ marginRight: 8 }} />
              <Text style={styles.endButtonText}>End Session Early</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Setup view
  return (
    <View style={styles.container}>
      <View style={styles.bg}>
        <View style={styles.bgCircle1} />
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
            <Text style={styles.headerTitle}>Time to Focus</Text>
            <Text style={styles.headerSubtitle}>Block everything, zero distractions</Text>
          </View>
        </View>

        <View style={styles.setupContainer}>
          {/* Icon */}
          <View style={styles.focusIconWrap}>
            <Text style={{ fontSize: 48 }}>🎯</Text>
          </View>

          <Text style={styles.setupTitle}>How long do you want to focus?</Text>
          <Text style={styles.setupSubtitle}>
            All apps will be blocked except your excepted apps
          </Text>

          {/* Preset buttons */}
          <View style={styles.presetsRow}>
            {PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.minutes}
                style={[
                  styles.presetBtn,
                  selectedMinutes === preset.minutes && styles.presetBtnActive,
                ]}
                onPress={() => {
                  setSelectedMinutes(preset.minutes);
                  setCustomHours(Math.floor(preset.minutes / 60));
                  setCustomMinutes(preset.minutes % 60);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.presetLabel,
                  selectedMinutes === preset.minutes && styles.presetLabelActive,
                ]}>
                  {preset.label}
                </Text>
                <Text style={[
                  styles.presetDesc,
                  selectedMinutes === preset.minutes && styles.presetDescActive,
                ]}>
                  {preset.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom time picker */}
          <View style={styles.customSection}>
            <Text style={styles.customLabel}>Custom Duration</Text>
            <View style={styles.customRow}>
              <View style={styles.customBlock}>
                <TouchableOpacity onPress={() => adjustCustom('hours', 1)} style={styles.customArrow}>
                  <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
                <Text style={styles.customValue}>{customHours}h</Text>
                <TouchableOpacity onPress={() => adjustCustom('hours', -1)} style={styles.customArrow}>
                  <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
              <Text style={styles.customSep}>:</Text>
              <View style={styles.customBlock}>
                <TouchableOpacity onPress={() => adjustCustom('minutes', 1)} style={styles.customArrow}>
                  <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
                <Text style={styles.customValue}>{customMinutes}m</Text>
                <TouchableOpacity onPress={() => adjustCustom('minutes', -1)} style={styles.customArrow}>
                  <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Selected duration summary */}
          <View style={styles.summaryCard}>
            <Ionicons name="time-outline" size={18} color="#a78bfa" />
            <Text style={styles.summaryText}>
              Focus for <Text style={styles.summaryHighlight}>{formatDuration(selectedMinutes)}</Text>
            </Text>
          </View>

          {/* Start button */}
          <TouchableOpacity
            style={[styles.startButton, selectedMinutes <= 0 && styles.startButtonDisabled]}
            onPress={handleStart}
            activeOpacity={0.8}
            disabled={selectedMinutes <= 0}
          >
            <Ionicons name="play" size={22} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.startButtonText}>Start Focus Session</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  bg: { ...StyleSheet.absoluteFillObject },
  bgCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.05)', top: -40, right: -60,
  },
  content: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 55 : 70, paddingBottom: 16,
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

  // Setup
  setupContainer: { flex: 1, paddingHorizontal: 20, alignItems: 'center', paddingTop: 10 },
  focusIconWrap: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.12)',
  },
  setupTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  setupSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24 },

  presetsRow: { flexDirection: 'row', gap: 10, marginBottom: 24, width: '100%' },
  presetBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  presetLabel: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  presetLabelActive: { color: '#a78bfa' },
  presetDesc: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 0.5 },
  presetDescActive: { color: 'rgba(167, 139, 250, 0.6)' },

  customSection: { width: '100%', marginBottom: 24 },
  customLabel: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  customBlock: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 10, width: 80,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  customArrow: { padding: 4 },
  customValue: { fontSize: 22, fontWeight: '700', color: '#f1f5f9', marginVertical: 4 },
  customSep: { fontSize: 18, color: 'rgba(255,255,255,0.3)' },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.06)', borderRadius: 12, padding: 14,
    width: '100%', marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  summaryText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  summaryHighlight: { color: '#a78bfa', fontWeight: '700' },

  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#8b5cf6', borderRadius: 16,
    paddingVertical: 18, width: '100%',
    elevation: 8,
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  startButtonDisabled: { opacity: 0.4 },
  startButtonText: { fontSize: 17, fontWeight: '700', color: '#ffffff', letterSpacing: 0.3 },

  // Active session
  activeContainer: { flex: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  countdownCircle: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 32,
  },
  countdownIcon: { fontSize: 32, marginBottom: 4 },
  countdownTime: { fontSize: 36, fontWeight: '800', color: '#10b981' },
  countdownLabel: { fontSize: 12, color: 'rgba(16, 185, 129, 0.6)', fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },

  progressContainer: { width: '100%', marginBottom: 32 },
  progressTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  progressText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 8, fontWeight: '500' },

  motivationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.06)', borderRadius: 16, padding: 16,
    width: '100%', marginBottom: 32,
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  motivationText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, flex: 1 },

  endButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 14,
    paddingVertical: 14, width: '100%',
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  endButtonText: { fontSize: 14, fontWeight: '600', color: '#f87171' },
});
