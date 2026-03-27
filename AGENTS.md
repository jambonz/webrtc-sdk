# jambonz WebRTC Client SDK — Agent Guide

> This document is written for AI coding agents (Claude, Copilot, Cursor, etc.) that need to generate applications using the jambonz WebRTC client SDK.
> It is the authoritative reference for building browser and React Native softphone applications.

## Quick Start

```bash
# Web (browser)
npm install @jambonz/client-sdk-web

# React Native (iOS/Android)
npm install @jambonz/client-sdk-react-native react-native-webrtc
```

### Minimal Web Example

```typescript
import { createJambonzClient } from '@jambonz/client-sdk-web';

const client = createJambonzClient({
  server: 'wss://sbc.example.com:8443',
  username: '1000',
  password: 'secret',
});

await client.connect();

// Make an outbound call
const call = client.call('+15551234567');
call.on('accepted', () => console.log('Call connected'));
call.on('ended', () => console.log('Call ended'));

// Incoming calls
client.on('incoming', (incomingCall) => {
  incomingCall.answer();
});
```

### Minimal React Native Example

```typescript
import { createJambonzClient } from '@jambonz/client-sdk-react-native';

// Same API as web — only the import changes
const client = createJambonzClient({
  server: 'wss://sbc.example.com:8443',
  username: '1000',
  password: 'secret',
});

await client.connect();
```

---

## Architecture Overview

The SDK is a monorepo with three packages:

| Package | Import | Platform |
|---------|--------|----------|
| `@jambonz/client-sdk-core` | Internal only | Platform-agnostic SIP/WebRTC logic |
| `@jambonz/client-sdk-web` | `@jambonz/client-sdk-web` | Browser applications |
| `@jambonz/client-sdk-react-native` | `@jambonz/client-sdk-react-native` | iOS & Android via React Native |

**Rule: Never import from `@jambonz/client-sdk-core` directly.** Always use the platform-specific package. It re-exports everything from core.

### How It Works

1. The SDK connects to a **jambonz SBC** (Session Border Controller) via WebSocket
2. It registers as a **SIP endpoint** using the provided credentials
3. Once registered, it can make and receive calls through the jambonz platform
4. Calls use **WebRTC** for media (audio) and **SIP** for signaling

---

## Core Concepts

### Client Lifecycle

```
Disconnected → Connecting → Connected → Registered
                                ↑            ↓
                          Reconnecting    Unregistered
                                ↑            ↓
                                └── Error ←──┘
```

- `connect()` establishes WebSocket and sends SIP REGISTER
- `autoRegister: true` (default) registers automatically on connect
- The client handles reconnection automatically on network drops
- Always call `disconnect()` when done (e.g., component unmount, page unload)

### Call Lifecycle

```
Idle → Connecting → Ringing → Connected → Ended
                                 ↓
                               Held
```

**Outbound**: `Idle → Connecting → (Ringing) → Connected → Ended`
**Inbound**: `Idle → Ringing → Connected → Ended` (after `answer()`)

### Events

Both `JambonzClient` and `JambonzCall` are event emitters. Use `.on()`, `.off()`, `.once()`.

**Critical rule**: Always remove event listeners when cleaning up to prevent memory leaks.

---

## API Reference

### createJambonzClient(options)

Factory function that creates a `JambonzClient` instance.

```typescript
createJambonzClient(options: JambonzClientOptions): JambonzClient
```

#### JambonzClientOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `server` | `string` | Yes | — | WebSocket URL of jambonz SBC (e.g., `wss://sbc.example.com:8443`) |
| `username` | `string` | Yes | — | SIP username for registration |
| `password` | `string` | Yes | — | SIP password |
| `displayName` | `string` | No | — | Display name in SIP From header |
| `realm` | `string` | No | hostname from `server` | SIP realm/domain for authentication |
| `registerHeaders` | `Record<string, string>` | No | — | Custom SIP headers sent with REGISTER |
| `autoRegister` | `boolean` | No | `true` | Automatically register on connect |
| `registerExpires` | `number` | No | `300` | Registration TTL in seconds |
| `userAgent` | `string` | No | SDK default | SIP User-Agent header value |

### JambonzClient

