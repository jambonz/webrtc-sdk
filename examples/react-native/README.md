# Jambonz React Native Example

A softphone example app using `@jambonz/client-sdk-react-native` for both iOS and Android.

<p align="center">
  <img src="../../imgs/ios_01.png" alt="iOS Connect" width="220" />
  <img src="../../imgs/ios_02.png" alt="iOS Dialer" width="220" />
  <img src="../../imgs/ios_03.png" alt="iOS Active Call" width="220" />
</p>

## Prerequisites

- Node.js >= 18
- [React Native development environment](https://reactnative.dev/docs/set-up-your-environment)
- **Android**: Android Studio, Android SDK, JDK 17+, emulator or physical device
- **iOS**: Xcode 15+, CocoaPods, simulator or physical device (physical recommended for real calls)

## Setup

```bash
# From the monorepo root
cd /path/to/jambonz-webrtc-sdk

# 1. Install and build the SDK
npm install
npm run build

# 2. Install example dependencies
cd examples/react-native
npm install
```

## Generate Native Projects

The `android/` and `ios/` folders are **not checked into git** — they are generated per-machine. Run these steps after cloning or whenever you need a fresh native project.

### Step 1: Generate the native code

```bash
cd examples/react-native

npx @react-native-community/cli init JambonzExample \
  --directory /tmp/JambonzExample --skip-install

cp -r /tmp/JambonzExample/android ./android
cp -r /tmp/JambonzExample/ios ./ios
rm -rf /tmp/JambonzExample
```

### Step 2: Add required permissions

**Android** — add to `android/app/src/main/AndroidManifest.xml` inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**iOS** — add to `ios/JambonzExample/Info.plist` before `</dict>`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Required for voice calls</string>
```

### Step 3: Install iOS native dependencies

```bash
cd ios && pod install && cd ..
```

## Running on Android

### Prerequisites

```bash
# Install JDK 17 if you don't have it
brew install --cask zulu@17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

### Run on Android Emulator

1. Open **Android Studio** → Virtual Device Manager → create/start an emulator
2. Run:

```bash
# Terminal 1: Start Metro
npx react-native start

# Terminal 2: Build and launch on emulator
npx react-native run-android
```

### Run on a physical Android device

1. Enable **USB Debugging** on your phone (Settings → Developer Options)
2. Connect your phone via USB
3. Verify: `adb devices` should show your device
4. Run the same commands as above — it will target the physical device automatically

## Running on iOS

### Prerequisites

```bash
# Install CocoaPods if needed
brew install ruby  # Need Ruby 3.x for CocoaPods
gem install cocoapods
```

### Run on iOS Simulator

```bash
# Terminal 1: Start Metro
npx react-native start

# Terminal 2: Build and launch on simulator
npx react-native run-ios

# To pick a specific simulator:
npx react-native run-ios --simulator="iPhone 16 Pro"
```

> **Note:** Microphone does not work on the iOS Simulator. Use a physical device for real calls.

### Run on a physical iPhone

1. Open the Xcode workspace to configure signing:
   ```bash
   open ios/JambonzExample.xcworkspace
   ```
2. Select the **JambonzExample** target → **Signing & Capabilities**
3. Check **Automatically manage signing**, select your **Team** (Apple ID)
4. Change **Bundle Identifier** to something unique (e.g. `com.yourname.jambonzexample`)
5. Connect your iPhone via USB, tap **Trust** when prompted
6. Enable **Developer Mode** (iOS 16+): Settings → Privacy & Security → Developer Mode
7. Run:

```bash
npx react-native run-ios --device
```

### Troubleshooting

- **`pod install` fails**: Run `cd ios && pod install --repo-update && cd ..`
- **Signing fails**: Add your Apple ID in Xcode → Settings → Accounts
- **App crashes on call**: Ensure microphone permission is in Info.plist
- **"Communication with Apple failed"**: Your iPhone must be connected and visible in Xcode → Window → Devices and Simulators

## Usage

1. Enter your Jambonz SBC WebSocket URL, SIP username, and password
2. Tap **Connect** to register
3. Enter a number or SIP target and tap **Call**
4. Use the in-call controls: mute, hold, DTMF, hang up
5. Incoming calls show an answer/decline prompt

## Project Structure

```
src/
├── App.tsx              # Orchestrator — connects SDK to UI components
├── useJambonz.ts        # Hook wrapping all SDK calls (read this to learn the SDK)
├── theme.ts             # Color palette
└── components/
    ├── StatusDot.tsx     # Connection status indicator
    ├── ConnectionForm.tsx
    ├── DialerView.tsx
    ├── DtmfPad.tsx
    ├── ActiveCallView.tsx
    └── IncomingCallView.tsx
```

**To understand the SDK**, read these two files:
- **`useJambonz.ts`** — all SDK interactions (connect, call, mute, hold, transfer)
- **`App.tsx`** — how to wire SDK state to UI

## SDK Quick Reference

```tsx
import { createJambonzClient } from '@jambonz/client-sdk-react-native';

const client = createJambonzClient({ server, username, password });
await client.connect();

// Make a call
const call = client.call('+1234567890');
call.on('accepted', () => console.log('Connected'));

// Call controls
call.toggleMute();
call.hold();
call.unhold();
call.sendDTMF('1');
call.transfer('sip:other@domain');
call.hangup();

// Incoming calls
client.on('incoming', (call) => {
  call.answer();   // or call.hangup()
});

client.disconnect();
```
