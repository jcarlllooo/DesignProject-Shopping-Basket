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
#define BTN_NEXT A1
#define BTN_PREV A0
#define SCAN_LED  A2
#define RST_OUT   A3

LiquidCrystal_I2C lcd(0x27, 20, 4);
SoftwareSerial NodeMCU(3, 2); // RX=3, TX=2

// Blink states
bool redBlink = false;
bool greenBlink = false;
bool scanBlink = false;

// Timers
unsigned long redTimer = 0;
unsigned long greenTimer = 0;
unsigned long scanTimer = 0;
const unsigned long blinkTime = 600; // ms

// Scan interval
const unsigned long scanInterval = 200; // ms
unsigned long lastScanTime = 0;
bool waitingForRfid = false;

// NodeMCU buffer
String serialBuffer = "";

// ========================
// Globals for item changes
int lastItemNumber = 0;

// ========================
// Setup
void setup() {
  Serial.begin(115200);
  NodeMCU.begin(4800);
  SPI.begin();
  lcd.init();
  lcd.backlight();
  lcd.clear();

  mfrc522.PCD_Init();
  lcd.setCursor(0,0);
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
// LED Blink functions
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

void Sscan() {
  scanBlink = true;
  scanTimer = millis();
}

// Update LEDs without blocking
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
  }
}

// ========================
// Main loop
void loop() {
  unsigned long now = millis();

  // Continuous RFID scan every scanInterval
  if (now - lastScanTime >= scanInterval) {
    lastScanTime = now;
    RFIDScan();
  }
digitalWrite(RST_OUT, LOW);
  buttons();
  handleNodeMCU();

  updateLEDs();
}

//=========================
void buttons() {
  static bool lastNext = HIGH;
  static bool lastPrev = HIGH;

  bool nextState = digitalRead(BTN_NEXT);
  bool prevState = digitalRead(BTN_PREV);

  if (prevState == HIGH) {
    NodeMCU.println("N");
    Serial.println("Sent NEXT");
  }

  if (nextState == HIGH) {
    NodeMCU.println("P");
    Serial.println("Sent PREV");
  }
}

// ========================
// RFID Scan
void RFIDScan() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // Build UID string
  String uidStr = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) uidStr += " ";
  }
  uidStr.toUpperCase();

  Serial.println("Scanned UID: " + uidStr);

  NodeMCU.println("LOOKUP:" + uidStr);

  if (waitingForRfid) {
    NodeMCU.println("RFID:" + uidStr);
    Serial.println("Sent to NodeMCU -> RFID:" + uidStr);
    waitingForRfid = false;
  }

  Sscan(); // blink scan LED
}

// ========================
// Handle NodeMCU messages
void handleNodeMCU() {
  while (NodeMCU.available()) {
    char c = NodeMCU.read();
    if (c == '\n') {
      serialBuffer.trim();
      if (serialBuffer.length() > 0) {

        if (serialBuffer == "PING_RFID") {
          waitingForRfid = true;
          lcd.clear();
          lcd.setCursor(0,1);
          lcd.print("Scan RFID Now    ");

          Serial.println("[NODEMCU] PING_RFID detected — awaiting scan");

        } else if (!waitingForRfid) {
          processServerCSV(serialBuffer);
        }
      }
      serialBuffer = "";
    } else {
      serialBuffer += c;
    }
  }
}

// ========================
// Extend your Item struct to include total, index, itemNumber
struct Item {
  String uid;
  String name;
  long price;
  String category;
  long total;       // total amount
  int index;        // current index
  int itemNumber;   // total items
};

// Global current item to display
Item currentItem;

// ========================
// Process CSV message from NodeMCU
// Expected format: "Data:Name,Category,Price,Total,Index,ItemNumber"
void processServerCSV(String msg) {
 if (msg == "NO_ITEM") {
    // Basket just became empty — reset count
    lastItemNumber = 0;
    currentItem.index = 0;
    currentItem.itemNumber = 0;
    currentItem.name = "";
    currentItem.category = "";
    currentItem.price = 0;
    currentItem.total = 0;

    // Update LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Empty Basket");

    Serial.println("Empty Basket");
    return;
}


  if (!msg.startsWith("Data:")) return;

  String payload = msg.substring(5);
  payload.trim();

  int idx0 = payload.indexOf(',');
  int idx1 = payload.indexOf(',', idx0 + 1);
  int idx2 = payload.indexOf(',', idx1 + 1);
  int idx3 = payload.indexOf(',', idx2 + 1);
  int idx4 = payload.indexOf(',', idx3 + 1);

  if (idx0 == -1 || idx1 == -1 || idx2 == -1 || idx3 == -1 || idx4 == -1) {
    Serial.println("Invalid CSV message: " + payload);
    return;
  }

  Item newItem;
  newItem.name       = payload.substring(0, idx0);      newItem.name.trim();
  newItem.category   = payload.substring(idx0 + 1, idx1); newItem.category.trim();
  newItem.price      = payload.substring(idx1 + 1, idx2).toInt();
  newItem.total      = payload.substring(idx2 + 1, idx3).toInt();
  newItem.index      = payload.substring(idx3 + 1, idx4).toInt();
  newItem.itemNumber = payload.substring(idx4 + 1).toInt();

  if (newItem.itemNumber > lastItemNumber) {
    triggerGreen();
    digitalWrite(SCAN_LED, HIGH);
    delay(100);
    digitalWrite(SCAN_LED, LOW);
  } else if (newItem.itemNumber < lastItemNumber) {
    triggerRed();
  }

  lastItemNumber = newItem.itemNumber;

  currentItem.name       = newItem.name;
  currentItem.category   = newItem.category;
  currentItem.price      = newItem.price;
  currentItem.total      = newItem.total;
  currentItem.index      = newItem.index;
  currentItem.itemNumber = newItem.itemNumber;

  displayCurrentItem();
}

// ========================
// Display current item on LCD
void displayCurrentItem() {
  lcd.clear();
  delay(200);

  lcd.setCursor(0,0);
  lcd.print("Name: ");
  lcd.print(currentItem.name);

  lcd.setCursor(0,1);
  lcd.print("Cat: ");
  lcd.print(currentItem.category);

  lcd.setCursor(0,2);
  lcd.print("Price: ");
  lcd.print(currentItem.price);

  lcd.setCursor(0,3);
  lcd.print("Total: ");
  lcd.print(currentItem.total);

  lcd.setCursor(20 - 5 , 3);
  lcd.print(currentItem.index);
  lcd.print("/");
  lcd.print(currentItem.itemNumber);
}
