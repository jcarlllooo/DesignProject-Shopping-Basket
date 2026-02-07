import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

// --- CONFIGURATION ---
const CSV_FILE_PATH = `${FileSystem.documentDirectory}inventory.csv`;
const RECONNECT_INTERVAL = 5000; // ms

let dbInstance = null;
let ws = null;
let messageQueue = [];
let currentServerIP = null; // store user-set IP

// ------------------- WEBSOCKET -------------------
export const connectToServer = (ip) => {
  if (!ip) {
    console.warn('⚠️ No IP provided for WebSocket connection');
    return;
  }

  const SERVER_URL = `ws://${ip}:4000`;
  currentServerIP = ip;

  if (ws && ws.readyState === WebSocket.OPEN) return ws;

  ws = new WebSocket(SERVER_URL);

  ws.onopen = () => {
    console.log(`🔗 Connected to server at ${SERVER_URL}`);
    while (messageQueue.length) ws.send(messageQueue.shift());
  };

  ws.onclose = () => {
    console.log('❌ Disconnected from server, retrying in 5s...');
    setTimeout(() => {
      if (currentServerIP) connectToServer(currentServerIP);
    }, RECONNECT_INTERVAL);
  };

  ws.onerror = (e) => console.error('⚠️ WebSocket error:', e.message);

  ws.onmessage = async (event) => {
    const msg = event.data;
    console.log('📨 From server:', msg);

    if (msg.startsWith('ITEM_ADDED,')) {
      const [, rfid, name, price, qty] = msg.split(',');
      await syncItemFromServer({ rfid, name, price, stock: qty });
    } else if (msg.startsWith('UPDATE_ITEM,')) {
      const [, rfid, name, price, qty] = msg.split(',');
      await syncItemFromServer({ rfid, name, price, stock: qty });
    } else if (msg.startsWith('DELETE_ITEM,')) {
      const [, rfid] = msg.split(',');
      await deleteItemByRfid(rfid);
    } else if (msg.startsWith('RFID:')) {
      console.log('📡 RFID scanned on server:', msg.replace('RFID:', ''));
    }
  };

  return ws;
};

export const disconnectFromServer = () => {
  if (ws) {
    ws.close();
    ws = null;
    currentServerIP = null;
    console.log('🔌 WebSocket manually disconnected');
  }
};

const sendMessageToServer = (message) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    console.log('📤 Sent message:', message);
  } else {
    console.log('⚠️ WebSocket not connected, queuing message:', message);
    messageQueue.push(message);
  }
};

// ------------------- LOCAL DB SYNC -------------------
const syncItemFromServer = async ({ rfid, name, price, stock }) => {
  try {
    const db = await openAndInitializeDatabase();
    const existing = await db.getFirstAsync('SELECT * FROM items WHERE rfid = ?;', [rfid]);

    if (existing) {
      await db.runAsync(
        'UPDATE items SET name = ?, price = ?, stock = ? WHERE rfid = ?;',
        [name, price, stock, rfid]
      );
      console.log(`♻️ Synced updated item: ${name}`);
    } else {
      await db.runAsync(
        'INSERT INTO items (name, price, stock, rfid) VALUES (?, ?, ?, ?);',
        [name, price, stock, rfid]
      );
      console.log(`⬇️ Synced new item: ${name}`);
    }

    await exportInventoryToCSV(db);
  } catch (err) {
    console.error('❌ syncItemFromServer failed:', err);
  }
};

const deleteItemByRfid = async (rfid) => {
  try {
    const db = await openAndInitializeDatabase();
    await db.runAsync('DELETE FROM items WHERE rfid = ?;', [rfid]);
    console.log(`🗑️ Synced deletion of RFID: ${rfid}`);
    await exportInventoryToCSV(db);
  } catch (err) {
    console.error('❌ deleteItemByRfid failed:', err);
  }
};

