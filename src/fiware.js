export const ORION_URL = (import.meta.env.VITE_ORION_URL || '/api/orion').replace(/\/$/, '')
export const STH_URL = (import.meta.env.VITE_STH_URL || '/api/sth').replace(/\/$/, '')
export const IOT_URL = (import.meta.env.VITE_IOT_URL || '/api/iot').replace(/\/$/, '')
export const SERVICE = import.meta.env.VITE_FIWARE_SERVICE || 'smart'
export const SERVICE_PATH = import.meta.env.VITE_FIWARE_SERVICE_PATH || '/'
export const API_KEY = import.meta.env.VITE_FIWARE_API_KEY || 'TEF'

export const FIWARE_HEADERS = {
  'fiware-service': SERVICE,
  'fiware-servicepath': SERVICE_PATH,
}

const DEVICE_ATTRIBUTES = [
  { object_id: 't', name: 'temperature', type: 'Number' },
  { object_id: 'h', name: 'humidity', type: 'Number' },
  { object_id: 'l', name: 'luminosity', type: 'Number' },
  { object_id: 'am', name: 'alertMode', type: 'Text' },
  { object_id: 'ast', name: 'alertState', type: 'Text' },
  { object_id: 'ar', name: 'alertReason', type: 'Text' },
  { object_id: 'ab', name: 'alarmSilenced', type: 'Boolean' },
  { object_id: 'op', name: 'lastOperator', type: 'Text' },
  { object_id: 'uid', name: 'lastOperatorUid', type: 'Text' },
  { object_id: 'act', name: 'lastAction', type: 'Text' },
  { object_id: 'at', name: 'lastActionTime', type: 'DateTime' },
  { object_id: 'lang', name: 'displayLanguage', type: 'Text' },
  { object_id: 'unit', name: 'temperatureUnit', type: 'Text' },
  { object_id: 'mt', name: 'measurementTime', type: 'DateTime' },
  { object_id: 'ss', name: 'sensorStatus', type: 'Text' },
]

const DEVICE_COMMANDS = [
  { name: 'setAlertMode', type: 'command' },
  { name: 'setDisplayLanguage', type: 'command' },
  { name: 'setTemperatureUnit', type: 'command' },
]

const HISTORICAL_ATTRIBUTES = [
  'temperature', 'humidity', 'luminosity', 'alertMode', 'alertState', 'alertReason',
  'alarmSilenced', 'lastOperator', 'lastOperatorUid', 'lastAction', 'lastActionTime',
  'displayLanguage', 'temperatureUnit', 'measurementTime', 'sensorStatus',
]

async function readResponse(response) {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function fiwareRequest(url, options = {}, acceptedStatuses = []) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...FIWARE_HEADERS,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const data = await readResponse(response)
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    const detail = typeof data === 'string' ? data : data?.description || data?.message || data?.error
    throw new Error(`${response.status} ${detail || response.statusText}`.trim())
  }
  return { status: response.status, data }
}

export async function getInfrastructureHealth() {
  try {
    const response = await fetch('/api/health', { headers: { Accept: 'application/json' } })
    const contentType = response.headers.get('Content-Type') || ''
    if (!response.ok || !contentType.includes('application/json')) throw new Error('Endpoint de saúde indisponível')
    return await response.json()
  } catch {
    const checks = await Promise.all([
      ['orion', `${ORION_URL}/version`],
      ['iotAgent', `${IOT_URL}/iot/about`],
      ['sthComet', `${STH_URL}/version`],
    ].map(async ([name, endpoint]) => {
      try {
        const response = await fetch(endpoint, { headers: FIWARE_HEADERS })
        return [name, { online: response.ok, status: response.status }]
      } catch {
        return [name, { online: false, status: null }]
      }
    }))
    const services = Object.fromEntries(checks)
    return { online: Object.values(services).every((item) => item.online), services }
  }
}

export async function listProvisionedDevices() {
  const { data } = await fiwareRequest(`${IOT_URL}/iot/devices?limit=100`)
  return data?.devices || []
}

async function ensureServiceGroup() {
  const { data } = await fiwareRequest(`${IOT_URL}/iot/services?limit=100`)
  const exists = (data?.services || []).some((service) => service.apikey === API_KEY && service.resource === '/iot/d')
  if (exists) return

  await fiwareRequest(`${IOT_URL}/iot/services`, {
    method: 'POST',
    body: JSON.stringify({
      services: [{
        apikey: API_KEY,
        cbroker: 'http://fiware-orion:1026',
        entity_type: 'WineCellar',
        resource: '/iot/d',
      }],
    }),
  }, [409])
}

function provisionDefinition(device) {
  return {
    device_id: device.id,
    entity_name: device.entityId,
    entity_type: device.entityType || 'WineCellar',
    protocol: 'PDI-IoTA-UltraLight',
    transport: 'MQTT',
    apikey: API_KEY,
    attributes: DEVICE_ATTRIBUTES,
    commands: DEVICE_COMMANDS,
    static_attributes: [
      { name: 'managedBy', type: 'Text', value: 'Starlight Dashboard' },
      { name: 'deviceProfile', type: 'Text', value: device.profile || 'physical' },
    ],
  }
}

async function ensureHistorySubscription(device) {
  const description = `Starlight history: ${device.entityId}`
  const { data: subscriptions } = await fiwareRequest(`${ORION_URL}/v2/subscriptions?limit=1000`)
  const exists = Array.isArray(subscriptions) && subscriptions.some((subscription) => subscription.description === description)
  if (exists) return

  await fiwareRequest(`${ORION_URL}/v2/subscriptions`, {
    method: 'POST',
    body: JSON.stringify({
      description,
      subject: {
        entities: [{ id: device.entityId, type: device.entityType || 'WineCellar' }],
        condition: { attrs: HISTORICAL_ATTRIBUTES },
      },
      notification: {
        http: { url: 'http://fiware-sth-comet:8666/notify' },
        attrs: HISTORICAL_ATTRIBUTES,
        metadata: ['dateCreated', 'dateModified'],
      },
      throttling: 5,
    }),
  })
}

export async function provisionDevice(device) {
  await ensureServiceGroup()
  const definition = provisionDefinition(device)
  const existing = await fiwareRequest(`${IOT_URL}/iot/devices/${encodeURIComponent(device.id)}`, {}, [404])

  if (existing.status === 404) {
    await fiwareRequest(`${IOT_URL}/iot/devices`, {
      method: 'POST',
      body: JSON.stringify({ devices: [definition] }),
    })
  } else {
    const update = { ...definition }
    delete update.device_id
    await fiwareRequest(`${IOT_URL}/iot/devices/${encodeURIComponent(device.id)}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    })
  }

  await ensureHistorySubscription(device)
  return definition
}

export async function unprovisionDevice(device) {
  await fiwareRequest(`${IOT_URL}/iot/devices/${encodeURIComponent(device.id)}`, { method: 'DELETE' }, [404])
  const { data: subscriptions } = await fiwareRequest(`${ORION_URL}/v2/subscriptions?limit=1000`)
  const matching = Array.isArray(subscriptions)
    ? subscriptions.filter((subscription) => subscription.description === `Starlight history: ${device.entityId}`)
    : []
  await Promise.all(matching.map((subscription) => fiwareRequest(`${ORION_URL}/v2/subscriptions/${subscription.id}`, { method: 'DELETE' }, [404])))
}
