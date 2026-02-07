import { Stack } from 'expo-router';
import { useEffect, useState, createContext, useRef } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  Modal,
  TextInput,
  Button,
  StyleSheet,
  Platform,
} from 'react-native';

import { openAndInitializeDatabase as openInventoryDb } from '../databases/inventoryDB';
import { initDB as initAccountsDb } from '../databases/accountDB';
import { styles as globalStyles } from '../components/styles';
import { getServerURL } from '../server/getServerURL.js';

export const DatabaseContext = createContext(null);
export const WebSocketContext = createContext(null);

export default function Layout() {
  const [db, setDb] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const manuallyDisconnected = useRef(false); // NEW FLAG
  const [ipAddress, setIpAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // --- Initialize local SQLite databases ---
  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        const [inventoryDb, accountsDb] = await Promise.all([
          openInventoryDb(),
          initAccountsDb(),
        ]);
        if (mounted) setDb({ inventoryDb, accountsDb });
      } catch (err) {
        console.error('❌ DB error:', err);
        if (mounted) {
          setError('Failed to load app data. Restart the app.');
          setDb(null);
        }
      }
    };
    initialize();
    return () => (mounted = false);
  }, []);

  // --- Connect WebSocket ---
  const connectWebSocket = async (manualIp) => {
    // Prevent double-connecting if already open or connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    manuallyDisconnected.current = false; // Reset manual disconnect flag

    // Get WebSocket URL
    let wsUrl;
    try {
      wsUrl =
        manualIp?.trim().length > 0
          ? manualIp.trim().startsWith('ws://')
            ? manualIp.trim()
            : `ws://${manualIp.trim()}`
          : await getServerURL();

      if (typeof wsUrl !== 'string') throw new Error('WebSocket URL is not a string');
    } catch (e) {
      console.error('❌ Failed to get WebSocket URL:', e);
      return;
    }

    console.log('🔗 Connecting to:', wsUrl);

    // Clean up existing instance before creating a new one
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connected:', wsUrl);
      setIsConnected(true);
      setModalVisible(false);
      // Keep the protocol-inclusive IP for the state so re-connect works
      setIpAddress(wsUrl.replace('ws://', '')); 
    };

    ws.onerror = (err) => {
      console.log('❌ WebSocket Error:', err?.message || 'Check if PC is on same Wi-Fi');
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log('🔴 Disconnected', event.reason || '');
      setIsConnected(false);

      // Auto-reconnect only if not manually disconnected
      if (!manuallyDisconnected.current) {
        // We use wsUrl directly here instead of state ipAddress 
        // to ensure we use the correct discovered IP even if state hasn't updated
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            console.log('♻️ Reconnecting WebSocket...');
            connectWebSocket(wsUrl); 
          }
        }, 3000);
      }
    };
  };

  // --- NEW: Auto-Trigger Connection on App Start ---
  useEffect(() => {
    if (db && !isConnected && !manuallyDisconnected.current) {
      connectWebSocket();
    }
  }, [db]);

  const disconnectWebSocket = () => {
    manuallyDisconnected.current = true; // Prevent auto-reconnect
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      console.log('🔌 Manually disconnected.');
    }
  };

  const sendMessage = (msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
      console.log('📤 Sent:', msg);
      return true;
    }
    console.log('⚠️ Cannot send, not connected.');
    return false;
  };

  if (error) {
    return (
      <View style={globalStyles.container}>
        <Text style={globalStyles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={globalStyles.container}>
        <ActivityIndicator size="large" color="#B04638" />
        <Text style={globalStyles.loadingText}>Loading application data…</Text>
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={db}>
      <WebSocketContext.Provider
        value={{
          wsRef,
          isConnected,
          ipAddress,
          setIpAddress,
          connectWebSocket,
          disconnectWebSocket,
          sendMessage,
          modalVisible,
          setModalVisible,
        }}
      >
        {/* IP Address Input Modal */}
        <Modal
          transparent
          visible={modalVisible}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={localStyles.overlay}>
            <View style={localStyles.modalBox}>
              <Text style={localStyles.title}>Connect to WebSocket</Text>

              <TextInput
                style={localStyles.input}
                placeholder="Enter IP Address (192.168.x.x:4000)"
                value={ipAddress}
                onChangeText={setIpAddress}
              />

              <View style={localStyles.buttons}>
                <Button title="Cancel" onPress={() => setModalVisible(false)} />
                <Button
                  color="#4CAF50"
                  title="Connect"
                  onPress={() => connectWebSocket(ipAddress)}
                />
              </View>
            </View>
          </View>
        </Modal>

        <Stack screenOptions={{ headerShown: false }} />
      </WebSocketContext.Provider>
    </DatabaseContext.Provider>
  );
}

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});