// ------------------- DATABASE -------------------
export const openAndInitializeDatabase = async () => {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await SQLite.openDatabaseAsync('inventory.db');
    console.log('✅ Inventory Database opened successfully.');

    await dbInstance.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name TEXT NOT NULL,
        stock INTEGER NOT NULL,
        price TEXT NOT NULL,
        img TEXT,
        rfid TEXT UNIQUE,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );
    `);

    console.log('✅ Tables ready.');
    return dbInstance;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    Alert.alert('Database Error', error.message);
    throw error;
  }
};

const ensureDb = async (db) => (db ? db : await openAndInitializeDatabase());

// ------------------- CATEGORY -------------------
export const insertCategory = async (db, name) => {
  db = await ensureDb(db);
  try {
    await db.runAsync('INSERT INTO categories (name) VALUES (?);', [name.trim()]);
    console.log(`✅ Category "${name}" added.`);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      Alert.alert('Duplicate', 'This category already exists.');
    } else {
      console.error('❌ insertCategory failed:', error);
    }
  }
};

export const getAllCategories = async (db) => {
  db = await ensureDb(db);
  return await db.getAllAsync('SELECT * FROM categories ORDER BY name ASC;');
};

export const deleteCategoryByName = async (db, name) => {
  db = await ensureDb(db);
  const cat = await db.getFirstAsync('SELECT id FROM categories WHERE name = ?;', [name.trim()]);
  if (!cat) return;

  await db.runAsync('UPDATE items SET category_id = NULL WHERE category_id = ?;', [cat.id]);
  await db.runAsync('DELETE FROM categories WHERE id = ?;', [cat.id]);
  console.log(`🗑️ Category "${name}" deleted.`);
  await exportInventoryToCSV(db);
};

// ------------------- CATEGORY STOCK TOTALS -------------------
export const getCategoryStockTotals = async (db) => {
  db = await ensureDb(db);
  return await db.getAllAsync(`
    SELECT 
      c.id, 
      c.name, 
      IFNULL(SUM(i.stock), 0) AS totalStock
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY c.name ASC;
  `);
};

// ------------------- ITEM -------------------
// ------------------- ITEM -------------------
export const insertItem = async (db, categoryId, name, stock, price, img, rfid, isImport = false) => {
  db = await ensureDb(db);
  const cleanRfid = rfid?.trim() || null;

  try {
    if (cleanRfid) {
      const existing = await db.getFirstAsync(
        "SELECT id FROM items WHERE rfid = ?;",
        [cleanRfid]
      );

      if (existing) {
        // Only show the alert if this is NOT a bulk import
        if (!isImport) {
          Alert.alert(
            "Duplicate RFID",
            "This RFID tag is already assigned to another item."
          );
        }
        
        console.log(`⏩ Skipping duplicate RFID: ${cleanRfid}`);
        // Return information so the import loop can track it for a summary alert
        return { success: false, reason: 'duplicate', name: name };
      }
    }

    await db.runAsync(
      'INSERT INTO items (category_id, name, stock, price, img, rfid) VALUES (?, ?, ?, ?, ?, ?);',
      [categoryId, name, stock, price, img, cleanRfid]
    );
    
    console.log('✅ Item inserted.');
    await exportInventoryToCSV(db);

    if (cleanRfid) {
      sendMessageToServer(`ADD_ITEM,${cleanRfid},${name},${price},${stock}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ insertItem failed:', error);
    
    // Don't show individual error alerts during a bulk import to avoid UI spam
    if (!isImport) {
      Alert.alert('Insert Error', error.message);
    }
    
    return { success: false, reason: 'error', message: error.message };
  }
};

export const updateItem = async (db, id, categoryId, name, stock, price, img, rfid) => {
  db = await ensureDb(db);
  const cleanRfid = rfid?.trim() || null;

  try {
    await db.runAsync(
      'UPDATE items SET category_id = ?, name = ?, stock = ?, price = ?, img = ?, rfid = ? WHERE id = ?;',
      [categoryId, name, stock, price, img, cleanRfid, id]
    );
    console.log('♻️ Item updated.');
    await exportInventoryToCSV(db);

    if (cleanRfid) sendMessageToServer(`UPDATE_ITEM,${cleanRfid},${name},${price},${stock}`);
  } catch (error) {
    console.error('❌ updateItem failed:', error);
  }
};

