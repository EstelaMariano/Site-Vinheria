# Starlight — Wine Intelligence

Dashboard React para monitoramento real da Vinheria Agnello. A ESP32 envia temperatura, umidade, luminosidade, alertas e eventos RFID por MQTT; a plataforma FIWARE mantém o estado atual e o histórico; o próprio dashboard provisiona e configura os dispositivos.

## O que está pronto

- Visão geral e modo especialista.
- Temperatura, umidade e luminosidade reais, sem dados demonstrativos.
- Gráficos para 1 h, 6 h, 24 h, 7 dias, intervalo personalizado ou todo o período.
- Relatório de alertas, falhas de sensores, comunicação, comandos e eventos RFID.
- Exportação CSV.
- Dashboard em português, inglês, espanhol, francês, alemão e mandarim.
- Celsius ou Fahrenheit no dashboard.
- Idioma e unidade do LCD configurados separadamente para cada dispositivo.
- Provisionamento, atualização e remoção no IoT Agent pelo próprio dashboard.
- Criação automática da assinatura histórica no STH-Comet.
- Perfil Wokwi e perfil físico prontos e separados.
- LED RGB, buzzer, DHT, LDR, LCD e RFID integrados no firmware.

## Sem Postman

O Postman não faz parte do fluxo. Em **Dispositivos**, escolha **Simulação Wokwi** ou **Adega física** e clique em **Provisionar**. O dashboard:

1. garante o grupo de serviço `TEF`;
2. cadastra ou atualiza o dispositivo no IoT Agent;
3. cria a assinatura do Orion para o STH-Comet;
4. passa a mostrar somente os dados reais recebidos.

O servidor do Site encaminha as requisições para a EC2 `13.221.253.95`. Assim, o navegador não acessa diretamente as APIs HTTP e não sofre bloqueio de conteúdo misto/CORS.

## Dispositivos preparados

| Uso | Device ID | Entity ID | Sensor | Buzzer | RFID |
|---|---|---|---|---:|---|
| Wokwi | `lamp200` | `urn:ngsi-ld:WineCellar:200` | DHT22, GPIO 4 | GPIO 18 | SS 5, SCK 14, MISO 19, MOSI 13, RST 17 |
| Físico | `cellar001` | `urn:ngsi-ld:WineCellar:001` | DHT11, GPIO 4 | GPIO 13 | SS 5, SCK 18, MISO 19, MOSI 23, RST 33 |

Nos dois perfis: LDR no GPIO 34; RGB nos GPIOs 25, 26 e 27; LCD I2C em SDA 21/SCL 22; MQTT em `13.221.253.95:1883`.

## Executar localmente

Requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

O Vite usa os proxies `/api/orion`, `/api/iot` e `/api/sth`, já configurados para a EC2. Não é preciso criar `.env` para o teste padrão.

Validação completa:

```bash
npm run firmware:generate
npm run lint
npm run build:site
npm run validate:site
```

## Firmware

- Wokwi: `firmware/wokwi/starlight_wokwi.ino`
- Montagem física: `firmware/physical/starlight_physical.ino`
- Código-base compartilhado: `firmware/starlight_esp32/starlight_esp32.ino`

No firmware físico, altere somente `SEU_WIFI` e `SUA_SENHA` antes de gravar a placa. Não envie a senha verdadeira ao GitHub. As bibliotecas necessárias estão no `libraries.txt` de cada pasta.

## Arquitetura

```text
ESP32/Wokwi --MQTT:1883--> Mosquitto --> IoT Agent --> Orion
                                                      |
                                                      +--> STH-Comet --> MongoDB

Navegador --> Site Starlight (proxy seguro) --> Orion / IoT Agent / STH-Comet
```

O Orion fornece o estado atual. O STH-Comet fornece as amostras históricas. O IoT Agent traduz UltraLight/MQTT para entidades NGSIv2 e transforma os comandos do dashboard em mensagens MQTT.

O guia de montagem, contrato de dados e teste está em `docs/fiware-esp32-setup.md`.
