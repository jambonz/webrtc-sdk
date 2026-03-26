import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

const DTMF_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
const DTMF_SUB: Record<string, string> = {
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ',
  '0': '+',
};

export const DtmfPad: React.FC<{ onPress: (key: string) => void }> = ({ onPress }) => (
  <View style={styles.grid}>
    {DTMF_KEYS.map((key) => (
      <Pressable
        key={key}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => onPress(key)}
      >
        <Text style={styles.text}>{key}</Text>
        {DTMF_SUB[key] && <Text style={styles.sub}>{DTMF_SUB[key]}</Text>}
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  button: {
    width: '30%',
    aspectRatio: 1.6,
    backgroundColor: colors.dtmfBg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: colors.controlBg,
  },
  text: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.text,
  },
  sub: {
    fontSize: 10,
    color: colors.textDim,
    letterSpacing: 2,
    marginTop: -2,
  },
});
