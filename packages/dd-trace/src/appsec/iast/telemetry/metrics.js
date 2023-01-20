'use strict'

const { ConflatedCombiner, AggregatedCombiner } = require('./combiners')
const { DefaultHandler, TaggedHandler, DelegatingHandler } = require('./handlers')
const { SOURCE_TYPE, VULNERABILITY_TYPE, PROPAGATION_TYPE } = require('./metric-tag')

const Scope = {
  GLOBAL: 'GLOBAL',
  REQUEST: 'REQUEST'
}

const PropagationTypes = {
  STRING: 'STRING',
  JSON: 'JSON',
  URL: 'URL'
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

  aggregated () {
    return this.metricTag
      ? new TaggedHandler(this, () => new AggregatedCombiner())
      : new DefaultHandler(this, new AggregatedCombiner())
  }

  conflated () {
    return this.metricTag
      ? new TaggedHandler(this, () => new ConflatedCombiner())
      : new DefaultHandler(this, new ConflatedCombiner())
  }

  delegating (collector) {
    return new DelegatingHandler(this, collector)
  }
}

function getExecutedMetric (metricTag) {
  return metricTag === VULNERABILITY_TYPE ? EXECUTED_SINK : EXECUTED_SOURCE
}

function getInstrumentedMetric (metricTag) {
  return metricTag === VULNERABILITY_TYPE ? INSTRUMENTED_SINK : INSTRUMENTED_SOURCE
}

const INSTRUMENTED_PROPAGATION = new IastMetric('instrumented.propagation', Scope.GLOBAL, PROPAGATION_TYPE)
const INSTRUMENTED_SOURCE = new IastMetric('instrumented.source', Scope.GLOBAL, SOURCE_TYPE)
const INSTRUMENTED_SINK = new IastMetric('instrumented.sink', Scope.GLOBAL, VULNERABILITY_TYPE)

const EXECUTED_PROPAGATION = new IastMetric('executed.propagation', Scope.REQUEST, PROPAGATION_TYPE)
const EXECUTED_SOURCE = new IastMetric('executed.source', Scope.REQUEST, SOURCE_TYPE)
const EXECUTED_SINK = new IastMetric('executed.sink', Scope.REQUEST, VULNERABILITY_TYPE)

const EXECUTED_TAINTED = new IastMetric('executed.tainted', Scope.REQUEST)
const REQUEST_TAINTED = new IastMetric('request.tainted', Scope.REQUEST)

const INSTRUMENTATION_TIME = new IastMetric('instrumentation.time', Scope.GLOBAL)
// const EXECUTION_TIME = new IastMetric('execution.time', Scope.GLOBAL)

const Metrics = {
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
for (const iastMetricName in Metrics) {
  const iastMetric = Metrics[iastMetricName]
  metrics.set(iastMetric.name, iastMetric)
}

function getMetric (metric) {
  return typeof metric === 'string' ? metrics.get(metric) : metric
}

module.exports = {
  Metrics,
  PropagationTypes,
  Scope,

  getMetric,
  getExecutedMetric,
  getInstrumentedMetric
}
