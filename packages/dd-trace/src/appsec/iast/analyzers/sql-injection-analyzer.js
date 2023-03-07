'use strict'
const InjectionAnalyzer = require('./injection-analyzer')

class SqlInjectionAnalyzer extends InjectionAnalyzer {
  constructor () {
    super('SQL_INJECTION')
  }

  onConfigure () {
    this.addSub(
      { channelName: 'apm:mysql:query:start' },
      ({ sql }, iastPluginContext) => this.analyze(sql, iastPluginContext)
    )
    this.addSub(
      { channelName: 'apm:mysql2:query:start' },
      ({ sql }, iastPluginContext) => this.analyze(sql, iastPluginContext)
    )
    this.addSub(
      { channelName: 'apm:pg:query:start' },
      ({ originalQuery }, iastPluginContext) => this.analyze(originalQuery, iastPluginContext)
    )
  }
}

module.exports = new SqlInjectionAnalyzer()
