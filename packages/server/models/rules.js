const mongoose = require('mongoose');
const Schema = mongoose.Schema({
  support: Number,
  ids: Array
});
const model = mongoose.model('poi_rules', Schema, 'poi_rules');

module.exports = model;
