'use strict'
const InjectionAnalyzer = require('./injection-analyzer')

class CommandInjectionAnalyzer extends InjectionAnalyzer {
  constructor () {
    super('COMMAND_INJECTION')
  }

  onConfigure () {
    this.addSub(
      { channelName: 'datadog:child_process:execution:start' },
      ({ command }, iastContext) => this.analyze(command, iastContext)
    )
  }
}

module.exports = new CommandInjectionAnalyzer()
