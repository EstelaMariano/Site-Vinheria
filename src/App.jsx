import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FIWARE_HEADERS, ORION_URL, SERVICE, SERVICE_PATH, STH_URL,
  getInfrastructureHealth, listProvisionedDevices, provisionDevice, unprovisionDevice,
} from './fiware.js'

const TEXT = {
  pt: {
    device: 'Dispositivo', devices: 'Dispositivos', settings: 'Preferências', online: 'Online', offline: 'Offline', connecting: 'Conectando', stale: 'Dados desatualizados',
    monitoring: 'MONITORAMENTO DA VINHERIA', conditionsAt: 'Condições da', subtitle: 'Dados reais enviados pelo protótipo físico e armazenados na plataforma FIWARE.',
    general: 'Visão geral', expert: 'Modo especialista', export: 'Exportar relatório', normalEnvironment: 'Ambiente dentro das condições definidas', normalSensors: 'Os três sensores estão sendo monitorados normalmente.',
    attention: 'condição fora da faixa ideal', attentions: 'condições fora da faixa ideal', needsAttention: 'exige atenção.', needAttention: 'exigem atenção.', reading: 'Leitura', lastSync: 'Última sincronização', checkConnection: 'Verifique a comunicação entre ESP32, MQTT e FIWARE.',
    normal: 'Normal', alert: 'Alerta', noData: 'Sem dados', idealRange: 'Faixa ideal', summaryPeriod: 'Resumo do período', occurrences: 'ocorrências', samples: 'amostras',
    hasEvents: 'Há eventos reais registrados para análise.', noEvents: 'Nenhuma ocorrência real registrada no período.', historicalData: 'DADOS HISTÓRICOS', evolution: 'Evolução das condições', history: 'HISTÓRICO',
    loadingHistory: 'Carregando histórico...', historyFailure: 'Falha ao consultar o STH-Comet', noSamples: 'Nenhuma amostra real neste período', min: 'Mín.', average: 'Média', max: 'Máx.', minShort: 'mín.', maxShort: 'máx.',
    hour1: '1 hora', hour6: '6 horas', hour24: '24 horas', day7: '7 dias', custom: 'Personalizado', allTime: 'Todo o período', from: 'De', to: 'Até', apply: 'Aplicar período',
    technicalControl: 'CONTROLE TÉCNICO', diagnostics: 'Diagnóstico e configuração', expertActive: 'MODO ESPECIALISTA ATIVO', fiwareId: 'IDENTIFICAÇÃO FIWARE', triggers: 'TRIGGERS POR DISPOSITIVO', operationalLimits: 'Limites operacionais',
    limitsSaved: 'Os limites ficam salvos neste navegador e são aplicados aos gráficos, alertas e relatórios.', remoteCommand: 'COMANDO REMOTO', physicalAlert: 'Alerta físico', alertOn: 'LED e buzzer ativados', alertOff: 'Alerta físico desativado',
    deactivateAlert: 'Desativar alerta', activateAlert: 'Ativar alerta', sending: 'Enviando...', request: 'Solicitação', noCommand: 'Nenhum comando pendente', requestSending: 'Enviando solicitação ao Orion...', requestAccepted: 'Solicitação aceita; aguardando confirmação do ESP32', confirmed: 'Comando confirmado pelo ESP32', commandFailure: 'Falha no envio do comando',
    incidentReport: 'RELATÓRIO DE OCORRÊNCIAS', alertsFailures: 'Alertas e falhas registradas', inPeriod: 'no período', dateTime: 'Data e hora', category: 'Categoria', parameter: 'Parâmetro', details: 'Detalhes', severity: 'Severidade',
    environmental: 'Condição ambiental', communication: 'Comunicação', command: 'Comando', system: 'Sistema', critical: 'Crítica', warning: 'Atenção', informative: 'Informativa', realOnly: 'Este espaço recebe apenas eventos reais dos sensores e das APIs.',
    footer: 'Monitoramento inteligente para conservação de vinhos.', config: 'CONFIGURAÇÃO', manageDevices: 'Gerenciar dispositivos', close: 'Fechar', remove: 'Remover', newDevice: 'Novo dispositivo', name: 'Nome', deviceId: 'Device ID', entityType: 'Tipo da entidade', entityId: 'Entity ID', addDevice: 'Adicionar dispositivo',
    deviceHelpTitle: 'O que preencher em cada campo?', helpName: 'Nome: identificação amigável exibida no dashboard, como “Adega principal”.', helpDeviceId: 'Device ID: identificador cadastrado no IoT Agent, como cellar001.', helpEntityType: 'Tipo da entidade: tipo usado no Orion e STH-Comet, normalmente WineCellar.', helpEntityId: 'Entity ID: URN completa da entidade FIWARE, como urn:ngsi-ld:WineCellar:001.',
    preferences: 'Preferências de exibição', language: 'Idioma', unit: 'Unidade de temperatura', dashboardApply: 'Aplicado ao dashboard', deviceDisplay: 'Visor do dispositivo', dashboardReady: 'As escolhas abaixo já alteram o dashboard e os relatórios.', firmwareLater: 'Sincronização com o visor físico será adicionada quando definirmos o comando no firmware.', dashboardOnly: 'Somente dashboard por enquanto',
    temperature: 'Temperatura', humidity: 'Umidade', luminosity: 'Luminosidade', waitingSensor: 'Aguardando dados reais do sensor', below: 'Abaixo do mínimo de', above: 'Acima do máximo de', withinRange: 'Dentro da faixa ideal',
  },
  en: {
    device: 'Device', devices: 'Devices', settings: 'Preferences', online: 'Online', offline: 'Offline', connecting: 'Connecting', stale: 'Stale data',
    monitoring: 'WINE CELLAR MONITORING', conditionsAt: 'Conditions at', subtitle: 'Real data sent by the physical prototype and stored on the FIWARE platform.',
    general: 'Overview', expert: 'Expert mode', export: 'Export report', normalEnvironment: 'Environment within configured conditions', normalSensors: 'All three sensors are being monitored normally.',
    attention: 'condition outside the ideal range', attentions: 'conditions outside the ideal range', needsAttention: 'requires attention.', needAttention: 'require attention.', reading: 'Reading', lastSync: 'Last sync', checkConnection: 'Check communication between ESP32, MQTT and FIWARE.',
    normal: 'Normal', alert: 'Alert', noData: 'No data', idealRange: 'Ideal range', summaryPeriod: 'Period summary', occurrences: 'events', samples: 'samples',
    hasEvents: 'There are real events available for analysis.', noEvents: 'No real events recorded in this period.', historicalData: 'HISTORICAL DATA', evolution: 'Condition trends', history: 'HISTORY',
    loadingHistory: 'Loading history...', historyFailure: 'Unable to query STH-Comet', noSamples: 'No real samples in this period', min: 'Min.', average: 'Average', max: 'Max.', minShort: 'min.', maxShort: 'max.',
    hour1: '1 hour', hour6: '6 hours', hour24: '24 hours', day7: '7 days', custom: 'Custom', allTime: 'All time', from: 'From', to: 'To', apply: 'Apply period',
    technicalControl: 'TECHNICAL CONTROL', diagnostics: 'Diagnostics and configuration', expertActive: 'EXPERT MODE ACTIVE', fiwareId: 'FIWARE IDENTIFICATION', triggers: 'DEVICE TRIGGERS', operationalLimits: 'Operating limits',
    limitsSaved: 'Limits are saved in this browser and applied to charts, alerts and reports.', remoteCommand: 'REMOTE COMMAND', physicalAlert: 'Physical alert', alertOn: 'LED and buzzer enabled', alertOff: 'Physical alert disabled',
    deactivateAlert: 'Disable alert', activateAlert: 'Enable alert', sending: 'Sending...', request: 'Request', noCommand: 'No pending command', requestSending: 'Sending request to Orion...', requestAccepted: 'Request accepted; waiting for ESP32 confirmation', confirmed: 'Command confirmed by ESP32', commandFailure: 'Command failed',
    incidentReport: 'EVENT REPORT', alertsFailures: 'Recorded alerts and failures', inPeriod: 'in period', dateTime: 'Date and time', category: 'Category', parameter: 'Parameter', details: 'Details', severity: 'Severity',
    environmental: 'Environmental condition', communication: 'Communication', command: 'Command', system: 'System', critical: 'Critical', warning: 'Warning', informative: 'Informational', realOnly: 'This space only receives real sensor and API events.',
    footer: 'Intelligent monitoring for wine preservation.', config: 'CONFIGURATION', manageDevices: 'Manage devices', close: 'Close', remove: 'Remove', newDevice: 'New device', name: 'Name', deviceId: 'Device ID', entityType: 'Entity type', entityId: 'Entity ID', addDevice: 'Add device',
    deviceHelpTitle: 'What should I enter in each field?', helpName: 'Name: friendly identifier displayed on the dashboard, such as “Main cellar”.', helpDeviceId: 'Device ID: identifier registered in the IoT Agent, such as cellar001.', helpEntityType: 'Entity type: type used in Orion and STH-Comet, usually WineCellar.', helpEntityId: 'Entity ID: complete FIWARE entity URN, such as urn:ngsi-ld:WineCellar:001.',
    preferences: 'Display preferences', language: 'Language', unit: 'Temperature unit', dashboardApply: 'Applied to dashboard', deviceDisplay: 'Device display', dashboardReady: 'The choices below already update the dashboard and reports.', firmwareLater: 'Physical display synchronization will be added after the firmware command is defined.', dashboardOnly: 'Dashboard only for now',
    temperature: 'Temperature', humidity: 'Humidity', luminosity: 'Luminosity', waitingSensor: 'Waiting for real sensor data', below: 'Below minimum of', above: 'Above maximum of', withinRange: 'Within the ideal range',
  },
  es: {
    device: 'Dispositivo', devices: 'Dispositivos', settings: 'Preferencias', online: 'En línea', offline: 'Sin conexión', connecting: 'Conectando', stale: 'Datos desactualizados',
    monitoring: 'MONITOREO DE LA BODEGA', conditionsAt: 'Condiciones de', subtitle: 'Datos reales enviados por el prototipo físico y almacenados en la plataforma FIWARE.',
    general: 'Vista general', expert: 'Modo experto', export: 'Exportar informe', normalEnvironment: 'Ambiente dentro de las condiciones configuradas', normalSensors: 'Los tres sensores se están monitoreando con normalidad.',
    attention: 'condición fuera del rango ideal', attentions: 'condiciones fuera del rango ideal', needsAttention: 'requiere atención.', needAttention: 'requieren atención.', reading: 'Lectura', lastSync: 'Última sincronización', checkConnection: 'Verifique la comunicación entre ESP32, MQTT y FIWARE.',
    normal: 'Normal', alert: 'Alerta', noData: 'Sin datos', idealRange: 'Rango ideal', summaryPeriod: 'Resumen del período', occurrences: 'eventos', samples: 'muestras',
    hasEvents: 'Hay eventos reales disponibles para el análisis.', noEvents: 'No se registraron eventos reales en este período.', historicalData: 'DATOS HISTÓRICOS', evolution: 'Evolución de las condiciones', history: 'HISTORIAL',
    loadingHistory: 'Cargando historial...', historyFailure: 'No se pudo consultar STH-Comet', noSamples: 'No hay muestras reales en este período', min: 'Mín.', average: 'Promedio', max: 'Máx.', minShort: 'mín.', maxShort: 'máx.',
    hour1: '1 hora', hour6: '6 horas', hour24: '24 horas', day7: '7 días', custom: 'Personalizado', allTime: 'Todo el período', from: 'Desde', to: 'Hasta', apply: 'Aplicar período',
    technicalControl: 'CONTROL TÉCNICO', diagnostics: 'Diagnóstico y configuración', expertActive: 'MODO EXPERTO ACTIVO', fiwareId: 'IDENTIFICACIÓN FIWARE', triggers: 'DISPARADORES DEL DISPOSITIVO', operationalLimits: 'Límites operativos',
    limitsSaved: 'Los límites se guardan en este navegador y se aplican a gráficos, alertas e informes.', remoteCommand: 'COMANDO REMOTO', physicalAlert: 'Alerta física', alertOn: 'LED y zumbador activados', alertOff: 'Alerta física desactivada',
    deactivateAlert: 'Desactivar alerta', activateAlert: 'Activar alerta', sending: 'Enviando...', request: 'Solicitud', noCommand: 'No hay comandos pendientes', requestSending: 'Enviando solicitud a Orion...', requestAccepted: 'Solicitud aceptada; esperando confirmación del ESP32', confirmed: 'Comando confirmado por el ESP32', commandFailure: 'Error al enviar el comando',
    incidentReport: 'INFORME DE EVENTOS', alertsFailures: 'Alertas y fallos registrados', inPeriod: 'en el período', dateTime: 'Fecha y hora', category: 'Categoría', parameter: 'Parámetro', details: 'Detalles', severity: 'Severidad',
    environmental: 'Condición ambiental', communication: 'Comunicación', command: 'Comando', system: 'Sistema', critical: 'Crítica', warning: 'Atención', informative: 'Informativa', realOnly: 'Este espacio solo recibe eventos reales de sensores y API.',
    footer: 'Monitoreo inteligente para la conservación del vino.', config: 'CONFIGURACIÓN', manageDevices: 'Administrar dispositivos', close: 'Cerrar', remove: 'Eliminar', newDevice: 'Nuevo dispositivo', name: 'Nombre', deviceId: 'Device ID', entityType: 'Tipo de entidad', entityId: 'Entity ID', addDevice: 'Agregar dispositivo',
    deviceHelpTitle: '¿Qué debo informar en cada campo?', helpName: 'Nombre: identificador amigable que aparece en el dashboard, como “Bodega principal”.', helpDeviceId: 'Device ID: identificador registrado en IoT Agent, como cellar001.', helpEntityType: 'Tipo de entidad: tipo utilizado en Orion y STH-Comet, normalmente WineCellar.', helpEntityId: 'Entity ID: URN completa de la entidad FIWARE, como urn:ngsi-ld:WineCellar:001.',
    preferences: 'Preferencias de visualización', language: 'Idioma', unit: 'Unidad de temperatura', dashboardApply: 'Aplicado al dashboard', deviceDisplay: 'Pantalla del dispositivo', dashboardReady: 'Las opciones siguientes ya modifican el dashboard y los informes.', firmwareLater: 'La sincronización con la pantalla física se agregará cuando se defina el comando del firmware.', dashboardOnly: 'Solo dashboard por ahora',
    temperature: 'Temperatura', humidity: 'Humedad', luminosity: 'Luminosidad', waitingSensor: 'Esperando datos reales del sensor', below: 'Por debajo del mínimo de', above: 'Por encima del máximo de', withinRange: 'Dentro del rango ideal',
  },
  fr: {
    device: 'Appareil', devices: 'Appareils', settings: 'Préférences', online: 'En ligne', offline: 'Hors ligne', connecting: 'Connexion', stale: 'Données obsolètes',
    monitoring: 'SURVEILLANCE DE LA CAVE', conditionsAt: 'Conditions de', subtitle: 'Données réelles envoyées par le prototype physique et stockées sur la plateforme FIWARE.',
    general: 'Vue générale', expert: 'Mode expert', export: 'Exporter le rapport', normalEnvironment: 'Environnement conforme aux conditions définies', normalSensors: 'Les trois capteurs sont surveillés normalement.',
    attention: 'condition hors de la plage idéale', attentions: 'conditions hors de la plage idéale', needsAttention: 'nécessite une attention.', needAttention: 'nécessitent une attention.', reading: 'Mesure', lastSync: 'Dernière synchronisation', checkConnection: 'Vérifiez la communication entre ESP32, MQTT et FIWARE.',
    normal: 'Normal', alert: 'Alerte', noData: 'Aucune donnée', idealRange: 'Plage idéale', summaryPeriod: 'Résumé de la période', occurrences: 'événements', samples: 'échantillons',
    hasEvents: 'Des événements réels sont disponibles pour analyse.', noEvents: 'Aucun événement réel enregistré pendant cette période.', historicalData: 'DONNÉES HISTORIQUES', evolution: 'Évolution des conditions', history: 'HISTORIQUE',
    loadingHistory: 'Chargement de l’historique...', historyFailure: 'Impossible d’interroger STH-Comet', noSamples: 'Aucun échantillon réel pour cette période', min: 'Min.', average: 'Moyenne', max: 'Max.', minShort: 'min.', maxShort: 'max.',
    hour1: '1 heure', hour6: '6 heures', hour24: '24 heures', day7: '7 jours', custom: 'Personnalisé', allTime: 'Toute la période', from: 'Du', to: 'Au', apply: 'Appliquer la période',
    technicalControl: 'CONTRÔLE TECHNIQUE', diagnostics: 'Diagnostic et configuration', expertActive: 'MODE EXPERT ACTIF', fiwareId: 'IDENTIFICATION FIWARE', triggers: 'SEUILS DE L’APPAREIL', operationalLimits: 'Limites opérationnelles',
    limitsSaved: 'Les limites sont enregistrées dans ce navigateur et appliquées aux graphiques, alertes et rapports.', remoteCommand: 'COMMANDE À DISTANCE', physicalAlert: 'Alerte physique', alertOn: 'LED et buzzer activés', alertOff: 'Alerte physique désactivée',
    deactivateAlert: 'Désactiver l’alerte', activateAlert: 'Activer l’alerte', sending: 'Envoi...', request: 'Demande', noCommand: 'Aucune commande en attente', requestSending: 'Envoi de la demande à Orion...', requestAccepted: 'Demande acceptée ; attente de confirmation de l’ESP32', confirmed: 'Commande confirmée par l’ESP32', commandFailure: 'Échec de la commande',
    incidentReport: 'RAPPORT D’ÉVÉNEMENTS', alertsFailures: 'Alertes et défaillances enregistrées', inPeriod: 'sur la période', dateTime: 'Date et heure', category: 'Catégorie', parameter: 'Paramètre', details: 'Détails', severity: 'Gravité',
    environmental: 'Condition environnementale', communication: 'Communication', command: 'Commande', system: 'Système', critical: 'Critique', warning: 'Attention', informative: 'Information', realOnly: 'Cet espace reçoit uniquement les événements réels des capteurs et des API.',
    footer: 'Surveillance intelligente pour la conservation du vin.', config: 'CONFIGURATION', manageDevices: 'Gérer les appareils', close: 'Fermer', remove: 'Supprimer', newDevice: 'Nouvel appareil', name: 'Nom', deviceId: 'Device ID', entityType: 'Type d’entité', entityId: 'Entity ID', addDevice: 'Ajouter l’appareil',
    deviceHelpTitle: 'Que faut-il renseigner dans chaque champ ?', helpName: 'Nom : identifiant lisible affiché dans le dashboard, comme « Cave principale ».', helpDeviceId: 'Device ID : identifiant enregistré dans l’IoT Agent, comme cellar001.', helpEntityType: 'Type d’entité : type utilisé dans Orion et STH-Comet, généralement WineCellar.', helpEntityId: 'Entity ID : URN complète de l’entité FIWARE, comme urn:ngsi-ld:WineCellar:001.',
    preferences: 'Préférences d’affichage', language: 'Langue', unit: 'Unité de température', dashboardApply: 'Appliqué au dashboard', deviceDisplay: 'Écran de l’appareil', dashboardReady: 'Les choix ci-dessous modifient déjà le dashboard et les rapports.', firmwareLater: 'La synchronisation avec l’écran physique sera ajoutée lorsque la commande du firmware sera définie.', dashboardOnly: 'Dashboard uniquement pour le moment',
    temperature: 'Température', humidity: 'Humidité', luminosity: 'Luminosité', waitingSensor: 'En attente de données réelles du capteur', below: 'Sous le minimum de', above: 'Au-dessus du maximum de', withinRange: 'Dans la plage idéale',
  },
  de: {
    device: 'Gerät', devices: 'Geräte', settings: 'Einstellungen', online: 'Online', offline: 'Offline', connecting: 'Verbindung wird hergestellt', stale: 'Veraltete Daten',
    monitoring: 'WEINKELLERÜBERWACHUNG', conditionsAt: 'Bedingungen in', subtitle: 'Echte Daten vom physischen Prototyp, gespeichert auf der FIWARE-Plattform.',
    general: 'Übersicht', expert: 'Expertenmodus', export: 'Bericht exportieren', normalEnvironment: 'Umgebung innerhalb der festgelegten Bedingungen', normalSensors: 'Alle drei Sensoren werden normal überwacht.',
    attention: 'Bedingung außerhalb des Idealbereichs', attentions: 'Bedingungen außerhalb des Idealbereichs', needsAttention: 'erfordert Aufmerksamkeit.', needAttention: 'erfordern Aufmerksamkeit.', reading: 'Messung', lastSync: 'Letzte Synchronisierung', checkConnection: 'Überprüfen Sie die Verbindung zwischen ESP32, MQTT und FIWARE.',
    normal: 'Normal', alert: 'Alarm', noData: 'Keine Daten', idealRange: 'Idealbereich', summaryPeriod: 'Zeitraumübersicht', occurrences: 'Ereignisse', samples: 'Messwerte',
    hasEvents: 'Echte Ereignisse stehen zur Analyse bereit.', noEvents: 'In diesem Zeitraum wurden keine echten Ereignisse erfasst.', historicalData: 'HISTORISCHE DATEN', evolution: 'Entwicklung der Bedingungen', history: 'VERLAUF',
    loadingHistory: 'Verlauf wird geladen...', historyFailure: 'STH-Comet konnte nicht abgefragt werden', noSamples: 'Keine echten Messwerte in diesem Zeitraum', min: 'Min.', average: 'Mittel', max: 'Max.', minShort: 'min.', maxShort: 'max.',
    hour1: '1 Stunde', hour6: '6 Stunden', hour24: '24 Stunden', day7: '7 Tage', custom: 'Benutzerdefiniert', allTime: 'Gesamter Zeitraum', from: 'Von', to: 'Bis', apply: 'Zeitraum anwenden',
    technicalControl: 'TECHNISCHE STEUERUNG', diagnostics: 'Diagnose und Konfiguration', expertActive: 'EXPERTENMODUS AKTIV', fiwareId: 'FIWARE-IDENTIFIKATION', triggers: 'GERÄTEGRENZWERTE', operationalLimits: 'Betriebsgrenzen',
    limitsSaved: 'Grenzwerte werden in diesem Browser gespeichert und auf Diagramme, Alarme und Berichte angewendet.', remoteCommand: 'FERNSTEUERUNG', physicalAlert: 'Physischer Alarm', alertOn: 'LED und Summer aktiviert', alertOff: 'Physischer Alarm deaktiviert',
    deactivateAlert: 'Alarm deaktivieren', activateAlert: 'Alarm aktivieren', sending: 'Wird gesendet...', request: 'Anfrage', noCommand: 'Kein ausstehender Befehl', requestSending: 'Anfrage wird an Orion gesendet...', requestAccepted: 'Anfrage akzeptiert; ESP32-Bestätigung wird erwartet', confirmed: 'Befehl vom ESP32 bestätigt', commandFailure: 'Befehl fehlgeschlagen',
    incidentReport: 'EREIGNISBERICHT', alertsFailures: 'Erfasste Alarme und Fehler', inPeriod: 'im Zeitraum', dateTime: 'Datum und Uhrzeit', category: 'Kategorie', parameter: 'Parameter', details: 'Details', severity: 'Schweregrad',
    environmental: 'Umgebungsbedingung', communication: 'Kommunikation', command: 'Befehl', system: 'System', critical: 'Kritisch', warning: 'Warnung', informative: 'Information', realOnly: 'Dieser Bereich enthält ausschließlich echte Sensor- und API-Ereignisse.',
    footer: 'Intelligente Überwachung für die Weinlagerung.', config: 'KONFIGURATION', manageDevices: 'Geräte verwalten', close: 'Schließen', remove: 'Entfernen', newDevice: 'Neues Gerät', name: 'Name', deviceId: 'Device ID', entityType: 'Entitätstyp', entityId: 'Entity ID', addDevice: 'Gerät hinzufügen',
    deviceHelpTitle: 'Was gehört in die einzelnen Felder?', helpName: 'Name: verständliche Bezeichnung im Dashboard, z. B. „Hauptkeller“.', helpDeviceId: 'Device ID: im IoT Agent registrierte Kennung, z. B. cellar001.', helpEntityType: 'Entitätstyp: in Orion und STH-Comet verwendeter Typ, normalerweise WineCellar.', helpEntityId: 'Entity ID: vollständige FIWARE-URN der Entität, z. B. urn:ngsi-ld:WineCellar:001.',
    preferences: 'Anzeigeeinstellungen', language: 'Sprache', unit: 'Temperatureinheit', dashboardApply: 'Auf das Dashboard angewendet', deviceDisplay: 'Geräteanzeige', dashboardReady: 'Die folgenden Einstellungen ändern bereits das Dashboard und die Berichte.', firmwareLater: 'Die Synchronisierung mit der physischen Anzeige wird ergänzt, sobald der Firmware-Befehl definiert ist.', dashboardOnly: 'Derzeit nur Dashboard',
    temperature: 'Temperatur', humidity: 'Luftfeuchtigkeit', luminosity: 'Helligkeit', waitingSensor: 'Warten auf echte Sensordaten', below: 'Unter dem Minimum von', above: 'Über dem Maximum von', withinRange: 'Im Idealbereich',
  },
  zh: {
    device: '设备', devices: '设备管理', settings: '偏好设置', online: '在线', offline: '离线', connecting: '正在连接', stale: '数据已过期',
    monitoring: '酒窖环境监测', conditionsAt: '环境状况：', subtitle: '由实体原型发送并存储在 FIWARE 平台上的真实数据。',
    general: '概览', expert: '专家模式', export: '导出报告', normalEnvironment: '环境处于设定范围内', normalSensors: '三个传感器均正常监测中。',
    attention: '项环境条件超出理想范围', attentions: '项环境条件超出理想范围', needsAttention: '需要关注。', needAttention: '需要关注。', reading: '读数', lastSync: '上次同步', checkConnection: '请检查 ESP32、MQTT 与 FIWARE 之间的通信。',
    normal: '正常', alert: '警报', noData: '无数据', idealRange: '理想范围', summaryPeriod: '时段摘要', occurrences: '条事件', samples: '个样本',
    hasEvents: '存在可供分析的真实事件。', noEvents: '该时段内没有记录真实事件。', historicalData: '历史数据', evolution: '环境变化趋势', history: '历史记录',
    loadingHistory: '正在加载历史记录...', historyFailure: '无法查询 STH-Comet', noSamples: '该时段内没有真实样本', min: '最低', average: '平均', max: '最高', minShort: '最低', maxShort: '最高',
    hour1: '1 小时', hour6: '6 小时', hour24: '24 小时', day7: '7 天', custom: '自定义', allTime: '全部时间', from: '开始', to: '结束', apply: '应用时段',
    technicalControl: '技术控制', diagnostics: '诊断与配置', expertActive: '专家模式已启用', fiwareId: 'FIWARE 标识', triggers: '设备阈值', operationalLimits: '运行限值',
    limitsSaved: '限值保存在此浏览器中，并应用于图表、警报和报告。', remoteCommand: '远程命令', physicalAlert: '实体警报', alertOn: 'LED 与蜂鸣器已启用', alertOff: '实体警报已关闭',
    deactivateAlert: '关闭警报', activateAlert: '启用警报', sending: '正在发送...', request: '请求', noCommand: '没有待处理命令', requestSending: '正在向 Orion 发送请求...', requestAccepted: '请求已接受，正在等待 ESP32 确认', confirmed: 'ESP32 已确认命令', commandFailure: '命令发送失败',
    incidentReport: '事件报告', alertsFailures: '已记录的警报与故障', inPeriod: '在所选时段内', dateTime: '日期和时间', category: '类别', parameter: '参数', details: '详情', severity: '严重程度',
    environmental: '环境条件', communication: '通信', command: '命令', system: '系统', critical: '严重', warning: '注意', informative: '信息', realOnly: '此区域仅显示来自传感器和 API 的真实事件。',
    footer: '用于葡萄酒保存的智能监测。', config: '配置', manageDevices: '管理设备', close: '关闭', remove: '移除', newDevice: '新设备', name: '名称', deviceId: 'Device ID', entityType: '实体类型', entityId: 'Entity ID', addDevice: '添加设备',
    deviceHelpTitle: '每个字段应该填写什么？', helpName: '名称：显示在仪表板中的易读名称，例如“主酒窖”。', helpDeviceId: 'Device ID：在 IoT Agent 中注册的设备标识，例如 cellar001。', helpEntityType: '实体类型：Orion 与 STH-Comet 使用的类型，通常为 WineCellar。', helpEntityId: 'Entity ID：FIWARE 实体的完整 URN，例如 urn:ngsi-ld:WineCellar:001。',
    preferences: '显示偏好设置', language: '语言', unit: '温度单位', dashboardApply: '应用于仪表板', deviceDisplay: '设备显示屏', dashboardReady: '以下选项已可更改仪表板和报告。', firmwareLater: '定义固件命令后，将添加与实体显示屏的同步功能。', dashboardOnly: '目前仅应用于仪表板',
    temperature: '温度', humidity: '湿度', luminosity: '光照', waitingSensor: '正在等待真实传感器数据', below: '低于最低值', above: '高于最高值', withinRange: '处于理想范围内',
  },
}

