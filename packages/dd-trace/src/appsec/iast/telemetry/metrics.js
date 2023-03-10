'use strict'

const Scope = {
  GLOBAL: 'GLOBAL',
  REQUEST: 'REQUEST'
}

const PropagationType = {
  STRING: 'STRING',
  JSON: 'JSON',
  URL: 'URL'
}

const MetricTag = {
  VULNERABILITY_TYPE: 'vulnerability_type',
  SOURCE_TYPE: 'source_type',
  PROPAGATION_TYPE: 'propagation_type'
}

class IastMetric {
  constructor (name, scope, metricTag) {
    this.name = name
    this.common = true
    this.type = 'count'
    this.metricTag = metricTag
    this.scope = scope
  }

  hasRequestScope () {
    return this.scope === Scope.REQUEST
  }
}

function getExecutedMetric (metricTag) {
  return metricTag === MetricTag.VULNERABILITY_TYPE ? EXECUTED_SINK : EXECUTED_SOURCE
}

function getInstrumentedMetric (metricTag) {
  return metricTag === MetricTag.VULNERABILITY_TYPE ? INSTRUMENTED_SINK : INSTRUMENTED_SOURCE
}

const INSTRUMENTED_PROPAGATION = new IastMetric('instrumented.propagation', Scope.GLOBAL, MetricTag.PROPAGATION_TYPE)
const INSTRUMENTED_SOURCE = new IastMetric('instrumented.source', Scope.GLOBAL, MetricTag.SOURCE_TYPE)
const INSTRUMENTED_SINK = new IastMetric('instrumented.sink', Scope.GLOBAL, MetricTag.VULNERABILITY_TYPE)

const EXECUTED_PROPAGATION = new IastMetric('executed.propagation', Scope.REQUEST, MetricTag.PROPAGATION_TYPE)
const EXECUTED_SOURCE = new IastMetric('executed.source', Scope.REQUEST, MetricTag.SOURCE_TYPE)
const EXECUTED_SINK = new IastMetric('executed.sink', Scope.REQUEST, MetricTag.VULNERABILITY_TYPE)

const EXECUTED_TAINTED = new IastMetric('executed.tainted', Scope.REQUEST)
const REQUEST_TAINTED = new IastMetric('request.tainted', Scope.REQUEST)

const INSTRUMENTATION_TIME = new IastMetric('instrumentation.time', Scope.GLOBAL)
// const EXECUTION_TIME = new IastMetric('execution.time', Scope.GLOBAL)

const Metric = {
  INSTRUMENTED_PROPAGATION,
  INSTRUMENTED_SOURCE,
  INSTRUMENTED_SINK,

  EXECUTED_PROPAGATION,
  EXECUTED_SOURCE,
  EXECUTED_SINK,
  EXECUTED_TAINTED,

  REQUEST_TAINTED,

  INSTRUMENTATION_TIME
}

const metrics = new Map()
for (const iastMetricName in Metric) {
  const iastMetric = Metric[iastMetricName]
  metrics.set(iastMetric.name, iastMetric)
}

function getMetric (metric) {
  return typeof metric === 'string' ? metrics.get(metric) : metric
}

module.exports = {
  Metric,
  PropagationType,
  Scope,
  MetricTag,

  getMetric,
  getExecutedMetric,
  getInstrumentedMetric
}
