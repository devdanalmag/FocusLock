import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  TextInput,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addSchedule } from '../utils/storage';
import { getInstalledApps } from '../modules/expo-app-manager';

const DAYS = [
  { id: 2, label: 'Mon', short: 'M' },
  { id: 3, label: 'Tue', short: 'T' },
  { id: 4, label: 'Wed', short: 'W' },
  { id: 5, label: 'Thu', short: 'T' },
  { id: 6, label: 'Fri', short: 'F' },
  { id: 7, label: 'Sat', short: 'S' },
  { id: 1, label: 'Sun', short: 'S' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function AddScheduleScreen() {
  const [name, setName] = useState('');
  const [startHour, setStartHour] = useState(8);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(18);
  const [endMinute, setEndMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState([2, 3, 4, 5, 6]); // weekdays
  const [selectedApps, setSelectedApps] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadApps();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadApps = async () => {
    const apps = await getInstalledApps();
    setInstalledApps(apps);
  };

  const toggleDay = (dayId) => {
    setSelectedDays(prev =>
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const selectAllWeekdays = () => setSelectedDays([2, 3, 4, 5, 6]);
  const selectAllDays = () => setSelectedDays([1, 2, 3, 4, 5, 6, 7]);

  const toggleApp = (app) => {
    setSelectedApps(prev => {
      const exists = prev.find(a => a.packageName === app.packageName);
      return exists
        ? prev.filter(a => a.packageName !== app.packageName)
        : [...prev, app];
    });
  };

  const formatTimeDisplay = (hour, minute) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  const adjustTime = (type, field, direction) => {
    if (type === 'hour') {
      if (field === 'start') {
        setStartHour(prev => (prev + direction + 24) % 24);
      } else {
        setEndHour(prev => (prev + direction + 24) % 24);
      }
    } else {
      if (field === 'start') {
        setStartMinute(prev => {
          const next = prev + (direction * 15);
          if (next >= 60) return 0;
          if (next < 0) return 45;
          return next;
        });
      } else {
        setEndMinute(prev => {
          const next = prev + (direction * 15);
          if (next >= 60) return 0;
          if (next < 0) return 45;
          return next;
        });
      }
    }
  };

  const handleSave = async () => {
    if (selectedApps.length === 0) {
      Alert.alert('Select Apps', 'Please select at least one app to block.');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('Select Days', 'Please select at least one day of the week.');
      return;
    }

    const schedule = {
      name: name || `Schedule ${new Date().toLocaleTimeString()}`,
      packages: selectedApps.map(a => a.packageName),
      appNames: selectedApps.map(a => a.name),
      startHour,
      startMinute,
      endHour,
      endMinute,
      daysOfWeek: selectedDays,
    };

    await addSchedule(schedule);
    router.back();
  };

  const filteredApps = installedApps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showAppPicker) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowAppPicker(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#f1f5f9" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Select Apps</Text>
            <Text style={styles.headerSubtitle}>
              {selectedApps.length} selected
            </Text>
          </View>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setShowAppPicker(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apps..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredApps}
          keyExtractor={item => item.packageName}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
          renderItem={({ item }) => {
            const isSelected = selectedApps.some(a => a.packageName === item.packageName);
            return (
              <TouchableOpacity
                style={[styles.appRow, isSelected && styles.appRowSelected]}
                onPress={() => toggleApp(item)}
                activeOpacity={0.7}
              >
                {item.icon ? (
                  <Image source={{ uri: item.icon }} style={styles.appIcon} />
                ) : (
                  <View style={[styles.appIcon, styles.appIconPlaceholder]}>
                    <Text style={styles.appIconText}>{item.name[0]}</Text>
                  </View>
                )}
                <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#f1f5f9" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Schedule</Text>
          </View>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Schedule Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Work Hours, Study Time"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Apps */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Apps to Block</Text>
            <TouchableOpacity
              style={styles.appPickerBtn}
              onPress={() => setShowAppPicker(true)}
              activeOpacity={0.7}
            >
              {selectedApps.length === 0 ? (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#a78bfa" />
                  <Text style={styles.appPickerText}>Tap to select apps</Text>
                </>
              ) : (
                <>
                  <View style={styles.selectedAppsRow}>
                    {selectedApps.slice(0, 4).map(app => (
                      <View key={app.packageName} style={styles.selectedAppChip}>
                        <Text style={styles.selectedAppChipText} numberOfLines={1}>
                          {app.name}
                        </Text>
                      </View>
                    ))}
                    {selectedApps.length > 4 && (
                      <Text style={styles.moreApps}>+{selectedApps.length - 4} more</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Time */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Block Time</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>From</Text>
                <View style={styles.timePicker}>
                  <TouchableOpacity onPress={() => adjustTime('hour', 'start', -1)} style={styles.timeArrow}>
                    <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{formatTimeDisplay(startHour, startMinute)}</Text>
                  <TouchableOpacity onPress={() => adjustTime('hour', 'start', 1)} style={styles.timeArrow}>
                    <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.timeSeparator}>→</Text>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>To</Text>
                <View style={styles.timePicker}>
                  <TouchableOpacity onPress={() => adjustTime('hour', 'end', -1)} style={styles.timeArrow}>
                    <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{formatTimeDisplay(endHour, endMinute)}</Text>
                  <TouchableOpacity onPress={() => adjustTime('hour', 'end', 1)} style={styles.timeArrow}>
                    <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Days */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Repeat On</Text>
            <View style={styles.daysRow}>
              {DAYS.map(day => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayBtn,
                    selectedDays.includes(day.id) && styles.dayBtnActive,
                  ]}
                  onPress={() => toggleDay(day.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayBtnText,
                    selectedDays.includes(day.id) && styles.dayBtnTextActive,
                  ]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.quickDaysRow}>
              <TouchableOpacity style={styles.quickDayBtn} onPress={selectAllWeekdays}>
                <Text style={styles.quickDayText}>Weekdays</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDayBtn} onPress={selectAllDays}>
                <Text style={styles.quickDayText}>Every day</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
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
  saveBtn: {
    backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  doneBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10,
  },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: '#a78bfa' },

  formContent: { paddingHorizontal: 20, paddingBottom: 30 },

  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },

  textInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#f1f5f9',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },

  appPickerBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  appPickerText: { fontSize: 14, color: '#a78bfa', fontWeight: '500' },
  selectedAppsRow: { flexDirection: 'row', flex: 1, flexWrap: 'wrap', gap: 6 },
  selectedAppChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  selectedAppChipText: { fontSize: 12, color: '#a78bfa', fontWeight: '600', maxWidth: 80 },
  moreApps: { fontSize: 12, color: 'rgba(255,255,255,0.4)', alignSelf: 'center' },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBlock: { flex: 1 },
  timeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: '500' },
  timePicker: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  timeArrow: { padding: 4 },
  timeValue: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginVertical: 4 },
  timeSeparator: { fontSize: 18, color: 'rgba(255,255,255,0.3)', marginTop: 20 },

  daysRow: { flexDirection: 'row', gap: 8 },
  dayBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  dayBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  dayBtnText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
  dayBtnTextActive: { color: '#a78bfa' },
  quickDaysRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  quickDayBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  quickDayText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },

  // App Picker
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#f1f5f9' },

  appRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 14, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  appRowSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  appIcon: { width: 36, height: 36, borderRadius: 10, marginRight: 12 },
  appIconPlaceholder: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  appIconText: { fontSize: 16, fontWeight: '700', color: '#a78bfa' },
  appName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#f1f5f9' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#8b5cf6', borderColor: '#8b5cf6',
  },
});
