'use strict'

const { addHook, channel } = require('./helpers/instrument')

const onSpanStart = channel('apm:otel:span:start')
const onSpanFinish = channel('apm:otel:span:finish')
const onSpanError = channel('apm:otel:span:error')

const name = '@opentelemetry/sdk-trace-base'
const versions = ['*']

function wrapSpanConstructor (OriginalSpan) {
  return class Span extends OriginalSpan {
    constructor (...args) {
      super(...args)
      onSpanStart.publish(this)
    }

    recordException (error, ...args) {
      onSpanError.publish(error)
      return super.recordException(error, ...args)
    }

    end (...args) {
      const res = super.end(...args)
      onSpanFinish.publish(this)
      return res
    }
  }
}

addHook({ name, versions, file: 'build/src/Span.js' }, exports => {
  exports.Span = wrapSpanConstructor(exports.Span)
  return exports
})
