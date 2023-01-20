'use strict'

const { expect } = require('chai')
const proxyquire = require('proxyquire')

const TelemetryPlugin = require('../../src/telemetry/plugin')
const originalSetInterval = global.setInterval

describe('TelemetryPlugin', () => {
  let setIntervalMock, plugin
  const config = {}
  const application = {}
  const host = 'host'

  beforeEach(() => {
    plugin = new TelemetryPlugin('pluginReqType')
    setIntervalMock = sinon.stub().returns({ unref: () => {} })
    global.setInterval = setIntervalMock
  })

  afterEach(() => {
    global.setInterval = originalSetInterval
  })

  describe('start', () => {
    it('should not set a periodic task to send metrics if no interval is provided', () => {
      plugin.start()
      expect(setIntervalMock).to.not.have.been.called
    })

    it('should set a periodic task to send metrics if interval is provided', () => {
      plugin.start(config, application, host, 60000)
      expect(setIntervalMock).to.have.been.calledOnce
      expect(plugin.interval).to.not.be.null
    })

    it('should call onStart and skip setting a periodic task if value returned by onStart is false', () => {
      const origOnStart = plugin.onStart
      plugin.onStart = () => false
      plugin.start(config, application, host, 60000)
      expect(setIntervalMock).to.not.have.been.called
      plugin.onStart = origOnStart
    })
  })

  describe('stop', () => {
    it('should clear interval if started', () => {
      const clearIntervalMock = sinon.stub()
      global.clearInterval = clearIntervalMock
      plugin.start(config, application, host, 60000)
      plugin.stop()
      expect(clearIntervalMock).to.have.been.calledOnceWith(plugin.interval)
    })

    it('should call onStop', () => {
      const clearIntervalMock = sinon.stub()
      global.clearInterval = clearIntervalMock
      const metricsOnStop = sinon.stub(plugin, 'onStop')
      plugin.start(config, application, host, 60000)
      plugin.stop()
      expect(clearIntervalMock).to.have.been.calledOnceWith(plugin.interval)
      metricsOnStop.restore()
    })
  })

  describe('onSendData', () => {
    it('should obtain the payload and send it with sendData', () => {
      const sendDataMock = sinon.stub()
      const TelemetryPlugin = proxyquire('../../src/telemetry/plugin', {
        './send-data': {
          sendData: sendDataMock
        }
      })
      const plugin = new TelemetryPlugin('pluginReqType')
      const getPayloadMock = sinon.stub(plugin, 'getPayload')
      const payload = { payload: '' }
      getPayloadMock.returns(payload)

      plugin.start(config, application, host)
      plugin.onSendData()

      expect(getPayloadMock).to.have.been.calledOnce
      expect(sendDataMock).to.have.been.calledOnceWith(config, application, host, 'pluginReqType', payload)
    })
  })
})
