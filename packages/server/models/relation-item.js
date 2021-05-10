const mongoose = require('mongoose');
const Schema = mongoose.Schema({
  youji_url: String,
  date: String,
  poi_ids: Array,
  relations: Object
});
const model = mongoose.model('poi_relation', Schema, 'poi_relation');

module.exports = model;
