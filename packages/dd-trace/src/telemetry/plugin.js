'use strict'

const log = require('../log')
const { sendData } = require('./send-data')

module.exports = class TelemetryPlugin {
  constructor (reqType) {
    this.reqType = reqType
  }

  start (aConfig, appplicationObject, hostObject, heartbeatInterval) {
    this.config = aConfig
    this.application = appplicationObject
    this.host = hostObject
    this.heartbeatInterval = heartbeatInterval

    if (this.onStart() && this.heartbeatInterval) {
      this.startInterval()
    }
  }

  startInterval () {
    if (this.interval || !this.heartbeatInterval) return

    this.interval = setInterval(() => { this.onSendData() }, this.heartbeatInterval)
    this.interval.unref()
  }

  stopInterval () {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }

  onSendData () {
    try {
      const payload = this.getPayload()
      if (payload) {
        this.send(payload)
      }
    } catch (e) {
      log.error(e)
    }
  }

  send (payload) {
    sendData(this.config, this.application, this.host, this.reqType, payload)
  }

  onStart () { return true }

  onStop () {}

  getPayload () {}

  stop () {
    this.onStop()

    this.config = null
    this.application = null
    this.host = null

    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}
