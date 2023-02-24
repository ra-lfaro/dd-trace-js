'use strict'
const { CoverageInterprocessEncoder } = require('../../../encode/coverage-interprocess')

// example the same as writer, so it can be reused but with a different encoder
class CoverageWriter {
  constructor () {
    this._encoder = new CoverageInterprocessEncoder(this)
  }

  flush () {
    const count = this._encoder.count()

    if (count > 0) {
      const payload = this._encoder.makePayload()

      this._sendPayload(payload)
    }
  }

  append (payload) {
    this._encoder.encode(payload)
  }

  _sendPayload (data) {
    if (process.send) {
      process.send([61, data])
    }
  }
}

module.exports = CoverageWriter
