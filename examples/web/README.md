# Jambonz Web Example

A softphone example app using `@jambonz/client-sdk-web` with React + Vite + Tailwind CSS.

<p align="center">
  <img src="../../imgs/web.png" alt="Web Softphone" width="500" />
</p>

## Setup

```bash
# From the monorepo root
cd /path/to/jambonz-webrtc-sdk

# 1. Install and build the SDK
npm install
npm run build

# 2. Install example dependencies
cd examples/web
npm install

# 3. Start dev server
npm run dev
```

Open http://localhost:5173 in your browser.

## Usage

1. Enter your Jambonz SBC WebSocket URL (e.g. `wss://sbc.jambonz.org:8443`)
2. Enter SIP username and password
3. Click **Connect** — status should show "registered"
4. Enter a number or SIP target and click **Call**
5. Use the in-call controls: mute, hold, DTMF pad, hang up
6. Incoming calls show an answer/decline prompt

## Project Structure

```
src/
├── App.tsx              # Orchestrator — connects SDK to UI (read this first)
├── useJambonz.ts        # Hook wrapping all SDK calls (read this to learn the SDK)
├── index.css            # Tailwind import
├── main.tsx             # React entry point
└── components/
    ├── StatusDot.tsx     # Connection status indicator (green/amber/red/gray)
    ├── ConnectionForm.tsx
    ├── DialerView.tsx
    ├── DtmfPad.tsx
    ├── ActiveCallView.tsx  # Timer, mute/hold/hangup, DTMF
    ├── IncomingCallView.tsx
    ├── LogPanel.tsx
    └── Icons.tsx
```

**To understand the SDK**, read these two files:
- **`useJambonz.ts`** — all SDK interactions (connect, call, mute, hold, transfer, incoming)
- **`App.tsx`** — how to wire SDK state to UI components

## SDK Quick Reference

```tsx
import { createJambonzClient } from '@jambonz/client-sdk-web';

const client = createJambonzClient({ server, username, password });
await client.connect();

const call = client.call('+1234567890');
call.on('accepted', () => console.log('Connected'));

call.toggleMute();
call.hold();
call.sendDTMF('1');
call.transfer('sip:other@domain');
call.hangup();

client.on('incoming', (call) => call.answer());
client.disconnect();
```

## React Hooks

```tsx
import { useJambonzClient, useCall } from '@jambonz/client-sdk-web';

function Phone() {
  const client = useJambonzClient({ server, username, password });
  const call = useCall(client.client);

  return (
    <>
      <button onClick={client.connect}>Connect</button>
      <button onClick={() => call.makeCall('+1234567890')}>Call</button>
      <button onClick={call.hangup}>Hangup</button>
    </>
  );
}
```

## Build for Production

```bash
npm run build    # Output in dist/
npm run preview  # Preview the production build
```
