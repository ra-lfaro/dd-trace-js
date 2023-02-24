'use strict'
const { InterprocessEncoder } = require('../../../encode/interprocess')

class Writer {
  constructor () {
    this._encoder = new InterprocessEncoder(this)
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
      process.send([60, data])
    }
  }
}

module.exports = Writer
