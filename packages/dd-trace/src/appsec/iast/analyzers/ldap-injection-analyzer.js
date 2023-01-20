'use strict'
const InjectionAnalyzer = require('./injection-analyzer')

class LdapInjectionAnalyzer extends InjectionAnalyzer {
  constructor () {
    super('LDAP_INJECTION')
  }

  onConfigure () {
    this.addSub(
      { channelName: 'datadog:ldapjs:client:search' },
      ({ base, filter }, iastContext) => this.analyzeAll(iastContext, base, filter))
  }
}

module.exports = new LdapInjectionAnalyzer()
