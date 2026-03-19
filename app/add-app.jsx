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
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getInstalledApps } from '../modules/expo-app-manager';
import { getPausedApps } from '../utils/storage';

export default function AddAppScreen() {
  const [apps, setApps] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pausedPackages, setPausedPackages] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadApps();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredApps(apps);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredApps(
        apps.filter(
          (app) =>
            app.name.toLowerCase().includes(query) ||
            app.packageName.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, apps]);

  const loadApps = async () => {
    try {
      const [installedApps, paused] = await Promise.all([
        getInstalledApps(),
        getPausedApps(),
      ]);

      const pausedPkgs = paused.map((a) => a.packageName);
      setPausedPackages(pausedPkgs);

      const availableApps = installedApps.filter(
        (a) => !pausedPkgs.includes(a.packageName)
      );

      setApps(availableApps);
      setFilteredApps(availableApps);
    } catch (e) {
      console.warn('Failed to load apps:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectApp = (app) => {
    router.push({
      pathname: '/set-duration',
      params: {
        name: app.name,
        packageName: app.packageName,
        icon: app.icon || '',
      },
    });
  };

  const renderAppItem = ({ item }) => (
    <TouchableOpacity
      style={styles.appItem}
      onPress={() => selectApp(item)}
      activeOpacity={0.7}
    >
      <View style={styles.appItemLeft}>
        <View style={styles.appIcon}>
          {item.icon ? (
            <Image source={{ uri: item.icon }} style={styles.appIconImage} />
          ) : (
            <Text style={styles.appIconFallback}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.appItemInfo}>
          <Text style={styles.appItemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.appItemPackage} numberOfLines={1}>
            {item.packageName}
          </Text>
        </View>
      </View>
      <View style={styles.selectArrow}>
        <Ionicons name="chevron-forward" size={18} color="#a78bfa" />
      </View>
    </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Select App to Pause</Text>
            <Text style={styles.headerSubtitle}>
              {filteredApps.length} apps available
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apps..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          )}
        </View>

        {/* App List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Loading installed apps...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredApps}
            renderItem={renderAppItem}
            keyExtractor={(item) => item.packageName}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyText}>No apps found</Text>
              </View>
            }
          />
        )}
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
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    top: -40,
    left: -60,
  },

  content: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 55 : 70,
    paddingBottom: 16,
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

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '500',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  appItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  appIconImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  appIconFallback: {
    fontSize: 20,
    fontWeight: '700',
    color: '#a78bfa',
  },
  appItemInfo: {
    flex: 1,
  },
  appItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  appItemPackage: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '400',
  },
  selectArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
  },
});