const DEVICE_TEXT = {
  pt: {
    syncNow: 'Sincronizar com o dispositivo', syncingDevice: 'Sincronizando...', syncSuccess: 'Visor sincronizado com a ESP32', syncFailure: 'Não foi possível sincronizar o visor', deviceCurrent: 'Configuração informada pela ESP32', deviceNotReported: 'Ainda não informada',
    alarmState: 'Estado físico', alarmReason: 'Motivo do alerta', lastOperator: 'Último responsável', lastAction: 'Última ação', alarmActive: 'Alarme ativo', alarmAcknowledged: 'Alarme pausado', alarmNormal: 'Condição normal', access: 'Acesso RFID', sensorFailure: 'Falha de sensor',
    sitePreferences: 'Dashboard e relatórios', selectedDisplay: 'Visor do dispositivo selecionado', provisioned: 'Provisionado', pending: 'Não provisionado', provisionNow: 'Provisionar', reprovision: 'Atualizar provisionamento', provisioning: 'Provisionando...', provisionSuccess: 'Dispositivo provisionado com sucesso', unprovisionConfirm: 'Remover este dispositivo do IoT Agent e a assinatura histórica?', operationFailure: 'Não foi possível concluir a operação', profile: 'Perfil', physicalProfile: 'Dispositivo físico', wokwiProfile: 'Simulação Wokwi', customProfile: 'Personalizado', infrastructureReady: 'Infraestrutura FIWARE conectada',
  },
  en: {
    syncNow: 'Sync with device', syncingDevice: 'Syncing...', syncSuccess: 'Display synced with ESP32', syncFailure: 'Unable to sync device display', deviceCurrent: 'Configuration reported by ESP32', deviceNotReported: 'Not reported yet',
    alarmState: 'Physical state', alarmReason: 'Alert reason', lastOperator: 'Last responsible person', lastAction: 'Last action', alarmActive: 'Alarm active', alarmAcknowledged: 'Alarm muted', alarmNormal: 'Normal condition', access: 'RFID access', sensorFailure: 'Sensor failure',
    sitePreferences: 'Dashboard and reports', selectedDisplay: 'Selected device display', provisioned: 'Provisioned', pending: 'Not provisioned', provisionNow: 'Provision', reprovision: 'Update provisioning', provisioning: 'Provisioning...', provisionSuccess: 'Device provisioned successfully', unprovisionConfirm: 'Remove this device from the IoT Agent and its historical subscription?', operationFailure: 'Unable to complete the operation', profile: 'Profile', physicalProfile: 'Physical device', wokwiProfile: 'Wokwi simulation', customProfile: 'Custom', infrastructureReady: 'FIWARE infrastructure connected',
  },
  es: {
    syncNow: 'Sincronizar con el dispositivo', syncingDevice: 'Sincronizando...', syncSuccess: 'Pantalla sincronizada con la ESP32', syncFailure: 'No se pudo sincronizar la pantalla', deviceCurrent: 'Configuración informada por la ESP32', deviceNotReported: 'Aún no informada',
    alarmState: 'Estado físico', alarmReason: 'Motivo de la alerta', lastOperator: 'Último responsable', lastAction: 'Última acción', alarmActive: 'Alarma activa', alarmAcknowledged: 'Alarma silenciada', alarmNormal: 'Condición normal', access: 'Acceso RFID', sensorFailure: 'Fallo del sensor',
    sitePreferences: 'Dashboard e informes', selectedDisplay: 'Pantalla del dispositivo seleccionado', provisioned: 'Provisionado', pending: 'No provisionado', provisionNow: 'Provisionar', reprovision: 'Actualizar provisionamiento', provisioning: 'Provisionando...', provisionSuccess: 'Dispositivo provisionado correctamente', unprovisionConfirm: '¿Eliminar este dispositivo del IoT Agent y su suscripción histórica?', operationFailure: 'No se pudo completar la operación', profile: 'Perfil', physicalProfile: 'Dispositivo físico', wokwiProfile: 'Simulación Wokwi', customProfile: 'Personalizado', infrastructureReady: 'Infraestructura FIWARE conectada',
  },
  fr: {
    syncNow: 'Synchroniser avec l’appareil', syncingDevice: 'Synchronisation...', syncSuccess: 'Écran synchronisé avec l’ESP32', syncFailure: 'Impossible de synchroniser l’écran', deviceCurrent: 'Configuration signalée par l’ESP32', deviceNotReported: 'Pas encore signalée',
    alarmState: 'État physique', alarmReason: 'Motif de l’alerte', lastOperator: 'Dernier responsable', lastAction: 'Dernière action', alarmActive: 'Alarme active', alarmAcknowledged: 'Alarme coupée', alarmNormal: 'Condition normale', access: 'Accès RFID', sensorFailure: 'Défaillance du capteur',
    sitePreferences: 'Dashboard et rapports', selectedDisplay: 'Écran de l’appareil sélectionné', provisioned: 'Provisionné', pending: 'Non provisionné', provisionNow: 'Provisionner', reprovision: 'Mettre à jour', provisioning: 'Provisionnement...', provisionSuccess: 'Appareil provisionné avec succès', unprovisionConfirm: 'Supprimer cet appareil de l’IoT Agent et son abonnement historique ?', operationFailure: 'Impossible de terminer l’opération', profile: 'Profil', physicalProfile: 'Appareil physique', wokwiProfile: 'Simulation Wokwi', customProfile: 'Personnalisé', infrastructureReady: 'Infrastructure FIWARE connectée',
  },
  de: {
    syncNow: 'Mit dem Gerät synchronisieren', syncingDevice: 'Synchronisierung...', syncSuccess: 'Anzeige mit ESP32 synchronisiert', syncFailure: 'Anzeige konnte nicht synchronisiert werden', deviceCurrent: 'Von der ESP32 gemeldete Konfiguration', deviceNotReported: 'Noch nicht gemeldet',
    alarmState: 'Physischer Zustand', alarmReason: 'Alarmgrund', lastOperator: 'Letzte verantwortliche Person', lastAction: 'Letzte Aktion', alarmActive: 'Alarm aktiv', alarmAcknowledged: 'Alarm pausiert', alarmNormal: 'Normalzustand', access: 'RFID-Zugriff', sensorFailure: 'Sensorfehler',
    sitePreferences: 'Dashboard und Berichte', selectedDisplay: 'Anzeige des ausgewählten Geräts', provisioned: 'Provisioniert', pending: 'Nicht provisioniert', provisionNow: 'Provisionieren', reprovision: 'Provisionierung aktualisieren', provisioning: 'Provisionierung...', provisionSuccess: 'Gerät erfolgreich provisioniert', unprovisionConfirm: 'Dieses Gerät aus dem IoT Agent und dem Verlauf entfernen?', operationFailure: 'Vorgang konnte nicht abgeschlossen werden', profile: 'Profil', physicalProfile: 'Physisches Gerät', wokwiProfile: 'Wokwi-Simulation', customProfile: 'Benutzerdefiniert', infrastructureReady: 'FIWARE-Infrastruktur verbunden',
  },
  zh: {
    syncNow: '与设备同步', syncingDevice: '正在同步...', syncSuccess: '显示屏已与 ESP32 同步', syncFailure: '无法同步设备显示屏', deviceCurrent: 'ESP32 报告的配置', deviceNotReported: '尚未报告',
    alarmState: '物理状态', alarmReason: '警报原因', lastOperator: '最后负责人', lastAction: '最后操作', alarmActive: '警报已激活', alarmAcknowledged: '警报已静音', alarmNormal: '状态正常', access: 'RFID 访问', sensorFailure: '传感器故障',
    sitePreferences: '仪表板和报告', selectedDisplay: '所选设备显示屏', provisioned: '已配置', pending: '未配置', provisionNow: '配置设备', reprovision: '更新配置', provisioning: '正在配置...', provisionSuccess: '设备配置成功', unprovisionConfirm: '从 IoT Agent 和历史订阅中删除此设备吗？', operationFailure: '无法完成操作', profile: '配置文件', physicalProfile: '实体设备', wokwiProfile: 'Wokwi 模拟', customProfile: '自定义', infrastructureReady: 'FIWARE 基础设施已连接',
  },
}

