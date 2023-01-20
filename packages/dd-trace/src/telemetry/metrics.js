'use strict'

const TelemetryPlugin = require('./plugin')

class MetricsTelemetryPlugin extends TelemetryPlugin {
  constructor () {
    super('generate-metrics')
    this.metricProviders = new Set()
  }

  onStart () {
    return this.metricProviders.size > 0
  }

  getPayload () {
    const series = []
    this.metricProviders.forEach(provider => {
      const metrics = provider()
      if (metrics) {
        series.push(...metrics)
      }
    })
    if (series.length > 0) {
      return {
        namespace: 'tracers',
        series
      }
    }
  }

  registerProvider (provider) {
    this.metricProviders.add(provider)
    this.startInterval()
  }

  unregisterProvider (provider) {
    if (this.metricProviders.has(provider)) {
      this.metricProviders.delete(provider)
    }
    if (this.metricProviders.size === 0) {
      this.stopInterval()
    }
  }

  onStop () {
    this.metricProviders.clear()
  }
}

module.exports = new MetricsTelemetryPlugin()
