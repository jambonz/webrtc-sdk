/**
 * Jambonz React Native SDK — Example Application
 *
 * This file demonstrates how to use @jambonz/client-sdk-react-native.
 * All SDK logic lives in useJambonz.ts — open that file to see
 * how createJambonzClient, events, and call methods work.
 *
 * UI components are in ./components/ and are not SDK-specific.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { CallState, ClientState } from '@jambonz/client-sdk-react-native';
import { useJambonz } from './useJambonz';
import { StatusDot } from './components/StatusDot';
import { ConnectionForm } from './components/ConnectionForm';
import { DialerView } from './components/DialerView';
import { ActiveCallView } from './components/ActiveCallView';
import { IncomingCallView } from './components/IncomingCallView';
import { colors } from './theme';

export const App: React.FC = () => {
  // ── SDK hook — all Jambonz interactions are here ─────────
  const jambonz = useJambonz();

  // ── Local form state (not SDK-related) ───────────────────
  const [server, setServer] = useState('wss://sip.jambonz.me:8443');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [target, setTarget] = useState('');

  // ── Derived state ────────────────────────────────────────
  const isConnected = jambonz.clientState === ClientState.Registered;
  const hasActiveCall =
    jambonz.callState !== null &&
    jambonz.callState !== CallState.Ended &&
    jambonz.callState !== CallState.Idle;

  // ── Render ───────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Jambonz</Text>
          <Text style={styles.headerSub}>WebRTC Softphone</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusRow}>
              <StatusDot state={jambonz.clientState} />
              <Text style={styles.statusText}>{jambonz.clientState}</Text>
            </View>
            {isConnected && <Text style={styles.usernameText}>{username}</Text>}
          </View>

          {/* Step 1: Connect to the SBC */}
          {!isConnected && (
            <ConnectionForm
              server={server}
              username={username}
              password={password}
              clientState={jambonz.clientState}
              onServerChange={setServer}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onConnect={() => jambonz.connect(server, username, password)}
            />
          )}

          {/* Step 2a: Incoming call — answer or decline */}
          {isConnected && !hasActiveCall && jambonz.incomingCaller && (
            <IncomingCallView
              caller={jambonz.incomingCaller}
              onAnswer={jambonz.answerIncoming}
              onDecline={jambonz.declineIncoming}
            />
          )}

          {/* Step 2b: Dial a number */}
          {isConnected && !hasActiveCall && !jambonz.incomingCaller && (
            <DialerView
              target={target}
              onTargetChange={setTarget}
              onCall={() => jambonz.makeCall(target)}
              onDisconnect={jambonz.disconnect}
            />
          )}

          {/* Step 3: In-call controls */}
          {hasActiveCall && (
            <ActiveCallView
              target={target}
              callState={jambonz.callState!}
              isMuted={jambonz.isMuted}
              isHeld={jambonz.isHeld}
              onToggleMute={jambonz.toggleMute}
              onToggleHold={jambonz.toggleHold}
              onHangup={jambonz.hangup}
              onSendDtmf={jambonz.sendDtmf}
            />
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Powered by{' '}
          <Text style={styles.footerBrand}>@jambonz/client-sdk-react-native</Text>
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: colors.textDim,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  usernameText: {
    fontSize: 12,
    color: colors.textDim,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textDim,
    marginTop: 16,
  },
  footerBrand: {
    color: colors.textMuted,
  },
});
