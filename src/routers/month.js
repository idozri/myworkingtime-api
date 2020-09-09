const express = require('express');
const auth = require('../middleware/auth');
const Month = require('../models/month');
const router = new express.Router();

// Add new month to db
router.post('/months', auth, async (req, res) => {
    const month = new Month({ ...req.body, owner: req.user._id });

    try {
        await month.save();
        res.status(201).json({ month });
    } catch (e) {
        res.status(500).json({ msg: e.message });
    }
});

// Get all registered months for the user
router.get('/months', auth, async (req, res) => {
    try {
        const months = await Month.find({ owner: requser._id });

        // Send the user incase of client user state is empty
        res.json(req.user, months);
    } catch (e) {
        res.status(500).send({ msg: e.message });
    }
});

// Get month
router.get('/months/:id', async (req, res) => {
    try {
        const month = await Month.findById(req.user._id);
        res.json(month);
    } catch (e) {
        res.status(500).send({ msg: e.message });
    }
});

// Update month
router.patch('/months/:id', async (req, res) => {
    const updates = Object.keys(req.body);

    const allowedUpdates = ['monthDate', 'potentialMonthHours'];

    const isValidOparation = updates.every(update =>
        allowedUpdates.includes(update)
    );

    if (!isValidOparation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        const month = await Month.findById(req.params.id);

        if (!month) {
            return res.status(404).json({ msg: 'Month was not found' });
        }

        updates.forEach(update => (month[update] = req.body[update]));

        await month.save();
        res.send({ month, workdays: month.workdays });
    } catch (e) {
        res.status(500).send({ msg: e.message });
    }
});

// Delete month
router.delete('/months/:id', async (req, res) => {
    try {
        const month = await Month.findById(req.params.id);

        if (!month) {
            return res.status(404).send();
        }

        await month.remove();
        res.json({ month });
    } catch (e) {
        res.status(500).send({ msg: e.message });
    }
});

module.exports = router;
