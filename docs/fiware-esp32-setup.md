# Integração Starlight: ESP32, MQTT, FIWARE e dashboard

Este guia descreve o fluxo final. O provisionamento é feito pelo dashboard, sem Postman e sem comandos manuais de cadastro.

## 1. Infraestrutura confirmada

EC2: `13.221.253.95`

| Serviço | Contêiner | Porta pública |
|---|---|---:|
| Orion Context Broker | `fiware-orion` | 1026 |
| IoT Agent | `fiware-iot-agent` | 4041 |
| STH-Comet | `fiware-sth-comet` | 8666 |
| Mosquitto | `fiware-mosquitto` | 1883 |
| Mongo histórico | `fiware-mongo-historical` | 27017 |
| Mongo interno | `fiware-mongo-internal` | somente interno |

As APIs e a porta MQTT já foram testadas. O ID da instância AWS não entra em nenhum código: o que interessa para a conexão é o IPv4 público e as portas liberadas.

## 2. Escolha o firmware

### Wokwi

Use `firmware/wokwi/starlight_wokwi.ino` e o `libraries.txt` da mesma pasta.

- Wi-Fi: `Wokwi-GUEST`, sem senha;
- broker: `13.221.253.95:1883`;
- Device ID: `lamp200`;
- Entity ID: `urn:ngsi-ld:WineCellar:200`;
- DHT22: GPIO 4;
- buzzer: GPIO 18;
- LDR: GPIO 34;
- RGB: GPIOs 25, 26 e 27;
- LCD: SDA 21 e SCL 22;
- RC522: SS 5, SCK 14, MOSI 13, MISO 19 e RST 17.

### Montagem física

Use `firmware/physical/starlight_physical.ino`. Antes de gravar, preencha no arquivo:

```cpp
const char* WIFI_SSID = "SEU_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA";
```

Não publique a senha real no GitHub.

| Componente | Pino ESP32 |
|---|---:|
| DHT11 DATA | GPIO 4 |
| LDR | GPIO 34 |
| RGB vermelho / verde / azul | GPIO 25 / 26 / 27 |
| Buzzer passivo | GPIO 13 |
| LCD I2C SDA / SCL | GPIO 21 / 22 |
| RC522 SS / RST | GPIO 5 / 33 |
| RC522 SCK / MISO / MOSI | GPIO 18 / 19 / 23 |

O RC522 usa **3,3 V**, nunca 5 V. O LCD está configurado em `0x27`. O RGB está configurado como cátodo comum; para ânodo comum, use `RGB_COMMON_ANODE = true`.

## 3. Bibliotecas Arduino

- PubSubClient;
- DHT sensor library;
- Adafruit Unified Sensor;
- LiquidCrystal I2C;
- MFRC522.

Na Arduino IDE, selecione **ESP32 Dev Module**. No Wokwi, use o `libraries.txt` incluído.

## 4. Provisionar pelo dashboard

1. Abra o dashboard.
2. Clique em **Dispositivos**.
3. Localize **Simulação Wokwi** ou **Adega física**.
4. Clique em **Provisionar**.
5. Aguarde o selo mudar para **Provisionado**.
6. Inicie a simulação Wokwi ou ligue a ESP32 física.

O botão executa automaticamente:

- criação do grupo de serviço `TEF`, se necessário;
- cadastro/atualização do dispositivo no IoT Agent;
- criação da assinatura histórica no Orion para `http://fiware-sth-comet:8666/notify`;
- atualização da lista de dispositivos.

O botão **?** explica cada campo ao adicionar outro dispositivo. O nome é apenas visual; Device ID, Entity ID e tipo precisam ser os mesmos usados pelo firmware/provisionamento.

## 5. Contrato de dados

| Object ID | Atributo Orion | Tipo | Conteúdo |
|---|---|---|---|
| `t` | `temperature` | Number | temperatura em °C |
| `h` | `humidity` | Number | umidade em % |
| `l` | `luminosity` | Number | luminosidade em % |
| `am` | `alertMode` | Text | `on`, `off` ou `silenced` |
| `ast` | `alertState` | Text | `normal`, `active` ou `acknowledged` |
| `ar` | `alertReason` | Text | motivo(s) do alerta |
| `ab` | `alarmSilenced` | Boolean | alarme reconhecido/pausado |
| `op` | `lastOperator` | Text | pessoa associada à tag RFID |
| `uid` | `lastOperatorUid` | Text | UID ou origem remota |
| `act` | `lastAction` | Text | ação real mais recente |
| `at` | `lastActionTime` | DateTime | horário da ação |
| `lang` | `displayLanguage` | Text | idioma atual do LCD |
| `unit` | `temperatureUnit` | Text | unidade atual do LCD |
| `mt` | `measurementTime` | DateTime | horário da leitura |
| `ss` | `sensorStatus` | Text | `ok`, `starting` ou `dht_error` |

Tópicos:

| Perfil | Dados | Comandos | Resposta |
|---|---|---|---|
| Wokwi | `/TEF/lamp200/attrs` | `/TEF/lamp200/cmd` | `/TEF/lamp200/cmdexe` |
| Físico | `/TEF/cellar001/attrs` | `/TEF/cellar001/cmd` | `/TEF/cellar001/cmdexe` |

Comandos do dashboard:

| Comando | Valores |
|---|---|
| `setAlertMode` | `on`, `off` |
| `setDisplayLanguage` | `pt`, `en`, `es`, `fr`, `de`, `zh` |
| `setTemperatureUnit` | `celsius`, `fahrenheit` |

O idioma do dashboard é independente. A preferência do LCD é enviada apenas ao dispositivo selecionado. Como o HD44780 não desenha caracteres chineses, o perfil `zh` usa rótulos ASCII no LCD e mantém mandarim completo no dashboard.

## 6. Alertas e RFID

- temperatura: RGB vermelho e dois bipes graves;
- umidade: RGB azul e um bipe médio longo;
- luminosidade: RGB amarelo e três bipes agudos;
- comando de teste: RGB magenta;
- situação normal: RGB verde.

Uma tag autorizada pausa luz e som por 60 segundos e publica o operador/UID. Se a condição continuar errada, o alarme volta. Se normalizar, a resolução e o último operador ficam registrados. Troque as entradas de `AUTHORIZED_TAGS` pelos UIDs reais da equipe.

## 7. Teste completo

1. Clique em **Provisionar** no dashboard.
2. Inicie Wokwi e abra o Serial Monitor em 115200 baud.
3. Confirme as mensagens `[WiFi] Conectado` e `[MQTT] Conectado`.
4. Aguarde a primeira publicação; o dispositivo deve ficar **Online** no dashboard.
5. Altere DHT/LDR e confira cards e gráficos.
6. Force cada faixa de erro e confira RGB/buzzer.
7. Aproxime uma tag e confira operador, pausa e retomada.
8. Em **Preferências**, altere separadamente idioma/unidade do dashboard e do visor.
9. No modo especialista, teste o alerta remoto e o relatório.

Se MQTT conectar mas não houver dados, verifique primeiro se o Device ID selecionado no dashboard corresponde ao firmware e se o dispositivo está provisionado. Se o dashboard mostrar a infraestrutura offline, confirme os contêineres com `docker ps` na EC2.
