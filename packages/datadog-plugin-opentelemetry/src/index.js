'use strict'

const TracingPlugin = require('../../dd-trace/src/plugins/tracing')

class OpenTelemetryPlugin extends TracingPlugin {
  static get name () {
    return 'opentelemetry'
  }

  start (span) {
    console.log('otel start', span)
  }

  finish (span) {
    console.log('otel finish', span)
  }

  error (error) {
    console.error('otel error', error)
  }
}

module.exports = OpenTelemetryPlugin
