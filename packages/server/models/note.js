const mongoose = require('mongoose');
const Schema = mongoose.Schema({
  poi_id: String,
  content: String,
  youji_url: String,
  date: String
});
const model = mongoose.model('poi_youji', Schema, 'poi_youji');

module.exports = model;
