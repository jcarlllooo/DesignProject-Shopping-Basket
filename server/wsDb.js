// wsDb.js
import * as ws from 'ws';
import os from 'os';
import fs from 'fs';
import path from 'path';

/**
 * Path to the server CSV file
 */
const SERVER_CSV_PATH = path.resolve('../server/database.csv');

export function initWebSocketServer(db, port = 4000) {
  const WebSocketServer = ws.WebSocketServer || ws.Server;
  const WebSocket = ws.WebSocket;

  const wss = new WebSocketServer({ port });

  const networkInterfaces = os.networkInterfaces();
  const localIPs = Object.values(networkInterfaces)
    .flat()
    .filter(iface => iface && iface.family === 'IPv4' && !iface.internal)
    .map(iface => iface.address);

  console.log(`✅ WebSocket server running on all interfaces (port ${port})`);
  console.log('🌐 Available local IPs:');
  localIPs.forEach(ip => console.log(`   ws://${ip}:${port}`));

  wss.on('connection', (client) => {
    console.log('🔗 Database client connected');

    client.on('message', async (message) => {
      const msg = message.toString().trim();
      const [command, ...args] = msg.split(',').map(a => a?.trim());

      switch (command) {
        case 'PING_RFID':
          broadcast(wss, 'PING_RFID', client);
          break;

        case 'ADD_ITEM':
          await handleAddItem(db, args, client, wss);
          break;

        case 'UPDATE_ITEM':
          await handleUpdateItem(db, args, client, wss);
          break;

        case 'DELETE_ITEM':
          await handleDeleteItem(db, args, client, wss);
          break;

        case 'GET_ITEM':
          await handleGetItem(db, args, client);
          break;

        case 'LIST_ITEMS':
          await handleListItems(db, client);
          break;

        default:
          if (msg.startsWith('RFID:')) {
            const rfid = msg.replace('RFID:', '').trim();
            const item = await findItemByRfid(db, rfid);
            if (item)
              broadcast(
                wss,
                `ITEM_FOUND,${item.rfid},${item.name},${item.price},${item.category}`,
                client
              );
            else broadcast(wss, `ITEM_NOT_FOUND,${rfid}`, client);
          } else {
            console.log('⚠️ Unknown command:', msg);
          }
      }
    });

    client.on('close', () => console.log('❌ Client disconnected'));
  });

  return wss;
}

// ------------------- CSV helper -------------------
async function exportInventoryToCSV(db) {
  try {
    const rows = await db.all('SELECT * FROM items');
    const header = 'RFID,Name,Price,Category\n';
    const csv = rows.map(r => `${r.rfid},${r.name},${r.price},${r.category || ''}`).join('\n');
    fs.writeFileSync(SERVER_CSV_PATH, header + csv, 'utf8');
    console.log('💾 Server CSV updated at:', SERVER_CSV_PATH);
  } catch (err) {
    console.error('❌ CSV export failed:', err);
  }
}

// ------------------- Helper Functions -------------------
async function handleAddItem(db, args, ws, wss) {
  const [rfid, name, price, category] = args;
  if (!rfid || !name) return ws.send('ERROR,Missing parameters');

  try {
    await db.run(
      `INSERT INTO items (rfid, name, price, category)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(rfid) DO UPDATE SET
       name=excluded.name, price=excluded.price, category=excluded.category`,
      [rfid, name, price, category || '']
    );

    await exportInventoryToCSV(db);

    ws.send('ITEM_SAVED');
    broadcast(wss, `ITEM_UPDATED,${rfid},${name},${price},${category || ''}`, ws);
  } catch (err) {
    console.error(err);
    ws.send(`ERROR,${err.message}`);
  }
}

async function handleUpdateItem(db, args, ws, wss) {
  const [rfid, name, price, category] = args;
  if (!rfid || !name) return ws.send('ERROR,Missing parameters');

  try {
    await db.run(
      `UPDATE items SET name=?, price=?, category=? WHERE rfid=?`,
      [name, price, category || '', rfid]
    );

    await exportInventoryToCSV(db);

    ws.send('ITEM_SAVED');
    broadcast(wss, `ITEM_UPDATED,${rfid},${name},${price},${category || ''}`, ws);
  } catch (err) {
    console.error(err);
    ws.send(`ERROR,${err.message}`);
  }
}

async function handleDeleteItem(db, args, ws, wss) {
  const [rfid] = args;
  if (!rfid) return ws.send('ERROR,Missing RFID');

  try {
    await db.run('DELETE FROM items WHERE rfid = ?', [rfid]);
    await exportInventoryToCSV(db);

    ws.send('ITEM_SAVED');
    broadcast(wss, `ITEM_REMOVED,${rfid}`, ws);
  } catch (err) {
    console.error(err);
    ws.send(`ERROR,${err.message}`);
  }
}

async function handleGetItem(db, args, ws) {
  const rfid = args[0];
  if (!rfid) return ws.send('ERROR,Missing RFID');

  const item = await findItemByRfid(db, rfid);
  if (item)
    ws.send(`ITEM_FOUND,${item.rfid},${item.name},${item.price},${item.category}`);
  else ws.send(`ITEM_NOT_FOUND,${rfid}`);
}

async function handleListItems(db, ws) {
  const rows = await db.all('SELECT * FROM items');
  ws.send(`ITEM_LIST,${JSON.stringify(rows)}`);
}

async function findItemByRfid(db, rfid) {
  return db.get('SELECT * FROM items WHERE rfid = ?', [rfid]);
}

function broadcast(wss, message, excludeSocket) {
  wss.clients.forEach(client => {
    if (client !== excludeSocket && client.readyState === ws.WebSocket.OPEN) {
      client.send(message);
    }
  });
}