const DEVICE_ACTIONS = {
  pt: { alarm_started: 'Alarme iniciado', alarm_updated: 'Condições do alarme atualizadas', alarm_acknowledged: 'Alarme reconhecido por RFID', alarm_acknowledged_remote: 'Alarme pausado pelo dashboard', alarm_resumed: 'Alarme retomado: a condição não foi corrigida', alarm_resumed_new_condition: 'Alarme retomado por uma nova condição', alarm_resolved_after_ack: 'Condição corrigida após reconhecimento', condition_normalized: 'Condição normalizada', rfid_access_denied: 'Tag RFID não autorizada', rfid_inspection: 'Inspeção registrada por RFID', remote_alert_activated: 'Alarme ativado pelo dashboard', remote_alert_deactivated: 'Alarme desativado pelo dashboard', display_language_changed: 'Idioma do visor alterado', temperature_unit_changed: 'Unidade do visor alterada' },
  en: { alarm_started: 'Alarm started', alarm_updated: 'Alarm conditions updated', alarm_acknowledged: 'Alarm acknowledged by RFID', alarm_acknowledged_remote: 'Alarm muted by dashboard', alarm_resumed: 'Alarm resumed: condition was not corrected', alarm_resumed_new_condition: 'Alarm resumed due to a new condition', alarm_resolved_after_ack: 'Condition corrected after acknowledgment', condition_normalized: 'Condition returned to normal', rfid_access_denied: 'Unauthorized RFID tag', rfid_inspection: 'Inspection recorded by RFID', remote_alert_activated: 'Alarm enabled by dashboard', remote_alert_deactivated: 'Alarm disabled by dashboard', display_language_changed: 'Display language changed', temperature_unit_changed: 'Display unit changed' },
  es: { alarm_started: 'Alarma iniciada', alarm_updated: 'Condiciones de alarma actualizadas', alarm_acknowledged: 'Alarma reconocida por RFID', alarm_acknowledged_remote: 'Alarma silenciada por el dashboard', alarm_resumed: 'Alarma reanudada: la condición no fue corregida', alarm_resumed_new_condition: 'Alarma reanudada por una nueva condición', alarm_resolved_after_ack: 'Condición corregida después del reconocimiento', condition_normalized: 'Condición normalizada', rfid_access_denied: 'Tag RFID no autorizada', rfid_inspection: 'Inspección registrada por RFID', remote_alert_activated: 'Alarma activada por el dashboard', remote_alert_deactivated: 'Alarma desactivada por el dashboard', display_language_changed: 'Idioma de la pantalla modificado', temperature_unit_changed: 'Unidad de la pantalla modificada' },
  fr: { alarm_started: 'Alarme déclenchée', alarm_updated: 'Conditions d’alarme mises à jour', alarm_acknowledged: 'Alarme reconnue par RFID', alarm_acknowledged_remote: 'Alarme coupée par le dashboard', alarm_resumed: 'Alarme relancée : la condition persiste', alarm_resumed_new_condition: 'Alarme relancée par une nouvelle condition', alarm_resolved_after_ack: 'Condition corrigée après reconnaissance', condition_normalized: 'Condition revenue à la normale', rfid_access_denied: 'Tag RFID non autorisé', rfid_inspection: 'Inspection enregistrée par RFID', remote_alert_activated: 'Alarme activée par le dashboard', remote_alert_deactivated: 'Alarme désactivée par le dashboard', display_language_changed: 'Langue de l’écran modifiée', temperature_unit_changed: 'Unité de l’écran modifiée' },
  de: { alarm_started: 'Alarm gestartet', alarm_updated: 'Alarmbedingungen aktualisiert', alarm_acknowledged: 'Alarm per RFID bestätigt', alarm_acknowledged_remote: 'Alarm über Dashboard pausiert', alarm_resumed: 'Alarm fortgesetzt: Zustand nicht behoben', alarm_resumed_new_condition: 'Alarm wegen neuer Bedingung fortgesetzt', alarm_resolved_after_ack: 'Zustand nach Bestätigung behoben', condition_normalized: 'Zustand normalisiert', rfid_access_denied: 'Nicht autorisierter RFID-Tag', rfid_inspection: 'Inspektion per RFID erfasst', remote_alert_activated: 'Alarm über Dashboard aktiviert', remote_alert_deactivated: 'Alarm über Dashboard deaktiviert', display_language_changed: 'Anzeigesprache geändert', temperature_unit_changed: 'Anzeigeeinheit geändert' },
  zh: { alarm_started: '警报已启动', alarm_updated: '警报条件已更新', alarm_acknowledged: '已通过 RFID 确认警报', alarm_acknowledged_remote: '仪表板已将警报静音', alarm_resumed: '问题未解决，警报已恢复', alarm_resumed_new_condition: '出现新情况，警报已恢复', alarm_resolved_after_ack: '确认后问题已解决', condition_normalized: '环境条件已恢复正常', rfid_access_denied: '未授权的 RFID 标签', rfid_inspection: '已通过 RFID 记录检查', remote_alert_activated: '仪表板已启用警报', remote_alert_deactivated: '仪表板已停用警报', display_language_changed: '设备显示语言已更改', temperature_unit_changed: '设备显示单位已更改' },
}

