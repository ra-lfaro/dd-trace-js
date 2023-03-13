'use strict'

const { AggregatedCombiner, ConflatedCombiner } = require('./combiners')

class MetricData {
  constructor (metric, points, tag) {
    this.metric = metric
    this.points = points
    this.tag = tag
  }
}

class DefaultHandler {
  constructor (metric, combiner) {
    this.metric = metric
    this.combiner = combiner
  }

  add (value) {
    this.combiner.add(value)
  }

  drain () {
    const points = this.combiner.drain()
    return [new MetricData(this.metric, points)]
  }

  merge (metricData) {
    this.combiner.merge(metricData)
  }
}

class TaggedHandler {
  constructor (metric, supplier) {
    this.metric = metric
    this.supplier = supplier
    this.combiners = new Map()
  }

  add (value, tag) {
    this.getOrCreateCombiner(tag).add(value)
  }

  drain () {
    const result = []
    for (const [key, value] of this.combiners) {
      const points = value.drain()
      if (points && points.length) {
        result.push(new MetricData(this.metric, points, key))
      }
    }
    return result
  }

  getOrCreateCombiner (tag) {
    tag = !tag ? '' : tag
    let combiner = this.combiners.get(tag)
    if (!combiner) {
      combiner = this.supplier()
      this.combiners.set(tag, combiner)
    }
    return combiner
  }

  merge (metricData) {
    this.getOrCreateCombiner(metricData.tag).merge(metricData)
  }
}

class DelegatingHandler {
  constructor (metric, collector) {
    this.metric = metric
    this.collector = collector
  }

  add (value, tag) {
    this.collector.addMetric(this.metric, value, tag)
  }

  drain () {}

  merge () {}
}

function aggregated (metric) {
  return metric.metricTag
    ? new TaggedHandler(metric, () => new AggregatedCombiner())
    : new DefaultHandler(metric, new AggregatedCombiner())
}

function conflated (metric) {
  return metric.metricTag
    ? new TaggedHandler(metric, () => new ConflatedCombiner())
    : new DefaultHandler(metric, new ConflatedCombiner())
}

function delegating (metric, collector) {
  return new DelegatingHandler(metric, collector)
}

module.exports = {
  DefaultHandler,
  TaggedHandler,
  DelegatingHandler,
  MetricData,

  aggregated,
  conflated,
  delegating
}
