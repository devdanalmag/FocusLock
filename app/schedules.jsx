import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  FlatList,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getSchedules, toggleSchedule, deleteSchedule } from '../utils/storage';

const DAY_NAMES = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_SHORT = ['', 'S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function SchedulesScreen() {
  const [schedules, setSchedules] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async () => {
    const data = await getSchedules();
    setSchedules(data);
  };

  const handleToggle = async (id) => {
    await toggleSchedule(id);
    await loadData();
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Schedule',
      `Remove "${name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSchedule(id);
            await loadData();
          },
        },
      ]
    );
  };

  const formatTime = (hour, minute) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  const getActiveDays = (daysOfWeek) => {
    if (!daysOfWeek || daysOfWeek.length === 0) return 'No days';
    if (daysOfWeek.length === 7) return 'Every day';
    // Check weekdays (Mon-Fri = 2-6)
    const weekdays = [2, 3, 4, 5, 6];
    const weekends = [1, 7];
    if (weekdays.every(d => daysOfWeek.includes(d)) && daysOfWeek.length === 5) return 'Weekdays';
    if (weekends.every(d => daysOfWeek.includes(d)) && daysOfWeek.length === 2) return 'Weekends';
    return daysOfWeek.map(d => DAY_NAMES[d]).join(', ');
  };

  const renderSchedule = ({ item, index }) => {
    const isActive = item.enabled;
    return (
      <Animated.View
        style={[
          styles.scheduleCard,
          !isActive && styles.scheduleCardDisabled,
          { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          })}] },
        ]}
      >
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleInfo}>
            <Text style={[styles.scheduleName, !isActive && styles.textDisabled]}>
              {item.name || 'Unnamed Schedule'}
            </Text>
            <Text style={[styles.scheduleTime, !isActive && styles.textDisabled]}>
              {formatTime(item.startHour, item.startMinute)} — {formatTime(item.endHour, item.endMinute)}
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={() => handleToggle(item.id)}
            trackColor={{ false: '#334155', true: 'rgba(139, 92, 246, 0.4)' }}
            thumbColor={isActive ? '#8b5cf6' : '#64748b'}
          />
        </View>

        <View style={styles.scheduleDays}>
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <View
              key={day}
              style={[
                styles.dayBadge,
                item.daysOfWeek?.includes(day) && styles.dayBadgeActive,
                !isActive && styles.dayBadgeDisabled,
              ]}
            >
              <Text style={[
                styles.dayBadgeText,
                item.daysOfWeek?.includes(day) && styles.dayBadgeTextActive,
              ]}>
                {DAY_SHORT[day]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.scheduleFooter}>
          <View style={styles.appsCount}>
            <Ionicons name="apps-outline" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.appsCountText}>
              {item.packages?.length || 0} app{(item.packages?.length || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name)}
            style={styles.deleteBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#f87171" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

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
            <Text style={styles.headerTitle}>Schedules</Text>
            <Text style={styles.headerSubtitle}>Auto-block apps at specific times</Text>
          </View>
        </View>

        {schedules.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-clock" size={56} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>No schedules yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a schedule to auto-block distracting apps{'\n'}during work or study hours
            </Text>
          </View>
        ) : (
          <FlatList
            data={schedules}
            keyExtractor={item => item.id}
            renderItem={renderSchedule}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-schedule')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
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

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  scheduleCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  scheduleCardDisabled: {
    opacity: 0.5,
  },
  scheduleHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  scheduleInfo: { flex: 1, marginRight: 12 },
  scheduleName: { fontSize: 16, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  scheduleTime: { fontSize: 14, fontWeight: '500', color: '#a78bfa' },
  textDisabled: { color: 'rgba(255,255,255,0.3)' },

  scheduleDays: {
    flexDirection: 'row', gap: 6, marginBottom: 12,
  },
  dayBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  dayBadgeActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  dayBadgeDisabled: { opacity: 0.4 },
  dayBadgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
  dayBadgeTextActive: { color: '#a78bfa' },

  scheduleFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  appsCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appsCountText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    justifyContent: 'center', alignItems: 'center',
  },

  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 16 },
  emptySubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 8, lineHeight: 20,
  },

  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8,
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
});
