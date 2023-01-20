
const { HTTP_REQUEST_PARAMETER, HTTP_REQUEST_BODY } = require('./source-types')
const { taintObject } = require('./operations')
const { SourceIastPlugin } = require('../iast-plugin')

class TaintTrackingPlugin extends SourceIastPlugin {
  constructor () {
    super()
    this._type = 'taint-tracking'
  }

  onConfigure () {
    this.addSub(
      { channelName: 'datadog:body-parser:read:finish', tag: HTTP_REQUEST_BODY },
      ({ request }, iastContext) => this._taintTrackingHandler(HTTP_REQUEST_BODY, request, 'body', iastContext)
    )
    this.addSub(
      { channelName: 'datadog:qs:parse:finish', tag: HTTP_REQUEST_PARAMETER },
      ({ qs }, iastContext) => this._taintTrackingHandler(HTTP_REQUEST_PARAMETER, qs, null, iastContext))
  }

  _taintTrackingHandler (type, target, property, iastContext) {
    if (!property) {
      target = taintObject(iastContext, target, type)
    } else {
      target[property] = taintObject(iastContext, target[property], type)
    }
  }

  enable () {
    this.configure(true)
  }

  disable () {
    this.configure(false)
  }
}

module.exports = new TaintTrackingPlugin()
