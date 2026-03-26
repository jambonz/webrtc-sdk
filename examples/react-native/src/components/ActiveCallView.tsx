import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CallState } from '@jambonz/client-sdk-react-native';
import { DtmfPad } from './DtmfPad';
import { colors } from '../theme';

interface ActiveCallViewProps {
  target: string;
  callState: CallState;
  isMuted: boolean;
  isHeld: boolean;
  onToggleMute: () => void;
  onToggleHold: () => void;
  onHangup: () => void;
  onSendDtmf: (tone: string) => void;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export const ActiveCallView: React.FC<ActiveCallViewProps> = ({
  target,
  callState,
  isMuted,
  isHeld,
  onToggleMute,
  onToggleHold,
  onHangup,
  onSendDtmf,
}) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (callState !== CallState.Connected) {
      setDuration(0);
      return;
    }
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  return (
    <View style={styles.container}>
      {/* Call Info */}
      <View style={styles.info}>
        <Text style={styles.target}>{target || 'Incoming Call'}</Text>
        <Text style={styles.status}>
          {callState === CallState.Connected
            ? formatDuration(duration)
            : callState === CallState.Ringing
              ? 'Ringing...'
              : callState}
        </Text>
        {isHeld && (
          <View style={styles.holdBadge}>
            <Text style={styles.holdBadgeText}>On Hold</Text>
          </View>
        )}
      </View>

      {/* DTMF */}
      <DtmfPad onPress={onSendDtmf} />

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={onToggleMute}
        >
          <Text style={[styles.controlIcon, isMuted && styles.controlIconActive]}>
            {isMuted ? 'M' : 'Mic'}
          </Text>
          <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </Pressable>

        <Pressable style={styles.hangupBtn} onPress={onHangup}>
          <Text style={styles.hangupText}>End</Text>
        </Pressable>

        <Pressable
          style={[styles.controlBtn, isHeld && styles.controlBtnActive]}
          onPress={onToggleHold}
        >
          <Text style={[styles.controlIcon, isHeld && styles.controlIconActive]}>
            {isHeld ? '>' : '||'}
          </Text>
          <Text style={[styles.controlLabel, isHeld && styles.controlLabelActive]}>
            {isHeld ? 'Resume' : 'Hold'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  info: {
    alignItems: 'center',
    marginBottom: 24,
  },
  target: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
  },
  status: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  holdBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  holdBadgeText: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 24,
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.controlBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  controlIcon: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  controlIconActive: {
    color: colors.red,
  },
  controlLabel: {
    fontSize: 10,
    color: colors.textDim,
    marginTop: 2,
  },
  controlLabelActive: {
    color: colors.red,
  },
  hangupBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  hangupText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
