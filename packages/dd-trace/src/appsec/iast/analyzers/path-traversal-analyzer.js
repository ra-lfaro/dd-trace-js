'use strict'
const InjectionAnalyzer = require('./injection-analyzer')

class PathTraversalAnalyzer extends InjectionAnalyzer {
  constructor () {
    super('PATH_TRAVERSAL')
    this.addSub({ channelName: 'apm:fs:operation:start' }, (obj, iastPluginContext) => {
      const pathArguments = []
      if (obj.dest) {
        pathArguments.push(obj.dest)
      }
      if (obj.existingPath) {
        pathArguments.push(obj.existingPath)
      }
      if (obj.file) {
        pathArguments.push(obj.file)
      }
      if (obj.newPath) {
        pathArguments.push(obj.newPath)
      }
      if (obj.oldPath) {
        pathArguments.push(obj.oldPath)
      }
      if (obj.path) {
        pathArguments.push(obj.path)
      }
      if (obj.prefix) {
        pathArguments.push(obj.prefix)
      }
      if (obj.src) {
        pathArguments.push(obj.src)
      }
      if (obj.target) {
        pathArguments.push(obj.target)
      }
      this.analyze(pathArguments, iastPluginContext)
    })
  }

  analyze (value, iastPluginContext) {
    if (this._invalidContext(iastPluginContext)) {
      return
    }

    const iastContext = iastPluginContext.iastContext
    if (value && value.constructor === Array) {
      for (const val of value) {
        if (this._isVulnerable(val, iastContext)) {
          this._report(val, iastContext)
          // no support several evidences in the same vulnerability, just report the 1st one
          break
        }
      }
    }
  }
}

module.exports = new PathTraversalAnalyzer()