The main client class. Manages SIP registration and call creation.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `state` | `ClientState` | Current connection state |
| `isRegistered` | `boolean` | Whether SIP registration is active |
| `calls` | `ReadonlyMap<string, JambonzCall>` | All active calls |
| `callCount` | `number` | Number of active calls |

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `(): Promise<void>` | Connect to SBC and register |
| `disconnect` | `(): void` | Disconnect, unregister, clean up |
| `register` | `(): void` | Manual SIP registration (when `autoRegister: false`) |
| `unregister` | `(): void` | Unregister without disconnecting |
| `call` | `(target: string, options?: JambonzCallOptions): JambonzCall` | Make outbound call to phone number or SIP URI |
| `callUser` | `(username: string, options?: JambonzCallOptions): JambonzCall` | Call another registered SIP user |
| `callQueue` | `(queueName: string, options?: JambonzCallOptions): JambonzCall` | Join a call queue (dials `queue-{name}`) |
| `callConference` | `(conferenceName: string, options?: JambonzCallOptions): JambonzCall` | Join a conference (dials `conference-{name}`) |
| `callApplication` | `(applicationSid: string, options?: JambonzCallOptions): JambonzCall` | Call a jambonz application by SID (sets `X-Application-Sid` header) |
| `sendMessage` | `(target: string, body: string, contentType?: string): void` | Send SIP MESSAGE |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `registered` | `()` | SIP registration succeeded |
| `unregistered` | `()` | SIP registration removed |
| `registrationFailed` | `(error: Error)` | SIP registration failed |
| `incoming` | `(call: JambonzCall)` | Incoming call received |
| `stateChanged` | `(state: ClientState)` | Client state transition |
| `connected` | `()` | WebSocket connected |
| `disconnected` | `()` | WebSocket disconnected |
| `message` | `({ from: string; body: string; contentType: string })` | SIP MESSAGE received |
| `error` | `(error: Error)` | Error occurred |

### JambonzCall

Represents a single voice call (inbound or outbound).

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique call identifier |
| `state` | `CallState` | Current call state |
| `direction` | `CallDirection` | `'inbound'` or `'outbound'` |
| `isMuted` | `boolean` | Whether microphone is muted |
| `isHeld` | `boolean` | Whether call is on hold |
| `duration` | `number` | Call duration in seconds |
| `remoteIdentity` | `string` | Remote party SIP URI or display name |

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `answer` | `(): void` | Answer an incoming call |
| `hangup` | `(): void` | End the call |
| `hold` | `(): void` | Put call on hold (re-INVITE with sendonly) |
| `unhold` | `(): void` | Resume held call |
| `mute` | `(): void` | Mute microphone (local, no SIP signaling) |
| `unmute` | `(): void` | Unmute microphone |
| `toggleMute` | `(): void` | Toggle mute state |
| `sendDTMF` | `(tone: string): void` | Send DTMF digit (`0-9`, `A-D`, `#`, `*`) |
| `transfer` | `(target: string, options?: { headers?: Record<string, string> }): void` | Blind transfer via SIP REFER |
| `attendedTransfer` | `(otherCall: JambonzCall, options?: { headers?: Record<string, string> }): void` | Attended transfer (connect two calls) |
| `getStats` | `(): Promise<CallQualityStats \| null>` | Get one-time quality snapshot |
| `startQualityMonitoring` | `(intervalMs?: number): void` | Start periodic quality stats (default 2000ms) |
| `stopQualityMonitoring` | `(): void` | Stop quality monitoring |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `accepted` | `()` | Call was answered |
| `progress` | `()` | Call is ringing (180/183) |
| `ended` | `(cause: CallEndCause)` | Call ended normally |
| `failed` | `(cause: CallEndCause)` | Call failed to connect |
| `stateChanged` | `(state: CallState)` | Call state transition |
| `hold` | `(held: boolean)` | Hold state changed |
| `mute` | `(muted: boolean)` | Mute state changed |
| `dtmf` | `(tone: string)` | DTMF tone received |
| `transferred` | `()` | Transfer succeeded |
| `transferFailed` | `(error: Error)` | Transfer failed |
| `qualityStats` | `(stats: CallQualityStats)` | Quality metrics received |

