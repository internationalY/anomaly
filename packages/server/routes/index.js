var express = require('express');
var router = express.Router();
var camelcase = require('camelcase');
var moment = require('moment');
const model = require('../models/map');
const commentModel = require('../models/comments');
const relationModel = require('../models/relation');
const noteModel = require('../models/note');
const relationItemModel = require('../models/relation-item');
const ruleModel = require('../models/rules');
const findFrequentPatterns = require('../utils/fp-growth').findFrequentPatterns;

/* GET home page. */
router.get('/', async function(req, res, next) {
  const result = await model
    .find(
      { poi_type: 'scenic', mafengwo_status: 'done', ctrip_status: 'done' },
      {
        qunar_count: 0,
        aip: 0,
        ctrip_url: 0,
        qunar_url: 0,
        qunar_status: 0,
        ctrip_count: 0,
        mafengwo_count: 0,
        _id: 0,
        poi_entry_url: 0,
        ctrip_status: 0,
        mafengwo_status: 0
      }
    )
    .exec();

  const data = result.map(item => {
    item = item.toObject();
    const tmp = {};
    Object.keys(item).forEach(key => (tmp[camelcase(key)] = item[key]));
    return tmp;
  });

  res.json({
    success: true,
    data: data,
    code: 200
  });
});

router.post('/compute_comparison', async function(req, res) {
  const poiIds = req.body.poiIds;
  const result = [];
  for (let i = 0, j = poiIds.length; i < j; ++i) {
    id = poiIds[i];
    const doc = await model.findOne({ poi_id: id }, { _id: 0, poi_name: 1, poi_id: 1, rate_group: 1 });
    if (doc != null) result.push(doc.toObject());
  }
  const tmpResult = result.map(item => {
    const tmp = {};
    Object.keys(item).forEach(key => (tmp[camelcase(key)] = item[key]));
    return tmp;
  });
  res.json({
    success: true,
    code: 201,
    data: tmpResult
  });
});

router.post(`/compute_related_pois`, async function(req, res) {
  const poiId = req.body.poiId;
  const timeRange = req.body.timeRange;
  const searchResult = await relationModel.find({ source: poiId, target: { $nin: ['2494887', '8607338'] } }).exec();
  // 从时间范围中找到Top6的景点
  const searchResultWithValue = searchResult.map(item => {
    const tmp = item.toObject();
    const value = tmp['relations']
      .filter(i => timeRange.findIndex(t => t === i.key) !== -1)
      .map(i => i.value)
      .reduce((a, b) => a + b);
    return { id: tmp['target'], value, name: tmp['target_name'] };
  });
  searchResultWithValue.sort((a, b) => b.value - a.value);
  const selectedPOIIds = searchResultWithValue.slice(0, 6).map(i => ({ id: i.id, name: i.name }));
  // const selfPOI = await model.findOne({ poi_id: poiId }, { poi_id: 1, _id: 0, poi_name: 1 }).exec();
  selectedPOIIds.push({ id: poiId });
  // 查询名称
  for (let i = 0, j = selectedPOIIds.length; i < j; ++i) {
    const result = await model.findOne({ poi_id: selectedPOIIds[i].id }).exec();
    selectedPOIIds[i].name = result.toObject()['poi_name'];
  }
  res.json({
    success: true,
    data: selectedPOIIds,
    code: 200
  });
});

