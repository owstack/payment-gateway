const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
const Schema = mongoose.Schema;

let Key = new Schema({
    xpub: {type: String, required: true, unique: true}
});

module.exports = Key = mongoose.model('Key', Key);
