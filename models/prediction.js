const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    panel: String,
    open: String,
    close: String,
    jodi: String,
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Prediction', predictionSchema);
