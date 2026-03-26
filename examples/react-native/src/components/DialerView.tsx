import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { DtmfPad } from './DtmfPad';
import { colors } from '../theme';

interface DialerViewProps {
  target: string;
  onTargetChange: (value: string) => void;
  onCall: () => void;
  onDisconnect: () => void;
}

export const DialerView: React.FC<DialerViewProps> = ({
  target,
  onTargetChange,
  onCall,
  onDisconnect,
}) => (
  <View style={styles.container}>
    <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.flex1]}
        placeholder="sip:user@domain or number"
        placeholderTextColor={colors.textDim}
        value={target}
        onChangeText={onTargetChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="phone-pad"
      />
      <Pressable
        style={({ pressed }) => [
          styles.callBtn,
          !target && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onCall}
        disabled={!target}
      >
        <Text style={styles.callBtnText}>Call</Text>
      </Pressable>
    </View>

    <DtmfPad onPress={(key) => onTargetChange(target + key)} />

    <Pressable style={styles.disconnectBtn} onPress={onDisconnect}>
      <Text style={styles.disconnectText}>Disconnect</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  callBtn: {
    backgroundColor: colors.emerald,
    borderRadius: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  disconnectText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
