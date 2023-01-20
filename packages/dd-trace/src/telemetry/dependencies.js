'use strict'

const path = require('path')
const parse = require('module-details-from-path')
const requirePackageJson = require('../require-package-json')
const dc = require('diagnostics_channel')
const { fileURLToPath } = require('url')
const TelemetryPlugin = require('./plugin')

const savedDependencies = new Set()
const detectedDependencyNames = new Set()
const FILE_URI_START = `file://`
const moduleLoadStartChannel = dc.channel('dd-trace:moduleLoadStart')

function isDependency (filename, request) {
  const isDependencyWithSlash = isDependencyWithSeparator(filename, request, '/')
  if (isDependencyWithSlash && process.platform === 'win32') {
    return isDependencyWithSeparator(filename, request, path.sep)
  }
  return isDependencyWithSlash
}

function isDependencyWithSeparator (filename, request, sep) {
  return request.indexOf(`..${sep}`) !== 0 &&
    request.indexOf(`.${sep}`) !== 0 &&
    request.indexOf(sep) !== 0 &&
    request.indexOf(`:${sep}`) !== 1
}

class DependenciesTelemetryPlugin extends TelemetryPlugin {
  constructor () {
    super('app-dependencies-loaded')
  }

  onStart () {
    // Is there another way to maintain `this` scope? .subscribe should return the message handler?
    this.onModuleLoadListener = (data) => this.onModuleLoad(data)
    moduleLoadStartChannel.subscribe(this.onModuleLoadListener)
  }

  onStop () {
    detectedDependencyNames.clear()
    savedDependencies.clear()
    if (moduleLoadStartChannel.hasSubscribers && this.onModuleLoadListener) {
      moduleLoadStartChannel.unsubscribe(this.onModuleLoadListener)
    }
  }

  onModuleLoad (data) {
    if (data) {
      let filename = data.filename
      if (filename && filename.startsWith(FILE_URI_START)) {
        try {
          filename = fileURLToPath(filename)
        } catch (e) {
          // cannot transform url to path
        }
      }
      const parseResult = filename && parse(filename)
      const request = data.request || (parseResult && parseResult.name)
      if (filename && request && isDependency(filename, request) && !detectedDependencyNames.has(request)) {
        detectedDependencyNames.add(request)
        if (parseResult) {
          const { name, basedir } = parseResult
          if (basedir) {
            try {
              const { version } = requirePackageJson(basedir, module)
              savedDependencies.add(`${name} ${version}`)
              this.waitAndSend()
            } catch (e) {
              // can not read the package.json, do nothing
            }
          }
        }
      }
    }
  }

  waitAndSend () {
    if (!this.immediate) {
      this.immediate = setImmediate(() => {
        this.immediate = null
        if (savedDependencies.size > 0) {
          const dependencies = Array.from(savedDependencies.values()).splice(0, 1000).map(pair => {
            savedDependencies.delete(pair)
            const [name, version] = pair.split(' ')
            return { name, version }
          })
          this.send({ dependencies })
          if (savedDependencies.size > 0) {
            this.waitAndSend()
          }
        }
      })
      this.immediate.unref()
    }
  }
}

module.exports = new DependenciesTelemetryPlugin()
