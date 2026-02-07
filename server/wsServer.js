// wsServer.js
import * as ws from 'ws';
import fs from 'fs';
import path from 'path';

// ================= CONFIG =================
const HOST = '192.168.137.1';   // your hotspot IP
const PORT = 4000;
const DB_FILE = path.resolve('database.csv');

// ================= CSV INIT =================
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, 'RFID,Name,Price,Category\n', 'utf8');
  console.log('📁 Created database.csv');
}

// ================= WS SERVER =================
const WebSocketServer = ws.WebSocketServer || ws.Server;
const WebSocket = ws.WebSocket;

const wss = new WebSocketServer({ host: HOST, port: PORT });
console.log(`✅ WebSocket running at ws://${HOST}:${PORT}`);

// ================= SERVER STATE =================
let pendingRFIDClient = null;
let pendingRFIDTimeout = null;

// ================= HELPERS =================
function normalize(str) {
  return str.replace(/\r/g, '').replace(/\n/g, '').trim().toUpperCase();
}

// Split message args accepting both comma and colon
function parseArgs(msg) {
  if (msg.includes(',')) return msg.split(',').map(a => a.trim());
  if (msg.includes(':')) return msg.split(':').map(a => a.trim());
  return [msg.trim()];
}

// ================= CSV FUNCTIONS =================
function readCSV() {
  const raw = fs.readFileSync(DB_FILE, 'utf8').trim();
  const lines = raw.split('\n');
  const header = lines[0];
  const data = lines.slice(1).map(line => line.split(','));
  return { header, data };
}

function writeCSV(header, data) {
  const csv = [header, ...data.map(d => d.join(','))].join('\n');
  fs.writeFileSync(DB_FILE, csv, 'utf8');
}

// ================= ITEM FUNCTIONS =================
// 🔹 Lookup item in CSV and send simple CSV string
function lookupItemCSV(rfid, socket) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8').trim();
    const lines = raw.split('\n').slice(1); // skip header

    let found = false;
    const rfidNormalized = normalize(rfid);

    for (const line of lines) {
      const [dbRfid, name, price, category] = line.split(',');
      if (!dbRfid) continue;

      if (normalize(dbRfid) === rfidNormalized) {
        // Send as simple CSV string
        socket.send(`ITEM:${dbRfid},${name},${price},${category}`);
        console.log(`📦 Found: ${dbRfid},${name},${price},${category}`);
        found = true;
        break;
      }
    }

    if (!found) {
      socket.send('ITEM_NOT_FOUND');
      console.log(`❌ Not found: ${rfid}`);
    }

  } catch (err) {
    console.error('Error reading CSV:', err);
    socket.send('ITEM_NOT_FOUND');
  }
}


function handleAddItem(args, wsClient) {
  const [rfid, name, price = '0', category = ''] = args.map(a => a?.trim());
  if (!rfid || !name) {
    wsClient.send('ERROR,Missing parameters');
    return;
  }

  const { header, data } = readCSV();
  let found = false;

  const updatedData = data.map(row => {
    if (normalize(row[0]) === normalize(rfid)) {
      found = true;
      return [rfid, name, price, category]; // update existing
    }
    return row;
  });

  if (!found) updatedData.push([rfid, name, price, category]); // add new

  writeCSV(header, updatedData);

  console.log(`✅ Item ${found ? 'updated' : 'added'}: ${rfid}`);
  wsClient.send(`ITEM_SAVED:${rfid}`);
  broadcast(`ITEM_UPDATED,${rfid},${name},${price},${category}`, wsClient);
}

function handleDeleteItem(args, wsClient) {
  const [rfid] = args.map(a => a?.trim());
  if (!rfid) {
    wsClient.send('ERROR,Missing RFID');
    return;
  }

  const { header, data } = readCSV();
  const updatedData = data.filter(row => normalize(row[0]) !== normalize(rfid));

  writeCSV(header, updatedData);

  console.log(`🗑️ Item deleted: ${rfid}`);
  wsClient.send(`ITEM_REMOVED:${rfid}`);
  broadcast(`ITEM_REMOVED,${rfid}`, wsClient);
}

