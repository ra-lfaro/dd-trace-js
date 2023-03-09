'use strict'

const Module = require('module')
const shimmer = require('../../../../../datadog-shimmer')
const log = require('../../../log')
const { isPrivateModule, isNotLibraryFile } = require('./filter')
const { csiMethods } = require('./csi-methods')
const telemetry = require('../telemetry')
const { Metric, PropagationType } = require('../telemetry/metrics')
const { Verbosity } = require('../telemetry/verbosity')

let rewriter
let getPrepareStackTrace
function getRewriter () {
  if (!rewriter) {
    try {
      const iastRewriter = require('@datadog/native-iast-rewriter')
      const Rewriter = iastRewriter.Rewriter
      getPrepareStackTrace = iastRewriter.getPrepareStackTrace
      rewriter = new Rewriter({ csiMethods, telemetryVerbosity: telemetry.getVerbosityName() })
    } catch (e) {
      log.warn(`Unable to initialize TaintTracking Rewriter: ${e.message}`)
    }
  }
  return rewriter
}

let originalPrepareStackTrace = Error.prepareStackTrace
function getPrepareStackTraceAccessor () {
  let actual = getPrepareStackTrace(originalPrepareStackTrace)
  return {
    get () {
      return actual
    },
    set (value) {
      actual = getPrepareStackTrace(value)
      originalPrepareStackTrace = value
    }
  }
}

const telemetryOffRewrite = function (content, filename) {
  if (isPrivateModule(filename) && isNotLibraryFile(filename)) {
    return rewriter.rewrite(content, filename)
  }
}

const telemetryInformationRewrite = function (content, filename) {
  const response = telemetryOffRewrite(content, filename)

  const metrics = response.metrics
  if (metrics && metrics.instrumentedPropagation) {
    telemetry.add(Metric.INSTRUMENTED_PROPAGATION, metrics.instrumentedPropagation, PropagationType.STRING)
  }

  return response
}

const telemetryDebugRewrite = function (content, filename) {
  const start = process.hrtime.bigint()
  const response = telemetryInformationRewrite(content, filename)

  // TODO: propagationDebug!
  const metrics = response.metrics
  if (metrics && metrics.propagationDebug) {
    // debug metrics are using logs telemetry API instead metrics telemetry API
  }

  const rewriteTime = parseInt(process.hrtime.bigint() - start) * 1e-6
  telemetry.add(Metric.INSTRUMENTATION_TIME, rewriteTime)
  return response
}

function getRewriteFunction () {
  switch (telemetry.verbosity) {
    case Verbosity.OFF:
      return telemetryOffRewrite
    case Verbosity.DEBUG:
      return telemetryDebugRewrite
    default:
      return telemetryInformationRewrite
  }
}

function getCompileMethodFn (compileMethod) {
  const rewriteFn = getRewriteFunction()
  return function (content, filename) {
    try {
      if (isPrivateModule(filename) && isNotLibraryFile(filename)) {
        const rewritten = rewriteFn(content, filename)
        if (rewritten && rewritten.content) {
          return compileMethod.apply(this, [rewritten.content, filename])
        }
      }
    } catch (e) {
      log.error(e)
    }
    return compileMethod.apply(this, [content, filename])
  }
}

function enableRewriter () {
  const rewriter = getRewriter()
  if (rewriter) {
    Object.defineProperty(global.Error, 'prepareStackTrace', getPrepareStackTraceAccessor())
    shimmer.wrap(Module.prototype, '_compile', compileMethod => getCompileMethodFn(compileMethod))
  }
}

function disableRewriter () {
  shimmer.unwrap(Module.prototype, '_compile')
  Error.prepareStackTrace = originalPrepareStackTrace
}

module.exports = {
  enableRewriter, disableRewriter
}