### JambonzCallOptions

Options passed when making an outbound call.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `headers` | `Record<string, string>` | No | — | Custom SIP headers on INVITE |
| `mediaConstraints` | `MediaStreamConstraints` | No | `{ audio: true }` | getUserMedia constraints |
| `pcConfig` | `{ iceServers?: RTCIceServer[] }` | No | — | WebRTC peer connection config |
| `noAnswerTimeout` | `number` | No | — | Auto-hangup after N seconds if unanswered |
| `preferredCodecs` | `string[]` | No | — | Codec priority (e.g., `['opus', 'PCMU']`) |
| `record` | `boolean` | No | `false` | Enable server-side recording (`X-Record-Call` header) |

### CallQualityStats

| Property | Type | Description |
|----------|------|-------------|
| `roundTripTime` | `number` | RTT in milliseconds |
| `jitter` | `number` | Jitter in milliseconds |
| `packetLoss` | `number` | Loss fraction 0.0–1.0 |
| `packetsSent` | `number` | Total packets sent |
| `packetsReceived` | `number` | Total packets received |
| `packetsLost` | `number` | Total packets lost |
| `codec` | `string` | Active codec (e.g., `'opus'`, `'PCMU'`) |
| `timestamp` | `number` | Measurement timestamp |

### CallEndCause

| Property | Type | Description |
|----------|------|-------------|
| `code` | `number` | SIP response code |
| `reason` | `string` | Human-readable reason |

### Enums

#### ClientState
```
'disconnected' | 'connecting' | 'connected' | 'registered' | 'reconnecting' | 'unregistered' | 'error'
```

#### CallState
```
'idle' | 'ringing' | 'connecting' | 'connected' | 'held' | 'ended'
```

#### CallDirection
```
'inbound' | 'outbound'
```

### Error Classes

| Class | Extends | Extra Properties | When Thrown |
|-------|---------|-----------------|------------|
| `JambonzError` | `Error` | — | Base error |
| `RegistrationError` | `JambonzError` | `code?: number` | SIP registration fails |
| `CallError` | `JambonzError` | `code?: number`, `reason?: string` | Call fails |
| `ConnectionError` | `JambonzError` | — | WebSocket connection fails |

### JambonzAudioManager

Audio device management (web only — React Native uses system audio routing).

| Method | Signature | Description |
|--------|-----------|-------------|
| `enumerateDevices` | `(): Promise<AudioDevice[]>` | List all audio devices |
| `getMicrophones` | `(): Promise<AudioDevice[]>` | List input devices |
| `getSpeakers` | `(): Promise<AudioDevice[]>` | List output devices |
| `setOutputDevice` | `(deviceId: string): Promise<boolean>` | Set audio output (returns false if unsupported) |

#### AudioDevice

| Property | Type | Description |
|----------|------|-------------|
| `deviceId` | `string` | Device identifier |
| `label` | `string` | Human-readable name |
| `kind` | `'audioinput' \| 'audiooutput'` | Device type |

---

## React Hooks

Both `@jambonz/client-sdk-web` and `@jambonz/client-sdk-react-native` export React hooks.

### useJambonzClient

```typescript
import { useJambonzClient } from '@jambonz/client-sdk-web';
// or
import { useJambonzClient } from '@jambonz/client-sdk-react-native';

const { client, state, isRegistered, isConnecting, connect, disconnect, error } =
  useJambonzClient({
    server: 'wss://sbc.example.com:8443',
    username: '1000',
    password: 'secret',
  });
```

| Return Property | Type | Description |
|----------------|------|-------------|
| `client` | `JambonzClient \| null` | Client instance (null before connect) |
| `state` | `ClientState` | Current state |
| `isRegistered` | `boolean` | Registration status |
| `isConnecting` | `boolean` | True during connecting/reconnecting |
| `connect` | `() => Promise<void>` | Connect and register |
| `disconnect` | `() => void` | Disconnect |
| `error` | `string \| null` | Last error message |

### useCall

```typescript
import { useCall } from '@jambonz/client-sdk-web';

const {
  call, state, isMuted, isHeld, isActive,
  incomingCaller, makeCall, answerIncoming, declineIncoming,
  hangup, toggleMute, toggleHold, sendDtmf, transfer
} = useCall(client);
```

