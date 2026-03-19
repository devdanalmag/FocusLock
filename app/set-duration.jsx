import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { pauseApp } from '../utils/storage';

const QUICK_OPTIONS = [
  { days: 1, label: '1 Day', iconName: 'flash-outline', color: '#22c55e' },
  { days: 3, label: '3 Days', iconName: 'flame-outline', color: '#f59e0b' },
  { days: 7, label: '1 Week', iconName: 'fitness-outline', color: '#8b5cf6' },
  { days: 14, label: '2 Weeks', iconName: 'trophy-outline', color: '#06b6d4' },
  { days: 30, label: '1 Month', iconName: 'diamond-outline', color: '#ef4444' },
  { days: 90, label: '3 Months', iconName: 'star-outline', color: '#ec4899' },
];

export default function SetDurationScreen() {
  const params = useLocalSearchParams();
  const [selectedDays, setSelectedDays] = useState(null);
  const [customDays, setCustomDays] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSelect = (days) => {
    setSelectedDays(days);
    setIsCustom(false);
    setCustomDays('');
  };

  const handleCustom = () => {
    setIsCustom(true);
    setSelectedDays(null);
  };

  const getDays = () => {
    if (isCustom && customDays) return parseInt(customDays, 10);
    return selectedDays;
  };

  const handleConfirm = async () => {
    const days = getDays();
    if (!days || days <= 0) {
      Alert.alert('Invalid Duration', 'Please select or enter a valid number of days.');
      return;
    }

    Alert.alert(
      'Confirm Focus Lock',
      `"${params.name}" will be completely locked for ${days} day${days > 1 ? 's' : ''}.\n\nNo notifications, no access.\nCannot be unlocked early.\n\nAre you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock It!',
          style: 'destructive',
          onPress: async () => {
            setConfirming(true);
            try {
              const success = await pauseApp(
                {
                  name: params.name,
                  packageName: params.packageName,
                  icon: params.icon || null,
                },
                days
              );
              if (success) {
                router.replace('/dashboard');
              } else {
                Alert.alert('Already Paused', 'This app is already locked.');
                setConfirming(false);
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to pause app. Please try again.');
              setConfirming(false);
            }
          },
        },
      ]
    );
  };

  const days = getDays();

  return (
    <View style={styles.container}>
      <View style={styles.bg}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#f1f5f9" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Duration</Text>
        </View>

        {/* Selected App */}
        <View style={styles.selectedApp}>
          <View style={styles.selectedAppIcon}>
            {params.icon ? (
              <Image
                source={{ uri: params.icon }}
                style={styles.selectedAppImage}
              />
            ) : (
              <Text style={styles.selectedAppFallback}>
                {(params.name || '?').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.selectedAppName}>{params.name}</Text>
          <Text style={styles.selectedAppHint}>
            Choose how long to pause this app
          </Text>
        </View>

        {/* Quick Options */}
        <View style={styles.optionsGrid}>
          {QUICK_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.days}
              style={[
                styles.optionCard,
                selectedDays === option.days && styles.optionCardSelected,
                selectedDays === option.days && {
                  borderColor: option.color + '60',
                  backgroundColor: option.color + '15',
                },
              ]}
              onPress={() => handleSelect(option.days)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.iconName}
                size={26}
                color={selectedDays === option.days ? option.color : 'rgba(255,255,255,0.4)'}
                style={{ marginBottom: 6 }}
              />
              <Text
                style={[
                  styles.optionLabel,
                  selectedDays === option.days && { color: option.color },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Input */}
        <TouchableOpacity
          style={[
            styles.customContainer,
            isCustom && styles.customContainerActive,
          ]}
          onPress={handleCustom}
          activeOpacity={0.8}
        >
          <View style={styles.customLabelRow}>
            <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
            <Text style={styles.customLabel}>Custom Days</Text>
          </View>
          {isCustom && (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                value={customDays}
                onChangeText={setCustomDays}
                keyboardType="numeric"
                placeholder="Enter days..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
                maxLength={3}
              />
              <Text style={styles.customUnit}>days</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Warning */}
        {days && days > 0 && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={20} color="#f87171" style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={styles.warningText}>
              {params.name} will be completely locked for{' '}
              <Text style={styles.warningBold}>{days} day{days > 1 ? 's' : ''}</Text>.
              No notifications, no access, no early unlock.
            </Text>
          </View>
        )}

        {/* Confirm Button */}
        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!days || days <= 0) && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!days || days <= 0 || confirming}
            activeOpacity={0.8}
          >
            {confirming ? (
              <Ionicons name="hourglass-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="lock-closed" size={20} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.confirmButtonText}>
              {confirming ? 'Locking...' : 'Start Focus Lock'}
            </Text>
          </TouchableOpacity>
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
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    top: -80,
    right: -40,
  },
  bgCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(236, 72, 153, 0.04)',
    bottom: 60,
    left: -50,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
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

  selectedApp: {
    alignItems: 'center',
    marginBottom: 28,
  },
  selectedAppIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
  },
  selectedAppImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  selectedAppFallback: {
    fontSize: 30,
    fontWeight: '700',
    color: '#a78bfa',
  },
  selectedAppName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  selectedAppHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    width: '31%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionCardSelected: {
    borderWidth: 1.5,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  customContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  customContainerActive: {
    borderColor: 'rgba(6, 182, 212, 0.3)',
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
  },
  customLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  customInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  customUnit: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },

  warningCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
    lineHeight: 19,
  },
  warningBold: {
    color: '#f87171',
    fontWeight: '700',
  },

  bottomArea: {
    marginTop: 'auto',
    paddingBottom: 30,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 18,
    paddingVertical: 18,
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
  confirmButtonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    ...Platform.select({
      android: { elevation: 0 },
      ios: { shadowOpacity: 0 },
    }),
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