function getText(language, key) {
  return DEVICE_TEXT[language]?.[key] || TEXT[language]?.[key] || DEVICE_TEXT.pt[key] || TEXT.pt[key] || key
}

function deviceActionLabel(language, action, operator) {
  const label = DEVICE_ACTIONS[language]?.[action] || DEVICE_ACTIONS.pt[action] || action || '—'
  return operator && !['none', 'Sistema'].includes(operator) ? `${label} · ${operator}` : label
}

const LOCALES = { pt: 'pt-BR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN' }

function readingCountLabel(language, count) {
  const labels = {
    pt: `leitura${count > 1 ? 's' : ''}`,
    en: `reading${count > 1 ? 's' : ''}`,
    es: `lectura${count > 1 ? 's' : ''}`,
    fr: `mesure${count > 1 ? 's' : ''}`,
    de: count === 1 ? 'Messung' : 'Messungen',
    zh: '次读数',
  }
  return labels[language] || labels.pt
}

const PERIODS = [
  { id: '1h', labelKey: 'hour1', hours: 1, samples: 60 },
  { id: '6h', labelKey: 'hour6', hours: 6, samples: 100 },
  { id: '24h', labelKey: 'hour24', hours: 24, samples: 100 },
  { id: '7d', labelKey: 'day7', hours: 168, samples: 100 },
  { id: 'custom', labelKey: 'custom', hours: null, samples: 1000 },
  { id: 'all', labelKey: 'allTime', hours: null, samples: 1000 },
]

const METRICS = [
  {
    key: 'temperature',
    labelKey: 'temperature',
    shortLabel: 'Temperatura',
    unit: '°C',
    icon: '◒',
    color: '#632024',
    digits: 1,
  },
  {
    key: 'humidity',
    labelKey: 'humidity',
    shortLabel: 'Umidade',
    unit: '%',
    icon: '◉',
    color: '#617891',
    digits: 0,
  },
  {
    key: 'luminosity',
    labelKey: 'luminosity',
    shortLabel: 'Luz',
    unit: '%',
    icon: '☼',
    color: '#6F4D38',
    digits: 0,
  },
]

const DEFAULT_THRESHOLDS = {
  temperature: { min: 10, max: 16 },
  humidity: { min: 60, max: 80 },
  luminosity: { min: 0, max: 70 },
}

const DEFAULT_DEVICE = {
  id: 'cellar001',
  name: 'Adega física',
  entityId: import.meta.env.VITE_ENTITY_ID || 'urn:ngsi-ld:WineCellar:001',
  entityType: import.meta.env.VITE_ENTITY_TYPE || 'WineCellar',
  profile: 'physical',
  thresholds: DEFAULT_THRESHOLDS,
}

const WOKWI_DEVICE = {
  id: 'lamp200',
  name: 'Simulação Wokwi',
  entityId: 'urn:ngsi-ld:WineCellar:200',
  entityType: 'WineCellar',
  profile: 'wokwi',
  thresholds: DEFAULT_THRESHOLDS,
}

const DEFAULT_DEVICES = [DEFAULT_DEVICE, WOKWI_DEVICE]

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function readInitialDevices() {
  const stored = readStored('starlight-devices', [])
  const defaults = DEFAULT_DEVICES.map((template) => {
    const saved = stored.find((device) => device.id === template.id)
    return saved ? { ...template, ...saved, thresholds: saved.thresholds || template.thresholds } : template
  })
  const custom = stored.filter((device) => !DEFAULT_DEVICES.some((template) => template.id === device.id))
  return [...defaults, ...custom]
}

