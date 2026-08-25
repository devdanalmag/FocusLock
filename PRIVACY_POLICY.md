# Privacy Policy for FocusLock

**Effective Date:** August 26, 2026  
**Application Name:** FocusLock  
**Package Name:** com.focuslockapp.app  
**Developer:** Dev Dan Almag  
**Contact:** [devdanalmag@gmail.com](mailto:devdanalmag@gmail.com)  

---

FocusLock ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy outlines how our mobile application handles user data, device permissions, and digital wellbeing features.

## 1. Summary & Core Privacy Principles
FocusLock is an on-device digital wellbeing and productivity tool designed to help you regain focus and manage screen time.
* **We do NOT collect, sell, or transmit personal data to external servers or third parties.**
* All data, usage stats, focus schedules, and preferences remain strictly on your local device.

---

## 2. Sensitive Permissions & Specific Disclosures

To perform core blocking and self-control functions, FocusLock requests specific Android permissions:

### A. Accessibility Service API (`AccessibilityService`)
FocusLock uses Android's AccessibilityService API solely for:
1. **Foreground App Detection & Blocking:** Detecting when a restricted/distracting application is opened during an active focus session or after exceeding a daily limit, and displaying the blocking overlay.
2. **Strict Mode Protection:** Assisting in preventing unauthorized cancellation or bypass during strict lock periods.

**Privacy Guarantee:**
* The Accessibility Service is **NEVER** used to read personal messages, capture typed keystrokes (no keylogging), read private screen content, or collect sensitive data.
* All processing happens 100% locally in real time.

### B. Usage Stats Access (`PACKAGE_USAGE_STATS`)
* Used to calculate daily screen time and monitor app usage limits set by the user.
* All usage logs are computed and kept exclusively on your device.

### C. Device Administration (`BIND_DEVICE_ADMIN`)
* Optionally enabled by the user to prevent uninstallation or tampering during active strict lock sessions.
* Can be revoked whenever no active lock session is running.

### D. Notification Policy Access (`ACCESS_NOTIFICATION_POLICY`)
* Used solely to activate Do Not Disturb (DND) mode during focus sessions.

---

## 3. Data Collection and Third-Party Sharing
* **No Account Required:** You can use FocusLock without registering or submitting personal information.
* **No Third-Party Brokers / Ads:** We do not sell, rent, or monetize your usage data or personal information.

---

## 4. Data Retention and Deletion
All data is stored locally in your device's app sandbox. You can permanently delete all data at any time by clearing the application storage in Android Settings or uninstalling the app.

---

## 5. Contact Information
For questions or feedback regarding this Privacy Policy, please contact:
* **Developer:** Dev Dan Almag
* **Email:** devdanalmag@gmail.com
* **GitHub:** [https://github.com/devdanalmag/FocusLock](https://github.com/devdanalmag/FocusLock)
