#include <SoftwareSerial.h>
#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>

// ========================
// WIFI / SERVER CONFIG
const char* ssid = "KHAEL";
const char* password = "12345678";
const char* serverAddress = "192.168.137.1";
const int serverPort = 4000;

// ========================
// SERIAL TO ARDUINO
SoftwareSerial NodeSerial(D2, D3); // RX, TX
unsigned long lastSerialRead = 0;
const unsigned long serialTimeout = 50;
String serialBuffer = "";

// ========================
// WEBSOCKET
WebSocketsClient webSocket;
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000;

// ========================
// BASKET STRUCTURE
struct Item {
  String uid;
  String name;
  long price;
  String category;
};

Item basket[20];
int basketCount = 0;
long totalAmount = 0;
int currentDisplayIndex = 0; // 0-based index
bool waitForScan = true;

// ========================
// SETUP
void setup() {
  Serial.begin(115200);
  NodeSerial.begin(4800);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected: " + WiFi.localIP().toString());

  webSocket.begin(serverAddress, serverPort, "/");
  webSocket.onEvent(webSocketEvent);
}

// ========================
// LOOP
void loop() {
  handleSerialFromArduino();
  webSocket.loop();
  reconnectWiFi();
  reconnectWebSocket();
  sendCurrentItemCSV();
}

// ========================
// SERIAL HANDLING
void handleSerialFromArduino() {
  while (NodeSerial.available()) {
    char c = NodeSerial.read();
    if (c == '\n') {
      serialBuffer.trim(); // remove whitespace
      if (serialBuffer.length()) {
        if (serialBuffer == "N") {
          nextItem();
          Serial.println("NAV -> NEXT");
        }
        else if (serialBuffer == "P") {
          prevItem();
          Serial.println("NAV -> PREV");
        }
        else {
          forwardToServer(serialBuffer);
        }
      }
      serialBuffer = "";
    } else {
      serialBuffer += c;
    }
    lastSerialRead = millis();
  }

  if (serialBuffer.length() > 0 && millis() - lastSerialRead > serialTimeout) {
    serialBuffer.trim();
    if (serialBuffer.length()) {
      if (serialBuffer != "N" && serialBuffer != "P") {
        forwardToServer(serialBuffer);
      }
    }
    serialBuffer = "";
  }
}

// ========================
// FORWARD ARDUINO MSG TO SERVER
void forwardToServer(const String& data) {
  String msg = data;
  msg.trim();
  if (msg.length() == 0) return;

  if (webSocket.isConnected()) {
    webSocket.sendTXT(msg);
    Serial.println("📤 Sent to server: " + msg);
  } else {
    Serial.println("⚠️ WS Not connected, dropping: " + msg);
  }
}

// ========================
// WEBSOCKET EVENT
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("✅ WebSocket Connected");
      break;

    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket Disconnected");
      break;

    case WStype_TEXT: {
      String msg = String((char*)payload);
      msg.trim();
      Serial.println("📥 From Server: " + msg);

      if (msg.startsWith("ITEM:")) {
        processServerMessage(msg);
      } else {
        NodeSerial.println(msg);
      }
      break;
    }

    case WStype_ERROR:
      Serial.println("⚠️ WebSocket Error");
      break;

    default: break;
  }
}

// ========================
// PROCESS SERVER RESPONSE
void processServerMessage(String msg) {
  if (msg.startsWith("ITEM_NOT_FOUND")) {
    NodeSerial.println("Item Not Found!");
    return;
  } 

  String payload = msg.substring(5);
  payload.trim();

  int idx1 = payload.indexOf(',');
  int idx2 = payload.indexOf(',', idx1 + 1);
  int idx3 = payload.indexOf(',', idx2 + 1);
  if (idx1 == -1 || idx2 == -1 || idx3 == -1) return;

  Item it;
  it.uid = payload.substring(0, idx1); it.uid.trim();
  it.name = payload.substring(idx1 + 1, idx2); it.name.trim();
  it.price = payload.substring(idx2 + 1, idx3).toInt();
  it.category = payload.substring(idx3 + 1); it.category.trim();

  if (isInBasket(it.uid)) {
    removeFromBasket(it.uid);
  } else {
    addToBasket(it);
  }

  currentDisplayIndex = basketCount > 0 ? basketCount - 1 : 0;
}

// ========================
// BASKET HELPERS
bool isInBasket(String uid) {
  for (int i = 0; i < basketCount; i++) {
    if (basket[i].uid == uid) return true;
  }
  return false;
}

void addToBasket(Item it) {
  if (basketCount < 20) {
    basket[basketCount++] = it;
    totalAmount += it.price;
  }
}

void removeFromBasket(String uid) {
  for (int i = 0; i < basketCount; i++) {
    if (basket[i].uid == uid) {
      totalAmount -= basket[i].price;
      for (int j = i; j < basketCount - 1; j++) {
        basket[j] = basket[j+1];
      }
      basketCount--;
      if (currentDisplayIndex >= basketCount) currentDisplayIndex = basketCount - 1;
      break;
    }
  }
}

// ========================
// SEND CURRENT ITEM CSV
String lastSentCSV = "";

void sendCurrentItemCSV() {
  if (basketCount == 0) {
    if (lastSentCSV != "NO_ITEM") {
      NodeSerial.println("NO_ITEM");
      lastSentCSV = "NO_ITEM";
    }
    return;
  }

  if (currentDisplayIndex < 0) currentDisplayIndex = 0;
  if (currentDisplayIndex >= basketCount) currentDisplayIndex = basketCount - 1;

  Item it = basket[currentDisplayIndex];
  String csvLine = it.name + "," + it.category + "," + String(it.price) + "," +
                   String(totalAmount) + "," + String(currentDisplayIndex + 1) + "," + String(basketCount);

  if (csvLine != lastSentCSV) {
    NodeSerial.println("Data:" + csvLine);
    lastSentCSV = csvLine;
  }
}

// ========================
// NAVIGATION — FIXED
void nextItem() {
  if (basketCount == 0) return;
  currentDisplayIndex = (currentDisplayIndex + 1) % basketCount;
  
  // Force report update
  lastSentCSV = "";
}

void prevItem() {
  if (basketCount == 0) return;
  currentDisplayIndex = (currentDisplayIndex - 1 + basketCount) % basketCount;

  // Force report update
  lastSentCSV = "";
}

// ========================
// WIFI / WS RECONNECT
void reconnectWiFi() {
  if (WiFi.status() != WL_CONNECTED &&
      millis() - lastReconnectAttempt > reconnectInterval) {
    Serial.println("🔄 Reconnecting WiFi...");
    WiFi.disconnect();
    WiFi.begin(ssid, password);
    lastReconnectAttempt = millis();
  }
}

void reconnectWebSocket() {
  if (WiFi.status() == WL_CONNECTED &&
      !webSocket.isConnected() &&
      millis() - lastReconnectAttempt > reconnectInterval) {
    Serial.println("🔄 Reconnecting WebSocket...");
    webSocket.begin(serverAddress, serverPort, "/");
    webSocket.onEvent(webSocketEvent);
    lastReconnectAttempt = millis();
  }
}
