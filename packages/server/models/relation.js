const mongoose = require('mongoose');
const Schema = mongoose.Schema({
  poi_id: String,
  target: String,
  source: String,
  value: Number
});
const model = mongoose.model('poi_relation_result', Schema, 'poi_relation_result');

module.exports = model;
