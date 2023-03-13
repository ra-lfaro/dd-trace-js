'use strict'

const { aggregated, conflated, delegating } = require('./handlers')
const { getMetric } = require('./metrics')
const { log } = require('../../../log')
const IAST_NAMESPACE = 'iast'
const IAST_TELEMETRY_COLLECTOR = Symbol('_dd.iast.telemetryCollector')

class TelemetryCollector {
  constructor (builders) {
    this.handlers = new Map()
    this.builders = builders
  }

  addMetric (metric, value, tag) {
    this.getOrCreateHandler(metric).add(value, tag)
  }

  getOrCreateHandler (metric) {
    let handler = this.handlers.get(metric)
    if (!handler) {
      handler = this.builders(metric)
      this.handlers.set(metric, handler)
    }
    return handler
  }

  drainMetrics () {
    const result = []
    for (const handler of this.handlers.values()) {
      const values = handler.drain()
      if (values && values.length) {
        result.push(...values)
      }
    }
    this.handlers.clear()
    return result
  }

  merge (metrics) {
    if (metrics) {
      for (const metricData of metrics) {
        this.getOrCreateHandler(metricData.metric).merge(metricData)
      }
    }
  }

  reset () {
    this.handlers = new Map()
  }
}

const GLOBAL = new TelemetryCollector(metric => metric.hasRequestScope()
  ? aggregated(metric)
  : conflated(metric)
)

function getCollector (metric, context) {
  if (metric && metric.hasRequestScope()) {
    const telemetryCollector = getTelemetryCollectorFromContext(context)
    if (telemetryCollector) {
      return telemetryCollector
    }
  }
  return GLOBAL
}

function initTelemetryCollector (iastContext) {
  if (!iastContext) return

  const collector = new TelemetryCollector((metric) => metric.hasRequestScope()
    ? conflated(metric)
    : delegating(metric, GLOBAL)
  )
  iastContext[IAST_TELEMETRY_COLLECTOR] = collector
  return collector
}

function getTelemetryCollectorFromContext (iastContext) {
  return iastContext && iastContext[IAST_TELEMETRY_COLLECTOR]
}

function add (metric, value, tag, context) {
  try {
    metric = getMetric(metric)
    if (!metric) return

    const collector = getCollector(metric, context)
    collector.addMetric(metric, value, tag)
  } catch (e) {
    log.error(e)
  }
}

function getPayloadMetric (metric, points, tag) {
  return {
    metric: metric.name,
    common: metric.common,
    type: metric.type,
    points: getPayloadPoints(points),
    tag: getPayloadTag(metric, tag),
    namespace: IAST_NAMESPACE
  }
}

function getPayloadPoints (points) {
  return points
    .map(point => [point.timestamp, point.value])
}

function getPayloadTag (metric, tag) {
  return metric.metricTag && tag ? `${metric.metricTag}:${tag}` : undefined
}

function drain () {
  const drained = []
  for (const metricData of GLOBAL.drainMetrics()) {
    if (metricData.metric && metricData.points) {
      drained.push(getPayloadMetric(metricData.metric, metricData.points, metricData.tag))
    }
  }
  return drained
}

module.exports = {
  add,
  drain,
  getCollector,
  initTelemetryCollector,
  getTelemetryCollectorFromContext,

  TelemetryCollector,

  GLOBAL,
  IAST_TELEMETRY_COLLECTOR
}
