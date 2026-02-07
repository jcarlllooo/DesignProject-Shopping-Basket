#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>

// ========================
// Pins
#define RST_PIN 4
#define SS_PIN 10
MFRC522 mfrc522(SS_PIN, RST_PIN);

#define GREEN_LED 8
#define RED_LED   7
#define SCAN_LED  A2
#define RST_OUT   A3

#define BTN_NEXT A1
#define BTN_PREV A0

LiquidCrystal_I2C lcd(0x27, 20, 4);
SoftwareSerial NodeMCU(3, 2); // RX, TX

// ========================
// Basket
struct Item {
  String uid;
  String name;
  long price;
  String category;
};

Item basket[20];
int basketCount = 0;
long totalAmount = 0;
int currentDisplayIndex = 0;

// ========================
// System variables
String serialBuffer = "";
bool waitForScan = true;        // allow scanning
bool waitForRfidScan = false;  // SERVER-requested scan mode
bool wsConnected = false;

unsigned long lastScanTime = 0;
const unsigned long scanInterval = 400;

// ========================
// Blink states
bool redBlink = false;
bool greenBlink = false;
bool scanBlink = false;

unsigned long redTimer = 0;
unsigned long greenTimer = 0;
unsigned long scanTimer = 0;

const unsigned long blinkTime = 600;

// ========================
// Setup
void setup() {
  Serial.begin(115200);
  NodeMCU.begin(4800);
  SPI.begin();
  mfrc522.PCD_Init();

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.print("RFID Ready");

  pinMode(BTN_NEXT, INPUT);
  pinMode(BTN_PREV, INPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(SCAN_LED, OUTPUT);
  pinMode(RST_OUT, OUTPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(SCAN_LED, LOW);
  digitalWrite(RST_OUT, HIGH);
}

// ========================
// LED triggers
void triggerGreen() {
  greenBlink = true;
  greenTimer = millis();
  digitalWrite(GREEN_LED, HIGH);
}

void triggerRed() {
  redBlink = true;
  redTimer = millis();
  digitalWrite(RED_LED, HIGH);
}

void triggerScan() {
  scanBlink = true;
  scanTimer = millis();
  digitalWrite(SCAN_LED, HIGH);
}

// ========================
// LED update (non-blocking)
void updateLEDs() {
  unsigned long now = millis();

  if (greenBlink && now - greenTimer >= blinkTime) {
    greenBlink = false;
    digitalWrite(GREEN_LED, LOW);
  }
  if (redBlink && now - redTimer >= blinkTime) {
    redBlink = false;
    digitalWrite(RED_LED, LOW);
  }
  if (scanBlink && now - scanTimer >= blinkTime) {
    scanBlink = false;
    digitalWrite(SCAN_LED, LOW);
  }
}

// ========================
// Main loop
void loop() {
  unsigned long now = millis();
  digitalWrite(RST_OUT, LOW);
  if (waitForScan && now - lastScanTime > scanInterval) {
    lastScanTime = now;
    RFIDScan();
  }

  handleNavigation();
  handleNodeMCU();
  updateLEDs();
}

// ========================
// RFID scan (FIXED)
void RFIDScan() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  String uidStr = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) uidStr += " ";
  }
  uidStr.toUpperCase();

  Serial.println("Scanned UID: " + uidStr);

  // ===== SERVER REQUESTED SCAN =====
  if (waitForRfidScan) {
    NodeMCU.println("RFID:" + uidStr);   // ✅ SEND TO SERVER
    waitForRfidScan = false;            // unlock normal mode
    waitForScan = false;

    lcd.clear();
    lcd.print("RFID Sent");
  }
  // ===== NORMAL LOOKUP MODE =====
  else {
    NodeMCU.println("LOOKUP:" + uidStr);
    waitForScan = false;
  }

  mfrc522.PICC_HaltA();
}

// ========================
// NodeMCU serial handler
void handleNodeMCU() {
  while (NodeMCU.available()) {
    char c = NodeMCU.read();
    if (c == '\n') {
      serialBuffer.trim();
      if (serialBuffer.length()) {
        processNodeMCUMessage(serialBuffer);
      }
      serialBuffer = "";
    } else {
      serialBuffer += c;
    }
  }
}

