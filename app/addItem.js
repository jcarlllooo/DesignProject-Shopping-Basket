import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
// 1. ADD useLocalSearchParams HERE
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import * as ImagePicker from 'expo-image-picker';
import ModalMessage from '../components/ModalMessage';
import { WebSocketContext } from './_layout';
import {
  HeaderContainer,
  HeaderTitle,
  IconButton,
  ContentContainer,
  Label,
  CustomInput,
  PhotoSection,
  PhotoContainer,
  PickImageButton,
} from '../components/styles';
import { insertItem, openAndInitializeDatabase } from '../databases/inventoryDB';

const AddItem = () => {
  const router = useRouter();
  
  // 2. CAPTURE the categoryId and categoryName passed from the previous screen
  const { categoryId, categoryName } = useLocalSearchParams();

  const { wsRef, isConnected, sendMessage } = useContext(WebSocketContext);

  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [rfid, setRfid] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalDuration, setModalDuration] = useState(2000);

  const showMessage = (message, duration = 2000) => {
    setModalMessage(message);
    setModalDuration(duration);
    setModalVisible(true);
  };

  const requestRfidScan = () => {
    if (!isConnected || !wsRef.current) {
      showMessage('WebSocket not connected!', 2500);
      return;
    }
    setScanning(true);
    setRfid('');
    showMessage('Waiting for RFID scan...', 5000);
    sendMessage('PING_RFID');
  };

  useEffect(() => {
    if (!wsRef.current) return;

    const handleMessage = (event) => {
      const msg = event.data?.toString?.().trim();
      if (!msg) return;

      if (scanning && msg.startsWith('RFID:')) {
        const scannedRfid = msg.replace('RFID:', '').trim();
        setRfid(scannedRfid);
        setScanning(false);
        showMessage(`RFID scanned: ${scannedRfid}`, 2000);
      }

      if (msg === 'ITEM_SAVED') {
        showMessage('Item saved to server!', 2000);
        setTimeout(() => router.back(), 1500);
      }

      if (msg === 'ITEM_NOT_SAVED') {
        showMessage('Failed to save item on server.', 3000);
      }
    };

    wsRef.current.addEventListener('message', handleMessage);
    return () => wsRef.current.removeEventListener('message', handleMessage);
  }, [wsRef, scanning]);

  const pickImage = async () => {
    setPickingImage(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showMessage('Camera roll permission denied!', 3000);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch (error) {
      console.error(error);
      showMessage('Failed to pick image.', 3000);
    } finally {
      setPickingImage(false);
    }
  };

  // ===== Save Item to local DB & server =====
  const handleSave = async () => {
    // 1. Basic Validation
    if (!itemName.trim() || !price.trim()) {
      showMessage('Please fill in both Name and Price.', 3000);
      return;
    }

    // 2. Connectivity Check (Crucial for your Arduino/Server sync)
    if (!isConnected || !wsRef.current) {
      showMessage('WebSocket not connected! Check your connection.', 2500);
      return;
    }

    const finalRfid = rfid.trim() || null;

    try {
      const db = await openAndInitializeDatabase();
      
      /** * 3. CATEGORY ID LOGIC 
       * Converts categoryId from string (params) to Number for SQLite.
       * If categoryId is undefined, it defaults to null (Uncategorized).
       */
      const numericCategoryId = categoryId ? parseInt(categoryId, 10) : null;

      // 4. INSERT INTO LOCAL DB
      // We pass numericCategoryId to link it to the correct category row.
      const result = await insertItem(
        db, 
        numericCategoryId, 
        itemName.trim(), 
        1, // Default stock
        price.trim(), 
        imageUri, 
        finalRfid,
        false // Not an import
      );

      // 5. SERVER SYNC
      // Only send to server if the local insert was successful (e.g., no duplicate RFID)
      if (result?.success) {
        // Construct message: ADD_ITEM,RFID,Name,Price,CategoryName
        const serverMsg = `ADD_ITEM,${finalRfid || 'N/A'},${itemName.trim()},${price.trim()},${categoryName || 'Uncategorized'}`;
        wsRef.current.send(serverMsg);

        showMessage(`✅ Item saved to ${categoryName || 'Uncategorized'}!`, 2000);

        // 6. RESET FORM
        setItemName('');
        setPrice('');
        setRfid('');
        setImageUri(null);
        
        // 7. RETURN TO PREVIOUS SCREEN
        setTimeout(() => router.back(), 1500);
      } else if (result?.reason === 'duplicate') {
        // Note: insertItem already shows an Alert.alert for duplicates, 
        // but we stop execution here so we don't send data to the server.
        console.log('Insert blocked: Duplicate RFID.');
      }

    } catch (error) {
      console.error('❌ handleSave failed:', error);
      showMessage('Failed to save item. Check logs.', 3000);
    }
  };

  const displayImageSource = imageUri
    ? { uri: imageUri }
    : require('../assets/images/blue-shirt.png');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <HeaderContainer>
        <IconButton onPress={router.back}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </IconButton>
        {/* 6. SHOW the category name in the header */}
        <HeaderTitle>Add to {categoryName || 'Inventory'}</HeaderTitle>
        <IconButton onPress={handleSave}>
          <Feather name="check" size={28} color="#fff" />
        </IconButton>
      </HeaderContainer>

      <ContentContainer>
        <Label>WebSocket Status: {isConnected ? '✅ Connected' : '🔴 Disconnected'}</Label>

        <Label>Name</Label>
        <CustomInput value={itemName} onChangeText={setItemName} placeholder="e.g., T-Shirt" />

        <Label>Price</Label>
        <CustomInput keyboardType="numeric" value={price} onChangeText={setPrice} placeholder="e.g., 200" />

        <Label>RFID</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <CustomInput
            value={rfid}
            onChangeText={setRfid}
            placeholder="Scan or enter RFID manually"
            style={{ flex: 1 }}
          />
          <TouchableOpacity
            onPress={requestRfidScan}
            style={{ marginLeft: 8, padding: 8, backgroundColor: '#B04638', borderRadius: 6 }}
          >
            {scanning ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff' }}>Scan RFID</Text>}
          </TouchableOpacity>
        </View>

        <PhotoSection>
          <Label>Photo</Label>
          <PhotoContainer source={displayImageSource} />
          <PickImageButton onPress={pickImage} disabled={pickingImage}>
            {pickingImage ? <ActivityIndicator size="small" color="#fff" /> : 'Pick Image'}
          </PickImageButton>
        </PhotoSection>
      </ContentContainer>

      <ModalMessage
        isVisible={modalVisible}
        message={modalMessage}
        onDismiss={() => setModalVisible(false)}
        duration={modalDuration}
      />
    </KeyboardAvoidingView>
  );
};

export default AddItem;