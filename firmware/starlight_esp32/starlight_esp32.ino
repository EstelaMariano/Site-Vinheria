/*
  STARLIGHT — Monitoramento da Vinheria Agnello

  Placa: ESP32 DevKit
  Sensores/atuadores: DHT22 no Wokwi (DHT11 no físico), LDR,
  LED RGB, buzzer passivo,
  LCD I2C 16x2 e RFID RC522.

  Fluxo: ESP32 -> MQTT/UltraLight 2.0 -> IoT Agent -> Orion -> STH-Comet
         Dashboard -> Orion -> IoT Agent -> MQTT -> ESP32

  Bibliotecas (Arduino Library Manager):
  - PubSubClient (Nick O'Leary)
  - DHT sensor library (Adafruit)
  - Adafruit Unified Sensor
  - LiquidCrystal I2C (Frank de Brabander)
  - MFRC522 (GithubCommunity)
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Preferences.h>
#include <time.h>

// ============================================================
// PERFIL DA MONTAGEM
// ============================================================

// 1 = pinos, sensor, broker e entidade usados no teste do Wokwi.
// 0 = montagem física informada anteriormente.
// Os arquivos das duas montagens são gerados a partir deste código-base.
#ifndef WOKWI_PROFILE
#define WOKWI_PROFILE 1
#endif

const uint16_t MQTT_PORT = 1883;
const char* MQTT_USER = "";
const char* MQTT_PASSWORD = "";

const char* FIWARE_API_KEY = "TEF";

// ============================================================
// CONFIGURAÇÃO POR PERFIL
// ============================================================

#if WOKWI_PROFILE

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_BROKER = "13.221.253.95";
const char* DEVICE_ID = "lamp200";
const char* MQTT_CLIENT_ID = "fiware_200";
const char* TOPIC_ATTRS = "/TEF/lamp200/attrs";
const char* TOPIC_COMMANDS = "/TEF/lamp200/cmd";
const char* TOPIC_CMDEXE = "/TEF/lamp200/cmdexe";

#define LED_R 25
#define LED_G 26
#define LED_B 27
#define BUZZER_PIN 18
#define LDR_PIN 34
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define RFID_SS_PIN 5
#define RFID_SCK_PIN 14
#define RFID_MISO_PIN 19
#define RFID_MOSI_PIN 13
#define RFID_RST_PIN 17

#else

// Preencha apenas no seu computador antes de gravar a ESP32 física.
// Não publique a senha real no GitHub.
const char* WIFI_SSID = "SEU_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA";
const char* MQTT_BROKER = "13.221.253.95";
const char* DEVICE_ID = "cellar001";
const char* MQTT_CLIENT_ID = "starlight_cellar001";
const char* TOPIC_ATTRS = "/TEF/cellar001/attrs";
const char* TOPIC_COMMANDS = "/TEF/cellar001/cmd";
const char* TOPIC_CMDEXE = "/TEF/cellar001/cmdexe";

#define LED_R 25
#define LED_G 26
#define LED_B 27
#define BUZZER_PIN 13
#define LDR_PIN 34
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define RFID_SS_PIN 5
#define RFID_SCK_PIN 18
#define RFID_MISO_PIN 19
#define RFID_MOSI_PIN 23
#define RFID_RST_PIN 33

#endif

// I2C padrão do ESP32: SDA 21 e SCL 22.
// O perfil Wokwi usa o SPI informado no teste: SCK 14, MISO 19 e MOSI 13.

const bool RGB_COMMON_ANODE = false;
const uint8_t LCD_ADDRESS = 0x27;

// ============================================================
// LIMITES DA VINHERIA
// ============================================================

const float TEMP_MIN_C = 10.0;
const float TEMP_MAX_C = 16.0;
const float HUMIDITY_MIN = 60.0;
const float HUMIDITY_MAX = 80.0;
const int LUMINOSITY_MIN = 0;
const int LUMINOSITY_MAX = 70;

const unsigned long SENSOR_INTERVAL_MS = 2500;
const unsigned long PUBLISH_INTERVAL_MS = 10000;
const unsigned long LCD_INTERVAL_MS = 3000;
const unsigned long RFID_SILENCE_MS = 60000;
const unsigned long MQTT_RETRY_MS = 4000;
const unsigned long WIFI_RETRY_MS = 10000;

// ============================================================
// TAGS RFID AUTORIZADAS
// Troque UID e nome pelos cartões reais da equipe.
// O UID deve ficar em hexadecimal, sem espaços e em maiúsculas.
// ============================================================

struct AuthorizedTag {
  const char* uid;
  const char* person;
};

const AuthorizedTag AUTHORIZED_TAGS[] = {
  {"DEADBEEF", "Estela Wokwi"},
  {"82A4CEAB", "Estela"},
  {"E3BDF439", "Operador 2"},
};

const size_t AUTHORIZED_TAG_COUNT = sizeof(AUTHORIZED_TAGS) / sizeof(AUTHORIZED_TAGS[0]);

// ============================================================
// OBJETOS E ESTADO
// ============================================================

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
DHT dht(DHT_PIN, DHT_TYPE);
LiquidCrystal_I2C lcd(LCD_ADDRESS, 16, 2);
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
Preferences preferences;

enum AlertBit : uint8_t {
  ALERT_NONE = 0,
  ALERT_TEMPERATURE = 1,
  ALERT_HUMIDITY = 2,
  ALERT_LUMINOSITY = 4,
  ALERT_MANUAL = 8,
};

enum DisplayLanguage : uint8_t {
  LANG_PT,
  LANG_EN,
  LANG_ES,
  LANG_FR,
  LANG_DE,
  LANG_ZH,
};

float temperatureC = NAN;
float humidity = NAN;
int luminosity = -1;
String sensorStatus = "starting";

uint8_t activeSensorAlerts = ALERT_NONE;
uint8_t previousSensorAlerts = ALERT_NONE;
uint8_t acknowledgedAlerts = ALERT_NONE;
bool manualAlert = false;
bool alarmSilenced = false;
unsigned long silenceStartedAt = 0;

String lastOperator = "";
String lastOperatorUid = "";
String lastAction = "system_started";
String lastActionTime = "";

DisplayLanguage displayLanguage = LANG_PT;
bool displayFahrenheit = false;

unsigned long lastSensorRead = 0;
unsigned long lastPublish = 0;
unsigned long lastLcdChange = 0;
unsigned long lastMqttAttempt = 0;
unsigned long lastWifiAttempt = 0;
unsigned long lcdOverrideUntil = 0;
unsigned long alertRotationAt = 0;
uint8_t lcdPage = 0;
uint8_t activeAlertForOutput = ALERT_NONE;
bool toneIsPlaying = false;
unsigned int currentToneFrequency = 0;

// ============================================================
// UTILITÁRIOS
// ============================================================

String sanitizeUltraLight(String value) {
  value.replace("|", "/");
  value.replace("#", "-");
  value.replace("@", "-");
  return value;
}

void appendAttribute(String& payload, const String& key, const String& value) {
  if (payload.length()) payload += "|";
  payload += key;
  payload += "|";
  payload += sanitizeUltraLight(value);
}

String isoTimestamp() {
  time_t now = time(nullptr);
  if (now < 1700000000) return "";

  struct tm timeInfo;
  gmtime_r(&now, &timeInfo);
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
  return String(buffer);
}

void markAction(const String& action, const String& person, const String& uid) {
  lastAction = action;
  lastOperator = person;
  lastOperatorUid = uid;
  lastActionTime = isoTimestamp();
}

String languageCode() {
  switch (displayLanguage) {
    case LANG_EN: return "en";
    case LANG_ES: return "es";
    case LANG_FR: return "fr";
    case LANG_DE: return "de";
    case LANG_ZH: return "zh";
    default: return "pt";
  }
}

DisplayLanguage parseLanguage(String value) {
  value.toLowerCase();
  if (value == "en") return LANG_EN;
  if (value == "es") return LANG_ES;
  if (value == "fr") return LANG_FR;
  if (value == "de") return LANG_DE;
  if (value == "zh" || value == "zh-cn" || value == "mandarin") return LANG_ZH;
  return LANG_PT;
}

String temperatureUnitCode() {
  return displayFahrenheit ? "fahrenheit" : "celsius";
}

float temperatureForDisplay() {
  if (isnan(temperatureC)) return NAN;
  return displayFahrenheit ? (temperatureC * 9.0 / 5.0) + 32.0 : temperatureC;
}

uint8_t fullAlertMask() {
  return activeSensorAlerts | (manualAlert ? ALERT_MANUAL : ALERT_NONE);
}

String alertReason() {
  uint8_t mask = fullAlertMask();
  if (mask == ALERT_NONE) return "none";

  String reason = "";
  if (mask & ALERT_TEMPERATURE) reason += "temperature";
  if (mask & ALERT_HUMIDITY) reason += (reason.length() ? ",humidity" : "humidity");
  if (mask & ALERT_LUMINOSITY) reason += (reason.length() ? ",luminosity" : "luminosity");
  if (mask & ALERT_MANUAL) reason += (reason.length() ? ",manual" : "manual");
  return reason;
}

String alertState() {
  if (fullAlertMask() == ALERT_NONE) return "normal";
  return alarmSilenced ? "acknowledged" : "active";
}

String alertMode() {
  if (fullAlertMask() == ALERT_NONE) return "off";
  return alarmSilenced ? "silenced" : "on";
}

void setRgb(bool red, bool green, bool blue) {
  digitalWrite(LED_R, RGB_COMMON_ANODE ? !red : red);
  digitalWrite(LED_G, RGB_COMMON_ANODE ? !green : green);
  digitalWrite(LED_B, RGB_COMMON_ANODE ? !blue : blue);
}

void stopBuzzer() {
  if (toneIsPlaying) {
    noTone(BUZZER_PIN);
    toneIsPlaying = false;
    currentToneFrequency = 0;
  }
}

void setBuzzer(unsigned int frequency, bool enabled) {
  if (!enabled) {
    stopBuzzer();
    return;
  }
  if (!toneIsPlaying || currentToneFrequency != frequency) {
    tone(BUZZER_PIN, frequency);
    toneIsPlaying = true;
    currentToneFrequency = frequency;
  }
}

void printLcdLine(uint8_t row, String text) {
  if (text.length() > 16) text = text.substring(0, 16);
  while (text.length() < 16) text += " ";
  lcd.setCursor(0, row);
  lcd.print(text);
}

void showTemporaryMessage(const String& line1, const String& line2, unsigned long durationMs) {
  printLcdLine(0, line1);
  printLcdLine(1, line2);
  lcdOverrideUntil = millis() + durationMs;
}

// ============================================================
// MQTT / FIWARE
// ============================================================

bool publishMeasurements(bool forcePublish = false) {
  if (!mqtt.connected()) return false;
  if (!forcePublish && millis() - lastPublish < PUBLISH_INTERVAL_MS) return false;

  String payload;
  payload.reserve(700);

  if (!isnan(temperatureC)) appendAttribute(payload, "t", String(temperatureC, 1));
  if (!isnan(humidity)) appendAttribute(payload, "h", String(humidity, 1));
  if (luminosity >= 0) appendAttribute(payload, "l", String(luminosity));

  appendAttribute(payload, "am", alertMode());
  appendAttribute(payload, "ast", alertState());
  appendAttribute(payload, "ar", alertReason());
  appendAttribute(payload, "ab", alarmSilenced ? "true" : "false");
  appendAttribute(payload, "op", lastOperator.length() ? lastOperator : "none");
  appendAttribute(payload, "uid", lastOperatorUid.length() ? lastOperatorUid : "none");
  appendAttribute(payload, "act", lastAction);
  appendAttribute(payload, "lang", languageCode());
  appendAttribute(payload, "unit", temperatureUnitCode());
  appendAttribute(payload, "ss", sensorStatus);

  String measurementTime = isoTimestamp();
  if (measurementTime.length()) appendAttribute(payload, "mt", measurementTime);
  if (lastActionTime.length()) appendAttribute(payload, "at", lastActionTime);

  bool published = mqtt.publish(TOPIC_ATTRS, payload.c_str(), false);
  if (published) {
    lastPublish = millis();
    Serial.println("[MQTT] Dados publicados:");
    Serial.println(payload);
  } else {
    Serial.println("[MQTT] Falha ao publicar dados.");
  }
  return published;
}

void publishCommandResult(const String& command, const String& result) {
  if (!mqtt.connected()) return;
  String payload = String(DEVICE_ID) + "@" + command + "|" + result;
  mqtt.publish(TOPIC_CMDEXE, payload.c_str(), false);
  Serial.println("[MQTT] Resultado do comando: " + payload);
}

void silenceAlarm(const String& person, const String& uid, const String& action) {
  if (fullAlertMask() == ALERT_NONE) return;
  alarmSilenced = true;
  silenceStartedAt = millis();
  acknowledgedAlerts = fullAlertMask();
  markAction(action, person, uid);
  stopBuzzer();
  setRgb(false, false, false);
}

void applyCommand(String command, String value) {
  value.trim();
  value.toLowerCase();

  if (command == "setAlertMode" || command == "alertMode") {
    if (value == "on") {
      manualAlert = true;
      alarmSilenced = false;
      markAction("remote_alert_activated", "Dashboard", "remote");
      publishCommandResult(command, "OK");
    } else if (value == "off") {
      manualAlert = false;
      if (activeSensorAlerts != ALERT_NONE) {
        silenceAlarm("Dashboard", "remote", "alarm_acknowledged_remote");
      } else {
        alarmSilenced = false;
        markAction("remote_alert_deactivated", "Dashboard", "remote");
      }
      publishCommandResult(command, "OK");
    } else {
      publishCommandResult(command, "ERROR_INVALID_VALUE");
      return;
    }
  } else if (command == "setDisplayLanguage" || command == "displayLanguage") {
    displayLanguage = parseLanguage(value);
    preferences.putUChar("language", static_cast<uint8_t>(displayLanguage));
    markAction("display_language_changed", "Dashboard", "remote");
    publishCommandResult(command, "OK");
  } else if (command == "setTemperatureUnit" || command == "temperatureUnit") {
    if (value != "celsius" && value != "fahrenheit") {
      publishCommandResult(command, "ERROR_INVALID_VALUE");
      return;
    }
    displayFahrenheit = value == "fahrenheit";
    preferences.putBool("fahrenheit", displayFahrenheit);
    markAction("temperature_unit_changed", "Dashboard", "remote");
    publishCommandResult(command, "OK");
  } else {
    publishCommandResult(command, "ERROR_UNKNOWN_COMMAND");
    return;
  }

  publishMeasurements(true);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  message.reserve(length + 1);
  for (unsigned int i = 0; i < length; i++) message += static_cast<char>(payload[i]);

  Serial.println("[MQTT] Comando recebido em " + String(topic) + ": " + message);

  int atIndex = message.indexOf('@');
  int separatorIndex = message.indexOf('|');
  if (atIndex < 0 || separatorIndex < 0 || separatorIndex <= atIndex) return;

  String targetDevice = message.substring(0, atIndex);
  String command = message.substring(atIndex + 1, separatorIndex);
  String value = message.substring(separatorIndex + 1);
  if (targetDevice != DEVICE_ID) return;

  applyCommand(command, value);
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiAttempt < WIFI_RETRY_MS) return;

  lastWifiAttempt = millis();
  Serial.println("[WiFi] Conectando a " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void ensureMqtt() {
  if (WiFi.status() != WL_CONNECTED || mqtt.connected()) return;
  if (millis() - lastMqttAttempt < MQTT_RETRY_MS) return;

  lastMqttAttempt = millis();
  Serial.println("[MQTT] Conectando ao broker " + String(MQTT_BROKER));

  bool connected = strlen(MQTT_USER)
    ? mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD)
    : mqtt.connect(MQTT_CLIENT_ID);

  if (connected) {
    Serial.println("[MQTT] Conectado.");
    mqtt.subscribe(TOPIC_COMMANDS);
    publishMeasurements(true);
  } else {
    Serial.println("[MQTT] Falha, rc=" + String(mqtt.state()));
  }
}

// ============================================================
// SENSORES E REGRAS DE ALERTA
// ============================================================

int readLuminosityPercent() {
  long total = 0;
  const int samples = 12;
  for (int i = 0; i < samples; i++) {
    total += analogRead(LDR_PIN);
    delay(2);
  }
  int raw = total / samples;
#if WOKWI_PROFILE
  // Mesmo sentido usado no código de teste: 0 -> 0% e 4095 -> 100%.
  int percent = map(raw, 0, 4095, 0, 100);
#else
  // Na montagem física informada, leitura baixa representa mais luz.
  int percent = map(raw, 0, 4095, 100, 0);
#endif
  return constrain(percent, 0, 100);
}

void evaluateAlerts() {
  previousSensorAlerts = activeSensorAlerts;
  activeSensorAlerts = ALERT_NONE;

  if (!isnan(temperatureC) && (temperatureC < TEMP_MIN_C || temperatureC > TEMP_MAX_C)) {
    activeSensorAlerts |= ALERT_TEMPERATURE;
  }
  if (!isnan(humidity) && (humidity < HUMIDITY_MIN || humidity > HUMIDITY_MAX)) {
    activeSensorAlerts |= ALERT_HUMIDITY;
  }
  if (luminosity >= 0 && (luminosity < LUMINOSITY_MIN || luminosity > LUMINOSITY_MAX)) {
    activeSensorAlerts |= ALERT_LUMINOSITY;
  }

  uint8_t newAlerts = activeSensorAlerts & ~previousSensorAlerts;
  if (newAlerts != ALERT_NONE) {
    if (alarmSilenced && (newAlerts & ~acknowledgedAlerts)) {
      alarmSilenced = false;
      markAction("alarm_resumed_new_condition", "Sistema", "system");
    } else if (previousSensorAlerts == ALERT_NONE) {
      markAction("alarm_started", "Sistema", "system");
    } else {
      markAction("alarm_updated", "Sistema", "system");
    }
    publishMeasurements(true);
  }

  if (previousSensorAlerts != ALERT_NONE && activeSensorAlerts == ALERT_NONE && !manualAlert) {
    String resolver = lastOperator.length() ? lastOperator : "Sistema";
    String resolverUid = lastOperatorUid.length() ? lastOperatorUid : "system";
    markAction(alarmSilenced ? "alarm_resolved_after_ack" : "condition_normalized", resolver, resolverUid);
    alarmSilenced = false;
    acknowledgedAlerts = ALERT_NONE;
    publishMeasurements(true);
  }
}

void readSensors() {
  if (millis() - lastSensorRead < SENSOR_INTERVAL_MS) return;
  lastSensorRead = millis();

  float newTemperature = dht.readTemperature();
  float newHumidity = dht.readHumidity();
  luminosity = readLuminosityPercent();

  if (isnan(newTemperature) || isnan(newHumidity)) {
    sensorStatus = "dht_error";
    Serial.println("[SENSOR] Falha na leitura do DHT.");
  } else {
    temperatureC = newTemperature;
    humidity = newHumidity;
    sensorStatus = "ok";
  }

  evaluateAlerts();

  Serial.printf("[SENSOR] Temp: %.1f C | Umidade: %.1f %% | Luz: %d %% | Alertas: %s\n",
                temperatureC, humidity, luminosity, alertReason().c_str());
}

// ============================================================
// RFID
// ============================================================

String currentCardUid() {
  String uid;
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

const AuthorizedTag* findAuthorizedTag(const String& uid) {
  for (size_t i = 0; i < AUTHORIZED_TAG_COUNT; i++) {
    if (uid.equalsIgnoreCase(AUTHORIZED_TAGS[i].uid)) return &AUTHORIZED_TAGS[i];
  }
  return nullptr;
}

void authorizedBeep() {
  tone(BUZZER_PIN, 2200, 120);
}

void deniedBeep() {
  tone(BUZZER_PIN, 350, 500);
}

void handleRfid() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = currentCardUid();
  const AuthorizedTag* tag = findAuthorizedTag(uid);

  if (!tag) {
    Serial.println("[RFID] Tag não autorizada: " + uid);
    markAction("rfid_access_denied", "Desconhecido", uid);
    deniedBeep();
    showTemporaryMessage("TAG NAO CAD.", uid, 2200);
    publishMeasurements(true);
  } else {
    String person = tag->person;
    Serial.println("[RFID] Acesso autorizado: " + person + " (" + uid + ")");
    authorizedBeep();

    if (fullAlertMask() != ALERT_NONE) {
      silenceAlarm(person, uid, "alarm_acknowledged");
      showTemporaryMessage("ALARME PAUSADO", person, 2500);
    } else {
      markAction("rfid_inspection", person, uid);
      showTemporaryMessage("ACESSO OK", person, 2000);
    }
    publishMeasurements(true);
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// ============================================================
// LED RGB E BUZZER — PADRÃO DIFERENTE PARA CADA ERRO
// ============================================================

uint8_t nextAlertBit(uint8_t mask, uint8_t current) {
  const uint8_t order[] = {ALERT_TEMPERATURE, ALERT_HUMIDITY, ALERT_LUMINOSITY, ALERT_MANUAL};
  int currentIndex = -1;
  for (int i = 0; i < 4; i++) if (order[i] == current) currentIndex = i;
  for (int offset = 1; offset <= 4; offset++) {
    uint8_t candidate = order[(currentIndex + offset + 4) % 4];
    if (mask & candidate) return candidate;
  }
  return ALERT_NONE;
}

void updateAlarmOutputs() {
  uint8_t mask = fullAlertMask();

  if (mask == ALERT_NONE) {
    activeAlertForOutput = ALERT_NONE;
    stopBuzzer();
    setRgb(false, true, false);  // Verde: normal
    return;
  }

  if (alarmSilenced) {
    if (millis() - silenceStartedAt >= RFID_SILENCE_MS) {
      alarmSilenced = false;
      markAction("alarm_resumed", lastOperator.length() ? lastOperator : "Sistema",
                 lastOperatorUid.length() ? lastOperatorUid : "system");
      publishMeasurements(true);
    } else {
      stopBuzzer();
      setRgb(false, false, false);  // RFID pausou luz e som
      return;
    }
  }

  if (activeAlertForOutput == ALERT_NONE || !(mask & activeAlertForOutput) || millis() - alertRotationAt >= 1800) {
    activeAlertForOutput = nextAlertBit(mask, activeAlertForOutput);
    alertRotationAt = millis();
  }

  unsigned long phase = millis() % 1400;
  bool beep = false;
  unsigned int frequency = 1000;

  switch (activeAlertForOutput) {
    case ALERT_TEMPERATURE:
      setRgb(true, false, false);       // Vermelho: temperatura
      frequency = 900;
      beep = phase < 220 || (phase >= 360 && phase < 580);  // 2 graves
      break;
    case ALERT_HUMIDITY:
      setRgb(false, false, true);       // Azul: umidade
      frequency = 1350;
      beep = phase < 650;               // 1 médio longo
      break;
    case ALERT_LUMINOSITY:
      setRgb(true, true, false);        // Amarelo: luminosidade
      frequency = 1900;
      beep = phase < 120 || (phase >= 260 && phase < 380) || (phase >= 520 && phase < 640); // 3 agudos
      break;
    case ALERT_MANUAL:
      setRgb(true, false, true);        // Magenta: teste/comando remoto
      frequency = 700;
      beep = phase < 450;
      break;
    default:
      stopBuzzer();
      return;
  }

  setBuzzer(frequency, beep);
}

// ============================================================
// LCD 16x2
// ============================================================

String metricLabel(uint8_t page) {
  const char* labels[6][3] = {
    {"Temperatura", "Umidade", "Luminosidade"},
    {"Temperature", "Humidity", "Light"},
    {"Temperatura", "Humedad", "Luminosidad"},
    {"Temperature", "Humidite", "Luminosite"},
    {"Temperatur", "Feuchte", "Helligkeit"},
    {"TEMP", "HUMIDITY", "LIGHT"}, // LCD HD44780 não desenha caracteres chineses.
  };
  return labels[displayLanguage][page];
}

String statusLabel() {
  if (alarmSilenced) {
    const char* labels[] = {"Alerta pausado", "Alert muted", "Alerta pausada", "Alerte coupee", "Alarm pausiert", "ALERT MUTED"};
    return labels[displayLanguage];
  }
  if (fullAlertMask() != ALERT_NONE) {
    const char* labels[] = {"ALERTA", "ALERT", "ALERTA", "ALERTE", "ALARM", "ALERT"};
    return labels[displayLanguage];
  }
  const char* labels[] = {"Condicao OK", "Condition OK", "Condicion OK", "Condition OK", "Zustand OK", "CONDITION OK"};
  return labels[displayLanguage];
}

void updateLcd() {
  if (millis() < lcdOverrideUntil) return;
  if (millis() - lastLcdChange < LCD_INTERVAL_MS) return;

  lastLcdChange = millis();
  lcdPage = (lcdPage + 1) % 3;

  String line1 = metricLabel(lcdPage) + ":";
  if (lcdPage == 0) {
    float value = temperatureForDisplay();
    line1 += isnan(value) ? " --" : " " + String(value, 1) + (displayFahrenheit ? "F" : "C");
  } else if (lcdPage == 1) {
    line1 += isnan(humidity) ? " --" : " " + String(humidity, 0) + "%";
  } else {
    line1 += luminosity < 0 ? " --" : " " + String(luminosity) + "%";
  }

  printLcdLine(0, line1);
  printLcdLine(1, statusLabel());
}

// ============================================================
// SETUP E LOOP
// ============================================================

void setup() {
  Serial.begin(115200);

  pinMode(LED_R, OUTPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_B, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LDR_PIN, INPUT);
  analogSetPinAttenuation(LDR_PIN, ADC_11db);

  setRgb(false, false, false);
  stopBuzzer();

  dht.begin();

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  printLcdLine(0, "* STARLIGHT *");
  printLcdLine(1, "Iniciando...");

  SPI.begin(RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, RFID_SS_PIN);
  rfid.PCD_Init();

  preferences.begin("starlight", false);
  uint8_t storedLanguage = preferences.getUChar("language", LANG_PT);
  displayLanguage = static_cast<DisplayLanguage>(storedLanguage <= LANG_ZH ? storedLanguage : LANG_PT);
  displayFahrenheit = preferences.getBool("fahrenheit", false);

  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(1024);

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  setRgb(false, true, false);
  Serial.println("[STARLIGHT] Sistema iniciado.");
}

void loop() {
  ensureWiFi();
  ensureMqtt();
  if (mqtt.connected()) mqtt.loop();

  readSensors();
  handleRfid();
  updateAlarmOutputs();
  updateLcd();
  publishMeasurements();

  delay(5);
}

