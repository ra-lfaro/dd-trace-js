const Writer = require('./writer')

/**
 * Lightweight exporter whose writers only do simple JSON serialization
 * of trace and coverage payloads, which they send to the jest main process.
 */

const TRACE_PAYLOAD_CODE = 60
const COVERAGE_PAYLOAD_CODE = 61

class JestWorkerCiVisibilityExporter {
  constructor () {
    this._writer = new Writer(TRACE_PAYLOAD_CODE)
    this._coverageWriter = new Writer(COVERAGE_PAYLOAD_CODE)
  }

  export (payload) {
    this._writer.append(payload)
  }

  exportCoverage ({ span, coverageFiles }) {
    this._coverageWriter.append([
      {
        coverageFiles,
        traceId: span.context()._traceId,
        spanId: span.context()._spanId
      }
    ])
  }

  flush () {
    this._writer.flush()
    this._coverageWriter.flush()
  }
}

module.exports = JestWorkerCiVisibilityExporter
