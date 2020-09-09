const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/user');
const router = new express.Router();

// Create user
router.post('/users', async (req, res) => {
    const user = new User(req.body);
    try {
        await user.save();
        const token = await user.generateAuthToken();

        res.status(201).json({ user: { user, token } });
    } catch (e) {
        let msg = '';
        // Chech if mongoose validation error occurred
        if (e.errors) {
            // Check if email or password error and set error message
            msg = e.errors.email
                ? e.errors.email.properties.message
                : e.errors.password.properties.message;
        } else if (!msg) {
            // If message is empty, get the server error message
            msg = e.message.includes('E11000')
                ? 'This email is already registered.'
                : e.message;
        }

        res.status(400).send({ msg });
    }
});

// Login user
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(
            req.body.email,
            req.body.password
        );

        // Create token for the session
        const token = await user.generateAuthToken();
        const months = [];
        // Populate user

        await user
            .populate({
                path: 'months',
                options: {
                    sort: { monthDate: -1 }
                },
                populate: {
                    path: 'workdays',
                    options: { sort: { date: -1 } }
                }
            })
            .execPopulate(() => {
                return res.json({
                    // Add the token to the
                    user: { user, token: token },
                    months: user.months
                });
            });
    } catch (e) {
        res.status(400).send({ msg: e.message });
    }
});

// Logout user
router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter(
            token => token.token !== req.token
        );

        await req.user.save();
        res.send();
    } catch (e) {
        res.status(500).send();
    }
});

// Clear all sessions of the user
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();

        res.send();
    } catch (e) {
        res.status(500).send();
    }
});

// Get user
router.get('/users/me', auth, async (req, res) => {
    try {
        await req.user
            .populate({
                path: 'months',
                options: {
                    sort: { monthDate: -1 }
                },
                populate: {
                    path: 'workdays',
                    options: { sort: { date: -1 } }
                }
            })
            .execPopulate((err, user) => {
                return res.json({
                    user: req.user,
                    months: req.user.months
                });
            });
    } catch (e) {
        res.send(400).send({ msg: e.message });
    }
});

// Update User
router.patch('/users/me', auth, async (req, res) => {
    // Get the updates from the request
    const updates = Object.keys(req.body);
    // Set allowed updates
    const allowedUpdates = ['email', 'password', 'fullTime'];
    // Check for invalid updates
    const isValidOparation = updates.every(update =>
        allowedUpdates.includes(update)
    );

    if (!isValidOparation) {
        return res.status(400).send({ msg: 'Invalid updates!' });
    }

    try {
        updates.forEach(update => (req.user[update] = req.body[update]));
        await req.user.save();

        if (!req.user) {
            return res.status(404).send();
        }

        res.send(req.user);
    } catch (e) {
        res.status(400).send();
    }
});

// Delete user
router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove();
        res.send(req.user);
    } catch (e) {
        res.status(500).send();
    }
});

module.exports = router;
