'use strict'

const { expect } = require('chai')
const proxyquire = require('proxyquire')

describe('MetricsTelemetryPlugin', () => {
  const m1 = { name: 'm1' }
  const m2 = { name: 'm2' }
  const m3 = { name: 'm3' }

  describe('getPayload', () => {
    it('should obtain metrics from every registered providers', () => {
      const sendDataMock = sinon.stub()
      const TelemetryPlugin = proxyquire('../../src/telemetry/plugin', {
        './send-data': {
          sendData: sendDataMock
        }
      })

      const metrics = proxyquire('../../src/telemetry/metrics', {
        './plugin': TelemetryPlugin
      })

      const iast = sinon.stub().returns([m1, m2])
      const other = sinon.stub().returns([m3])

      metrics.registerProvider(iast)
      metrics.registerProvider(other)

      const payload = metrics.getPayload()

      expect(iast).to.have.been.calledOnce
      expect(other).to.have.been.calledOnce
      expect(payload.series).to.contain(m1, m2, m3)
    })
  })

  describe('onSendData', () => {
    it('should obtain the payload and send it with sendData and \'generate-metrics\' request type', () => {
      const sendDataMock = sinon.stub()
      const TelemetryPlugin = proxyquire('../../src/telemetry/plugin', {
        './send-data': {
          sendData: sendDataMock
        }
      })

      const metrics = proxyquire('../../src/telemetry/metrics', {
        './plugin': TelemetryPlugin
      })

      const config = {}
      const application = {}
      const host = 'host'

      metrics.onStart = () => false
      metrics.start(config, application, host)

      const iast = sinon.stub().returns([m1, m2])
      metrics.registerProvider(iast)

      metrics.onSendData()

      expect(sendDataMock).to.have.been.calledOnceWith(config, application, host, 'generate-metrics', {
        namespace: 'tracers',
        series: [m1, m2]
      })
    })
  })
})
