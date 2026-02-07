// screens/InvScreen.js
import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseContext, WebSocketContext } from '../app/_layout';
import {
  getAllCategories,
  getAllItems,
  getItemsByCategory,
} from '../databases/inventoryDB';

export default function InvScreen() {
  const dbs = useContext(DatabaseContext);
  const { wsRef, isConnected, sendMessage } = useContext(WebSocketContext);

  const [categories, setCategories] = useState([]);
  const [itemsByCategory, setItemsByCategory] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryItems, setCategoryItems] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // --- Load inventory from DB ---
  const loadInventory = useCallback(async () => {
    if (!dbs || !dbs.inventoryDb) return;

    setIsLoading(true);
    try {
      const fetchedCategories = await getAllCategories(dbs.inventoryDb);
      const allItems = await getAllItems(dbs.inventoryDb);

      const grouped = {};
      for (let item of allItems) {
        const cat = item.category_name || 'Uncategorized';
        grouped[cat] = grouped[cat] || [];
        grouped[cat].push(item);
      }

      setItemsByCategory(grouped);

      const categorySummary = Object.keys(grouped).map((cat) => ({
        name: cat,
        totalStock: grouped[cat].reduce((sum, i) => sum + (Number(i.stock) || 0), 0),
      }));

      setCategories(categorySummary);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Could not load inventory.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [dbs]);

  // --- Refresh whenever DB changes ---
  useEffect(() => {
    loadInventory();
  }, [dbs]);

  // --- Real-time updates via WebSocket ---
  useEffect(() => {
    if (!wsRef.current) return;
    const ws = wsRef.current;

    const handleMessage = () => loadInventory();
    ws.addEventListener('message', handleMessage);

    return () => ws.removeEventListener('message', handleMessage);
  }, [wsRef, loadInventory]);

  const openCategoryDetails = async (categoryName) => {
    setSelectedCategory(categoryName);
    const items = itemsByCategory[categoryName] || [];
    setCategoryItems(items);
    setModalVisible(true);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) {
      Alert.alert('Error', 'Message cannot be empty.');
      return;
    }
    const success = sendMessage(inputMessage);
    if (success) {
      Alert.alert('Sent', inputMessage);
      setInputMessage('');
      setModalVisible(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B04638" />
        <Text>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory Dashboard</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.wsButton}
        >
          <Text style={{ color: '#fff' }}>
            {isConnected ? 'Connected' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      {isConnected ? (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.name}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadInventory();
              }}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openCategoryDetails(item.name)}
              style={styles.categoryCard}
            >
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text>Total Items: {item.totalStock}</Text>
              <Ionicons name="chevron-forward" size={22} color="#555" />
            </Pressable>
          )}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={{ color: '#B04638', fontSize: 16 }}>
            Connect to WebSocket to view categories.
          </Text>
        </View>
      )}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedCategory ? (
              <>
                <Text style={styles.modalTitle}>{selectedCategory} Items</Text>
                <FlatList
                  data={categoryItems}
                  keyExtractor={(item) =>
                    item.id?.toString() || item.rfid || Math.random().toString()
                  }
                  renderItem={({ item }) => (
                    <View style={styles.itemRow}>
                      <Text style={{ flex: 1 }}>{item.name}</Text>
                      <Text style={{ width: 80 }}>{item.price}</Text>
                      <Text style={{ width: 120 }}>{item.rfid || '-'}</Text>
                    </View>
                  )}
                  ListEmptyComponent={() => (
                    <Text style={{ padding: 10, textAlign: 'center' }}>
                      No items in this category.
                    </Text>
                  )}
                />
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#B04638', marginTop: 10 }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: '#fff' }}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Send Message</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Type your message"
                  value={inputMessage}
                  onChangeText={setInputMessage}
                />
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#B04638' }]}
                  onPress={handleSendMessage}
                >
                  <Text style={{ color: '#fff' }}>Send</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    backgroundColor: '#B04638',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  wsButton: { backgroundColor: '#2E7D32', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  categoryCard: {
    backgroundColor: '#f2f2f2',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: { fontSize: 18, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  itemRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 6, marginBottom: 15 },
  modalButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
});
