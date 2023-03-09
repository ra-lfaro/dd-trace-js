'use strict'

const { expect } = require('chai')
const { AggregatedCombiner, ConflatedCombiner } = require('../../../../src/appsec/iast/telemetry/combiners')
const { TaggedHandler, DefaultHandler, DelegatingHandler } = require('../../../../src/appsec/iast/telemetry/handlers')

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

  describe('handlers', () => {
    it('aggregated should return a TaggedHandler when invoked on a metric with tag', () => {
      const handler = Metric.EXECUTED_PROPAGATION.aggregated()

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(TaggedHandler)
      expect(handler.supplier()).to.be.an.instanceOf(AggregatedCombiner)
    })

    it('aggregated should return a DefaultHandler when invoked on a metric without tag', () => {
      const handler = Metric.REQUEST_TAINTED.aggregated()

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(DefaultHandler)
      expect(handler.combiner).to.be.an.instanceOf(AggregatedCombiner)
    })

    it('conflated should return a TaggedHandler when invoked on a metric with tag', () => {
      const handler = Metric.EXECUTED_PROPAGATION.conflated()

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(TaggedHandler)
      expect(handler.supplier()).to.be.an.instanceOf(ConflatedCombiner)
    })

    it('conflated should return a DefaultHandler when invoked on a metric without tag', () => {
      const handler = Metric.REQUEST_TAINTED.conflated()

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(DefaultHandler)
      expect(handler.combiner).to.be.an.instanceOf(ConflatedCombiner)
    })

    it('delegating should return a DelegatingHandler', () => {
      const collector = {}
      const handler = Metric.REQUEST_TAINTED.delegating(collector)

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(DelegatingHandler)
      expect(handler.collector).to.be.eq(collector)
    })
  })
})
