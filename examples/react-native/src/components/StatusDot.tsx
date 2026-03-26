import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ClientState } from '@jambonz/client-sdk-react-native';
import { colors } from '../theme';

export const StatusDot: React.FC<{ state: ClientState }> = ({ state }) => {
  const color =
    state === ClientState.Registered
      ? colors.emerald
      : state === ClientState.Connecting || state === ClientState.Connected
        ? colors.amber
        : state === ClientState.Error
          ? colors.red
          : colors.textDim;

  return <View style={[styles.dot, { backgroundColor: color }]} />;
};

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
