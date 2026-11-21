const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{9,15}$/;

function asTrimmed(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
}

function validateHoneypot(req, res) {
    if (asTrimmed(req.body.hp)) {
        res.status(400).json({ message: 'Spam detected' });
        return false;
    }
    return true;
}

module.exports.validateCreateLead = function (req, res, next) {
    if (!validateHoneypot(req, res)) return;

    const name = asTrimmed(req.body.name);
    const channel = asTrimmed(req.body.channel);
    const contact = asTrimmed(req.body.contact);

    if (!name || name.length > 100) {
        return res.status(400).json({ message: 'name is required' });
    }

    if (!['email', 'whatsapp'].includes(channel)) {
        return res.status(400).json({ message: 'channel must be email or whatsapp' });
    }

    if (channel === 'email' && !EMAIL_RE.test(contact)) {
        return res.status(400).json({ message: 'email is invalid' });
    }

    if (channel === 'whatsapp' && !PHONE_RE.test(contact)) {
        return res.status(400).json({ message: 'phone is invalid' });
    }

    req.body.name = name;
    req.body.channel = channel;
    req.body.contact = contact;
    next();
};
