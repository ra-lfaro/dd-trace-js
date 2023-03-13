'use strict'

const { expect } = require('chai')
const { DefaultHandler, TaggedHandler, DelegatingHandler, MetricData, aggregated, conflated, delegating } =
  require('../../../../src/appsec/iast/telemetry/handlers')
const { Point, AggregatedCombiner, ConflatedCombiner } = require('../../../../src/appsec/iast/telemetry/combiners')
const { Metric } = require('../../../../src/appsec/iast/telemetry/metrics')

function getCombiner (point) {
  return {
    add: sinon.spy(),
    drain: sinon.stub().returns([point]),
    merge: sinon.spy()
  }
}

describe('Telemetry Handlers', () => {
  const point = new Point(5)
  let combinersCreated
  let combiner
  let supplier
  beforeEach(() => {
    combiner = getCombiner(point)
    combinersCreated = []
    supplier = () => {
      const combiner = getCombiner(point)
      combinersCreated.push(combiner)
      return combiner
    }
  })
  const metric = {
    name: 'test.metric'
  }
  const taggedMetric = {
    name: 'test.metric',
    tag: 'testTag'
  }

  describe('DefaultHandler', () => {
    it('should invoke add combiner with value', () => {
      const defaultHandler = new DefaultHandler(metric, combiner)
      defaultHandler.add(5)

      expect(combiner.add).to.be.calledOnceWith(5)
    })

    it('should invoke combiner.drain and return a MetricData[]', () => {
      const defaultHandler = new DefaultHandler(metric, combiner)
      defaultHandler.add(5)

      const metricDataList = defaultHandler.drain()
      expect(metricDataList.length).to.be.eq(1)

      const metricData = metricDataList[0]
      expect(metricData).to.be.an.instanceOf(MetricData)
      expect(metricData.metric).to.be.eq(metric)
      expect(metricData.points.length).to.be.eq(1)
      expect(metricData.points[0]).to.be.eq(point)
    })

    it('should invoke combiner.merge', () => {
      const defaultHandler = new DefaultHandler(metric, combiner)
      defaultHandler.add(5)

      const datas = [{}]

      defaultHandler.merge(datas)
      expect(combiner.merge).to.be.calledOnceWith(datas)
    })
  })

  describe('TaggedHandler', () => {
    it('should initialize a combiner for a tag and store it', () => {
      const taggedHandler = new TaggedHandler(taggedMetric, supplier)
      taggedHandler.add(5, 'this_is_a_tag')

      expect(combinersCreated.length).to.be.eq(1)
      expect(taggedHandler.combiners.size).to.be.eq(1)
      expect(taggedHandler.combiners.has('this_is_a_tag')).to.be.true
      expect(taggedHandler.combiners.get('this_is_a_tag')).to.be.eq(combinersCreated[0])

      expect(combinersCreated[0].add).to.be.calledOnceWith(5)
    })

    it('should reuse a combiner for a tag', () => {
      const taggedHandler = new TaggedHandler(taggedMetric, supplier)
      taggedHandler.add(5, 'this_is_a_tag')
      taggedHandler.add(10, 'this_is_a_tag')

      expect(combinersCreated.length).to.be.eq(1)
      expect(taggedHandler.combiners.size).to.be.eq(1)

      expect(combinersCreated[0].add).to.be.calledTwice
    })

    it('should initialize a combiner for each tag', () => {
      const taggedHandler = new TaggedHandler(taggedMetric, supplier)
      taggedHandler.add(5, 'this_is_a_tag')
      taggedHandler.add(10, 'this_is_a_different_tag')

      expect(combinersCreated.length).to.be.eq(2)
      expect(taggedHandler.combiners.size).to.be.eq(2)

      expect(combinersCreated[0].add).to.be.calledOnceWith(5)
      expect(combinersCreated[1].add).to.be.calledOnceWith(10)
    })

    it('should use empty string when no tag is provided to add', () => {
      const taggedHandler = new TaggedHandler(taggedMetric, supplier)
      taggedHandler.add(5)

      expect(combinersCreated.length).to.be.eq(1)
      expect(taggedHandler.combiners.size).to.be.eq(1)
      expect(taggedHandler.combiners.has('')).to.be.true
    })

    it('should drain all combiners and set MetricData correct tag', () => {
      const taggedHandler = new TaggedHandler(taggedMetric, supplier)
      taggedHandler.add(5, 'this_is_a_tag')
      taggedHandler.add(10, 'this_is_a_different_tag')

      const metricDataList = taggedHandler.drain()

      expect(combinersCreated[0].drain).to.be.calledOnce
      expect(combinersCreated[1].drain).to.be.calledOnce

      expect(metricDataList.length).to.be.eq(2)

      expect(metricDataList[0].metric).to.be.equal(taggedMetric)
      expect(metricDataList[0].tag).to.be.equal('this_is_a_tag')

      expect(metricDataList[1].metric).to.be.equal(taggedMetric)
      expect(metricDataList[1].tag).to.be.equal('this_is_a_different_tag')
    })

    it('should merge metricData which same tag if match', () => {
      const taggedHandler = new TaggedHandler(taggedMetric, supplier)
      taggedHandler.add(5, 'this_is_a_tag')
      taggedHandler.add(10, 'this_is_a_different_tag')

      const metricData = {
        points: [new Point(7)],
        tag: 'this_is_a_different_tag'
      }
      taggedHandler.merge(metricData)

      expect(combinersCreated[1].merge).to.be.calledOnceWith(metricData)
    })

    it('should merge metricData whith unknown tag', () => {
      const taggedHandler = new TaggedHandler(taggedMetric, supplier)
      taggedHandler.add(5, 'this_is_a_tag')
      taggedHandler.add(10, 'this_is_a_different_tag')

      const metricData = {
        points: [new Point(7)],
        tag: 'this_is_another_tag'
      }
      taggedHandler.merge(metricData)

      expect(combinersCreated.length).to.be.eq(3)
      expect(combinersCreated[2].merge).to.be.calledOnceWith(metricData)
      expect(taggedHandler.combiners.has('this_is_another_tag')).to.be.true
    })
  })

  describe('DelegatingHandler', () => {
    it('should invoke collector.addMetric combiner with metric, value and tag', () => {
      const collector = {
        addMetric: sinon.spy()
      }
      const delegatingHandler = new DelegatingHandler(taggedMetric, collector)
      delegatingHandler.add(5, 'this_is_a_tag')

      expect(collector.addMetric).to.be.calledOnceWith(taggedMetric, 5, 'this_is_a_tag')
    })
  })

  describe('handlers', () => {
    it('aggregated should return a TaggedHandler when invoked on a metric with tag', () => {
      const handler = aggregated(Metric.EXECUTED_PROPAGATION)

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(TaggedHandler)
      expect(handler.supplier()).to.be.an.instanceOf(AggregatedCombiner)
    })

    it('aggregated should return a DefaultHandler when invoked on a metric without tag', () => {
      const handler = aggregated(Metric.REQUEST_TAINTED)

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(DefaultHandler)
      expect(handler.combiner).to.be.an.instanceOf(AggregatedCombiner)
    })

    it('conflated should return a TaggedHandler when invoked on a metric with tag', () => {
      const handler = conflated(Metric.EXECUTED_PROPAGATION)

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(TaggedHandler)
      expect(handler.supplier()).to.be.an.instanceOf(ConflatedCombiner)
    })

    it('conflated should return a DefaultHandler when invoked on a metric without tag', () => {
      const handler = conflated(Metric.REQUEST_TAINTED)

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(DefaultHandler)
      expect(handler.combiner).to.be.an.instanceOf(ConflatedCombiner)
    })

    it('delegating should return a DelegatingHandler', () => {
      const collector = {}
      const handler = delegating(Metric.REQUEST_TAINTED, collector)

      expect(handler).to.not.be.undefined
      expect(handler).to.be.an.instanceOf(DelegatingHandler)
      expect(handler.collector).to.be.eq(collector)
    })
  })
})
