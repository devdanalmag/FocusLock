import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  FlatList,
  TextInput,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getInstalledApps } from '../modules/expo-app-manager';
import { setAppDailyLimit, getAppDailyLimits } from '../utils/storage';

const LIMIT_OPTIONS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
  { label: '1h', value: 60 },
  { label: '1h 30m', value: 90 },
  { label: '2h', value: 120 },
  { label: '2h 30m', value: 150 },
];

export default function AddLimitScreen() {
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedLimit, setSelectedLimit] = useState(60);
  const [existingLimits, setExistingLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadApps();
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();
  }, []);

  const loadApps = async () => {
    const [installed, existing] = await Promise.all([
      getInstalledApps(),
      getAppDailyLimits(),
    ]);
    // Filter out already limited apps and system apps
    const filtered = (installed || []).filter(a =>
      !existing[a.packageName] &&
      a.name &&
      !a.packageName.startsWith('com.android.')
    );
    setApps(filtered);
    setExistingLimits(existing || {});
    setLoading(false);
  };

  const filteredApps = apps.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!selectedApp) {
      Alert.alert('Select App', 'Please select an app to limit');
      return;
    }
    await setAppDailyLimit(selectedApp.packageName, selectedLimit, selectedApp.name);
    router.back();
  };

  const formatLimit = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const renderApp = ({ item }) => {
    const isSelected = selectedApp?.packageName === item.packageName;
    return (
      <TouchableOpacity
        style={[styles.appRow, isSelected && styles.appRowSelected]}
        onPress={() => setSelectedApp(item)}
        activeOpacity={0.7}
      >
        {item.icon ? (
          <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={styles.appIcon} />
        ) : (
          <View style={styles.appIconFallback}>
            <Text style={styles.appIconText}>{item.name?.[0] || '?'}</Text>
          </View>
        )}
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.appPkg} numberOfLines={1}>{item.packageName}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="#8b5cf6" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.bg}>
        <View style={styles.bgCircle1} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color="#f1f5f9" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Daily Limit</Text>
          <TouchableOpacity
            style={[styles.saveBtn, !selectedApp && { opacity: 0.4 }]}
            onPress={handleSave}
            disabled={!selectedApp}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Time Limit Selector */}
        <View style={styles.limitSection}>
          <Text style={styles.limitLabel}>Max daily usage</Text>
          <View style={styles.limitGrid}>
            {LIMIT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.limitBtn, selectedLimit === opt.value && styles.limitBtnActive]}
                onPress={() => setSelectedLimit(opt.value)}
              >
                <Text style={[styles.limitBtnText, selectedLimit === opt.value && styles.limitBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected App Preview */}
        {selectedApp && (
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              ⏱️ {selectedApp.name} → max {formatLimit(selectedLimit)} per day
            </Text>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.3)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apps..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* App List */}
        <FlatList
          style={{ flex: 1 }}
          data={filteredApps}
          renderItem={renderApp}
          keyExtractor={item => item.packageName}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 30 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                {loading ? 'Loading apps...' : 'No apps found'}
              </Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  bg: { ...StyleSheet.absoluteFillObject },
  bgCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(139, 92, 246, 0.05)', top: -40, right: -30,
  },
  content: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 55 : 70, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  saveBtn: {
    backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  limitSection: { paddingHorizontal: 20, marginTop: 6 },
  limitLabel: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  limitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  limitBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  limitBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  limitBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  limitBtnTextActive: { color: '#a78bfa' },

  preview: {
    marginHorizontal: 20, marginTop: 14, padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.08)', borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  previewText: { fontSize: 13, fontWeight: '600', color: '#a78bfa', textAlign: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: { flex: 1, color: '#f1f5f9', fontSize: 14, paddingVertical: 12, marginLeft: 8 },

  list: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  appRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  appRowSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  appIcon: { width: 38, height: 38, borderRadius: 10, marginRight: 12 },
  appIconFallback: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  appIconText: { fontSize: 16, fontWeight: '700', color: '#a78bfa' },
  appInfo: { flex: 1, marginRight: 8 },
  appName: { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  appPkg: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 },
});
