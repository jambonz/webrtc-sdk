# Jambonz WebRTC SDK

Voice calling SDK for [Jambonz](https://jambonz.org) CPaaS — supports **Web (React)** and **React Native (iOS + Android)**.

Uses SIP over WebSocket for signaling via JsSIP (hidden from consumers). Provides a simple, typed API for making and receiving voice calls.

<p align="center">
  <img src="imgs/web.png" alt="Web Softphone" width="400" />
</p>

<p align="center">
  <img src="imgs/ios_01.png" alt="iOS Connect" width="200" />
  <img src="imgs/ios_02.png" alt="iOS Dialer" width="200" />
  <img src="imgs/ios_03.png" alt="iOS Active Call" width="200" />
</p>

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| `@jambonz/client-sdk-core` | Shared logic — JambonzClient, JambonzCall, events, types | [![npm](https://img.shields.io/npm/v/@jambonz/client-sdk-core)](https://www.npmjs.com/package/@jambonz/client-sdk-core) |
| `@jambonz/client-sdk-web` | Browser adapter — WebRTC + WebSocket + HTMLAudioElement | [![npm](https://img.shields.io/npm/v/@jambonz/client-sdk-web)](https://www.npmjs.com/package/@jambonz/client-sdk-web) |
| `@jambonz/client-sdk-react-native` | React Native adapter — uses `react-native-webrtc` | [![npm](https://img.shields.io/npm/v/@jambonz/client-sdk-react-native)](https://www.npmjs.com/package/@jambonz/client-sdk-react-native) |

## Quick Start

### Web (React)

```bash
npm install @jambonz/client-sdk-web
```

```tsx
import { createJambonzClient } from '@jambonz/client-sdk-web';

// Connect to Jambonz SBC
const client = createJambonzClient({
  server: 'wss://sbc.jambonz.org:8443',
  username: 'user1',
  password: 'pass123',
});

await client.connect();
console.log('Registered!');

// Make a call (phone number or SIP URI)
const call = client.call('+1234567890');
call.on('accepted', () => console.log('Call connected'));
call.on('ended', () => console.log('Call ended'));

// Call another registered user
const call = client.callUser('alice');

// Take a call from a queue
const call = client.callQueue('support');

// Join a conference room
const call = client.callConference('standup-meeting');

// Call a Jambonz application
const call = client.callApplication('app-sid-123');

// In-call controls
call.toggleMute();
call.hold();
call.unhold();
call.sendDTMF('1');
call.transfer('sip:other@domain');
call.hangup();

// Receive incoming calls
client.on('incoming', (call) => {
  call.answer();  // or call.hangup() to decline
});

// Disconnect
client.disconnect();
```

### React Native (iOS + Android)

```bash
npm install @jambonz/client-sdk-react-native react-native-webrtc
```

```tsx
import { createJambonzClient } from '@jambonz/client-sdk-react-native';

// Same API as web — just a different import
const client = createJambonzClient({
  server: 'wss://sbc.jambonz.org:8443',
  username: 'user1',
  password: 'pass123',
});

await client.connect();
const call = client.call('+1234567890');
```

### React Hooks

Both packages export React hooks for declarative integration:

```tsx
import { useJambonzClient, useCall } from '@jambonz/client-sdk-web';
// or from '@jambonz/client-sdk-react-native'

function Phone() {
  const { state, isRegistered, connect, disconnect, error } = useJambonzClient({
    server: 'wss://sbc.jambonz.org:8443',
    username: 'user1',
    password: 'pass123',
  });

  const {
    call, state: callState, isMuted, isHeld, isActive,
    makeCall, hangup, toggleMute, toggleHold, sendDtmf,
    incomingCaller, answerIncoming, declineIncoming,
  } = useCall(client);

  return (
    <div>
      <p>Status: {state}</p>
      <button onClick={connect}>Connect</button>
      <button onClick={() => makeCall('+1234567890')}>Call</button>
    </div>
  );
}
```

## Call Types

The SDK supports four types of outbound calls, matching Jambonz SBC routing conventions:

| Method | Target | Use Case |
|--------|--------|----------|
| `client.call(number)` | Phone number or SIP URI | Call a PSTN number or SIP endpoint |
| `client.callUser(username)` | Registered SIP user | Call another user registered on the same SBC |
| `client.callQueue(queueName)` | Named queue | Take a call from a Jambonz queue |
| `client.callConference(name)` | Conference room | Join a Jambonz conference room |
| `client.callApplication(sid)` | Application SID | Route call to a specific Jambonz application |

```ts
// Call a phone number
const call = client.call('+15551234567');

// Call another registered user
const call = client.callUser('alice');

// Take a call from the "support" queue
const call = client.callQueue('support');

// Join the "standup" conference room
const call = client.callConference('standup');

// Call a Jambonz application by its SID
const call = client.callApplication('abc-123-def-456');
```

All call type methods accept the same optional `JambonzCallOptions` (custom headers, timeout, recording, codec preference).

## Features

- **SIP registration** — auto-register on connect
- **Outbound & inbound calls** — make and receive voice calls
- **4 call types** — call users, queues, conferences, and applications
- **Call control** — answer, hangup, hold/unhold, mute/unmute, DTMF
- **Call transfer** — blind (`call.transfer(target)`) and attended (`call.attendedTransfer(otherCall)`)
- **Call quality metrics** — `call.getStats()` and `call.startQualityMonitoring()`
- **Audio device management** — enumerate mics/speakers, switch output device
- **Codec preference** — `client.call(target, { preferredCodecs: ['opus'] })`
- **No-answer timeout** — `client.call(target, { noAnswerTimeout: 30 })`
- **Call recording** — `client.call(target, { record: true })`
- **Conference calling** — `client.conference(target, roomId)`
- **SIP messaging** — `client.sendMessage(target, body)`
- **Multiple simultaneous calls** — `client.calls`, `client.callCount`
- **Auto-reconnection** — reconnects on transient WebSocket drops
- **Custom SIP headers** — on REGISTER and INVITE
- **Custom User-Agent** — configurable via options
- **Ringtone/ringback** — auto-plays ringback tone on outgoing calls
- **React hooks** — `useJambonzClient()`, `useCall()`
- **TypeScript** — full strict mode, named exports only
- **Integration tests** — 68 Playwright tests against real SBC

## API Reference

### JambonzClient

```ts
const client = createJambonzClient(options);

// Options
interface JambonzClientOptions {
  server: string;           // WebSocket URL (wss://...)
  username: string;         // SIP username
  password: string;         // SIP password
  displayName?: string;     // Display name for callee
  realm?: string;           // SIP realm (defaults to server hostname)
  autoRegister?: boolean;   // Auto-register on connect (default: true)
  registerExpires?: number; // Registration expiry in seconds (default: 300)
  userAgent?: string;       // Custom User-Agent header
}

// Methods
await client.connect();
client.disconnect();
client.register();
client.unregister();
const call = client.call(target, options?);
const call = client.callUser(username, options?);
const call = client.callQueue(queueName, options?);
const call = client.callConference(conferenceName, options?);
const call = client.callApplication(applicationSid, options?);
client.sendMessage(target, body, contentType?);

// Properties
client.state;        // ClientState enum
client.isRegistered; // boolean
client.calls;        // ReadonlyMap<string, JambonzCall>
client.callCount;    // number

// Events
client.on('registered', () => {});
client.on('unregistered', () => {});
client.on('registrationFailed', (error) => {});
client.on('incoming', (call) => {});
client.on('stateChanged', (state) => {});
client.on('connected', () => {});
client.on('disconnected', () => {});
client.on('message', ({ from, body, contentType }) => {});
client.on('error', (error) => {});
```

### JambonzCall

```ts
// Methods
call.answer();
call.hangup();
call.hold();
call.unhold();
call.mute();
call.unmute();
call.toggleMute();
call.sendDTMF(tone);
call.transfer(target, options?);
call.attendedTransfer(otherCall, options?);
await call.getStats();
call.startQualityMonitoring(intervalMs?);
call.stopQualityMonitoring();

// Properties
call.id;              // string
call.state;           // CallState enum
call.direction;       // 'inbound' | 'outbound'
call.isMuted;         // boolean
call.isHeld;          // boolean
call.duration;        // seconds
call.remoteIdentity;  // string

// Events
call.on('accepted', () => {});
call.on('progress', () => {});
call.on('ended', (cause) => {});
call.on('failed', (cause) => {});
call.on('stateChanged', (state) => {});
call.on('hold', (held) => {});
call.on('mute', (muted) => {});
call.on('dtmf', (tone) => {});
call.on('transferred', () => {});
call.on('transferFailed', (error) => {});
call.on('qualityStats', (stats) => {});
```

### Call Options

```ts
client.call(target, {
  headers: { 'X-Custom': 'value' },      // Custom SIP headers
  mediaConstraints: { audio: true },       // getUserMedia constraints
  pcConfig: { iceServers: [...] },         // ICE/STUN/TURN config
  noAnswerTimeout: 30,                     // Auto-hangup after 30s
  preferredCodecs: ['opus', 'PCMU'],       // Codec priority
  record: true,                            // Server-side recording
});
```

## For AI Agents

This SDK is designed to be consumed by AI coding agents. See:

- **[AGENTS.md](AGENTS.md)** — Comprehensive guide written for AI agents with rules, patterns, and full API reference
- **[schema/](schema/)** — JSON Schema definitions for all options, events, methods, and types
- **[mcp-server/](mcp-server/)** — MCP server exposing the SDK schemas for tool-using AI agents

### MCP Server

The MCP server provides two tools for AI agents:

| Tool | Description |
|------|-------------|
| `jambonz_developer_toolkit` | Returns the full AGENTS.md guide + schema index |
| `get_jambonz_schema` | Fetches a specific schema by name (e.g., `client-options`, `component:audio-device`) |

```bash
# Run locally (stdio mode for Claude Desktop / IDE)
cd mcp-server && npm install && npm run build
node dist/index.js

# Run as HTTP server (for hosting)
node dist/index.js --http 3000
# → http://localhost:3000/mcp
```

## Examples

| Example | Location | Run |
|---------|----------|-----|
| Web (React + Vite + Tailwind) | `examples/web/` | `cd examples/web && npm install && npm run dev` |
| React Native (iOS + Android) | `examples/react-native/` | See [React Native README](examples/react-native/README.md) |

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Format code
npm run format

# Run web integration tests (requires .env.test)
cp .env.test.example .env.test  # Fill in your SBC credentials
npm run test:web
```

## Architecture

```
packages/
  core/           @jambonz/client-sdk-core       — shared logic, JsSIP wrapper
  web/            @jambonz/client-sdk-web         — browser platform adapter
  react-native/   @jambonz/client-sdk-react-native — React Native adapter
mcp-server/       @jambonz/webrtc-mcp-server     — MCP server for AI agents
schema/           JSON Schema definitions for the SDK API
examples/
  web/            React + Vite + Tailwind softphone demo
  react-native/   iOS + Android softphone demo
```

## License

MIT
