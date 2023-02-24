const Writer = require('./writer')
const CoverageWriter = require('./coverage-writer')

class InterprocessExporter {
  constructor () {
    this._writer = new Writer()
    this._coverageWriter = new CoverageWriter()
  }

  export (payload) {
    this._writer.append(payload)
  }

  exportCoverage (payload) {
    this._coverageWriter.append(payload)
  }

  flush () {
    this._writer.flush()
    this._coverageWriter.flush()
  }
}

module.exports = InterprocessExporter