function handleGetItem(args, wsClient) {
  const rfid = args[0]?.trim();
  if (!rfid) {
    wsClient.send('ERROR,Missing RFID');
    return;
  }
  lookupItemCSV(rfid, wsClient);
}

function handleListItems(wsClient) {
  const { data } = readCSV();
  wsClient.send(`ITEM_LIST,${JSON.stringify(data)}`);
}

// ================= BROADCAST =================
function broadcast(message, excludeSocket = null) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== excludeSocket) {
      client.send(message);
    }
  });
}

// ================= CONNECTION HANDLER =================
wss.on('connection', (client) => {
  console.log('🔗 Client connected');

  client.on('message', (data) => {
    const msg = data.toString().trim();
    console.log('📩 Received:', msg);

    
    // Split command from args (first separator can be comma or colon)
    let [commandRaw, ...rest] = msg.includes(',') ? msg.split(',') : msg.split(':');
    const command = commandRaw?.trim().toUpperCase();
    const args = parseArgs(rest.join(','));

    switch (command) {

      // ===== APP REQUESTS RFID SCAN =====
      case 'PING_RFID': {
        if (pendingRFIDClient) {
          client.send('RFID_BUSY');
          return;
        }

        console.log('📡 Server requesting RFID scan from Arduino');

        pendingRFIDClient = client;

        // Ask Arduino to scan
        broadcast('PING_RFID', client);

        // Timeout safety
        pendingRFIDTimeout = setTimeout(() => {
          if (pendingRFIDClient) {
            pendingRFIDClient.send('RFID_TIMEOUT');
            pendingRFIDClient = null;
            console.log('⏰ RFID scan timeout');
          }
        }, 10000);
      }
        break;
      }

    // ===== DEFAULT FLOW LIKE ORIGINAL CODE =====
    defaultFlow: {
      // ===== ARDUINO SENDS RFID =====
      if (msg.startsWith('RFID:')) {
        const rfid = msg.replace('RFID:', '').trim();

        if (!pendingRFIDClient) {
          console.log('⚠️ Ignored unsolicited RFID:', rfid);
          break defaultFlow;
        }

        console.log('📡 RFID received:', rfid);
        pendingRFIDClient.send(`RFID:${rfid}`);
        clearTimeout(pendingRFIDTimeout);
        pendingRFIDClient = null;
        break defaultFlow;
      }
      if (command=== 'PING_RFID'){
        break defaultFlow;
      }
      // ===== LOOKUP ITEM =====
      if (command === 'LOOKUP') {
        const rfid = args[0]?.trim();
        if (rfid) lookupItemCSV(rfid, client);
        else client.send('ITEM_NOT_FOUND');
        break defaultFlow;
      }

      // ===== ADD ITEM =====
      if (command === 'ADD_ITEM') {
        handleAddItem(args, client);
        break defaultFlow;
      }

      // ===== UPDATE ITEM =====
      if (command === 'UPDATE_ITEM') {
        handleAddItem(args, client); // same as add
        break defaultFlow;
      }

      // ===== DELETE ITEM =====
      if (command === 'DELETE_ITEM') {
        handleDeleteItem(args, client);
        break defaultFlow;
      }

      // ===== LIST ITEMS =====
      if (command === 'LIST_ITEMS') {
        handleListItems(client);
        break defaultFlow;
      }

      console.log('⚠️ Unknown command:', msg);
    }
  });

  client.on('close', () => {
    console.log('❌ Client disconnected');

    if (client === pendingRFIDClient) {
      clearTimeout(pendingRFIDTimeout);
      pendingRFIDClient = null;
      console.log('⚠️ Pending RFID request cancelled');
    }
  });
});