| Return Property | Type | Description |
|----------------|------|-------------|
| `call` | `JambonzCall \| null` | Active call or null |
| `state` | `CallState \| null` | Call state |
| `isMuted` | `boolean` | Mute status |
| `isHeld` | `boolean` | Hold status |
| `isActive` | `boolean` | True when call is active (not ended/idle) |
| `incomingCaller` | `string \| null` | Remote identity of incoming call |
| `makeCall` | `(target: string, options?: JambonzCallOptions) => void` | Start outbound call |
| `answerIncoming` | `() => void` | Answer incoming call |
| `declineIncoming` | `() => void` | Decline incoming call |
| `hangup` | `() => void` | End active call |
| `toggleMute` | `() => void` | Toggle mute |
| `toggleHold` | `() => void` | Toggle hold |
| `sendDtmf` | `(tone: string) => void` | Send DTMF |
| `transfer` | `(target: string) => void` | Blind transfer |

---

## Common Application Patterns

### Pattern 1: Basic Softphone (React + Hooks)

The most common pattern — a phone UI with connect, dial, and in-call controls.

```tsx
import React, { useState } from 'react';
import { useJambonzClient, useCall } from '@jambonz/client-sdk-web';

function Softphone() {
  const [target, setTarget] = useState('');
  const { client, state, isRegistered, connect, disconnect, error } =
    useJambonzClient({
      server: 'wss://sbc.example.com:8443',
      username: '1000',
      password: 'secret',
    });

  const {
    call, state: callState, isMuted, isHeld,
    incomingCaller, makeCall, answerIncoming, declineIncoming,
    hangup, toggleMute, toggleHold, sendDtmf,
  } = useCall(client);

  return (
    <div>
      {/* Connection */}
      {!isRegistered ? (
        <button onClick={connect}>Connect</button>
      ) : (
        <button onClick={disconnect}>Disconnect</button>
      )}

      {/* Dialer */}
      {isRegistered && !call && (
        <>
          <input value={target} onChange={(e) => setTarget(e.target.value)} />
          <button onClick={() => makeCall(target)}>Call</button>
        </>
      )}

      {/* Incoming call */}
      {incomingCaller && (
        <div>
          <p>Incoming: {incomingCaller}</p>
          <button onClick={answerIncoming}>Answer</button>
          <button onClick={declineIncoming}>Decline</button>
        </div>
      )}

      {/* Active call */}
      {call && callState === 'connected' && (
        <div>
          <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
          <button onClick={toggleHold}>{isHeld ? 'Unhold' : 'Hold'}</button>
          <button onClick={hangup}>Hang Up</button>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### Pattern 2: Click-to-Call Widget

Embed a call button in any web page. No dialer needed.

```typescript
import { createJambonzClient } from '@jambonz/client-sdk-web';

class ClickToCall {
  private client;
  private currentCall;

  constructor(server: string, username: string, password: string) {
    this.client = createJambonzClient({ server, username, password });
  }

  async init() {
    await this.client.connect();
  }

  async dial(target: string) {
    if (this.currentCall) return; // Already in a call

    this.currentCall = this.client.call(target);
    this.currentCall.on('ended', () => { this.currentCall = null; });
    this.currentCall.on('failed', () => { this.currentCall = null; });
  }

  hangup() {
    this.currentCall?.hangup();
  }

  destroy() {
    this.client.disconnect();
  }
}
```

### Pattern 3: Conference Room

```typescript
const client = createJambonzClient({ server, username, password });
await client.connect();

// Join a named conference
const call = client.callConference('team-standup');
call.on('accepted', () => console.log('Joined conference'));

// Mute/unmute in conference
call.toggleMute();

// Leave
call.hangup();
```

### Pattern 4: Call Queue Agent

```typescript
const client = createJambonzClient({ server, username, password });
await client.connect();

// Agent joins a queue to receive calls
const call = client.callQueue('support');
call.on('accepted', () => console.log('Connected to caller'));

// Transfer to another agent
call.transfer('sip:agent2@sbc.example.com');
```

### Pattern 5: Attended Transfer

```typescript
// Agent is on call with customer
const customerCall = /* existing call */;

