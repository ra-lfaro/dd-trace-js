'use strict'

const metrics = require('../../../telemetry/metrics')
const { Verbosity, isDebugAllowed, isInfoAllowed, parseVerbosity, getName } = require('./verbosity')
const {
  inc,
  add,
  drain,
  initTelemetryCollector,
  getTelemetryCollectorFromContext,
  GLOBAL
} = require('./telemetry-collector')

const TRACE_METRIC_PATTERN = '_dd.instrumentation_telemetry_data.iast'

const iastTelemetryVerbosity = process.env.DD_IAST_TELEMETRY_VERBOSITY
  ? parseVerbosity(process.env.DD_IAST_TELEMETRY_VERBOSITY)
  : Verbosity.INFORMATION

class Telemetry {
  configure (config) {
    this.enabled = config.telemetryEnabled
    this.verbosity = parseVerbosity(config.iastTelemetryVerbosity) ?? iastTelemetryVerbosity
    if (!config.doNotRegisterProvider) {
      metrics.registerProvider(drain)
    }
  }

  stop () {
    this.enabled = false
    metrics.unregisterProvider(drain)
  }

  isEnabled () {
    return this.enabled
  }

  isDebugEnabled () {
    return this.isEnabled() && isDebugAllowed(this.verbosity)
  }

  isInformationEnabled () {
    return this.isEnabled() && isInfoAllowed(this.verbosity)
  }

  getVerbosityName () {
    return getName(this.verbosity)
  }

  increase (metric, tag, context) {
    inc(metric, tag, context)
  }

  add (metric, value, tag, context) {
    add(metric, value, tag, context)
  }

  onRequestStarted (iastContext) {
    if (this.isEnabled() && this.verbosity !== Verbosity.OFF) {
      initTelemetryCollector(iastContext)
    }
  }

  onRequestEnded (iastContext, rootSpan) {
    if (!this.isEnabled()) return

    const collector = getTelemetryCollectorFromContext(iastContext)
    if (!collector) return

    const metrics = collector.drainMetrics()
    if (metrics && metrics.length > 0) {
      this.addMetricsToSpan(rootSpan, metrics)
      GLOBAL.merge(metrics)
    }
  }

  flatten (metricData) {
    return metricData.points && metricData.points.map(point => point.value).reduce((total, value) => total + value, 0)
  }

  addMetricsToSpan (rootSpan, metrics) {
    if (!rootSpan || !rootSpan.addTags || !metrics) return

    const flattenMap = new Map()
    metrics
      .filter(data => data && data.metric && data.metric.hasRequestScope())
      .forEach(data => {
        let total = flattenMap.get(data.metric)
        const value = this.flatten(data)
        if (!total) {
          total = value
        } else {
          total += value
        }
        flattenMap.set(data.metric, total)
      })

    for (const [key, value] of flattenMap) {
      const tagName = `${TRACE_METRIC_PATTERN}.${key.name}`
      rootSpan.addTags({
        [tagName]: value
      })
    }
  }
}

module.exports = new Telemetry()
