const mongoose = require('mongoose');
const Schema = mongoose.Schema({
  poi_id: String,
  content: String,
  date: String
});
const model = mongoose.model('poi_comments', Schema, 'poi_comments');

module.exports = model;
