// app/testing.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { WebSocketContext } from './_layout';
import ModalMessage from '../components/ModalMessage';

const Testing = () => {
  const router = useRouter();
  const { wsConnected, sendMessage, messages } = useContext(WebSocketContext);

  const [message, setMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const showMessage = (msg, duration = 2000) => {
    setModalMessage(msg);
    setModalVisible(true);
    setTimeout(() => setModalVisible(false), duration);
  };

  const sendToArduino = () => {
    if (!wsConnected) {
      showMessage('WebSocket not connected', 3000);
      return;
    }

    if (message.trim() === '') {
      showMessage('Please enter a message', 2000);
      return;
    }

    // Send message to Arduino
    try {
      sendMessage(JSON.stringify({ command: 'displayLCD', message }));
      showMessage('Message sent to Arduino!', 1500);
      setMessage('');
    } catch (error) {
      console.error(error);
      showMessage('Failed to send message', 3000);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Message to LCD 20x4:</Text>
      <TextInput
        style={styles.input}
        placeholder="Type message here"
        value={message}
        onChangeText={setMessage}
      />

      <TouchableOpacity style={styles.button} onPress={sendToArduino}>
        <Text style={styles.buttonText}>Send to Arduino</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#ccc', marginTop: 10 }]}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>

      <Text style={{ marginTop: 20, fontSize: 16, fontWeight: 'bold' }}>
        Incoming Messages:
      </Text>
      <View style={styles.messagesBox}>
        {messages.map((msg, index) => (
          <Text key={index} style={styles.messageText}>
            {msg}
          </Text>
        ))}
      </View>

      <ModalMessage
        isVisible={modalVisible}
        message={modalMessage}
        onDismiss={() => setModalVisible(false)}
      />
    </View>
  );
};

// Export with Stack integration
export default function TestingWrapper() {
  return (
    <Stack.Screen options={{ headerShown: false }}>
      {() => <Testing />}
    </Stack.Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16 },
  messagesBox: {
    marginTop: 10,
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 8,
    maxHeight: 200,
  },
  messageText: {
    fontSize: 14,
    marginBottom: 4,
  },
});
