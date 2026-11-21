const { messageMaxLength } = require('../helpers/configuration');

function asTrimmed(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
}

module.exports.validateMessage = function (req, res, next) {
    // A quick-reply answer has no text; it is validated against the question bank in the controller
    if ((req.body.answer || req.body.example !== undefined) && req.body.message === undefined) return next();

    const text = asTrimmed(req.body.message);

    if (!text) {
        return res.status(400).json({ message: 'message is required' });
    }

    if (text.length > messageMaxLength) {
        return res.status(400).json({ message: `Message is too long. Max length is ${messageMaxLength}` });
    }

    req.body.message = text;
    next();
};
