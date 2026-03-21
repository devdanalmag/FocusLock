import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { isAccessibilityServiceEnabled, openAccessibilitySettings } from '../modules/expo-app-blocker';
import {
  isNotificationListenerEnabled,
  openNotificationListenerSettings,
  scheduleRepeatingNudge,
  cancelNudge,
  sendTestNudge,
  getNudgeSettings,
} from '../modules/expo-notification-policy';
import { isDeviceAdmin, requestDeviceAdmin } from '../modules/expo-device-admin';
import { hasUsageStatsPermission, openUsageStatsSettings } from '../modules/expo-app-manager';
import { getPausedApps, unpauseApp, getBedtimeMode, setBedtimeMode, unlockAchievement } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMERGENCY_PHRASE = 'I understand this breaks my focus commitment and I choose to unlock';

export default function SettingsScreen() {
  const [permissions, setPermissions] = useState({
    usage: false,
    accessibility: false,
    notifications: false,
    admin: false,
  });
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyInput, setEmergencyInput] = useState('');
  const [pausedApps, setPausedApps] = useState([]);
  const [selectedUnlockApp, setSelectedUnlockApp] = useState(null);
  const [nudgeEnabled, setNudgeEnabled] = useState(false);
  const [nudgeInterval, setNudgeInterval] = useState(120);
  const [bedtimeEnabled, setBedtimeEnabled] = useState(false);
  const [bedtimeStart, setBedtimeStart] = useState(22);
  const [bedtimeEnd, setBedtimeEnd] = useState(7);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPermissions();
    loadPausedApps();
    loadNudgeSettings();
    loadBedtimeSettings();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(checkPermissions, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadNudgeSettings = async () => {
    const settings = await getNudgeSettings();
    setNudgeEnabled(settings.enabled);
    setNudgeInterval(settings.intervalMinutes);
  };

  const handleNudgeToggle = async () => {
    if (nudgeEnabled) {
      await cancelNudge();
      setNudgeEnabled(false);
    } else {
      await scheduleRepeatingNudge(nudgeInterval);
      setNudgeEnabled(true);
      await unlockAchievement('nudge_on');
    }
  };

  const handleNudgeIntervalChange = async (minutes) => {
    setNudgeInterval(minutes);
    if (nudgeEnabled) {
      await scheduleRepeatingNudge(minutes);
    }
  };

  const loadBedtimeSettings = async () => {
    const settings = await getBedtimeMode();
    setBedtimeEnabled(settings.enabled);
    setBedtimeStart(settings.startHour);
    setBedtimeEnd(settings.endHour);
  };

  const handleBedtimeToggle = async () => {
    const newEnabled = !bedtimeEnabled;
    setBedtimeEnabled(newEnabled);
    await setBedtimeMode(bedtimeStart, bedtimeEnd, newEnabled);
  };

  const handleBedtimeTimeChange = async (field, direction) => {
    if (field === 'start') {
      const newVal = (bedtimeStart + direction + 24) % 24;
      setBedtimeStart(newVal);
      if (bedtimeEnabled) await setBedtimeMode(newVal, bedtimeEnd, true);
    } else {
      const newVal = (bedtimeEnd + direction + 24) % 24;
      setBedtimeEnd(newVal);
      if (bedtimeEnabled) await setBedtimeMode(bedtimeStart, newVal, true);
    }
  };

  const checkPermissions = async () => {
    const [usage, accessibility, notifications, admin] = await Promise.all([
      hasUsageStatsPermission(),
      isAccessibilityServiceEnabled(),
      isNotificationListenerEnabled(),
      isDeviceAdmin(),
    ]);
    setPermissions({ usage, accessibility, notifications, admin });
  };

  const loadPausedApps = async () => {
    const apps = await getPausedApps();
    setPausedApps(apps);
  };

  const handleEmergencyUnlock = async () => {
    if (!selectedUnlockApp) return;

    if (emergencyInput.trim().toLowerCase() !== EMERGENCY_PHRASE.toLowerCase()) {
      Alert.alert(
        'Phrase Mismatch',
        'You must type the exact phrase to unlock. This is intentional friction to prevent impulsive unlocking.'
      );
      return;
    }

    Alert.alert(
      'Emergency Unlock',
      `Are you really sure you want to unlock "${selectedUnlockApp.name}"?\n\nThis cannot be undone.`,
      [
        { text: 'Keep Locked', style: 'cancel' },
        {
          text: 'Unlock',
          style: 'destructive',
          onPress: async () => {
            await unpauseApp(selectedUnlockApp.packageName);
            setShowEmergency(false);
            setEmergencyInput('');
            setSelectedUnlockApp(null);
            await loadPausedApps();
            Alert.alert('Unlocked', `${selectedUnlockApp.name} has been unlocked.`);
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem('@focuslock_onboarding_complete');
    router.replace('/');
  };

  const PermissionRow = ({ title, iconName, enabled, onEnable }) => (
    <View style={styles.permRow}>
      <View style={styles.permLeft}>
        <View style={[styles.permDot, enabled && styles.permDotEnabled]} />
        <Ionicons name={iconName} size={20} color="rgba(255,255,255,0.6)" style={{ marginRight: 10 }} />
        <Text style={styles.permTitle}>{title}</Text>
      </View>
      {enabled ? (
        <View style={styles.permBadge}>
          <Ionicons name="checkmark" size={14} color="#4ade80" style={{ marginRight: 4 }} />
          <Text style={styles.permBadgeText}>Active</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.permEnableBtn} onPress={onEnable} activeOpacity={0.7}>
          <Text style={styles.permEnableBtnText}>Enable</Text>
        </TouchableOpacity>
      )}
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
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Permissions Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#a78bfa" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Permissions</Text>
            </View>
            <View style={styles.sectionCard}>
              <PermissionRow
                title="Usage Access"
                iconName="bar-chart-outline"
                enabled={permissions.usage}
                onEnable={openUsageStatsSettings}
              />
              <PermissionRow
                title="Accessibility Service"
                iconName="shield-outline"
                enabled={permissions.accessibility}
                onEnable={openAccessibilitySettings}
              />
              <PermissionRow
                title="Notification Access"
                iconName="notifications-off-outline"
                enabled={permissions.notifications}
                onEnable={openNotificationListenerSettings}
              />
              <PermissionRow
                title="Device Admin"
                iconName="lock-closed-outline"
                enabled={permissions.admin}
                onEnable={requestDeviceAdmin}
              />
            </View>
          </View>

          {/* Emergency Unlock Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="alert-circle-outline" size={18} color="#f87171" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Emergency Unlock</Text>
            </View>
            <View style={[styles.sectionCard, styles.dangerCard]}>
              <Text style={styles.emergencyDescription}>
                Unlock a paused app before its timer expires. You must type a long phrase
                to prevent impulsive unlocking.
              </Text>

              {!showEmergency ? (
                <TouchableOpacity
                  style={styles.emergencyButton}
                  onPress={() => {
                    if (pausedApps.length === 0) {
                      Alert.alert('No Paused Apps', 'You have no apps currently paused.');
                      return;
                    }
                    setShowEmergency(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="lock-open-outline" size={16} color="#f87171" style={{ marginRight: 8 }} />
                  <Text style={styles.emergencyButtonText}>Emergency Unlock</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.emergencyForm}>
                  <Text style={styles.emergencyLabel}>Select app to unlock:</Text>
                  <View style={styles.emergencyAppList}>
                    {pausedApps.map((app) => (
                      <TouchableOpacity
                        key={app.packageName}
                        style={[
                          styles.emergencyAppItem,
                          selectedUnlockApp?.packageName === app.packageName &&
                            styles.emergencyAppItemSelected,
                        ]}
                        onPress={() => setSelectedUnlockApp(app)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.emergencyAppName}>{app.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedUnlockApp && (
                    <>
                      <Text style={styles.emergencyLabel}>
                        Type this phrase exactly:
                      </Text>
                      <Text style={styles.emergencyPhrase}>"{EMERGENCY_PHRASE}"</Text>
                      <TextInput
                        style={styles.emergencyInput}
                        value={emergencyInput}
                        onChangeText={setEmergencyInput}
                        placeholder="Type the phrase..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        multiline
                        autoCapitalize="none"
                      />
                      <View style={styles.emergencyActions}>
                        <TouchableOpacity
                          style={styles.emergencyCancelBtn}
                          onPress={() => {
                            setShowEmergency(false);
                            setEmergencyInput('');
                            setSelectedUnlockApp(null);
                          }}
                        >
                          <Text style={styles.emergencyCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.emergencyUnlockBtn,
                            emergencyInput.trim().toLowerCase() !== EMERGENCY_PHRASE.toLowerCase() &&
                              styles.emergencyUnlockBtnDisabled,
                          ]}
                          onPress={handleEmergencyUnlock}
                        >
                          <Ionicons name="lock-open" size={16} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.emergencyUnlockText}>Unlock</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Reality Check Nudge Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="brain" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Reality Check Nudge</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.emergencyDescription}>
                Get periodic notifications showing your real screen time to build awareness.
              </Text>

              <View style={styles.nudgeToggleRow}>
                <Text style={styles.permTitle}>Enable Nudges</Text>
                <TouchableOpacity
                  style={[styles.permEnableBtn, nudgeEnabled && styles.nudgeActiveBtn]}
                  onPress={handleNudgeToggle}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.permEnableBtnText, nudgeEnabled && { color: '#4ade80' }]}>
                    {nudgeEnabled ? '✓ Active' : 'Enable'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.emergencyDescription, { marginTop: 12, marginBottom: 8, fontSize: 12 }]}>
                Frequency
              </Text>
              <View style={styles.nudgeFreqRow}>
                {[{ label: '1h', value: 60 }, { label: '2h', value: 120 }, { label: '4h', value: 240 }].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.nudgeFreqBtn,
                      nudgeInterval === opt.value && styles.nudgeFreqBtnActive,
                    ]}
                    onPress={() => handleNudgeIntervalChange(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.nudgeFreqText,
                      nudgeInterval === opt.value && styles.nudgeFreqTextActive,
                    ]}>
                      Every {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.nudgeTestBtn}
                onPress={sendTestNudge}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                <Text style={styles.nudgeTestText}>Send Test Nudge</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bedtime Mode Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="moon-outline" size={18} color="#818cf8" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Bedtime Mode</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.emergencyDescription}>
                Block ALL apps during sleep hours. Protect your rest and start mornings fresh.
              </Text>

              <View style={styles.nudgeToggleRow}>
                <Text style={styles.permTitle}>Enable Bedtime</Text>
                <TouchableOpacity
                  style={[styles.permEnableBtn, bedtimeEnabled && styles.bedtimeActiveBtn]}
                  onPress={handleBedtimeToggle}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.permEnableBtnText, bedtimeEnabled && { color: '#818cf8' }]}>
                    {bedtimeEnabled ? '🌙 Active' : 'Enable'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bedtimeTimeRow}>
                <View style={styles.bedtimeTimeBlock}>
                  <Text style={styles.bedtimeTimeLabel}>Sleep at</Text>
                  <View style={styles.bedtimeTimePicker}>
                    <TouchableOpacity onPress={() => handleBedtimeTimeChange('start', -1)} style={styles.bedtimeArrow}>
                      <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                    <Text style={styles.bedtimeTimeValue}>
                      {bedtimeStart % 12 || 12}:00 {bedtimeStart < 12 ? 'AM' : 'PM'}
                    </Text>
                    <TouchableOpacity onPress={() => handleBedtimeTimeChange('start', 1)} style={styles.bedtimeArrow}>
                      <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.bedtimeSep}>→</Text>
                <View style={styles.bedtimeTimeBlock}>
                  <Text style={styles.bedtimeTimeLabel}>Wake at</Text>
                  <View style={styles.bedtimeTimePicker}>
                    <TouchableOpacity onPress={() => handleBedtimeTimeChange('end', -1)} style={styles.bedtimeArrow}>
                      <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                    <Text style={styles.bedtimeTimeValue}>
                      {bedtimeEnd % 12 || 12}:00 {bedtimeEnd < 12 ? 'AM' : 'PM'}
                    </Text>
                    <TouchableOpacity onPress={() => handleBedtimeTimeChange('end', 1)} style={styles.bedtimeArrow}>
                      <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* App Exceptions Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="shield-check" size={18} color="#10b981" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>App Exceptions</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={[styles.emergencyDescription, { paddingHorizontal: 14, paddingTop: 10 }]}>
                Apps that are never blocked, even during focus sessions, schedules, or daily limits.
              </Text>
              <TouchableOpacity
                style={styles.permRow}
                onPress={() => router.push('/exceptions')}
                activeOpacity={0.7}
              >
                <View style={styles.permLeft}>
                  <Ionicons name="apps-outline" size={20} color="rgba(255,255,255,0.6)" style={{ marginRight: 10 }} />
                  <Text style={styles.permTitle}>Manage Exceptions</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="information-circle-outline" size={18} color="#06b6d4" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>App</Text>
                <Text style={styles.aboutValue}>FocusLock</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Version</Text>
                <Text style={styles.aboutValue}>1.0.0</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Purpose</Text>
                <Text style={styles.aboutValue}>Stay focused on your goals</Text>
              </View>
            </View>
          </View>

          {/* Reset Section */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              Alert.alert(
                'Reset Setup',
                'This will show the permission setup screen again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', onPress: handleResetOnboarding },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
            <Text style={styles.resetButtonText}>Reset Permission Setup</Text>
          </TouchableOpacity>

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
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    top: -40,
    right: -60,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  section: {
    marginBottom: 24,
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
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dangerCard: {
    borderColor: 'rgba(239, 68, 68, 0.1)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    padding: 16,
  },

  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  permLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 10,
  },
  permDotEnabled: {
    backgroundColor: '#22c55e',
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  permBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  permBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ade80',
  },
  permEnableBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  permEnableBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a78bfa',
  },

  emergencyDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 19,
    marginBottom: 14,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  emergencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
  },

  emergencyForm: {
    marginTop: 4,
  },
  emergencyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
    marginTop: 8,
  },
  emergencyAppList: {
    gap: 6,
    marginBottom: 8,
  },
  emergencyAppItem: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emergencyAppItemSelected: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  emergencyAppName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  emergencyPhrase: {
    fontSize: 12,
    color: '#f87171',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    borderRadius: 8,
  },
  emergencyInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  emergencyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  emergencyCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emergencyCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  emergencyUnlockBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
  },
  emergencyUnlockBtnDisabled: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  emergencyUnlockText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  aboutLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },

  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },

  nudgeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  nudgeActiveBtn: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  nudgeFreqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nudgeFreqBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  nudgeFreqBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  nudgeFreqText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
  nudgeFreqTextActive: {
    color: '#f59e0b',
  },
  nudgeTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  nudgeTestText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
  },

  bedtimeActiveBtn: {
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    borderColor: 'rgba(129, 140, 248, 0.2)',
  },
  bedtimeTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  bedtimeTimeBlock: { flex: 1 },
  bedtimeTimeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 6,
    fontWeight: '500',
  },
  bedtimeTimePicker: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bedtimeArrow: { padding: 2 },
  bedtimeTimeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginVertical: 2,
  },
  bedtimeSep: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 18,
  },
});
