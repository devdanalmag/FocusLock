import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  FlatList,
  Platform,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getExceptedApps, addExceptedApp, removeExceptedApp } from '../utils/storage';
import { getInstalledApps } from '../modules/expo-app-manager';

export default function ExceptionsScreen() {
  const [exceptedApps, setExceptedApps] = useState([]);
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [installedApps, setInstalledApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
    const apps = await getExceptedApps();
    setExceptedApps(apps);
  };

  const loadInstalledApps = async () => {
    const apps = await getInstalledApps();
    setInstalledApps(apps);
  };

  const handleAdd = async (app) => {
    const success = await addExceptedApp(app);
    if (success) {
      await loadData();
    }
  };

  const handleRemove = (app) => {
    Alert.alert(
      'Remove Exception',
      `Remove "${app.name}" from exceptions? This app will be subject to blocking again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeExceptedApp(app.packageName);
            await loadData();
          },
        },
      ]
    );
  };

  const openAppPicker = async () => {
    await loadInstalledApps();
    setShowAppPicker(true);
    setSearchQuery('');
  };

  const filteredApps = installedApps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !exceptedApps.find(e => e.packageName === app.packageName)
  );

  // App Picker view
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
            <Text style={styles.headerTitle}>Add Exception</Text>
            <Text style={styles.headerSubtitle}>Select apps to whitelist</Text>
          </View>
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.appRow}
              onPress={() => {
                handleAdd(item);
                setShowAppPicker(false);
              }}
              activeOpacity={0.7}
            >
              {item.icon ? (
                <Image source={{ uri: item.icon }} style={styles.appIcon} />
              ) : (
                <View style={[styles.appIcon, styles.appIconPlaceholder]}>
                  <Text style={styles.appIconText}>{item.name[0]}</Text>
                </View>
              )}
              <Text style={styles.appRowName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.addBadge}>
                <Ionicons name="add" size={16} color="#10b981" />
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  const renderExceptedApp = ({ item }) => (
    <View style={styles.exceptedCard}>
      <View style={styles.exceptedLeft}>
        {item.icon ? (
          <Image source={{ uri: item.icon }} style={styles.exceptedIcon} />
        ) : (
          <View style={[styles.exceptedIcon, styles.exceptedIconPlaceholder]}>
            <Text style={styles.exceptedIconText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.exceptedInfo}>
          <Text style={styles.exceptedName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.exceptedPackage} numberOfLines={1}>Always allowed</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleRemove(item)}
        style={styles.removeBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="close-circle" size={22} color="#f87171" />
      </TouchableOpacity>
    </View>
  );

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
            <Text style={styles.headerTitle}>App Exceptions</Text>
            <Text style={styles.headerSubtitle}>These apps are never blocked</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="shield-check" size={20} color="#10b981" />
          <Text style={styles.infoText}>
            Excepted apps bypass ALL blocking: paused apps, schedules, daily limits, and focus sessions.
          </Text>
        </View>

        {exceptedApps.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="shield-star-outline" size={56} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>No exceptions yet</Text>
            <Text style={styles.emptySubtitle}>
              Add apps like YouTube that you use for learning{'\n'}so they're never blocked
            </Text>
          </View>
        ) : (
          <FlatList
            data={exceptedApps}
            keyExtractor={item => item.packageName}
            renderItem={renderExceptedApp}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={openAppPicker}
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
    backgroundColor: 'rgba(16, 185, 129, 0.05)', top: -40, right: -60,
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

  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 16, padding: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.06)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  infoText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 18, flex: 1 },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  exceptedCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  exceptedLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  exceptedIcon: { width: 40, height: 40, borderRadius: 12, marginRight: 12, overflow: 'hidden' },
  exceptedIconPlaceholder: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  exceptedIconText: { fontSize: 18, fontWeight: '700', color: '#10b981' },
  exceptedInfo: { flex: 1 },
  exceptedName: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', marginBottom: 2 },
  exceptedPackage: { fontSize: 12, color: '#10b981', fontWeight: '500' },
  removeBtn: { padding: 4 },

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
    backgroundColor: '#10b981',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },

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
  appIcon: { width: 36, height: 36, borderRadius: 10, marginRight: 12 },
  appIconPlaceholder: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  appIconText: { fontSize: 16, fontWeight: '700', color: '#10b981' },
  appRowName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#f1f5f9' },
  addBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)',
  },
});
