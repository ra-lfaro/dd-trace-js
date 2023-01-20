'use strict'
const InjectionAnalyzer = require('./injection-analyzer')

class SqlInjectionAnalyzer extends InjectionAnalyzer {
  constructor () {
    super('SQL_INJECTION')
  }

  onConfigure () {
    this.addSub(
      { channelName: 'apm:mysql:query:start' },
      ({ sql }, iastContext) => this.analyze(sql, iastContext)
    )
    this.addSub(
      { channelName: 'apm:mysql2:query:start' },
      ({ sql }, iastContext) => this.analyze(sql, iastContext)
    )
    this.addSub(
      { channelName: 'apm:pg:query:start' },
      ({ originalQuery }, iastContext) => this.analyze(originalQuery, iastContext)
    )
  }
}

module.exports = new SqlInjectionAnalyzer()
