const express = require('express');
const moment = require('moment');
const auth = require('../middleware/auth');
const Workday = require('../models/workday');
const Month = require('../models/month');
const router = new express.Router();

// Create a new working day
router.post('/workdays', auth, async ({ body }, res) => {
    const date = moment(body.date).startOf('day');
    try {
        const workdayDate = date.toISOString();
        const workday = await new Workday({
            ...body,
            date: workdayDate
        });

        await workday.save();
        res.status(201).json({
            workday,
            month: workday.owner
        });
    } catch (e) {
        res.status(500).json({ msg: e.message });
    }
});
router.get('/workdays', auth, async (req, res) => {
    try {
        const months = await Month.find({
            owner: req.user.id
        });

        const workdays = [];
        if (months) {
            await Promise.all(
                months.map(async month => {
                    const result = await Workday.find({
                        owner: month._id
                    });
                    workdays.push(...result);
                })
            );
        }

        res.json(workdays);
    } catch (e) {
        res.status(500).json({ msg: e.message });
    }
});

router.get('/workdays/:id', auth, async (req, res) => {
    try {
        const workday = await Workday.findById(req.params.id);

        if (!workday) {
            return res.status(404).json('Workday does not exist!');
        }
        res.json({ workday });
    } catch (e) {
        res.status(500).json({ msg: e.message });
    }
});

// Get all wordays for the month
router.get('/workdays/month/:monthId', auth, async (req, res) => {
    try {
        const workdays = await Workday.find({
            owner: req.params.id
        });
        res.json({ workdays });
    } catch (e) {
        res.status(500).json({ msg: e.message });
    }
});

router.patch('/workdays/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = [
        'date',
        'timeIn',
        'timeOut',
        'totalHours',
        'note',
        'isDayOff',
        'owner'
    ];

    // Check if the update parameters valid
    const isValidOperation = updates.every(update =>
        allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
        return res.status(400).json({ msg: 'Invalid updates' });
    }

    const workday = await Workday.findById(req.params.id);

    if (!workday) {
        return res.status(404).json({ msg: 'Workday was not found' });
    }

    try {
        updates.forEach(update => (workday[update] = req.body[update]));

        await workday.save();
        res.json({ workday, month: workday.owner });
    } catch (e) {
        res.status(400).json({ msg: e.message });
    }
});

router.delete('/workdays/:id', auth, async (req, res) => {
    try {
        const workday = await Workday.findById(req.params.id);
        const month = await workday.remove();

        if (!workday) {
            return res.status(404).json({ msg: e.message });
        }

        res.json({ workday, month: workday.owner });
    } catch (e) {
        res.status(500).json({ msg: e.message });
    }
});

module.exports = router;
