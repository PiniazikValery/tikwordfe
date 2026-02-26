import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Linking } from 'react-native';

const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/id YOUR_APP_ID',
  android: 'https://play.google.com/store/apps/details?id=com.tickword.app',
  default: 'https://play.google.com/store/apps/details?id=com.tickword.app',
});

interface ForceUpdateModalProps {
  visible: boolean;
}

export function ForceUpdateModal({ visible }: ForceUpdateModalProps) {
  const handleUpdate = () => {
    if (STORE_URL) {
      Linking.openURL(STORE_URL);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🚀</Text>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.message}>
            A new version of TikWord is available. Please update to continue using the app.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleUpdate} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Update Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#1AABF0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
