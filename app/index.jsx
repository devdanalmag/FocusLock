import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { isOnboardingComplete, setOnboardingComplete } from '../utils/storage';
import { hasUsageStatsPermission, openUsageStatsSettings } from '../modules/expo-app-manager';
import { isAccessibilityServiceEnabled, openAccessibilitySettings } from '../modules/expo-app-blocker';
import { isNotificationListenerEnabled, openNotificationListenerSettings } from '../modules/expo-notification-policy';
import { isDeviceAdmin, requestDeviceAdmin } from '../modules/expo-device-admin';

const PERMISSIONS = [
  {
    id: 'usage',
    title: 'Usage Access',
    description: 'Required to detect which apps are running',
    icon: 'bar-chart',
    iconPack: 'ionicons',
    check: hasUsageStatsPermission,
    request: openUsageStatsSettings,
  },
  {
    id: 'accessibility',
    title: 'Accessibility Service',
    description: 'Required to block paused apps from opening',
    icon: 'shield-checkmark',
    iconPack: 'ionicons',
    check: isAccessibilityServiceEnabled,
    request: openAccessibilitySettings,
  },
  {
    id: 'notifications',
    title: 'Notification Access',
    description: 'Required to silence notifications from paused apps',
    icon: 'notifications-off',
    iconPack: 'ionicons',
    check: isNotificationListenerEnabled,
    request: openNotificationListenerSettings,
  },
  {
    id: 'admin',
    title: 'Device Admin',
    description: 'Prevents FocusLock from being uninstalled',
    icon: 'lock-closed',
    iconPack: 'ionicons',
    check: isDeviceAdmin,
    request: requestDeviceAdmin,
  },
];

export default function OnboardingScreen() {
  const [permissionStatus, setPermissionStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkInitialState();
    startAnimations();
  }, []);

  useEffect(() => {
    const interval = setInterval(checkPermissions, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const granted = Object.values(permissionStatus).filter(Boolean).length;
    Animated.spring(progressAnim, {
      toValue: granted / PERMISSIONS.length,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [permissionStatus]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkInitialState = async () => {
    const complete = await isOnboardingComplete();
    if (complete) {
      router.replace('/dashboard');
      return;
    }
    await checkPermissions();
    setLoading(false);
  };

  const checkPermissions = async () => {
    const status = {};
    for (const perm of PERMISSIONS) {
      try {
        status[perm.id] = await perm.check();
      } catch (e) {
        status[perm.id] = false;
      }
    }
    setPermissionStatus(status);

    const allGranted = Object.values(status).every(Boolean);
    if (allGranted && !loading) {
      await setOnboardingComplete();
      router.replace('/dashboard');
    }
  };

  const handlePermissionRequest = async (permission, index) => {
    setCurrentStep(index);
    try {
      await permission.request();
    } catch (e) {
      console.warn('Permission request failed:', e);
    }
  };

  const handleSkip = async () => {
    await setOnboardingComplete();
    router.replace('/dashboard');
  };

  const allGranted = Object.values(permissionStatus).every(Boolean);
  const grantedCount = Object.values(permissionStatus).filter(Boolean).length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.bg}>
          <View style={styles.bgCircle1} />
          <View style={styles.bgCircle2} />
          <View style={styles.bgCircle3} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="rgba(255,255,255,0.6)" />
          <Text style={styles.loadingText}>Setting up FocusLock...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bg}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
        <View style={styles.bgCircle3} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.appIconWrap}>
            <Ionicons name="lock-closed" size={36} color="#a78bfa" />
          </View>
          <Text style={styles.title}>FocusLock</Text>
          <Text style={styles.subtitle}>
            A few permissions are needed to{'\n'}block distracting apps
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {grantedCount}/{PERMISSIONS.length} permissions
          </Text>
        </View>

        {/* Permission Cards */}
        <View style={styles.permissionsList}>
          {PERMISSIONS.map((perm, index) => {
            const isGranted = permissionStatus[perm.id];
            return (
              <TouchableOpacity
                key={perm.id}
                style={[
                  styles.permissionCard,
                  isGranted && styles.permissionCardGranted,
                ]}
                onPress={() => !isGranted && handlePermissionRequest(perm, index)}
                activeOpacity={isGranted ? 1 : 0.7}
                disabled={isGranted}
              >
                <View style={styles.permissionLeft}>
                  <View
                    style={[
                      styles.permissionIconContainer,
                      isGranted && styles.permissionIconGranted,
                    ]}
                  >
                    {isGranted ? (
                      <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                    ) : (
                      <Ionicons name={perm.icon} size={22} color="#a78bfa" />
                    )}
                  </View>
                  <View style={styles.permissionInfo}>
                    <Text
                      style={[
                        styles.permissionTitle,
                        isGranted && styles.permissionTitleGranted,
                      ]}
                    >
                      {perm.title}
                    </Text>
                    <Text style={styles.permissionDescription}>
                      {perm.description}
                    </Text>
                  </View>
                </View>
                {!isGranted && (
                  <View style={styles.enableButton}>
                    <Text style={styles.enableButtonText}>Enable</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          {allGranted ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={async () => {
                  await setOnboardingComplete();
                  router.replace('/dashboard');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="rocket" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.continueButtonText}>Get Started</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
              <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </View>
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    top: -80,
    right: -60,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    bottom: 150,
    left: -50,
  },
  bgCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(236, 72, 153, 0.05)',
    bottom: -30,
    right: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginTop: 16,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },

  progressContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },

  permissionsList: {
    flex: 1,
    gap: 12,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  permissionCardGranted: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  permissionIconGranted: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 3,
  },
  permissionTitleGranted: {
    color: '#4ade80',
  },
  permissionDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 16,
  },
  enableButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  enableButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a78bfa',
  },

  bottomButtons: {
    alignItems: 'center',
    marginTop: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
});
