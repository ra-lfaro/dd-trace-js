'use strict'
const InjectionAnalyzer = require('./injection-analyzer')

class CommandInjectionAnalyzer extends InjectionAnalyzer {
  constructor () {
    super('COMMAND_INJECTION')
  }

  onConfigure () {
    this.addSub(
      { channelName: 'datadog:child_process:execution:start' },
      ({ command }, iastPluginContext) => this.analyze(command, iastPluginContext)
    )
  }
}

module.exports = new CommandInjectionAnalyzer()
