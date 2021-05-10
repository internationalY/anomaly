const mongoose = require('mongoose');
const mongoDB = 'mongodb://127.0.0.1:27017/poi';
mongoose.connect(mongoDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;

db.on('error', function() {
  console.error('连接错误');
});

module.exports = db;
