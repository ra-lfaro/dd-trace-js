'use strict'

const { expect } = require('chai')

const { Metric, MetricTag, getMetric, getExecutedMetric, getInstrumentedMetric } =
  require('../../../../src/appsec/iast/telemetry/metrics')

describe('Metrics', () => {
  describe('getMetric', () => {
    it('should return a metric using its name', () => {
      const metric = getMetric(Metric.EXECUTED_PROPAGATION.name)

      expect(metric).to.be.equal(Metric.EXECUTED_PROPAGATION)
    })

    it('getExecutedMetric should return a metric depending on tag', () => {
      let metric = getExecutedMetric(MetricTag.VULNERABILITY_TYPE)

      expect(metric).to.be.equal(Metric.EXECUTED_SINK)

      metric = getExecutedMetric(MetricTag.SOURCE_TYPE)
      expect(metric).to.be.equal(Metric.EXECUTED_SOURCE)
    })

    it('getInstrumentedMetric should return a metric depending on tag', () => {
      let metric = getInstrumentedMetric(MetricTag.VULNERABILITY_TYPE)

      expect(metric).to.be.equal(Metric.INSTRUMENTED_SINK)

      metric = getInstrumentedMetric(MetricTag.SOURCE_TYPE)
      expect(metric).to.be.equal(Metric.INSTRUMENTED_SOURCE)
    })
  })
})
