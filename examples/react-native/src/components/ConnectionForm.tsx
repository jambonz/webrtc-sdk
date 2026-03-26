import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ClientState } from '@jambonz/client-sdk-react-native';
import { colors } from '../theme';

interface ConnectionFormProps {
  server: string;
  username: string;
  password: string;
  clientState: ClientState;
  onServerChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConnect: () => void;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  server,
  username,
  password,
  clientState,
  onServerChange,
  onUsernameChange,
  onPasswordChange,
  onConnect,
}) => {
  const isConnecting = clientState === ClientState.Connecting;
  const canConnect = !!server && !!username && !!password && !isConnecting;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Server (wss://...)"
        placeholderTextColor={colors.textDim}
        value={server}
        onChangeText={onServerChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={colors.textDim}
        value={username}
        onChangeText={onUsernameChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textDim}
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry
        autoCapitalize="none"
      />
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          !canConnect && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
        onPress={onConnect}
        disabled={!canConnect}
      >
        <Text style={styles.btnText}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
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
    marginBottom: 10,
  },
  btn: {
    backgroundColor: colors.indigo,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