function toDateTimeInput(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function attributeValue(entity, key) {
  const aliases = {
    temperature: ['temperature', 'temperatura'],
    humidity: ['humidity', 'umidade'],
    luminosity: ['luminosity', 'luminosidade'],
    alertMode: ['alertMode', 'alert', 'alerta'],
    alertState: ['alertState', 'estadoAlerta'],
    alertReason: ['alertReason', 'motivoAlerta'],
    alarmSilenced: ['alarmSilenced', 'alarmeSilenciado'],
    lastOperator: ['lastOperator', 'ultimoOperador'],
    lastOperatorUid: ['lastOperatorUid', 'ultimoOperadorUid'],
    lastAction: ['lastAction', 'ultimaAcao'],
    lastActionTime: ['lastActionTime', 'horarioUltimaAcao'],
    displayLanguage: ['displayLanguage', 'idiomaVisor'],
    temperatureUnit: ['temperatureUnit', 'unidadeTemperatura'],
    sensorStatus: ['sensorStatus', 'statusSensor'],
    setAlertModeStatus: ['setAlertMode_status'],
    setDisplayLanguageStatus: ['setDisplayLanguage_status'],
    setTemperatureUnitStatus: ['setTemperatureUnit_status'],
    measurementTime: ['measurementTime', 'TimeInstant', 'timestamp'],
  }

  const attribute = aliases[key]?.find((name) => entity?.[name] !== undefined)
  const rawValue = attribute ? entity[attribute] : undefined
  return rawValue && typeof rawValue === 'object' && 'value' in rawValue ? rawValue.value : rawValue
}

function booleanAttribute(value) {
  return value === true || String(value).toLowerCase() === 'true'
}

function parseHistoryResponse(payload) {
  const contexts = payload?.contextResponses || (payload?.contextElement ? [payload] : [])
  const attributes = contexts.flatMap((item) => item?.contextElement?.attributes || [])
  const values = attributes.flatMap((attribute) => attribute?.values || [])

  return values
    .map((sample) => ({
      timestamp: new Date(sample.recvTime || sample.timestamp || sample.time).getTime(),
      value: Number(sample.attrValue ?? sample.value),
    }))
    .filter((sample) => Number.isFinite(sample.timestamp) && Number.isFinite(sample.value))
    .sort((a, b) => a.timestamp - b.timestamp)
}

function formatDateTime(timestamp, language = 'pt') {
  if (!timestamp) return getText(language, 'noData')
  return new Intl.DateTimeFormat(LOCALES[language] || LOCALES.pt, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

function formatShortTime(timestamp, period, language = 'pt') {
  return new Intl.DateTimeFormat(LOCALES[language] || LOCALES.pt, ['7d', 'all', 'custom'].includes(period)
    ? { day: '2-digit', month: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))
}

function metricStatus(value, limits) {
  if (!Number.isFinite(value)) return 'unknown'
  return value < limits.min || value > limits.max ? 'alert' : 'normal'
}

function metricMessage(metric, value, limits, language = 'pt') {
  if (!Number.isFinite(value)) return getText(language, 'waitingSensor')
  if (value < limits.min) return `${getText(language, 'below')} ${limits.min}${metric.unit}`
  if (value > limits.max) return `${getText(language, 'above')} ${limits.max}${metric.unit}`
  return getText(language, 'withinRange')
}

function convertTemperature(value, unit) {
  if (!Number.isFinite(value)) return value
  return unit === 'fahrenheit' ? (value * 9) / 5 + 32 : value
}

function temperatureToCelsius(value, unit) {
  if (!Number.isFinite(value)) return value
  return unit === 'fahrenheit' ? ((value - 32) * 5) / 9 : value
}

function calculateStats(data) {
  if (!data.length) return { min: null, max: null, average: null }
  const values = data.map((sample) => sample.value)
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    average: values.reduce((total, value) => total + value, 0) / values.length,
  }
}

function deriveAlertEpisodes(history, thresholds, language) {
  return METRICS.flatMap((metric) => {
    const samples = history[metric.key] || []
    const episodes = []
    let activeEpisode = null

    samples.forEach((sample, index) => {
      const outside = metricStatus(sample.value, thresholds[metric.key]) === 'alert'
      if (outside && !activeEpisode) {
        activeEpisode = { start: sample.timestamp, end: sample.timestamp, samples: [sample] }
      } else if (outside && activeEpisode) {
        activeEpisode.end = sample.timestamp
        activeEpisode.samples.push(sample)
      }

      if ((!outside || index === samples.length - 1) && activeEpisode) {
        const values = activeEpisode.samples.map((item) => item.value)
        const mostExtreme = values.reduce((selected, value) => {
          const selectedDistance = Math.max(thresholds[metric.key].min - selected, selected - thresholds[metric.key].max, 0)
          const valueDistance = Math.max(thresholds[metric.key].min - value, value - thresholds[metric.key].max, 0)
          return valueDistance > selectedDistance ? value : selected
        }, values[0])
        episodes.push({
          id: `history-${metric.key}-${activeEpisode.start}`,
          type: 'historical-alert',
          severity: 'critical',
          metric: metric.key,
          value: mostExtreme,
          timestamp: activeEpisode.start,
          endTimestamp: activeEpisode.end,
          message: `${metricMessage(metric, mostExtreme, thresholds[metric.key], language)} · ${activeEpisode.samples.length} ${readingCountLabel(language, activeEpisode.samples.length)}`,
        })
        activeEpisode = null
      }
    })

    return episodes
  })
}

function LineChart({ metric, data, limits, period, loading, error, expert, language, t }) {
  const width = 720
  const height = 230
  const padding = { top: 22, right: 24, bottom: 38, left: 46 }
  const stats = calculateStats(data)
  const values = data.map((sample) => sample.value)
  const domainValues = [...values, limits.min, limits.max]
  const rawMin = domainValues.length ? Math.min(...domainValues) : 0
  const rawMax = domainValues.length ? Math.max(...domainValues) : 100
  const margin = Math.max((rawMax - rawMin) * 0.14, 2)
  const minY = rawMin - margin
  const maxY = rawMax + margin
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom

  const xFor = (index) => padding.left + (data.length <= 1 ? graphWidth / 2 : (index / (data.length - 1)) * graphWidth)
  const yFor = (value) => padding.top + ((maxY - value) / (maxY - minY || 1)) * graphHeight
  const path = data.map((sample, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(sample.value)}`).join(' ')

  return (
    <article className="chart-card">
      <div className="chart-head">
        <div className="chart-title">
          <span className="chart-icon" style={{ background: metric.color }}>{metric.icon}</span>
          <div>
            <span className="section-kicker">{t('history')}</span>
            <h3>{metric.label}</h3>
          </div>
        </div>
        {expert && (
          <div className="chart-stats" aria-label={`Estatísticas de ${metric.label}`}>
            <span>{t('min')} <strong>{stats.min === null ? '—' : stats.min.toFixed(metric.digits)}</strong></span>
            <span>{t('average')} <strong>{stats.average === null ? '—' : stats.average.toFixed(metric.digits)}</strong></span>
            <span>{t('max')} <strong>{stats.max === null ? '—' : stats.max.toFixed(metric.digits)}</strong></span>
          </div>
        )}
      </div>

      <div className="chart-area">
        {loading && <div className="chart-state"><span className="spinner" />{t('loadingHistory')}</div>}
        {!loading && error && <div className="chart-state error-state">{t('historyFailure')}</div>}
        {!loading && !error && data.length === 0 && <div className="chart-state">{t('noSamples')}</div>}
        {!loading && !error && data.length > 0 && (
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Gráfico de ${metric.label}`}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + ratio * graphHeight
              const value = maxY - ratio * (maxY - minY)
              return (
                <g key={ratio}>
                  <line className="grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                  <text className="axis-label" x={padding.left - 9} y={y + 4} textAnchor="end">{value.toFixed(metric.digits)}</text>
                </g>
              )
            })}
            {[limits.min, limits.max].map((limit, index) => (
              <g key={limit}>
                <line className="limit-line" x1={padding.left} x2={width - padding.right} y1={yFor(limit)} y2={yFor(limit)} />
                <text className="limit-label" x={width - padding.right - 4} y={yFor(limit) - 6} textAnchor="end">
                  {index === 0 ? t('minShort') : t('maxShort')} {limit}{metric.unit}
                </text>
              </g>
            ))}
            <path className="data-area" d={`${path} L ${xFor(data.length - 1)} ${padding.top + graphHeight} L ${xFor(0)} ${padding.top + graphHeight} Z`} style={{ fill: metric.color }} />
            <path className="data-line" d={path} style={{ stroke: metric.color }} />
            {data.map((sample, index) => (
              <circle key={`${sample.timestamp}-${index}`} className="data-point" cx={xFor(index)} cy={yFor(sample.value)} r="4" style={{ fill: metric.color }}>
                <title>{`${formatDateTime(sample.timestamp, language)} — ${sample.value}${metric.unit}`}</title>
              </circle>
            ))}
            {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((index) => (
              <text key={index} className="axis-label" x={xFor(index)} y={height - 10} textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}>
                {formatShortTime(data[index].timestamp, period, language)}
              </text>
            ))}
          </svg>
        )}
      </div>
    </article>
  )
}

function DeviceModal({ devices, provisionedIds, operation, onClose, onProvision, onRemove, t }) {
  const [form, setForm] = useState({ name: '', id: '', entityId: '', entityType: 'WineCellar', profile: 'custom' })
  const [showHelp, setShowHelp] = useState(false)

  function selectProfile(profile) {
    if (profile === 'physical') {
      setForm({ name: 'Adega física', id: 'cellar001', entityId: 'urn:ngsi-ld:WineCellar:001', entityType: 'WineCellar', profile })
    } else if (profile === 'wokwi') {
      setForm({ name: 'Simulação Wokwi', id: 'lamp200', entityId: 'urn:ngsi-ld:WineCellar:200', entityType: 'WineCellar', profile })
    } else {
      setForm({ name: '', id: '', entityId: '', entityType: 'WineCellar', profile: 'custom' })
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.id.trim() || !form.entityId.trim()) return
    const completed = await onProvision({
      ...form,
      name: form.name.trim(),
      id: form.id.trim(),
      entityId: form.entityId.trim(),
      entityType: form.entityType.trim() || 'WineCellar',
      thresholds: DEFAULT_THRESHOLDS,
    })
    if (completed) setForm({ name: '', id: '', entityId: '', entityType: 'WineCellar', profile: 'custom' })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="device-modal" role="dialog" aria-modal="true" aria-labelledby="device-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><span className="section-kicker">{t('config')}</span><h2 id="device-title">{t('manageDevices')}</h2></div>
          <div className="modal-head-actions">
            <button className="help-button" type="button" onClick={() => setShowHelp((value) => !value)} aria-label={t('deviceHelpTitle')}>?</button>
            <button className="icon-button" type="button" onClick={onClose} aria-label={t('close')}>×</button>
          </div>
        </div>

        {showHelp && (
          <aside className="device-help" aria-live="polite">
            <strong>{t('deviceHelpTitle')}</strong>
            <p><b>{t('helpName').split(':')[0]}:</b>{t('helpName').split(':').slice(1).join(':')}</p>
            <p><b>{t('helpDeviceId').split(':')[0]}:</b>{t('helpDeviceId').split(':').slice(1).join(':')}</p>
            <p><b>{t('helpEntityType').split(':')[0]}:</b>{t('helpEntityType').split(':').slice(1).join(':')}</p>
            <p><b>{t('helpEntityId').split(':')[0]}:</b>{t('helpEntityId').split(':').slice(1).join(':')}</p>
          </aside>
        )}

        <div className="device-list">
          {devices.map((device) => (
            <div className="device-list-item" key={device.id}>
              <div className="device-list-copy">
                <strong>{device.name}</strong><span>{device.entityId}</span>
                <small className={provisionedIds.has(device.id) ? 'provisioned' : 'pending'}>{provisionedIds.has(device.id) ? t('provisioned') : t('pending')}</small>
              </div>
              <div className="device-list-actions">
                <button className="provision-action" type="button" disabled={operation.status === 'loading'} onClick={() => onProvision(device)}>
                  {operation.status === 'loading' && operation.deviceId === device.id ? t('provisioning') : provisionedIds.has(device.id) ? t('reprovision') : t('provisionNow')}
                </button>
                <button type="button" disabled={devices.length === 1 || operation.status === 'loading'} onClick={() => onRemove(device)}>{t('remove')}</button>
              </div>
            </div>
          ))}
        </div>

        {operation.message && <p className={`device-operation-message ${operation.status}`}>{operation.message}</p>}

        <form className="device-form" onSubmit={submit}>
          <h3>{t('newDevice')}</h3>
          <label>{t('profile')}
            <select value={form.profile} onChange={(event) => selectProfile(event.target.value)}>
              <option value="custom">{t('customProfile')}</option>
              <option value="physical">{t('physicalProfile')}</option>
              <option value="wokwi">{t('wokwiProfile')}</option>
            </select>
          </label>
          <label>{t('name')}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Adega reserva" /></label>
          <div className="form-row">
            <label>{t('deviceId')}<input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} placeholder="cellar002" /></label>
            <label>{t('entityType')}<input value={form.entityType} onChange={(event) => setForm({ ...form, entityType: event.target.value })} /></label>
          </div>
          <label>{t('entityId')}<input value={form.entityId} onChange={(event) => setForm({ ...form, entityId: event.target.value })} placeholder="urn:ngsi-ld:WineCellar:002" /></label>
          <button className="primary-button" type="submit" disabled={operation.status === 'loading'}>{operation.status === 'loading' ? t('provisioning') : t('addDevice')}</button>
        </form>
      </section>
    </div>
  )
}

