const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Create Delivery Person (Admin Only)
router.post('/delivery', async (req, res) => {
    const { name, email, bikeNumber, phoneNumber } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            // Update existing user to be delivery
            user.role = 'delivery';
            user.bikeNumber = bikeNumber;
            user.name = name;
            user.phoneNumber = phoneNumber;
            await user.save();
            return res.json({ msg: 'User updated to Delivery Role', user });
        }

        // Create new placeholder user
        user = new User({
            name,
            email,
            bikeNumber,
            phoneNumber,
            role: 'delivery',
            firebaseUid: `temp_${Date.now()}` // Temporary until they login and sync
        });

        await user.save();
        res.json({ msg: 'Delivery Person Created', user });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Update Delivery Person
router.put('/delivery/:id', async (req, res) => {
    const { name, email, bikeNumber, phoneNumber } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, bikeNumber, phoneNumber },
            { new: true }
        );
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get all users with Delivery role
router.get('/delivery', async (req, res) => {
    try {
        const users = await User.find({ role: 'delivery' });
        res.json(users);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Update General User Profile
router.put('/:id', async (req, res) => {
    const { name, phoneNumber, address } = req.body;

    // Validate ID format
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ msg: 'Invalid User ID format' });
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, phoneNumber, address },
            { new: true }
        );
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
