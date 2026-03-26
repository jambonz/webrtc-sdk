import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface IncomingCallViewProps {
  caller: string;
  onAnswer: () => void;
  onDecline: () => void;
}

export const IncomingCallView: React.FC<IncomingCallViewProps> = ({
  caller,
  onAnswer,
  onDecline,
}) => (
  <View style={styles.container}>
    <View style={styles.info}>
      <View style={styles.iconRing}>
        <Text style={styles.iconText}>Incoming</Text>
      </View>
      <Text style={styles.label}>Incoming call</Text>
      <Text style={styles.caller}>{caller}</Text>
    </View>

    <View style={styles.buttons}>
      <Pressable style={styles.declineBtn} onPress={onDecline}>
        <Text style={styles.btnText}>Decline</Text>
      </Pressable>
      <Pressable style={styles.answerBtn} onPress={onAnswer}>
        <Text style={styles.btnText}>Answer</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  info: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.indigo,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
  },
  caller: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  declineBtn: {
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
  answerBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
});