export const deleteItem = async (db, id) => {
  db = await ensureDb(db);
  try {
    const item = await db.getFirstAsync('SELECT rfid FROM items WHERE id = ?;', [id]);
    await db.runAsync('DELETE FROM items WHERE id = ?;', [id]);
    console.log('🗑️ Item deleted.');
    await exportInventoryToCSV(db);

    if (item?.rfid) sendMessageToServer(`DELETE_ITEM,${item.rfid}`);
  } catch (error) {
    console.error('❌ deleteItem failed:', error);
  }
};

export const getAllItems = async (db) => {
  db = await ensureDb(db);
  return await db.getAllAsync(`
    SELECT i.*, c.name AS category_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY i.id DESC;
  `);
};

// ------------------- NEW: GET ITEM BY ID -------------------
export const getItemById = async (db, id) => {
  db = await ensureDb(db);
  return await db.getFirstAsync('SELECT * FROM items WHERE id = ?;', [id]);
};

// ------------------- DELETE UNCATEGORIZED ITEMS -------------------
export const deleteUncategorizedItems = async (db) => {
  db = await ensureDb(db);
  try {
    await db.runAsync(`
      DELETE FROM items
      WHERE category_id IS NULL
         OR category_id NOT IN (SELECT id FROM categories)
    `);
    console.log('🗑️ All uncategorized items deleted.');
    await exportInventoryToCSV(db);
  } catch (error) {
    console.error('❌ Failed to delete uncategorized items:', error);
    throw error;
  }
};

// ------------------- CSV -------------------
export const exportInventoryToCSV = async (db) => {
  db = await ensureDb(db);
  const items = await getAllItems(db);

  const header = 'ID,Category,Name,Stock,Price,Image,RFID\n';
  const rows = items.map((i) => {
    const id = i.id || '';
    const cat = `"${i.category_name || ''}"`;
    const name = `"${i.name || ''}"`;
    const stock = i.stock || 0;
    const price = `"${i.price || ''}"`;
    const img = `"${i.img || ''}"`;
    const rfid = `"${i.rfid || ''}"`;
    return `${id},${cat},${name},${stock},${price},${img},${rfid}`;
  });

  const csvString = header + rows.join('\n');
  try {
    await FileSystem.writeAsStringAsync(CSV_FILE_PATH, csvString);
    console.log(`💾 CSV updated: ${CSV_FILE_PATH}`);
  } catch (error) {
    console.error('❌ CSV save failed:', error);
  }

  return csvString;
};

export const getLocalCSV = async () => {
  try {
    const exists = await FileSystem.getInfoAsync(CSV_FILE_PATH);
    if (!exists.exists) {
      console.warn('⚠️ CSV not found. Generating...');
      const db = await openAndInitializeDatabase();
      await exportInventoryToCSV(db);
    }
    return await FileSystem.readAsStringAsync(CSV_FILE_PATH);
  } catch (error) {
    console.error('❌ CSV read failed:', error);
    return '';
  }
};

// ------------------- CSV IMPORT -------------------
export const importCSVToDB = async (csvUri) => {
  try {
    const db = await openAndInitializeDatabase();
    const csvString = await FileSystem.readAsStringAsync(csvUri);

    const lines = csvString.split('\n').slice(1); // skip header
    for (const line of lines) {
      if (!line.trim()) continue;
      const [id, category, name, stock, price, img, rfid] = line.split(',');

      // Optional: get categoryId from category name
      const categoryRow = await db.getFirstAsync(
        'SELECT id FROM categories WHERE name = ?;',
        [category.replace(/"/g, '')]
      );
      const categoryId = categoryRow?.id || null;

      await insertItem(
        db,
        categoryId,
        name.replace(/"/g, ''),
        Number(stock),
        price.replace(/"/g, ''),
        img.replace(/"/g, ''),
        rfid.replace(/"/g, '')
      );
    }
    console.log('✅ CSV imported into database!');
  } catch (error) {
    console.error('❌ CSV import failed:', error);
    Alert.alert('CSV Import Error', error.message);
  }
};
