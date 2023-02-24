const Writer = require('./writer')

class InterprocessExporter {
  constructor () {
    this._writer = new Writer()
  }

  export (payload) {
    this._writer.append(payload)
  }

  flush () {
    this._writer.flush()
  }
}

module.exports = InterprocessExporter
