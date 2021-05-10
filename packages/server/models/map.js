const mongoose = require('mongoose');
const Schema = mongoose.Schema({
  poi_id: String,
  poi_name: String,
  poi_type: String,
  latitude: String,
  longtitude: String
});
const model = mongoose.model('poi_list', Schema, 'poi_list');

module.exports = model;
