'use strict'

const { expect } = require('chai')
const { channel } = require('diagnostics_channel')
const proxyquire = require('proxyquire')
const { VULNERABILITY_TYPE, SOURCE_TYPE } = require('../../../src/appsec/iast/telemetry/metric-tag')
const { getExecutedMetric, getInstrumentedMetric } = require('../../../src/appsec/iast/telemetry/metrics')

describe('IAST Plugin', () => {
  const loadChannel = channel('dd-trace:instrumentation:load')

  const logErrorMock = sinon.stub()
  const addSubMock = sinon.stub()
  const configureMock = sinon.stub()
  const getIastContextMock = sinon.stub()
  class PluginClass {
    addSub (channelName, handler) {
      addSubMock(channelName, handler)
    }
    configure (config) {
      configureMock(config)
    }
  }

  const handler = () => {
    throw new Error('handler error')
  }
  const channelName = 'datadog:test:start'

  let iastPlugin

  beforeEach(() => {
    addSubMock.reset()
    logErrorMock.reset()
    getIastContextMock.reset()
  })

  describe('with telemetry disabled', () => {
    const { IastPlugin, SinkIastPlugin, SourceIastPlugin } = proxyquire('../../../src/appsec/iast/iast-plugin', {
      '../../plugins/plugin': PluginClass,
      '../../log': {
        error: logErrorMock
      },
      './iast-context': {
        getIastContext: getIastContextMock
      }
    })

    beforeEach(() => {
      iastPlugin = new IastPlugin()
    })

    afterEach(() => {
      iastPlugin.disableTelemetry()
    })

    describe('addSub', () => {
      it('should call Plugin.addSub with channelName and wrapped handler', () => {
        iastPlugin.addSub('test', handler)

        expect(addSubMock).to.be.calledOnce
        const args = addSubMock.getCall(0).args
        expect(args[0]).equal('test')

        const wrapped = args[1]
        expect(wrapped).to.be.a('function')
        expect(wrapped).to.not.be.equal(handler)
        expect(wrapped()).to.not.throw
        expect(logErrorMock).to.be.calledOnce
      })

      it('should call Plugin.addSub with channelName and wrapped handler after registering iastPluginSub', () => {
        const iastPluginSub = { channelName: 'test' }
        iastPlugin.addSub(iastPluginSub, handler)

        expect(addSubMock).to.be.calledOnce
        const args = addSubMock.getCall(0).args
        expect(args[0]).equal('test')

        const wrapped = args[1]
        expect(wrapped).to.be.a('function')
        expect(wrapped).to.not.be.equal(handler)
        expect(wrapped()).to.not.throw
        expect(logErrorMock).to.be.calledOnce
      })

      it('should infer moduleName from channelName after registering iastPluginSub', () => {
        const iastPluginSub = { channelName: 'test' }
        iastPlugin.addSub(iastPluginSub, handler)

        expect(iastPlugin.pluginSubs).to.have.lengthOf(1)
        expect(iastPlugin.pluginSubs[0].moduleName).eq('test')
      })

      it('should infer moduleName from channelName after registering iastPluginSub with real channelName', () => {
        const iastPluginSub = { channelName: 'datadog:test:start' }
        iastPlugin.addSub(iastPluginSub, handler)

        expect(iastPlugin.pluginSubs).to.have.lengthOf(1)
        expect(iastPlugin.pluginSubs[0].moduleName).eq('test')
      })

      it('should call _wrapHandler with correct metric values', () => {
        const wrapHandler = sinon.stub()
        iastPlugin._wrapHandler = wrapHandler
        iastPlugin.addSub({ channelName, metricTag: VULNERABILITY_TYPE }, handler)

        expect(wrapHandler).to.be.calledOnceWith(handler, getExecutedMetric(VULNERABILITY_TYPE), undefined)

        wrapHandler.reset()
        iastPlugin.addSub({ channelName, metricTag: SOURCE_TYPE, tag: 'test-tag' }, handler)
        expect(wrapHandler).to.be.calledOnceWith(handler, getExecutedMetric(SOURCE_TYPE), 'test-tag')
      })

      it('sink should _wrapHandler vulnerability_type metric', () => {
        const sink = new SinkIastPlugin()
        const wrapHandler = sinon.stub()
        sink._wrapHandler = wrapHandler

        sink.addSub({ channelName }, handler)

        expect(wrapHandler).to.be.calledOnceWith(handler, getExecutedMetric(VULNERABILITY_TYPE))
      })

      it('source should call _wrapHandler with source_type metric', () => {
        const source = new SourceIastPlugin()
        const wrapHandler = sinon.stub()
        source._wrapHandler = wrapHandler

        source.addSub({ channelName }, handler)

        expect(wrapHandler).to.be.calledOnceWith(handler, getExecutedMetric(SOURCE_TYPE))
      })

      it('source should call original handler providing iast context', () => {
        const context = {
          iast: true
        }
        getIastContextMock.returns(context)

        const sourceHandler = sinon.spy()
        const source = new SourceIastPlugin()
        source.addSub({ channelName }, sourceHandler)

        expect(addSubMock).to.be.calledOnce
        const finalHandler = addSubMock.getCall(0).args[1]
        const message = { message: 'hello' }
        finalHandler(message, channelName)

        expect(sourceHandler).to.be.calledOnceWith(message, context, channelName)
      })
    })

    describe('configure', () => {
      it('should mark Plugin configured and call only once onConfigure', () => {
        iastPlugin.onConfigure = sinon.stub()
        iastPlugin.configure(true)
        iastPlugin.configure(false)
        iastPlugin.configure(true)

        expect(iastPlugin.configured).to.be.true
        expect(iastPlugin.onConfigure).to.be.calledOnce
      })
    })
  })

  describe('with telemetry enabled', () => {
    const telemetry = require('../../../src/appsec/iast/telemetry')
    let isEnabledMock
    let isDebugEnabledMock
    let increaseMock

    const { IastPlugin } = proxyquire('../../../src/appsec/iast/iast-plugin', {
      '../../plugins/plugin': PluginClass,
      '../../log': {
        error: logErrorMock
      },
      './telemetry': telemetry
    })

    beforeEach(() => {
      iastPlugin = new IastPlugin()
      isEnabledMock = sinon.stub(telemetry, 'isEnabled').returns(true)
      isDebugEnabledMock = sinon.stub(telemetry, 'isDebugEnabled').returns(true)
      increaseMock = sinon.stub(telemetry, 'increase')
      increaseMock.reset()
    })

    afterEach(() => {
      iastPlugin.disableTelemetry()
      increaseMock.restore()
      isEnabledMock.restore()
      isDebugEnabledMock.restore()
    })

    describe('configure', () => {
      it('should subscribe dd-trace:instrumentation:load channel', () => {
        const onInstrumentationLoadedMock = sinon.stub(iastPlugin, 'onInstrumentationLoaded')
        iastPlugin.configure(true)
        iastPlugin.configure(false)
        iastPlugin.configure(true)

        loadChannel.publish({ name: 'test' })

        expect(onInstrumentationLoadedMock).to.be.calledOnceWith('test')
      })
    })

    describe('addSub', () => {
      it('should register an pluginSubscription and increment a sink metric when a sink module is loaded', () => {
        iastPlugin.addSub({
          moduleName: 'sink',
          channelName: 'datadog:sink:start',
          tag: 'injection',
          metricTag: VULNERABILITY_TYPE
        }, handler)
        iastPlugin.configure(true)

        loadChannel.publish({ name: 'sink' })

        expect(increaseMock).to.be.calledOnceWith(getInstrumentedMetric(VULNERABILITY_TYPE), 'injection')
      })

      it('should register an pluginSubscription and increment a source metric when a source module is loaded', () => {
        iastPlugin.addSub({
          moduleName: 'source',
          channelName: 'datadog:source:start',
          tag: 'http.source',
          metricTag: SOURCE_TYPE
        }, handler)
        iastPlugin.configure(true)

        loadChannel.publish({ name: 'source' })

        expect(increaseMock).to.be.calledOnceWith(getInstrumentedMetric(SOURCE_TYPE), 'http.source')
      })

      it('should wrap original handler and increment a sink metric when handler it is executed', () => {
        iastPlugin.addSub({
          moduleName: 'sink',
          channelName: 'datadog:sink:start',
          tag: 'injection',
          metricTag: VULNERABILITY_TYPE
        }, handler)
        iastPlugin.configure(true)

        const wrappedHandler = addSubMock.getCall(0).args[1]
        wrappedHandler()

        expect(increaseMock).to.be.calledOnceWith(getExecutedMetric(VULNERABILITY_TYPE), 'injection')
      })

      it('should wrap original handler and increment a source metric when handler it is executed', () => {
        iastPlugin.addSub({
          moduleName: 'source',
          channelName: 'datadog:source:start',
          tag: 'http.source',
          metricTag: SOURCE_TYPE
        }, handler)
        iastPlugin.configure(true)

        const wrappedHandler = addSubMock.getCall(0).args[1]
        wrappedHandler()

        expect(increaseMock).to.be.calledOnceWith(getExecutedMetric(SOURCE_TYPE), 'http.source')
      })
    })
  })
})
