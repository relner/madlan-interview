const mongoose = require('mongoose');

const { mongoURI } = require('./configuration');

module.exports.connectDb = () => {
    mongoose.connect(mongoURI);
    return mongoose.connection;
}