// ========================
// Message processor
void processNodeMCUMessage(String msg) {
  Serial.println("[ESP] " + msg);

  if (msg == "WS_CONNECTED") {
    wsConnected = true;
    lcd.setCursor(0,2);
    lcd.print("WS: Connected     ");
  }
  else if (msg == "WS_DISCONNECTED") {
    wsConnected = false;
    lcd.setCursor(0,2);
    lcd.print("WS: Disconnected  ");
  }
  else if (msg == "PING_RFID") {
    waitForRfidScan = true;   // 🔒 HALT LOOKUP
    waitForScan = true;

    lcd.clear();
    lcd.setCursor(0,1);
    lcd.print("Scan RFID Now");
  }
  else if (msg.startsWith("ITEM_NOT_FOUND")) {
    lcd.clear();
    lcd.print("Item Not Found!");
    triggerRed();
    waitForScan = true;
  }
  else if (msg.startsWith("ITEM:")) {
    handleItemMessage(msg.substring(5));
  }
  else {
    lcd.clear();
    lcd.print(msg);
  }
}

// ========================
// Item handler
void handleItemMessage(String payload) {
  int i1 = payload.indexOf(',');
  int i2 = payload.indexOf(',', i1 + 1);
  int i3 = payload.indexOf(',', i2 + 1);
  if (i1 < 0 || i2 < 0 || i3 < 0) return;

  Item it;
  it.uid = payload.substring(0, i1);
  it.name = payload.substring(i1 + 1, i2);
  it.price = payload.substring(i2 + 1, i3).toInt();
  it.category = payload.substring(i3 + 1);

  if (isInBasket(it.uid)) {
    removeFromBasket(it.uid);
    lcd.clear();
    lcd.print(it.name);
    lcd.setCursor(0,1);
    lcd.print("Removed");
  } else {
    addToBasket(it);
    lcd.clear();
    lcd.print(it.name);
    lcd.setCursor(0,1);
    lcd.print("Added");
  }

  waitForScan = true;
  currentDisplayIndex = basketCount - 1;
  displayBasketItem();
}

// ========================
// Basket helpers
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
    triggerGreen();
    triggerScan();
  }
}

void removeFromBasket(String uid) {
  for (int i = 0; i < basketCount; i++) {
    if (basket[i].uid == uid) {
      totalAmount -= basket[i].price;
      for (int j = i; j < basketCount - 1; j++) {
        basket[j] = basket[j + 1];
      }
      basketCount--;
      if (currentDisplayIndex >= basketCount)
        currentDisplayIndex = basketCount - 1;
      break;
    }
  }
  triggerRed();
}

// ========================
// Navigation buttons
void handleNavigation() {
  static bool lastNext = HIGH;
  static bool lastPrev = HIGH;

  bool nextState = digitalRead(BTN_NEXT);
  bool prevState = digitalRead(BTN_PREV);

  if (lastNext && !nextState && basketCount > 0) {
    currentDisplayIndex = (currentDisplayIndex + 1) % basketCount;
    displayBasketItem();
  }
  if (lastPrev && !prevState && basketCount > 0) {
    currentDisplayIndex--;
    if (currentDisplayIndex < 0)
      currentDisplayIndex = basketCount - 1;
    displayBasketItem();
  }

  lastNext = nextState;
  lastPrev = prevState;
}

// ========================
// LCD display
void displayBasketItem() {
  lcd.clear();
  if (basketCount == 0) {
    lcd.print("Basket empty");
    return;
  }

  Item it = basket[currentDisplayIndex];

  lcd.setCursor(20 - 3, 3); // top-right for 20x4 LCD
  lcd.print(currentDisplayIndex + 1); // Current item number
  lcd.print("/");
  lcd.print(basketCount);            // Total items

  lcd.setCursor(0,0);
  lcd.print("Name:");
  lcd.print(it.name);

  lcd.setCursor(0,1);
  lcd.print("Cat:");
  lcd.print(it.category);

  lcd.setCursor(0,2);
  lcd.print("Price:");
  lcd.print(it.price);

  lcd.setCursor(0,3);
  lcd.print("Total:");
  lcd.print(totalAmount);
}
