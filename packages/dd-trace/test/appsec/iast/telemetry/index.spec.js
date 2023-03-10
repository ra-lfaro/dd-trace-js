'use strict'

const { expect } = require('chai')
const proxyquire = require('proxyquire')
const { Verbosity } = require('../../../../src/appsec/iast/telemetry/verbosity')
const { Metric } = require('../../../../src/appsec/iast/telemetry/metrics')

const TAG_PREFIX = '_dd.instrumentation_telemetry_data.iast'

describe('Telemetry', () => {
  let collector
  let telemetryMetrics
  let telemetry

  beforeEach(() => {
    collector = {
      initTelemetryCollector: sinon.spy(),
      getTelemetryCollectorFromContext: (context) => context['collector'],
      GLOBAL: {
        merge: sinon.spy()
      },
      add: sinon.spy(),
      inc: sinon.spy()
    }

    telemetryMetrics = {
      registerProvider: sinon.spy(),
      unregisterProvider: sinon.spy()
    }

    telemetry = proxyquire('../../../../src/appsec/iast/telemetry', {
      './telemetry-collector': collector,
      '../../../telemetry/metrics': telemetryMetrics
    })
  })

  describe('configure', () => {
    it('should set default verbosity', () => {
      telemetry.configure({
        telemetryEnabled: true
      })

      expect(telemetry.enabled).to.be.true
      expect(telemetry.verbosity).to.be.eq(Verbosity.INFORMATION)
      expect(telemetryMetrics.registerProvider).to.be.calledOnce
    })
  })

  describe('stop', () => {
    it('should set enabled = false and unregister provider', () => {
      telemetry.configure({
        telemetryEnabled: true
      })

      telemetry.stop()
      expect(telemetry.enabled).to.be.false
      expect(telemetryMetrics.unregisterProvider).to.be.calledOnce
    })
  })

  describe('onRequestStarted', () => {
    it('should call initTelemetryCollector if enabled and verbosity is not Off', () => {
      telemetry.configure({
        telemetryEnabled: true
      })

      const iastContext = {}
      telemetry.onRequestStarted(iastContext)

      expect(collector.initTelemetryCollector).to.be.calledOnceWith(iastContext)
    })

    it('should not call initTelemetryCollector if enabled and verbosity is Off', () => {
      telemetry.configure({
        telemetryEnabled: true,
        iastTelemetryVerbosity: 'OFF'
      })

      const iastContext = {}
      telemetry.onRequestStarted(iastContext)

      expect(collector.initTelemetryCollector).to.not.be.calledOnce
    })
  })

  describe('onRequestEnded', () => {
    let iastContext
    let rootSpan

    beforeEach(() => {
      telemetry.configure({
        telemetryEnabled: true
      })

      rootSpan = {
        addTags: sinon.spy()
      }
    })

    it('should set a rootSpan tag with the flattened value of the metric', () => {
      const metrics = [{
        metric: Metric.REQUEST_TAINTED,
        points: [{ value: 5 }, { value: 5 }]
      }]

      iastContext = {
        collector: {
          drainMetrics: sinon.stub().returns(metrics)
        }
      }

      telemetry.onRequestEnded(iastContext, rootSpan)

      expect(iastContext.collector.drainMetrics).to.be.calledOnce
      expect(rootSpan.addTags).to.be.called

      const tag = rootSpan.addTags.getCalls()[0].args[0]
      expect(tag).to.has.property(`${TAG_PREFIX}.${Metric.REQUEST_TAINTED.name}`)
      expect(tag[`${TAG_PREFIX}.${Metric.REQUEST_TAINTED.name}`]).to.be.eq(10)
    })

    it('should set as many rootSpan tags as different request scoped metrics', () => {
      const metrics = [{
        metric: Metric.REQUEST_TAINTED,
        points: [{ value: 5 }, { value: 5 }]
      },
      {
        metric: Metric.EXECUTED_SINK,
        points: [{ value: 1 }]
      },
      {
        metric: Metric.REQUEST_TAINTED,
        points: [{ value: 5 }]
      }]

      iastContext = {
        collector: {
          drainMetrics: sinon.stub().returns(metrics)
        }
      }

      telemetry.onRequestEnded(iastContext, rootSpan)

      expect(iastContext.collector.drainMetrics).to.be.calledOnce
      expect(rootSpan.addTags).to.be.calledTwice

      const calls = rootSpan.addTags.getCalls()
      const reqTaintedTag = calls[0].args[0]
      expect(reqTaintedTag).to.has.property(`${TAG_PREFIX}.${Metric.REQUEST_TAINTED.name}`)
      expect(reqTaintedTag[`${TAG_PREFIX}.${Metric.REQUEST_TAINTED.name}`]).to.be.eq(15)

      const execSinkTag = calls[1].args[0]
      expect(execSinkTag).to.has.property(`${TAG_PREFIX}.${Metric.EXECUTED_SINK.name}`)
      expect(execSinkTag[`${TAG_PREFIX}.${Metric.EXECUTED_SINK.name}`]).to.be.eq(1)
    })

    it('should set filter out global scoped metrics', () => {
      const metrics = [{
        metric: Metric.INSTRUMENTED_PROPAGATION,
        points: [{ value: 5 }, { value: 5 }]
      }]

      iastContext = {
        collector: {
          drainMetrics: sinon.stub().returns(metrics)
        }
      }

      telemetry.onRequestEnded(iastContext, rootSpan)

      expect(iastContext.collector.drainMetrics).to.be.calledOnce
      expect(rootSpan.addTags).to.not.be.called
    })

    it('should merge all kind of metrics in GLOBAL collector', () => {
      const metrics = [{
        metric: Metric.REQUEST_TAINTED,
        points: [{ value: 5 }, { value: 5 }]
      },
      {
        metric: Metric.INSTRUMENTED_PROPAGATION,
        points: [{ value: 1 }]
      }]

      iastContext = {
        collector: {
          drainMetrics: sinon.stub().returns(metrics)
        }
      }

      telemetry.onRequestEnded(iastContext, rootSpan)
      expect(collector.GLOBAL.merge).to.be.calledWith(metrics)
    })

    it('should not fail with incomplete metrics', () => {
      const metrics = [{
        points: [{ value: 5 }, { value: 5 }]
      },
      {
        metric: Metric.INSTRUMENTED_PROPAGATION
      },
      {}]

      iastContext = {
        collector: {
          drainMetrics: sinon.stub().returns(metrics)
        }
      }

      telemetry.onRequestEnded(iastContext, rootSpan)
      expect(collector.GLOBAL.merge).to.be.calledWith(metrics)
    })
  })

  describe('add, increase methods', () => {
    beforeEach(() => {
      telemetry.configure({
        telemetryEnabled: true
      })
    })

    it('should call collector add', () => {
      const iastContext = {}
      telemetry.add(Metric.INSTRUMENTED_PROPAGATION, 1, 'tag', iastContext)

      expect(collector.add).to.be.calledOnceWith(Metric.INSTRUMENTED_PROPAGATION, 1, 'tag', iastContext)
    })
  })
})