// Agent calls supervisor
const supervisorCall = client.call('sip:supervisor@sbc.example.com');
supervisorCall.on('accepted', () => {
  // Supervisor answered — agent can now connect them
  customerCall.attendedTransfer(supervisorCall);
});
```

### Pattern 6: Call Quality Dashboard

```typescript
const call = client.call('+15551234567');
call.on('accepted', () => {
  call.startQualityMonitoring(3000); // Every 3 seconds
});

call.on('qualityStats', (stats) => {
  console.log(`RTT: ${stats.roundTripTime}ms`);
  console.log(`Jitter: ${stats.jitter}ms`);
  console.log(`Packet loss: ${(stats.packetLoss * 100).toFixed(1)}%`);
  console.log(`Codec: ${stats.codec}`);
});

call.on('ended', () => {
  call.stopQualityMonitoring();
});
```

### Pattern 7: SIP Messaging

```typescript
const client = createJambonzClient({ server, username, password });
await client.connect();

// Send a message
client.sendMessage('sip:user@domain.com', 'Hello!', 'text/plain');

// Receive messages
client.on('message', ({ from, body, contentType }) => {
  console.log(`Message from ${from}: ${body}`);
});
```

### Pattern 8: Call Recording

```typescript
// Enable server-side recording via call options
const call = client.call('+15551234567', { record: true });
// The jambonz SBC records the call based on application configuration
```

---

## Rules for AI Agents

These rules prevent common mistakes when generating jambonz WebRTC applications.

### Connection Rules

1. **Always call `disconnect()` on cleanup** — in React, use `useEffect` cleanup or window `beforeunload`.
2. **Never create multiple clients for the same user** — one client per SIP identity.
3. **Wait for `registered` event (or `isRegistered` hook state) before making calls.**
4. **The `server` URL must use `wss://` protocol** and typically port `8443`.

### Call Rules

5. **Always handle both `ended` and `failed` events** — `ended` fires for connected calls, `failed` for calls that never connected.
6. **Call `answer()` only on inbound calls** — calling it on outbound calls is a no-op.
7. **You cannot `hold()` before a call is `connected`** — check `call.state === 'connected'`.
8. **DTMF tones are single characters** — `'0'`–`'9'`, `'A'`–`'D'`, `'#'`, `'*'`. Don't pass full strings.
9. **`transfer()` ends the local call** — after blind transfer, the call is handed off.
10. **`attendedTransfer()` requires two active calls** — one with the customer, one with the transfer target.

### React Rules

11. **Pass stable options to `useJambonzClient`** — use `useMemo` or state, not inline objects, to avoid reconnection loops.
12. **`useCall` manages one call at a time** — for multi-call apps, use `client.calls` Map directly.
13. **Don't call `connect()` in render** — use an event handler or `useEffect`.

### Platform Rules

14. **Web: HTTPS required** — browsers block `getUserMedia` on non-HTTPS origins (except localhost).
15. **React Native: install `react-native-webrtc`** — it's a required peer dependency.
16. **React Native: microphone doesn't work on iOS Simulator** — use a physical device.
17. **React Native: `android/` and `ios/` folders are generated, not checked in** — see the example README for generation steps.

### Error Handling

18. **Wrap `connect()` in try/catch** — it throws `ConnectionError` or `RegistrationError`.
19. **Listen for `client.on('error')` for runtime errors** after connection.
20. **Check `call.state` before calling methods** — e.g., don't `hangup()` an already ended call.

---

## Important Behavioral Details

These details prevent common bugs that agents introduce when using the SDK.

### connect() resolves after registration

When `autoRegister: true` (the default), `connect()` resolves only after SIP registration succeeds. This means `await connect()` guarantees `isRegistered` is true when it returns:

```typescript
await client.connect();
// client.isRegistered === true here
const call = client.call('+15551234567'); // Safe — already registered
```

### connect() is idempotent

Calling `connect()` while already connected/registered is a no-op. It will not reconnect or re-register.

### useJambonzClient with dynamic credentials

When credentials come from a form (not known at mount time), use state to defer hook initialization:

