const request = require('../exporters/common/request')

const debug = process.env.DD_TELEMETRY_DEBUG
  ? process.env.DD_TELEMETRY_DEBUG === 'true'
  : false

function getHeaders (reqType, debug) {
  const headers = {
    'content-type': 'application/json',
    'dd-telemetry-api-version': 'v1',
    'dd-telemetry-request-type': reqType
  }
  if (debug) {
    headers['dd-telemetry-debug-enabled'] = 'true'
  }
  return headers
}

let seqId = 0
function sendData (config, application, host, reqType, payload = {}) {
  const {
    hostname,
    port,
    url
  } = config

  const { logger, tags, serviceMapping, ...trimmedPayload } = payload

  const options = {
    url,
    hostname,
    port,
    method: 'POST',
    path: '/telemetry/proxy/api/v2/apmtelemetry',
    headers: getHeaders(reqType, debug)
  }
  const data = JSON.stringify({
    api_version: 'v1',
    request_type: reqType,
    tracer_time: Math.floor(Date.now() / 1000),
    runtime_id: config.tags['runtime-id'],
    seq_id: ++seqId,
    payload: trimmedPayload,
    application,
    host
  })

  request(data, options, () => {
    // ignore errors
  })
}

module.exports = { sendData }
