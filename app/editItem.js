import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, Image,
  TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getItemById, updateItem, deleteItem } from '../databases/inventoryDB';
import ModalMessage from '../components/ModalMessage';
import { DatabaseContext, WebSocketContext } from './_layout';
import {
  HeaderContainer,
  HeaderTitle,
  IconButton,
  Label,
  CustomInput,
  PhotoSection,
  PhotoContainer,
  PickImageButton,
} from '../components/styles';
import { styles } from '../components/styles'; // ✅ default import for the StyleSheet

const EditItem = () => {
  const router = useRouter();
  const dbs = useContext(DatabaseContext);
  const { wsRef, isConnected } = useContext(WebSocketContext); // ✅ added WebSocketContext
  const params = useLocalSearchParams();
  const itemId = params.id;

  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [categoryId, setCategoryId] = useState(null);
  const [stock, setStock] = useState(0);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [rfid, setRfid] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalDuration, setModalDuration] = useState(2000);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const showMessage = (message, duration = 2000) => {
    setModalMessage(message);
    setModalDuration(duration);
    setModalVisible(true);
  };

  const pickImage = async () => {
    setPickingImage(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showMessage('Sorry, we need camera roll permissions to make this work!', 3000);
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showMessage('Failed to pick image. Please try again.', 3000);
    } finally {
      setPickingImage(false);
    }
  };

  useEffect(() => {
    if (itemId && dbs && dbs.inventoryDb) {
      const loadItemData = async () => {
        try {
          const item = await getItemById(dbs.inventoryDb, itemId);
          if (item) {
            setCategoryId(item.category_id);
            setStock(item.stock);
            setName(item.name);
            setPrice(item.price);
            setRfid(item.rfid || '');
            setImageUri(item.img || null);
            setInitialDataLoaded(true);
          } else {
            showMessage('Item not found.', 2000);
            router.back();
          }
        } catch (error) {
          console.error('Error loading item for edit:', error);
          showMessage('Failed to load item data.', 2000);
        }
      };
      loadItemData();
    }
  }, [itemId, router, dbs]);

  const handleSave = async () => {
    if (!name.trim() || !price.trim()) {
      showMessage('Please fill in all required fields (Name, Price).', 3000);
      return;
    }
    if (!dbs || !dbs.inventoryDb) {
      showMessage('Database is not ready. Please try again later.', 3000);
      return;
    }

    const finalRfid = rfid.trim();
    const rfidToStore = finalRfid === '' ? null : finalRfid;
    const finalImageUri = imageUri || null;
    const finalCategory = categoryId || ''; // ✅ for server message

    try {
      // 1️⃣ Update local SQLite DB
      await updateItem(
        dbs.inventoryDb,
        itemId,
        categoryId,
        name,
        stock,
        price,
        finalImageUri,
        rfidToStore
      );

      // 2️⃣ Send UPDATE_ITEM message to server (✅ new code for CSV sync)
      if (isConnected && wsRef?.current) {
        const message = `UPDATE_ITEM,${rfidToStore || 'N/A'},${name},${price},${finalCategory}`;
        wsRef.current.send(message);
      }

      showMessage('Item updated successfully!', 1500);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Failed to update item:', error);
      showMessage('Failed to update item. Please try again.', 3000);
    }
  };

  const confirmDelete = () => setShowConfirmDelete(true);

  const executeDelete = async () => {
    setShowConfirmDelete(false);
    if (!dbs || !dbs.inventoryDb) {
      showMessage('Database is not ready. Please try again later.', 3000);
      return;
    }

    try {
      await deleteItem(dbs.inventoryDb, itemId);
      showMessage('Item deleted successfully!', 1500);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Failed to delete item:', error);
      showMessage('Failed to delete item. Please try again.', 3000);
    }
  };

  const displayImageSource = imageUri
    ? (imageUri.startsWith('file://') || imageUri.startsWith('http'))
      ? { uri: imageUri }
      : require('../assets/images/blue-shirt.png')
    : require('../assets/images/blue-shirt.png');

  if (!initialDataLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B04638" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <HeaderContainer>
        <IconButton onPress={router.back}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </IconButton>
        <HeaderTitle>Edit Item</HeaderTitle>
        <IconButton onPress={handleSave}>
          <Feather name="check" size={28} color="#fff" />
        </IconButton>
      </HeaderContainer>

      <View style={styles.contentContainer}>
        <Label>Name</Label>
        <CustomInput value={name} onChangeText={setName} />

        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <PhotoSection>
            <Label>Photo</Label>
            <PhotoContainer source={displayImageSource} />
            <PickImageButton onPress={pickImage} disabled={pickingImage}>
              {pickingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.pickImageTxt}>Change Image</Text>
              )}
            </PickImageButton>
          </PhotoSection>
        </View>

        <Label>Price</Label>
        <CustomInput
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="e.g., 200.00"
        />

        <Label>RFID</Label>
        <CustomInput
          value={rfid}
          onChangeText={setRfid}
          placeholder="Enter RFID code (optional)"
        />

        <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
          <Text style={styles.deleteButtonText}>Delete Item</Text>
        </TouchableOpacity>
      </View>

      <ModalMessage
        isVisible={modalVisible}
        message={modalMessage}
        onDismiss={() => {
          setModalVisible(false);
          if (modalDuration !== 0) {
            setShowConfirmDelete(false);
          }
        }}
        duration={showConfirmDelete ? 0 : modalDuration}
      />

      {showConfirmDelete && (
        <View style={styles.confirmDeleteOverlay}>
          <View style={styles.confirmDeleteBox}>
            <Text style={styles.confirmDeleteText}>
              Are you sure you want to delete this item?
            </Text>
            <View style={styles.confirmDeleteButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirmDelete(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={executeDelete}>
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default EditItem;
