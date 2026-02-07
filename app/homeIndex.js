import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Animated, // ✅ Fixed: Added missing Animated import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';

import {
  HomeHeader,
  SearchContainer,
  TopBar,
  InventoryTitle,
  AddButton,
  ListCard,
  EmptyListContainer,
  HeaderTitle,
  LoadingText,
  styles,
} from '../components/styles';

import { DatabaseContext, WebSocketContext } from './_layout';
import {
  getAllCategories,
  getAllItems,
  getItemsByCategory,
  insertItem,
  deleteCategoryByName,
  deleteItem,
} from '../databases/inventoryDB';

const Home = () => {
  const router = useRouter();
  const dbs = useContext(DatabaseContext);
  const {
    connectWebSocket,
    disconnectWebSocket,
    sendMessage,
    isConnected,
    setModalVisible,
  } = useContext(WebSocketContext);

  const params = useLocalSearchParams();
  let userData = null;
  try {
    userData = params.user ? JSON.parse(params.user) : null; // ✅ Safe parsing
  } catch {
    userData = null;
  }

  const [categories, setCategories] = useState([]);
  const [itemsByCategory, setItemsByCategory] = useState({});
  const [allItems, setAllItems] = useState([]); // ✅ ADDED: track all items
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisibleLocal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryItems, setCategoryItems] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  const [modalVisibleIP, setModalVisibleIP] = useState(false);
  const [serverIP, setServerIP] = useState('');

  // 🔹 Animated Floating Menu
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = menuVisible ? 0 : 1;
    Animated.spring(menuAnim, {
      toValue,
      useNativeDriver: true,
      friction: 6,
    }).start();
    setMenuVisible(!menuVisible);
  };

  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const menuOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Load categories and grouped stock
  const loadCategories = useCallback(async () => {
    if (!dbs || !dbs.inventoryDb) {
      console.log('Inventory database not available.');
      setIsLoading(false);
      return;
    }

    setRefreshing(true);
    setIsLoading(true);

    try {
      const fetchedCategories = await getAllCategories(dbs.inventoryDb);
      const fetchedAllItems = await getAllItems(dbs.inventoryDb);

      // ✅ store allItems in state for uncategorized calculations and general access
      setAllItems(fetchedAllItems);

      const grouped = {};
      for (let item of fetchedAllItems) {
        const cat = item.category_name || 'Uncategorized';
        grouped[cat] = (grouped[cat] || 0) + (item.stock || 1);
      }

      // ✅ KEEP THE ID so add-in-category can use it
      setCategories(
        fetchedCategories.map((c) => ({
          id: c.id, // <-- preserved
          name: c.name || 'Uncategorized',
          totalStock: grouped[c.name] || 0,
        }))
      );

      const byCategory = {};
      for (let cat of fetchedCategories) {
        const name = cat.name || 'Uncategorized';
        byCategory[name] = fetchedAllItems.filter(
          (i) => (i.category_name || 'Uncategorized') === name
        );
      }

      setItemsByCategory({ ...byCategory });
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Could not load inventory.');
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  }, [dbs]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  // Handle Category Deletion
  const handleDeleteCategory = (categoryName) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete the category "${categoryName}"? All items under this category will be uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!dbs || !dbs.inventoryDb) {
              Alert.alert('Error', 'Database not ready.');
              return;
            }
            try {
              await deleteCategoryByName(dbs.inventoryDb, categoryName);
              Alert.alert('Success', `Category "${categoryName}" deleted.`);
              loadCategories();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category.');
            }
          },
        },
      ]
    );
  };

  // Edit item routing
  const handleEditItem = (itemId) => {
    setModalVisibleLocal(false);
    router.push({
      pathname: '/editItem',
      params: { id: itemId.toString() },
    });
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const allItemsExport = await getAllItems(dbs.inventoryDb);
      if (!allItemsExport.length) {
        Alert.alert('No Data', 'No items available to export.');
        return;
      }

      // Prepare CSV Content
      const header = 'ID,Category,Name,Price,RFID\n';
      const csvData = allItemsExport
        .map((item) =>
          `${item.id},${item.category_name || 'Uncategorized'},${item.name},${item.price},${item.rfid || ''}`
        )
        .join('\n');
      const csvContent = header + csvData;

      // Access Storage Access Framework (SAF) for Android
      const SAF = FileSystem.StorageAccessFramework;

      if (SAF) {
        const permissions = await SAF.requestDirectoryPermissionsAsync();

        if (permissions.granted && permissions.directoryUri) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `inventory_export_${timestamp}.csv`;

          const uri = await SAF.createFileAsync(
            permissions.directoryUri,
            filename,
            'text/csv'
          );

          await FileSystem.writeAsStringAsync(uri, csvContent, {
            encoding: 'utf8', // Hardcoded string avoids "UTF8 of undefined" error
          });

          Alert.alert('Export Successful', `File saved to folder:\n${filename}`);
          return;
        }
      }

      // Fallback for iOS or if SAF is denied
      const fallbackUri = `${FileSystem.documentDirectory}inventory_export.csv`;
      await FileSystem.writeAsStringAsync(fallbackUri, csvContent, {
        encoding: 'utf8',
      });

      Alert.alert('Export Successful', `File saved to app storage:\n${fallbackUri}`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV. Ensure you are using expo-file-system/legacy if on SDK 54.');
    }
  };
  
  // Import CSV
  const handleImportCSV = async () => {
    try {
      setIsLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/comma-separated-values',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'utf8',
      });

      const lines = content.split('\n').slice(1);
      
      // 1. Fresh list of categories to prevent Foreign Key crashes
      const existingCategories = await getAllCategories(dbs.inventoryDb);
      const existingCatNames = existingCategories.map(c => c.name);

      // 2. Trackers for the final summary
      let duplicateNames = [];
      let successCount = 0;

      for (let line of lines) {
        const columns = line.split(',');
        if (columns.length < 3) continue;

        // Extract columns based on your export structure (ID, Category, Name, Price, RFID)
        const [id, category, name, price, rfid] = columns;
        if (!name || name.trim() === '') continue;

        const categoryClean = category?.trim();
        
        // Determine if category is valid or needs to be "Uncategorized" (null)
        const validCategory = existingCatNames.includes(categoryClean) 
          ? categoryClean 
          : null;

        // 3. Call insertItem with the new 'isImport' flag set to true
        const insertResult = await insertItem(
          dbs.inventoryDb,
          validCategory, 
          name.trim(),
          1, // Default stock
          price?.trim() || '0',
          null, // No image during CSV import
          rfid?.trim() || '',
          true // SILENT MODE: prevents multiple alert popups
        );

        // 4. Record results
        if (insertResult?.success) {
          successCount++;
        } else if (insertResult?.reason === 'duplicate') {
          duplicateNames.push(name.trim());
        }
      }

      // 5. Refresh the UI
      await loadCategories();

      // 6. FINAL SUMMARY ALERT (The only one the user sees)
      if (duplicateNames.length > 0) {
        Alert.alert(
          'Import Complete',
          `Successfully imported ${successCount} items.\n\n` +
          `⚠️ ${duplicateNames.length} items were skipped because their RFID tags already exist in the database:\n` +
          duplicateNames.slice(0, 5).join(', ') + (duplicateNames.length > 5 ? '...' : '')
        );
      } else {
        Alert.alert('Import Successful', `All ${successCount} items processed successfully.`);
      }

    } catch (error) {
      console.error('Error importing CSV:', error);
      Alert.alert('Error', 'Failed to import CSV.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to Arduino
  const handleSendToArduino = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect first.');
      return;
    }
    if (inputMessage.trim() === '') {
      Alert.alert('Error', 'Message cannot be empty.');
      return;
    }

    const success = sendMessage(inputMessage);
    if (success) {
      Alert.alert('Success', `Message sent: ${inputMessage}`);
      setInputMessage('');
      setModalVisibleLocal(false);
    } else {
      Alert.alert('Failed', 'Could not send message.');
    }
  };

  // Open category modal
  const openCategoryDetails = async (categoryName) => {
    setSelectedCategory(categoryName);
    const items =
      (itemsByCategory[categoryName] || []) ||
      (dbs?.inventoryDb
        ? await getItemsByCategory(dbs.inventoryDb, categoryName)
        : []);
    setCategoryItems(items || []); // ✅ Safe default

    // If opening "Uncategorized", ensure we build uncategorized from allItems
    if (categoryName === 'Uncategorized') {
      const uncategorizedItems = (allItems || []).filter(
        (item) => !item.category_name || item.category_name.trim() === ''
      );
      setCategoryItems(uncategorizedItems);
    }

    setModalVisibleLocal(true);
  };

  // WebSocket connect/disconnect
  const handleConnectPress = () => {
    if (isConnected) {
      disconnectWebSocket();
      Alert.alert('Disconnected', 'WebSocket has been disconnected.');
    } else {
      setModalVisibleIP(true);
    }
  };

  // Add item in category
  const handleAddItemInCategory = () => {
    if (!selectedCategory) return;

    // 1. Find the category object in your state that matches the selected name
    const foundCategory = categories.find(c => c.name === selectedCategory);

    setModalVisibleLocal(false);

    // 2. Pass both the ID (for the Database) and the Name (for the UI)
    router.push({
      pathname: '/addItem',
      params: { 
        categoryId: foundCategory ? foundCategory.id : null, 
        categoryName: selectedCategory 
      },
    });
  };

  // Delete uncategorized items
  const handleDeleteUncategorizedItems = () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete all items without a category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!dbs || !dbs.inventoryDb) {
              Alert.alert('Error', 'Database not ready.');
              return;
            }
            try {
              const allItemsDeleted = await getAllItems(dbs.inventoryDb);
              const uncategorized = allItemsDeleted.filter((i) => !i.category_name);
              for (let item of uncategorized) {
                await deleteItem(dbs.inventoryDb, item.id);
              }
              Alert.alert('Success', 'All uncategorized items have been deleted.');
              loadCategories();
            } catch (error) {
              console.error('Error deleting uncategorized items:', error);
              Alert.alert('Error', 'Failed to delete uncategorized items.');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !refreshing && categories.length === 0) {
    return (
      <View style={styles.fullScreenCenter}>
        <ActivityIndicator size="large" color="#B04638" />
        <LoadingText>Loading categories...</LoadingText>
      </View>
    );
  }

  // Build UI category list including "Uncategorized" derived from allItems
  const buildCategoryList = () => {
    const allCategories = [...categories];

    const uncategorizedItems = (allItems || []).filter(
      (item) => !item.category_name || item.category_name.trim() === ''
    );

    if (uncategorizedItems.length > 0) {
      allCategories.push({
        name: 'Uncategorized',
        totalStock: uncategorizedItems.length,
        isUncategorized: true,
      });
    }

    return allCategories.filter((c) =>
      String(c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <HomeHeader style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <HeaderTitle>Welcome, {userData ? userData.fullName : 'User'}</HeaderTitle>
        <TouchableOpacity
          onPress={handleConnectPress}
          style={{
            backgroundColor: isConnected ? '#2E7D32' : '#B04638',
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {isConnected ? 'Connected' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </HomeHeader>

      {/* Search */}
      <SearchContainer>
        <Ionicons name="search" size={18} color="#666" />
        <TextInput
          placeholder="Search category..."
          style={{ flex: 1, marginLeft: 6 }}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </SearchContainer>

      {/* Top Bar */}
      <TopBar>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={30} color="#B04638" />
        </TouchableOpacity>

        <InventoryTitle>Inventory Categories</InventoryTitle>

        <AddButton onPress={() => router.push('/addCategory')}>
          <Ionicons name="add" size={22} color="#fff" />
        </AddButton>
      </TopBar>

      {isConnected ? (
        <FlatList
          data={buildCategoryList()}
          keyExtractor={(item) => item.name}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadCategories} />
          }
          ListEmptyComponent={() => (
            <EmptyListContainer>No categories found.</EmptyListContainer>
          )}
          renderItem={({ item }) => (
            <ListCard style={{ justifyContent: 'space-between', paddingHorizontal: 15 }}>
              <Pressable
                onPress={() => {
                  if (item.isUncategorized) {
                    setSelectedCategory('Uncategorized');
                    const uncategorizedItems = (allItems || []).filter(
                      (it) => !it.category_name || it.category_name.trim() === ''
                    );
                    setCategoryItems(uncategorizedItems);
                    setModalVisibleLocal(true);
                  } else {
                    openCategoryDetails(item.name);
                  }
                }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: '#555' }}>Total Items: {item.totalStock}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#555" />
              </Pressable>

              {!item.isUncategorized && (
                <TouchableOpacity
                  onPress={() => handleDeleteCategory(item.name)}
                  style={{ marginLeft: 15, padding: 8 }}
                >
                  <Ionicons name="trash-outline" size={24} color="#B04638" />
                </TouchableOpacity>
              )}
            </ListCard>
          )}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#B04638', fontSize: 16 }}>
            Connect to the WebSocket to view categories.
          </Text>
        </View>
      )}

      {/* FLOATING ACTION BUTTON + EXPANDED UPWARD MENU */}
      <View style={localStyles.floatingContainer}>
        <TouchableOpacity
          style={[localStyles.floatingButton, { backgroundColor: '#007AFF' }]}
          onPress={() => setMenuVisible(!menuVisible)}
        >
          <Ionicons name={menuVisible ? 'close' : 'add'} size={30} color="#fff" />
        </TouchableOpacity>

        {menuVisible && (
          <View style={localStyles.expandedMenu}>
            {/* IMPORT CSV */}
            <TouchableOpacity
              style={[localStyles.menuButton, { backgroundColor: '#28A745' }]}
              onPress={handleImportCSV}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={localStyles.menuButtonText}>Import CSV</Text>
            </TouchableOpacity>

            {/* EXPORT CSV */}
            <TouchableOpacity
              style={[localStyles.menuButton, { backgroundColor: '#17A2B8' }]}
              onPress={handleExportCSV}
            >
              <Ionicons name="cloud-download-outline" size={20} color="#fff" />
              <Text style={localStyles.menuButtonText}>Export CSV</Text>
            </TouchableOpacity>

            {/* SEND MESSAGE */}
            <TouchableOpacity
              style={[localStyles.menuButton, { backgroundColor: '#FFC107' }]}
              onPress={handleSendToArduino}
            >
              <Ionicons name="send-outline" size={20} color="#fff" />
              <Text style={localStyles.menuButtonText}>Send Message</Text>
            </TouchableOpacity>

            {/* DELETE UNCATEGORIZED ITEMS */}
            <TouchableOpacity
              style={[localStyles.menuButton, { backgroundColor: '#B04638' }]}
              onPress={handleDeleteUncategorizedItems}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={localStyles.menuButtonText}>Delete Uncategorized Items</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* CATEGORY / SEND MESSAGE MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisibleLocal(false)}>
        <View style={localStyles.modalContainer}>
          <View style={localStyles.modalContent}>
            {selectedCategory ? (
              <>
                <Text style={localStyles.modalTitle}>{selectedCategory} Items</Text>

                <View style={[localStyles.itemRow, { borderBottomWidth: 2 }]}>
                  <Text style={{ flex: 1, fontWeight: 'bold' }}>Name</Text>
                  <Text style={{ width: 70, fontWeight: 'bold' }}>Price</Text>
                  <Text style={{ width: 120, fontWeight: 'bold' }}>RFID</Text>
                </View>

                <FlatList
                  data={categoryItems || []}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => handleEditItem(item.id)}>
                      <View style={localStyles.itemRow}>
                        <Text style={{ flex: 1 }}>{item.name}</Text>
                        <Text style={{ width: 70 }}>{item.price}</Text>
                        <Text style={{ width: 120 }}>{item.rfid || '-'}</Text>

                        <Ionicons
                          name="create-outline"
                          size={18}
                          color="#007ACC"
                          style={{ marginLeft: 10 }}
                        />
                      </View>
                    </Pressable>
                  )}
                  ListEmptyComponent={() => (
                    <Text style={{ padding: 10, textAlign: 'center', color: '#555' }}>
                      No items in this category.
                    </Text>
                  )}
                />

                <TouchableOpacity
                  style={[localStyles.modalButton, { backgroundColor: '#007ACC', marginTop: 10 }]}
                  onPress={handleAddItemInCategory}
                >
                  <Text style={{ color: '#fff' }}>Add Item</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[localStyles.modalButton, { backgroundColor: '#B04638', marginTop: 8 }]}
                  onPress={() => setModalVisibleLocal(false)}
                >
                  <Text style={{ color: '#fff' }}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={localStyles.modalTitle}>Send Message</Text>

                <TextInput
                  style={localStyles.modalInput}
                  placeholder="Type your message"
                  value={inputMessage}
                  onChangeText={setInputMessage}
                />

                <View style={localStyles.modalButtonRow}>
                  <TouchableOpacity
                    style={[localStyles.modalButton, { backgroundColor: '#ccc', width: '48%' }]}
                    onPress={() => setModalVisibleLocal(false)}
                  >
                    <Text>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[localStyles.modalButton, { backgroundColor: '#B04638', width: '48%' }]}
                    onPress={handleSendToArduino}
                  >
                    <Text style={{ color: '#fff' }}>Send</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* IP Modal */}
      <Modal
        visible={modalVisibleIP}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisibleIP(false)}
      >
        <View style={localStyles.modalContainer}>
          <View style={localStyles.modalContent}>
            <Text style={localStyles.modalTitle}>Enter WebSocket IP</Text>

            <TextInput
              style={localStyles.modalInput}
              placeholder="e.g., 192.168.1.100"
              value={serverIP}
              onChangeText={setServerIP}
            />

            <View style={localStyles.modalButtonRow}>
              <TouchableOpacity
                style={[localStyles.modalButton, { backgroundColor: '#ccc', width: '48%' }]}
                onPress={() => setModalVisibleIP(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[localStyles.modalButton, { backgroundColor: '#B04638', width: '48%' }]}
                onPress={() => {
                  connectWebSocket(serverIP);
                  setModalVisibleIP(false);
                }}
              >
                <Text style={{ color: '#fff' }}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  expandedMenu: {
    marginBottom: 10, // EXPANDS UPWARD
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  circleButton: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  innerCircle: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  menuButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  modalButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
});

export default Home;