router.post('/compute_relations', async function(req, res, next) {
  const relationsId = req.body.poiIds;
  const timeRange = req.body.timeRange;
  // 计算得到与被选中景点相关的所有其他景点
  const matrix = [];

  for (let i = 0, j = relationsId.length; i < j; ++i) {
    // 进行多次计算
    const tmpRelations = [];
    for (let k = 0, m = relationsId.length; k < m; ++k) {
      const searchResult = await relationModel
        .findOne(
          {
            source: relationsId[i],
            target: relationsId[k]
          },
          { _id: 0 }
        )
        .exec();
      const tmp = { source: relationsId[i], target: relationsId[k] };
      if (searchResult == null) tmp.value = 0;
      else {
        const parsedResult = (tmp.value = searchResult.toObject());
        const r = parsedResult['relations'].filter(r => timeRange.findIndex(i => i === r.key) !== -1);
        tmp.value = r.map(i => i.value).reduce((a, b) => a + b);
        tmp.total = r;
      }
      tmpRelations.push(tmp);
    }
    matrix.push({ source: relationsId[i], relations: tmpRelations });
  }
  for (let i = 0, j = matrix.length; i < j; ++i) {
    const result = await model.findOne({ poi_id: matrix[i].source }, { _id: 0, poi_name: 1, longtitude: 1, latitude: 1 }).exec();
    matrix[i].name = result.toObject()['poi_name'];
    matrix[i].longtitude = result.toObject()['longtitude'];
    matrix[i].latitude = result.toObject()['latitude'];
  }

  // for (let i = 0, j = relationsId.length; i < j; ++i) {
  //   // 计算景点的每月共现关系分布
  //   const monthlyRelation = await model.findOne({ poi_id: relationsId[i] }, { _id: 0, monthly_relation: 1 }).exec();
  //   matrix[i].monthlyRelation = monthlyRelation.toObject()['monthly_relation'];
  // }

  res.send({
    success: true,
    code: 200,
    data: matrix
  });
});

router.post(`/compute_keywords`, async function(req, res) {
  const poiId = req.body.poiId;
  const sentimentCategory = req.body.sentiment;
  const timeRange = req.body.timeRange;
  const timeRangeExp = timeRange.length <= 1 ? timeRange[0] : `${timeRange.map(i => `(${i.replace('-', `\\-`)})`).join('|')}`;

  const allComments = await commentModel.find({ sentiment_items: { $exists: true }, poi_id: poiId, date: new RegExp(timeRangeExp) }).exec();
  let allItems = allComments.filter(i => i.toObject()['sentiment_items'].length !== 0);
  allItems = allItems.reduce((a, b) => a.concat(b), []);
  const posMap = {};
  const negMap = {};
  allItems.forEach(i => {
    const item = i.toObject()['sentiment_items'];
    if (item == null) return;
    // 积极
    item.forEach(i => {
      const map = i['sentiment'] === sentimentCategory ? posMap : negMap;
      const key = i['prop'];
      const value = i['adj'];
      if (map[key] == null) map[key] = {};
      if (map[key][value] == null) map[key][value] = 1;
      else map[key][value] += 1;
    });
  });

  const tmpResult = Object.keys(posMap).map(i => {
    const prop = i;
    const value = Object.keys(posMap[i]).map(c => ({ adj: c, value: posMap[i][c] }));
    const totalValue = value.map(i => i.value).reduce((a, b) => a + b);
    return { prop, adjs: value, totalValue };
  });

  // 仅保留频次较高的关键词
  const result = tmpResult
    .map(t => {
      const adjs = t['adjs'];
      const filteredAdjs = adjs.filter(a => a.value >= 2);
      if (filteredAdjs == null || filteredAdjs.length === 0) return null;
      else {
        t['prop']['adjs'] = filteredAdjs;
        const newTotalValue = filteredAdjs.map(i => i.value).reduce((a, b) => a + b);
        return { prop: t['prop'], adjs: filteredAdjs, totalValue: newTotalValue };
      }
    })
    .filter(i => i);

  result.sort((a, b) => b.totalValue - a.totalValue);

  res.json({
    data: result.slice(0, 8),
    code: 200,
    success: true
  });
});

router.post('/compute_rules', async function(req, res) {
  const { poiId, timeRange } = req.body;
  const data = await ruleModel.find({}, { _id: 0 }).exec();
  const map = {};
  // 查找名称,建立ID与名称之间的关联
  const ids = Array.from(new Set(data.map(i => i.ids).reduce((a, b) => a.concat(b))));
  for (let i = 0, j = ids.length; i < j; ++i) {
    const obj = await model.findOne({ poi_id: ids[i] }).exec();
    const name = obj == null ? 'unknown' : obj.toObject()['poi_name'];
    map[ids[i]] = name;
  }
  const result = { map: map, data: data };
  res.json({
    data: result,
    code: 200,
    success: true
  });
});

