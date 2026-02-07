// AddCategory.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { DatabaseContext, WebSocketContext } from './_layout';
import { insertCategory, getCategoryStockTotals } from '../databases/inventoryDB';
import { useRouter } from 'expo-router';

export default function AddCategory() {
  const dbs = useContext(DatabaseContext);
  const { wsRef, isConnected, sendMessage } = useContext(WebSocketContext);
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);

  // Load categories from local DB
  const loadCategories = async () => {
    if (!dbs || !dbs.inventoryDb) return;
    const data = await getCategoryStockTotals(dbs.inventoryDb);
    setCategories(data);
  };

  // Handle adding a category
  const handleAddCategory = async () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a category name.');
      return;
    }

    setLoading(true);
    try {
      // Insert locally
      await insertCategory(dbs.inventoryDb, trimmedName);
      setCategoryName('');
      await loadCategories();

      // Send to server if WebSocket connected
      if (isConnected && wsRef?.current) {
        sendMessage(`ADD_CATEGORY,${trimmedName}`);
      }

      Alert.alert('Success', 'Category added!');
    } catch (err) {
      console.error('Failed to add category:', err);
      Alert.alert('Error', 'Category may already exist.');
    } finally {
      setLoading(false);
    }
  };

  // Listen for category updates from server
  useEffect(() => {
    if (!wsRef?.current) return;

    const handleMessage = (event) => {
      const msg = event.data?.toString?.().trim();
      if (!msg) return;

      if (msg.startsWith('CATEGORY_ADDED,')) {
        loadCategories();
      }
    };

    wsRef.current.addEventListener('message', handleMessage);
    return () => wsRef.current.removeEventListener('message', handleMessage);
  }, [wsRef]);

  // Initial load
  useEffect(() => {
    loadCategories();
  }, [dbs]);

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#B04638', marginBottom: 12 }}>Categories</Text>

      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <TextInput
          style={{
            flex: 1,
            borderColor: '#ccc',
            borderWidth: 1,
            borderRadius: 8,
            padding: 10,
          }}
          placeholder="Add new category..."
          value={categoryName}
          onChangeText={setCategoryName}
          editable={!loading}
        />
        <TouchableOpacity
          onPress={handleAddCategory}
          disabled={loading}
          style={{
            backgroundColor: '#B04638',
            marginLeft: 10,
            borderRadius: 8,
            paddingHorizontal: 16,
            justifyContent: 'center',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/addItem',
                params: { categoryId: item.id, categoryName: item.name },
              })
            }
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderColor: '#eee',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 18 }}>{item.name}</Text>
            <Text style={{ fontSize: 16, color: '#B04638' }}>{item.totalStock}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 20 }}>
            <Text style={{ color: '#999', fontStyle: 'italic' }}>No categories yet.</Text>
          </View>
        }
      />
    </View>
  );
}