```tsx
const [creds, setCreds] = useState<JambonzClientOptions | null>(null);

// Pass stable defaults when no credentials yet — the hook won't auto-connect
const options = useMemo(
  () => creds ?? { server: '', username: '', password: '' },
  [creds]
);

const { client, isRegistered, connect, disconnect } = useJambonzClient(options);

const handleConnect = async (server: string, user: string, pass: string) => {
  setCreds({ server, username: user, password: pass });
};

// connect() after credentials are set
useEffect(() => {
  if (creds) {
    connect().catch(console.error);
  }
}, [creds, connect]);
```

**Key points:**
- `useJambonzClient` does NOT auto-connect — you must call `connect()` explicitly
- The hook does NOT auto-disconnect on unmount — add your own cleanup: `useEffect(() => () => disconnect(), [disconnect])`
- The `connect` and `disconnect` functions are stable across renders (safe in dependency arrays)

### Remote audio is handled automatically

The SDK creates a hidden `<audio>` element (web) or uses native audio routing (React Native) to play remote audio. **You do not need to render an `<audio>` element or attach streams manually.**

### Microphone permission prompt

The browser's microphone permission prompt fires on the first `call()`, not on `connect()`. Handle the case where the user denies permission — it will surface as a `CallError`.

### useCall handles one call at a time

The `useCall` hook manages a single call. When an incoming call arrives while another is active, the incoming call's `incomingCaller` is only set if no call is currently active. For multi-call scenarios, use `client.calls` Map directly instead of `useCall`.

### Call quality monitoring with hooks

There is no dedicated `useCallQuality` hook. To show quality stats with hooks, attach to the call's event emitter:

```tsx
const { call } = useCall(client);
const [stats, setStats] = useState<CallQualityStats | null>(null);

useEffect(() => {
  if (!call) { setStats(null); return; }

  const onStats = (s: CallQualityStats) => setStats(s);
  call.on('qualityStats', onStats);

  if (call.state === 'connected') {
    call.startQualityMonitoring(3000);
  } else {
    call.once('accepted', () => call.startQualityMonitoring(3000));
  }

  return () => {
    call.off('qualityStats', onStats);
    call.stopQualityMonitoring();
  };
}, [call]);
```

### callState resets after a call ends

After a call ends, `useCall` resets: `call` becomes `null`, `state` becomes `null`, `isActive` becomes `false`. The dialer reappears automatically.

### Exported types

These types are available as named imports from both platform packages:

```typescript
import type {
  JambonzClientOptions,
  JambonzCallOptions,
  CallQualityStats,
  CallEndCause,
  AudioDevice,
  AudioConstraints,
  CallState,
  CallDirection,
  ClientState,
  ClientEventMap,
  CallEventMap,
  UseJambonzClientReturn,
  UseCallReturn,
} from '@jambonz/client-sdk-web';
```

---

## Web vs React Native Differences

| Feature | Web | React Native |
|---------|-----|-------------|
| Import | `@jambonz/client-sdk-web` | `@jambonz/client-sdk-react-native` |
| Audio output switching | `setOutputDevice(deviceId)` | `setOutputDevice('speaker')` or `setOutputDevice('earpiece')` |
| Device enumeration | Full device list | Limited to system devices |
| Tone generation | Web Audio API ringtone/ringback | Not available (use native audio) |
| HTTPS requirement | Yes (except localhost) | N/A |
| Peer dependency | None | `react-native-webrtc` |

---

## Glossary

| Term | Definition |
|------|-----------|
| **SBC** | Session Border Controller — the jambonz server that handles SIP signaling |
| **SIP** | Session Initiation Protocol — signaling protocol for calls |
| **WebRTC** | Web Real-Time Communication — browser API for peer-to-peer audio/video |
| **REGISTER** | SIP method to register a client endpoint with the SBC |
| **INVITE** | SIP method to initiate a call |
| **REFER** | SIP method used for call transfer |
| **DTMF** | Dual-Tone Multi-Frequency — the tones from phone keypads |
| **ICE** | Interactive Connectivity Establishment — NAT traversal for WebRTC |
| **SDP** | Session Description Protocol — describes media capabilities in WebRTC |
| **Codec** | Audio encoding format (e.g., Opus, PCMU/G.711) |