function PreferencesModal({ language, unit, onLanguage, onUnit, onSync, syncState, deviceState, device, onClose, t }) {
  const [deviceLanguage, setDeviceLanguage] = useState(deviceState.displayLanguage || device?.displayLanguage || 'pt')
  const [deviceUnit, setDeviceUnit] = useState(deviceState.temperatureUnit || device?.displayUnit || 'celsius')

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="device-modal preferences-modal" role="dialog" aria-modal="true" aria-labelledby="preferences-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><span className="section-kicker">{t('dashboardApply')}</span><h2 id="preferences-title">{t('preferences')}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t('close')}>×</button>
        </div>

        <p className="preferences-intro">{t('dashboardReady')}</p>
        <span className="preferences-section-label">{t('sitePreferences')}</span>
        <div className="preferences-grid">
          <label>
            <span>{t('language')}</span>
            <select value={language} onChange={(event) => onLanguage(event.target.value)}>
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文（简体）</option>
            </select>
          </label>
          <label>
            <span>{t('unit')}</span>
            <select value={unit} onChange={(event) => onUnit(event.target.value)}>
              <option value="celsius">Celsius (°C)</option>
              <option value="fahrenheit">Fahrenheit (°F)</option>
            </select>
          </label>
        </div>

        <div className="device-sync-placeholder">
          <div className="sync-title"><span>▣</span><div><strong>{t('selectedDisplay')}</strong><small>{device?.name} · {t('deviceCurrent')}</small></div></div>
          <p>{deviceState.displayLanguage && deviceState.temperatureUnit
            ? `${deviceState.displayLanguage.toUpperCase()} · ${deviceState.temperatureUnit === 'fahrenheit' ? 'Fahrenheit (°F)' : 'Celsius (°C)'}`
            : t('deviceNotReported')}</p>
          <div className="preferences-grid device-preferences-grid">
            <label>
              <span>{t('language')}</span>
              <select value={deviceLanguage} onChange={(event) => setDeviceLanguage(event.target.value)}>
                <option value="pt">Português</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="zh">中文（简体）</option>
              </select>
            </label>
            <label>
              <span>{t('unit')}</span>
              <select value={deviceUnit} onChange={(event) => setDeviceUnit(event.target.value)}>
                <option value="celsius">Celsius (°C)</option><option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </label>
          </div>
          {syncState.message && <p className={`sync-feedback ${syncState.status}`}>{syncState.message}</p>}
          <button type="button" className="sync-device-button" disabled={syncState.status === 'sending'} onClick={() => onSync(deviceLanguage, deviceUnit)}>
            {syncState.status === 'sending' ? t('syncingDevice') : t('syncNow')}
          </button>
        </div>
      </section>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState('general')
  const [period, setPeriod] = useState('24h')
  const [customRange, setCustomRange] = useState(() => ({
    from: toDateTimeInput(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    to: toDateTimeInput(new Date()),
  }))
  const [appliedCustomRange, setAppliedCustomRange] = useState(null)
  const [language, setLanguage] = useState(() => readStored('starlight-language', 'pt'))
  const [unit, setUnit] = useState(() => readStored('starlight-temperature-unit', 'celsius'))
  const [devices, setDevices] = useState(readInitialDevices)
  const [selectedId, setSelectedId] = useState(() => readStored('starlight-selected-device', DEFAULT_DEVICE.id))
  const [current, setCurrent] = useState({
    temperature: null, humidity: null, luminosity: null, alertMode: 'off', alertState: 'normal', alertReason: 'none', alarmSilenced: false,
    lastOperator: '', lastOperatorUid: '', lastAction: '', lastActionTime: null, displayLanguage: '', temperatureUnit: '', sensorStatus: 'starting', measurementTime: null,
  })
  const [history, setHistory] = useState({ temperature: [], humidity: [], luminosity: [] })
  const [connection, setConnection] = useState('loading')
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyErrors, setHistoryErrors] = useState({})
  const [lastSync, setLastSync] = useState(null)
  const [clock, setClock] = useState(() => Date.now())
  const [incidents, setIncidents] = useState(() => readStored('starlight-real-incidents-v2', []))
  const [commandState, setCommandState] = useState({ status: 'idle', desired: null, message: '' })
  const [displaySyncState, setDisplaySyncState] = useState({ status: 'idle', language: null, unit: null, message: '' })
  const [showDevices, setShowDevices] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [provisionedIds, setProvisionedIds] = useState(() => new Set())
  const [deviceOperation, setDeviceOperation] = useState({ status: 'idle', deviceId: null, message: '' })
  const [infrastructureHealth, setInfrastructureHealth] = useState(null)
  const incidentKeys = useRef(new Set())
  const lastDeviceEventKey = useRef('')

  const t = useCallback((key) => getText(language, key), [language])

  const device = devices.find((item) => item.id === selectedId) || devices[0]
  const selectedPeriod = PERIODS.find((item) => item.id === period) || PERIODS[2]
  const thresholds = device?.thresholds || DEFAULT_THRESHOLDS

  const displayMetrics = useMemo(() => METRICS.map((metric) => ({
    ...metric,
    label: t(metric.labelKey),
    unit: metric.key === 'temperature' && unit === 'fahrenheit' ? '°F' : metric.unit,
  })), [t, unit])

  const displayThresholds = useMemo(() => ({
    ...thresholds,
    temperature: {
      min: convertTemperature(thresholds.temperature.min, unit),
      max: convertTemperature(thresholds.temperature.max, unit),
    },
  }), [thresholds, unit])

  const displayHistory = useMemo(() => ({
    ...history,
    temperature: history.temperature.map((sample) => ({ ...sample, value: convertTemperature(sample.value, unit) })),
  }), [history, unit])

  useEffect(() => {
    localStorage.setItem('starlight-devices', JSON.stringify(devices))
  }, [devices])

  const refreshProvisionedDevices = useCallback(async () => {
    try {
      const [health, remoteDevices] = await Promise.all([getInfrastructureHealth(), listProvisionedDevices()])
      setInfrastructureHealth(health)
      setProvisionedIds(new Set(remoteDevices.map((item) => item.device_id)))
      setDevices((previous) => {
        const additions = remoteDevices
          .filter((item) => !previous.some((deviceItem) => deviceItem.id === item.device_id))
          .map((item) => ({
            id: item.device_id,
            name: item.device_id === 'lamp200' ? 'Simulação Wokwi' : item.device_id === 'cellar001' ? 'Adega física' : item.device_id,
            entityId: item.entity_name,
            entityType: item.entity_type || 'WineCellar',
            profile: item.device_id === 'lamp200' ? 'wokwi' : item.device_id === 'cellar001' ? 'physical' : 'custom',
            thresholds: DEFAULT_THRESHOLDS,
          }))
        return additions.length ? [...previous, ...additions] : previous
      })
    } catch (error) {
      console.error('Erro ao consultar o provisionamento:', error)
      setInfrastructureHealth({ online: false })
    }
  }, [])

  useEffect(() => {
    const initial = setTimeout(refreshProvisionedDevices, 0)
    return () => clearTimeout(initial)
  }, [refreshProvisionedDevices])

  useEffect(() => {
    localStorage.setItem('starlight-selected-device', JSON.stringify(selectedId))
  }, [selectedId])

  function selectDevice(nextId) {
    if (!nextId || nextId === selectedId) return
    setCurrent({
      temperature: null, humidity: null, luminosity: null, alertMode: 'off', alertState: 'normal', alertReason: 'none', alarmSilenced: false,
      lastOperator: '', lastOperatorUid: '', lastAction: '', lastActionTime: null, displayLanguage: '', temperatureUnit: '', sensorStatus: 'starting', measurementTime: null,
    })
    setHistory({ temperature: [], humidity: [], luminosity: [] })
    setConnection('loading')
    setCommandState({ status: 'idle', desired: null, message: '' })
    setDisplaySyncState({ status: 'idle', language: null, unit: null, message: '' })
    lastDeviceEventKey.current = ''
    setSelectedId(nextId)
  }

  useEffect(() => {
    localStorage.setItem('starlight-real-incidents-v2', JSON.stringify(incidents.slice(0, 250)))
  }, [incidents])

  useEffect(() => {
    localStorage.setItem('starlight-language', JSON.stringify(language))
    localStorage.setItem('starlight-temperature-unit', JSON.stringify(unit))
    document.documentElement.lang = LOCALES[language] || LOCALES.pt
  }, [language, unit])

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const registerIncident = useCallback((incident) => {
    const roundedTime = Math.floor((incident.timestamp || Date.now()) / 60000)
    const incidentDeviceId = incident.deviceId || selectedId
    const key = `${incidentDeviceId}-${incident.type}-${incident.metric || 'system'}-${roundedTime}-${incident.message}`
    if (incidentKeys.current.has(key)) return
    incidentKeys.current.add(key)
    setIncidents((previous) => {
      if (incident.sourceId && previous.some((item) => item.sourceId === incident.sourceId)) return previous
      return [{ id: `${Date.now()}-${Math.random()}`, ...incident, deviceId: incidentDeviceId, timestamp: incident.timestamp || Date.now() }, ...previous].slice(0, 250)
    })
  }, [selectedId])

  const fetchCurrent = useCallback(async () => {
    if (!device) return
    if (!provisionedIds.has(device.id)) {
      setConnection('offline')
      return
    }
    try {
      const response = await fetch(`${ORION_URL}/v2/entities/${device.entityId}`, { headers: FIWARE_HEADERS })
      if (response.status === 404) {
        setConnection('offline')
        return
      }
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`Orion ${response.status}: ${detail || response.statusText}`)
      }

      const entity = await response.json()
      const nextCurrent = {
        temperature: Number(attributeValue(entity, 'temperature')),
        humidity: Number(attributeValue(entity, 'humidity')),
        luminosity: Number(attributeValue(entity, 'luminosity')),
        alertMode: String(attributeValue(entity, 'alertMode') || 'off').toLowerCase(),
        alertState: String(attributeValue(entity, 'alertState') || 'normal').toLowerCase(),
        alertReason: String(attributeValue(entity, 'alertReason') || 'none').toLowerCase(),
        alarmSilenced: booleanAttribute(attributeValue(entity, 'alarmSilenced')),
        lastOperator: String(attributeValue(entity, 'lastOperator') || ''),
        lastOperatorUid: String(attributeValue(entity, 'lastOperatorUid') || ''),
        lastAction: String(attributeValue(entity, 'lastAction') || ''),
        lastActionTime: attributeValue(entity, 'lastActionTime') || null,
        displayLanguage: String(attributeValue(entity, 'displayLanguage') || ''),
        temperatureUnit: String(attributeValue(entity, 'temperatureUnit') || ''),
        sensorStatus: String(attributeValue(entity, 'sensorStatus') || 'unknown').toLowerCase(),
        setAlertModeStatus: String(attributeValue(entity, 'setAlertModeStatus') || '').toUpperCase(),
        setDisplayLanguageStatus: String(attributeValue(entity, 'setDisplayLanguageStatus') || '').toUpperCase(),
        setTemperatureUnitStatus: String(attributeValue(entity, 'setTemperatureUnitStatus') || '').toUpperCase(),
        measurementTime: attributeValue(entity, 'measurementTime') || new Date().toISOString(),
      }
      const measurementTimestamp = new Date(nextCurrent.measurementTime).getTime()
      const stale = Number.isFinite(measurementTimestamp) && Date.now() - measurementTimestamp > 120000

      setCurrent(nextCurrent)
      setConnection(stale ? 'stale' : 'online')
      setLastSync(Date.now())

      const deviceEventKey = `${nextCurrent.lastAction}|${nextCurrent.lastActionTime}|${nextCurrent.lastOperatorUid}`
      if (nextCurrent.lastAction && nextCurrent.lastAction !== 'system_started' && deviceEventKey !== lastDeviceEventKey.current) {
        lastDeviceEventKey.current = deviceEventKey
        const eventTime = new Date(nextCurrent.lastActionTime).getTime()
        const denied = nextCurrent.lastAction === 'rfid_access_denied'
        const resumed = nextCurrent.lastAction.startsWith('alarm_resumed')
        const alarmStarted = ['alarm_started', 'alarm_updated'].includes(nextCurrent.lastAction)
        const rfidEvent = nextCurrent.lastAction.startsWith('rfid_') || nextCurrent.lastAction.includes('acknowledged') || nextCurrent.lastAction.includes('resolved')
        registerIncident({
          sourceId: `device:${deviceEventKey}`,
          type: rfidEvent ? 'rfid' : nextCurrent.lastAction.startsWith('remote_') || nextCurrent.lastAction.includes('changed') ? 'command' : 'sensor',
          severity: denied || resumed ? 'warning' : alarmStarted ? 'critical' : 'info',
          metric: nextCurrent.alertReason === 'none' ? null : nextCurrent.alertReason.split(',')[0],
          timestamp: Number.isFinite(eventTime) ? eventTime : Date.now(),
          message: deviceActionLabel(language, nextCurrent.lastAction, nextCurrent.lastOperator),
        })
      }

      if (nextCurrent.sensorStatus !== 'ok' && !['starting', 'unknown'].includes(nextCurrent.sensorStatus)) {
        registerIncident({ sourceId: `sensor-status:${nextCurrent.sensorStatus}:${nextCurrent.measurementTime}`, type: 'sensor-failure', severity: 'critical', message: `${t('sensorFailure')}: ${nextCurrent.sensorStatus}` })
      }

      METRICS.forEach((metric) => {
        const value = nextCurrent[metric.key]
        if (metricStatus(value, thresholds[metric.key]) === 'alert') {
          registerIncident({
            type: 'sensor',
            severity: 'critical',
            metric: metric.key,
            value,
            message: metricMessage(metric, value, thresholds[metric.key], language),
          })
        }
      })

      if (commandState.status === 'accepted' && nextCurrent.setAlertModeStatus === 'OK' && (commandState.desired === nextCurrent.alertMode || (commandState.desired === 'off' && nextCurrent.alertMode === 'silenced'))) {
        setCommandState({ status: 'confirmed', desired: nextCurrent.alertMode, message: t('confirmed') })
      }

      if (displaySyncState.status === 'accepted'
        && nextCurrent.setDisplayLanguageStatus === 'OK'
        && nextCurrent.setTemperatureUnitStatus === 'OK'
        && nextCurrent.displayLanguage === displaySyncState.language
        && nextCurrent.temperatureUnit === displaySyncState.unit) {
        setDisplaySyncState((previous) => ({ ...previous, status: 'confirmed', message: t('syncSuccess') }))
      }
    } catch (error) {
      console.error('Erro ao consultar o Orion:', error)
      setConnection('offline')
      registerIncident({ type: 'communication', severity: 'critical', message: error.message })
    }
  }, [device, provisionedIds, thresholds, registerIncident, commandState.status, commandState.desired, displaySyncState.status, displaySyncState.language, displaySyncState.unit, language, t])

  const fetchHistory = useCallback(async () => {
    if (!device) return
    if (!provisionedIds.has(device.id)) {
      setHistory({ temperature: [], humidity: [], luminosity: [] })
      setHistoryErrors({})
      setHistoryLoading(false)
      return
    }
    setHistoryLoading(true)
    setHistoryErrors({})
    const cutoff = selectedPeriod.hours ? Date.now() - selectedPeriod.hours * 60 * 60 * 1000 : null
    const customFrom = appliedCustomRange ? new Date(appliedCustomRange.from).getTime() : null
    const customTo = appliedCustomRange ? new Date(appliedCustomRange.to).getTime() : null

    const results = await Promise.all(METRICS.map(async (metric) => {
      const query = new URLSearchParams({ lastN: String(selectedPeriod.samples) })
      if (period === 'custom' && appliedCustomRange) {
        query.set('dateFrom', new Date(appliedCustomRange.from).toISOString())
        query.set('dateTo', new Date(appliedCustomRange.to).toISOString())
      }
      const url = `${STH_URL}/STH/v1/contextEntities/type/${device.entityType}/id/${device.entityId}/attributes/${metric.key}?${query}`
      try {
        const response = await fetch(url, { headers: FIWARE_HEADERS })
        if (response.status === 404) return { key: metric.key, data: [], error: null }
        if (!response.ok) {
          const detail = await response.text()
          throw new Error(`STH-Comet ${response.status}: ${detail || response.statusText}`)
        }
        const data = parseHistoryResponse(await response.json())
        const filtered = period === 'all'
          ? data
          : period === 'custom' && customFrom && customTo
            ? data.filter((sample) => sample.timestamp >= customFrom && sample.timestamp <= customTo)
            : data.filter((sample) => sample.timestamp >= cutoff)
        return { key: metric.key, data: filtered, error: null }
      } catch (error) {
        console.error(`Erro no histórico de ${metric.key}:`, error)
        registerIncident({ type: 'communication', severity: 'warning', metric: metric.key, message: error.message })
        return { key: metric.key, data: [], error: error.message }
      }
    }))

    const nextHistory = {}
    const nextErrors = {}
    results.forEach((result) => {
      nextHistory[result.key] = result.data
      if (result.error) nextErrors[result.key] = result.error
    })
    setHistory(nextHistory)
    setHistoryErrors(nextErrors)
    setHistoryLoading(false)
  }, [device, provisionedIds, selectedPeriod, period, appliedCustomRange, registerIncident])

  useEffect(() => {
    const initial = setTimeout(fetchCurrent, 0)
    const interval = setInterval(fetchCurrent, 5000)
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [fetchCurrent])

  useEffect(() => {
    const initial = setTimeout(fetchHistory, 0)
    return () => clearTimeout(initial)
  }, [fetchHistory])

  const metricCards = useMemo(() => displayMetrics.map((metric) => {
    const sourceValue = current[metric.key]
    const value = metric.key === 'temperature' ? convertTemperature(sourceValue, unit) : sourceValue
    return {
      ...metric,
      value,
      status: metricStatus(sourceValue, thresholds[metric.key]),
      message: metricMessage(metric, value, displayThresholds[metric.key], language),
    }
  }), [current, thresholds, displayMetrics, displayThresholds, language, unit])

  const activeAlerts = metricCards.filter((metric) => metric.status === 'alert')
  const periodStart = selectedPeriod.hours ? clock - selectedPeriod.hours * 60 * 60 * 1000 : null
  const customStart = appliedCustomRange ? new Date(appliedCustomRange.from).getTime() : null
  const customEnd = appliedCustomRange ? new Date(appliedCustomRange.to).getTime() : null
  const historicalAlerts = useMemo(() => deriveAlertEpisodes(history, thresholds, language)
    .map((incident) => ({ ...incident, deviceId: device.id })), [history, thresholds, language, device.id])
  const periodIncidents = [...historicalAlerts, ...incidents]
    .filter((incident) => {
      if (incident.deviceId !== device.id) return false
      if (period === 'all') return true
      if (period === 'custom' && customStart && customEnd) return incident.timestamp >= customStart && incident.timestamp <= customEnd
      return incident.timestamp >= periodStart
    })
    .sort((a, b) => b.timestamp - a.timestamp)
  const connectionLabel = {
    loading: t('connecting'), online: t('online'), stale: t('stale'), offline: t('offline'),
  }[connection]
  const selectedPeriodLabel = t(selectedPeriod.labelKey)

  function updateThreshold(metricKey, field, value) {
    const displayNumber = Number(value)
    const number = metricKey === 'temperature' ? temperatureToCelsius(displayNumber, unit) : displayNumber
    if (!Number.isFinite(number)) return
    setDevices((previous) => previous.map((item) => item.id === device.id
      ? { ...item, thresholds: { ...item.thresholds, [metricKey]: { ...item.thresholds[metricKey], [field]: number } } }
      : item))
  }

  async function sendAlertCommand() {
    if (!device || !provisionedIds.has(device.id)) {
      setCommandState({ status: 'error', desired: null, message: t('commandFailure') })
      return
    }
    const desired = current.alertMode === 'on' ? 'off' : 'on'
    setCommandState({ status: 'sending', desired, message: t('requestSending') })
    try {
      const response = await fetch(`${ORION_URL}/v2/entities/${device.entityId}/attrs`, {
        method: 'PATCH',
        headers: { ...FIWARE_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ setAlertMode: { type: 'command', value: desired } }),
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`Orion ${response.status}: ${detail || response.statusText}`)
      }
      setCommandState({ status: 'accepted', desired, message: t('requestAccepted') })
      registerIncident({ type: 'command', severity: 'info', message: `${t('physicalAlert')}: ${desired}` })
      setTimeout(fetchCurrent, 1200)
    } catch (error) {
      setCommandState({ status: 'error', desired, message: t('commandFailure') })
      registerIncident({ type: 'communication', severity: 'critical', message: error.message })
    }
  }

  async function syncDevicePreferences(desiredLanguage, desiredUnit) {
    if (!device || !provisionedIds.has(device.id)) {
      setDisplaySyncState({ status: 'error', language: desiredLanguage, unit: desiredUnit, message: t('syncFailure') })
      return
    }

    setDisplaySyncState({ status: 'sending', language: desiredLanguage, unit: desiredUnit, message: t('syncingDevice') })
    try {
      const response = await fetch(`${ORION_URL}/v2/entities/${device.entityId}/attrs`, {
        method: 'PATCH',
        headers: { ...FIWARE_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setDisplayLanguage: { type: 'command', value: desiredLanguage },
          setTemperatureUnit: { type: 'command', value: desiredUnit },
        }),
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`Orion ${response.status}: ${detail || response.statusText}`)
      }
      setDisplaySyncState({ status: 'accepted', language: desiredLanguage, unit: desiredUnit, message: t('requestAccepted') })
      setDevices((previous) => previous.map((item) => item.id === device.id ? { ...item, displayLanguage: desiredLanguage, displayUnit: desiredUnit } : item))
      registerIncident({ type: 'command', severity: 'info', message: `${t('deviceDisplay')}: ${desiredLanguage.toUpperCase()} · ${desiredUnit}` })
      setTimeout(fetchCurrent, 1200)
    } catch (error) {
      setDisplaySyncState({ status: 'error', language: desiredLanguage, unit: desiredUnit, message: t('syncFailure') })
      registerIncident({ type: 'communication', severity: 'critical', message: error.message })
    }
  }

  function exportReport() {
    const rows = [['categoria', 'dispositivo', 'parametro', 'data_hora', 'valor', 'status', 'detalhes']]
    displayMetrics.forEach((metric) => {
      displayHistory[metric.key].forEach((sample) => {
        const status = metricStatus(sample.value, displayThresholds[metric.key])
        rows.push(['leitura', device.id, metric.label, new Date(sample.timestamp).toISOString(), `${sample.value}${metric.unit}`, status, status === 'alert' ? metricMessage(metric, sample.value, displayThresholds[metric.key], language) : t('normal')])
      })
    })
    periodIncidents.forEach((incident) => {
      rows.push(['ocorrencia', device.id, incident.metric || incident.type, new Date(incident.timestamp).toISOString(), incident.value ?? '', incident.severity, incident.message])
    })
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `starlight-${device.id}-${period}-${unit}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function handleProvisionDevice(targetDevice) {
    setDeviceOperation({ status: 'loading', deviceId: targetDevice.id, message: t('provisioning') })
    try {
      await provisionDevice(targetDevice)
      setDevices((previous) => previous.some((item) => item.id === targetDevice.id)
        ? previous.map((item) => item.id === targetDevice.id ? { ...item, ...targetDevice } : item)
        : [...previous, targetDevice])
      setProvisionedIds((previous) => new Set([...previous, targetDevice.id]))
      selectDevice(targetDevice.id)
      setDeviceOperation({ status: 'success', deviceId: targetDevice.id, message: t('provisionSuccess') })
      await refreshProvisionedDevices()
      return true
    } catch (error) {
      console.error('Erro ao provisionar dispositivo:', error)
      setDeviceOperation({ status: 'error', deviceId: targetDevice.id, message: `${t('operationFailure')}: ${error.message}` })
      registerIncident({ type: 'communication', severity: 'critical', message: error.message })
      return false
    }
  }

  async function handleRemoveDevice(targetDevice) {
    if (devices.length === 1 || !window.confirm(t('unprovisionConfirm'))) return
    setDeviceOperation({ status: 'loading', deviceId: targetDevice.id, message: t('sending') })
    try {
      if (provisionedIds.has(targetDevice.id)) await unprovisionDevice(targetDevice)
      const next = devices.filter((item) => item.id !== targetDevice.id)
      setDevices(next)
      setProvisionedIds((previous) => {
        const updated = new Set(previous)
        updated.delete(targetDevice.id)
        return updated
      })
      if (selectedId === targetDevice.id) selectDevice(next[0].id)
      setDeviceOperation({ status: 'idle', deviceId: null, message: '' })
    } catch (error) {
      console.error('Erro ao remover dispositivo:', error)
      setDeviceOperation({ status: 'error', deviceId: targetDevice.id, message: `${t('operationFailure')}: ${error.message}` })
    }
  }

  return (
    <main className={`dashboard-shell mode-${mode}`}>
      <header className="dashboard-header">
        <a className="brand" href="#overview" aria-label="Starlight — início">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span><strong>STARLIGHT</strong><small>Wine Intelligence</small></span>
        </a>

        <div className="header-actions">
          <label className="device-select">
            <span>{t('device')}</span>
            <select value={device?.id} onChange={(event) => selectDevice(event.target.value)}>
              {devices.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className={`connection-badge ${connection}`}><span />{connectionLabel}</div>
          <button className="ghost-button manage-device-button" type="button" onClick={() => setShowDevices(true)}>{t('devices')}</button>
          <button className="settings-button" type="button" onClick={() => setShowPreferences(true)} aria-label={t('settings')}>⚙</button>
        </div>
      </header>

      <section className="dashboard-main" id="overview">
        <div className="dashboard-toolbar">
          <div>
            <span className="section-kicker">{t('monitoring')}</span>
            <h1>{t('conditionsAt')} <em>{device?.name}</em></h1>
            <p>{t('subtitle')}</p>
          </div>

          <div className="view-controls">
            <div className="mode-switch" aria-label="Modo de visualização">
              <button className={mode === 'general' ? 'active' : ''} type="button" onClick={() => setMode('general')}>{t('general')}</button>
              <button className={mode === 'expert' ? 'active' : ''} type="button" onClick={() => setMode('expert')}>{t('expert')}</button>
            </div>
            <button className="export-button" type="button" onClick={exportReport}>↓ {t('export')}</button>
          </div>
        </div>

        {activeAlerts.length > 0 ? (
          <div className="system-banner alert-banner">
            <span className="banner-icon">!</span>
            <div><strong>{activeAlerts.length} {activeAlerts.length > 1 ? t('attentions') : t('attention')}</strong><p>{activeAlerts.map((item) => item.label).join(', ')} {activeAlerts.length === 1 ? t('needsAttention') : t('needAttention')}</p></div>
            <span className="banner-time">{t('reading')}: {formatDateTime(current.measurementTime, language)}</span>
          </div>
        ) : (
          <div className={`system-banner ${connection === 'online' ? 'normal-banner' : 'warning-banner'}`}>
            <span className="banner-icon">{connection === 'online' ? '✓' : 'i'}</span>
            <div><strong>{connection === 'online' ? t('normalEnvironment') : connectionLabel}</strong><p>{connection === 'online' ? t('normalSensors') : t('checkConnection')}</p></div>
            <span className="banner-time">{t('lastSync')}: {formatDateTime(lastSync, language)}</span>
          </div>
        )}

        <section className="summary-grid" aria-label="Resumo atual">
          {metricCards.map((metric) => (
            <article className={`sensor-card ${metric.status}`} key={metric.key}>
              <div className="sensor-card-head"><span className="sensor-icon" style={{ backgroundColor: metric.color }}>{metric.icon}</span><span className={`status-pill ${metric.status}`}>{metric.status === 'normal' ? t('normal') : metric.status === 'alert' ? t('alert') : t('noData')}</span></div>
              <span className="sensor-name">{metric.label}</span>
              <div className="sensor-reading"><strong>{Number.isFinite(metric.value) ? metric.value.toFixed(metric.digits) : '—'}</strong><span>{metric.unit}</span></div>
              <div className="sensor-range"><span>{t('idealRange')}</span><strong>{displayThresholds[metric.key].min.toFixed(metric.digits)}{metric.unit} — {displayThresholds[metric.key].max.toFixed(metric.digits)}{metric.unit}</strong></div>
              <p>{metric.message}</p>
            </article>
          ))}

          <article className="sensor-card overview-card">
            <div className="sensor-card-head"><span className="sensor-icon dark">✦</span><span className="status-pill neutral">{selectedPeriodLabel}</span></div>
            <span className="sensor-name">{t('summaryPeriod')}</span>
            <div className="overview-numbers"><div><strong>{periodIncidents.length}</strong><span>{t('occurrences')}</span></div><div><strong>{METRICS.reduce((total, metric) => total + history[metric.key].length, 0)}</strong><span>{t('samples')}</span></div></div>
            <p>{periodIncidents.length ? t('hasEvents') : t('noEvents')}</p>
          </article>
        </section>

        <section className="history-section">
          <div className="section-head">
            <div><span className="section-kicker">{t('historicalData')}</span><h2>{t('evolution')}</h2></div>
            <div className="period-control" aria-label="Período dos gráficos">
              {PERIODS.map((item) => <button type="button" className={period === item.id ? 'active' : ''} onClick={() => { setPeriod(item.id); if (item.id === 'custom' && !appliedCustomRange) setAppliedCustomRange(customRange) }} key={item.id}>{t(item.labelKey)}</button>)}
            </div>
          </div>

          {period === 'custom' && (
            <div className="custom-period-panel">
              <label>{t('from')}<input type="datetime-local" value={customRange.from} max={customRange.to} onChange={(event) => setCustomRange({ ...customRange, from: event.target.value })} /></label>
              <label>{t('to')}<input type="datetime-local" value={customRange.to} min={customRange.from} onChange={(event) => setCustomRange({ ...customRange, to: event.target.value })} /></label>
              <button type="button" onClick={() => setAppliedCustomRange({ ...customRange })}>{t('apply')}</button>
            </div>
          )}

          <div className="charts-grid">
            {displayMetrics.map((metric) => (
              <LineChart key={metric.key} metric={metric} data={displayHistory[metric.key]} limits={displayThresholds[metric.key]} period={period} loading={historyLoading} error={historyErrors[metric.key]} expert={mode === 'expert'} language={language} t={t} />
            ))}
          </div>
        </section>

        {mode === 'expert' && (
          <section className="expert-section">
            <div className="section-head"><div><span className="section-kicker">{t('technicalControl')}</span><h2>{t('diagnostics')}</h2></div><span className="expert-tag">{t('expertActive')}</span></div>

            <div className="expert-grid">
              <article className="technical-card endpoint-card">
                <span className="section-kicker">{t('fiwareId')}</span>
                <h3>{device.name}</h3>
                <dl>
                  <div><dt>Device ID</dt><dd>{device.id}</dd></div>
                  <div><dt>Entity ID</dt><dd>{device.entityId}</dd></div>
                  <div><dt>Entity type</dt><dd>{device.entityType}</dd></div>
                  <div><dt>Tenant / path</dt><dd>{SERVICE} · {SERVICE_PATH}</dd></div>
                  <div><dt>Infraestrutura</dt><dd>{infrastructureHealth?.online ? t('infrastructureReady') : t('offline')}</dd></div>
                  <div><dt>Orion</dt><dd>{ORION_URL}</dd></div>
                  <div><dt>STH-Comet</dt><dd>{STH_URL}</dd></div>
                </dl>
              </article>

              <article className="technical-card threshold-card">
                <span className="section-kicker">{t('triggers')}</span>
                <h3>{t('operationalLimits')}</h3>
                <div className="threshold-list">
                  {displayMetrics.map((metric) => (
                    <div className="threshold-row" key={metric.key}>
                      <span>{metric.label}</span>
                      <label>{t('min')}<input type="number" value={displayThresholds[metric.key].min.toFixed(metric.digits)} onChange={(event) => updateThreshold(metric.key, 'min', event.target.value)} /></label>
                      <label>{t('max')}<input type="number" value={displayThresholds[metric.key].max.toFixed(metric.digits)} onChange={(event) => updateThreshold(metric.key, 'max', event.target.value)} /></label>
                      <small>{metric.unit}</small>
                    </div>
                  ))}
                </div>
                <p className="card-note">{t('limitsSaved')}</p>
              </article>

              <article className="technical-card alert-control-card">
                <span className="section-kicker">{t('remoteCommand')}</span>
                <h3>{t('physicalAlert')}</h3>
                <div className="command-status">
                  <span className={`command-light ${current.alertMode === 'on' ? 'active' : ''}`} />
                  <div><strong>{current.alertMode === 'on' ? t('alertOn') : current.alertMode === 'silenced' ? t('alarmAcknowledged') : t('alertOff')}</strong><p>{commandState.message || t('noCommand')}</p></div>
                </div>
                <button className="primary-button" type="button" disabled={commandState.status === 'sending'} onClick={sendAlertCommand}>{commandState.status === 'sending' ? t('sending') : current.alertMode === 'on' ? t('deactivateAlert') : t('activateAlert')}</button>
                <div className="confirmation-flow"><span>{t('request')}</span><i className={['accepted', 'confirmed'].includes(commandState.status) ? 'done' : ''} /><span>Orion</span><i className={commandState.status === 'confirmed' ? 'done' : ''} /><span>ESP32</span></div>
                <dl className="device-event-status">
                  <div><dt>{t('alarmState')}</dt><dd>{current.alertState === 'active' ? t('alarmActive') : current.alertState === 'acknowledged' ? t('alarmAcknowledged') : t('alarmNormal')}</dd></div>
                  <div><dt>{t('alarmReason')}</dt><dd>{current.alertReason || 'none'}</dd></div>
                  <div><dt>{t('lastOperator')}</dt><dd>{current.lastOperator && current.lastOperator !== 'none' ? current.lastOperator : '—'}</dd></div>
                  <div><dt>{t('lastAction')}</dt><dd>{deviceActionLabel(language, current.lastAction)}</dd></div>
                </dl>
              </article>
            </div>
          </section>
        )}

        <section className="incidents-section">
          <div className="section-head">
            <div><span className="section-kicker">{t('incidentReport')}</span><h2>{t('alertsFailures')}</h2></div>
            <span className="incident-count">{periodIncidents.length} {t('inPeriod')}</span>
          </div>

          <div className="incident-table-wrap">
            <table className="incident-table">
              <thead><tr><th>{t('dateTime')}</th><th>{t('category')}</th><th>{t('parameter')}</th><th>{t('details')}</th><th>{t('severity')}</th></tr></thead>
              <tbody>
                {periodIncidents.length === 0 && <tr><td colSpan="5" className="empty-cell"><strong>{t('noEvents')}</strong><span>{t('realOnly')}</span></td></tr>}
                {periodIncidents.slice(0, mode === 'expert' ? 50 : 8).map((incident) => (
                  <tr key={incident.id}>
                    <td>{formatDateTime(incident.timestamp, language)}</td>
                    <td>{['sensor', 'historical-alert', 'sensor-failure'].includes(incident.type) ? t('environmental') : incident.type === 'communication' ? t('communication') : incident.type === 'rfid' ? t('access') : t('command')}</td>
                    <td>{displayMetrics.find((metric) => metric.key === incident.metric)?.label || t('system')}</td>
                    <td>{incident.message}</td>
                    <td><span className={`severity ${incident.severity}`}>{incident.severity === 'critical' ? t('critical') : incident.severity === 'warning' ? t('warning') : t('informative')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <footer className="dashboard-footer"><span>✦ STARLIGHT</span><p>{t('footer')}</p><small>ESP32 · MQTT · FIWARE · STH-Comet</small></footer>

      {showDevices && <DeviceModal devices={devices} provisionedIds={provisionedIds} operation={deviceOperation} onClose={() => setShowDevices(false)} onProvision={handleProvisionDevice} onRemove={handleRemoveDevice} t={t} />}
      {showPreferences && <PreferencesModal language={language} unit={unit} onLanguage={setLanguage} onUnit={setUnit} onSync={syncDevicePreferences} syncState={displaySyncState} deviceState={current} device={device} onClose={() => setShowPreferences(false)} t={t} />}
    </main>
  )
}

export default App
