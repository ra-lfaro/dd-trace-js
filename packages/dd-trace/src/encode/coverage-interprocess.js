class CoverageInterprocessEncoder {
  constructor (writer) {
    this._writer = writer
    this.payloads = []
  }

  encode ({ span, coverageFiles }) { // span, coverageFiles
    this.payloads.push({
      coverageFiles,
      traceId: span.context()._traceId,
      spanId: span.context()._spanId
    })
  }

  count () {
    return this.payloads.length
  }

  reset () {
    this.payloads = []
  }

  makePayload () {
    const data = JSON.stringify(this.payloads)
    this.reset()
    return data
  }
}

module.exports = { CoverageInterprocessEncoder }
