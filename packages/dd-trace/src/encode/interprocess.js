class InterprocessEncoder {
  constructor (writer) {
    this._writer = writer
    this.payloads = []
  }

  encode (payload) {
    this.payloads = this.payloads.concat(payload)
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

module.exports = { InterprocessEncoder }