router.get('/statistics', async function(req, res) {
  const years = [2018, 2019];
  const result = [];
  const months = Array.from({ length: 12 }, (v, k) => (k + 1 < 10 ? `0${k + 1}` : `${k + 1}`));
  for (let i = 0, j = years.length; i < j; ++i) {
    for (let k = 0, m = months.length; k < m; ++k) {
      const dateStr = `${years[i]}-${months[k]}`;
      const count = await commentModel.countDocuments({ date: new RegExp(dateStr) }).exec();
      const noteCount = await noteModel.countDocuments({ date: new RegExp(dateStr) }).exec();
      result.push({ key: dateStr, value: [count, noteCount] });
    }
  }
  res.json({
    code: 200,
    success: true,
    data: result
  });
});

/**
 * 计算基于某一景点得到的关联规则
 */
router.post('/compute_relation_rules', async function(req, res) {
  const poiId = req.body.poiId;
  const timeRange = req.body.timeRange;
  const timeRangeExp = timeRange.length <= 1 ? timeRange[0] : `${timeRange.map(i => `(${i.replace('-', `\\-`)})`).join('|')}`;

  const comments = await relationItemModel.find({ poi_ids: poiId, date: new RegExp(timeRangeExp) }).exec();
  const transactions = comments.map(c => {
    const tmp = c.toObject();
    return tmp['poi_ids'];
  });

  const patterns = findFrequentPatterns(transactions, 300);
  res.json({
    success: true,
    code: 200,
    data: []
  });
});

/**
 * 计算某一关键词相关的评论数据
 */
router.post('/compute_comments', async (req, res) => {
  const poiId = req.body.poiId;
  const timeRange = req.body.timeRange;
  const prop = req.body.prop;
  const adj = req.body.adj;
  const timeRangeExp = timeRange.length <= 1 ? timeRange[0] : `${timeRange.map(i => `(${i.replace('-', `\\-`)})`).join('|')}`;
  const allComments = await commentModel
    .find({ poi_id: poiId, sentiment_items: { $elemMatch: { prop, adj } }, date: new RegExp(timeRangeExp) })
    .exec();
  const data = allComments.map(i => i.toObject());
  res.json({
    success: true,
    code: 200,
    data
  });
});

/**
 * 计算某一景点的日历数据
 */
router.post('/compute_calendar', async (req, res) => {
  const poiIds = req.body.poiIds;
  const timeRange = req.body.timeRange;
  const result = [];
  for (let i = 0, j = poiIds.length; i < j; ++i) {
    const singlePoiData = { poiId: poiIds[i], data: [] };
    // 查找景点名称
    const poiName = await model.findOne({ poi_id: poiIds[i] }, { poi_name: 1, _id: 0 }).exec();
    singlePoiData.poiName = poiName.toObject()['poi_name'];
    for (let k = 0, m = timeRange.length; k < m; ++k) {
      const queryResult = await commentModel
        .aggregate([
          { $match: { poi_id: poiIds[i], date: new RegExp(timeRange[k]) } },
          { $group: { _id: '$rating', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])
        .exec();
      let allComments = await commentModel.find({ poi_id: poiIds[i], sentiment_items: { $exists: true }, date: new RegExp(timeRange[k]) }).exec();
      const sentimentObj = [
        ['价格', 0],
        ['景点', 0],
        ['环境', 0],
        ['感觉', 0],
        ['交通', 0],
        ['美食', 0]
      ];
      allComments = allComments.map(i => i.toObject().sentiment_items).reduce((a, b) => [...a, ...b], []);
      allComments.forEach(i => {
        if (i.category == null) return;
        if (i.sentiment !== 2) return;
        const idx = sentimentObj.findIndex(c => c[0] === i.category);
        if (idx !== -1) sentimentObj[idx][1] += 1;
      });
      singlePoiData.data.push({
        month: timeRange[k],
        sentimentValue: sentimentObj,
        data: queryResult.filter(i => i._id).map(i => ({ rate: i._id, count: i.count }))
      });
    }
    result.push(singlePoiData);
  }
  res.json({
    success: true,
    data: result,
    code: 200
  });
});

module.exports = router;
