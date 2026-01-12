const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

// Get all restaurants
router.get('/', async (req, res) => {
    try {
        console.log("GET /api/restaurants called");
        const restaurants = await Restaurant.find().populate('owner', 'name email');
        console.log(`Found ${restaurants.length} restaurants from DB`);
        res.json(restaurants);
    } catch (err) {
        console.error("Error in GET /restaurants:", err);
        res.status(500).send('Server Error');
    }
});

// Add new restaurant (Admin)
router.post('/', async (req, res) => {
    try {
        let ownerId = null;

        // If owner email provided, try to find that user
        if (req.body.ownerEmail) {
            const user = await User.findOne({ email: req.body.ownerEmail });
            if (user) {
                ownerId = user._id;
                // Ideally, we should also update this user's role to 'restaurant_owner' if not already
                if (user.role !== 'restaurant_owner' && user.role !== 'admin') {
                    user.role = 'restaurant_owner';
                    await user.save();
                }
            } else {
                // Or return clear error validation if stricter
                console.log("Owner email not found: " + req.body.ownerEmail);
            }
        }

        // Fallback: Assign to admin if no email provided or not found (legacy behavior)
        if (!ownerId) {
            let admin = await User.findOne({ email: 'delifyadmin@gmail.com' });
            if (!admin) admin = await User.findOne({});
            ownerId = admin ? admin._id : null;
        }

        const newRestaurant = new Restaurant({
            ...req.body,
            owner: ownerId
        });

        const restaurant = await newRestaurant.save();

        // Emit Real-time Event
        if (req.io) {
            req.io.emit('restaurant_added', restaurant);
        }

        res.json(restaurant);
    } catch (err) {
        console.error("Error adding restaurant:", err);
        res.status(500).send('Server Error: ' + err.message);
    }
});

// Update restaurant details (Admin)
router.put('/:id', async (req, res) => {
    try {
        console.log(`PUT /api/restaurants/${req.params.id} called`);
        console.log("Update Data:", req.body);

        const updateData = { ...req.body };

        if (updateData.cuisine && typeof updateData.cuisine === 'string') {
            updateData.cuisine = updateData.cuisine.split(',').map(c => c.trim());
        }

        // Handle Owner Update via Email
        if (updateData.ownerEmail) {
            // Always save the email string provided by Admin
            // Look up user to link ID if they exist
            const user = await User.findOne({ email: updateData.ownerEmail });
            if (user) {
                updateData.owner = user._id;
                // Update role logic
                if (user.role !== 'restaurant_owner' && user.role !== 'admin') {
                    user.role = 'restaurant_owner';
                    await user.save();
                }
            } else {
                console.log(`Owner email '${updateData.ownerEmail}' provided but no user found. Email saved for future matching.`);
            }
        }

        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedRestaurant) {
            return res.status(404).json({ msg: 'Restaurant not found' });
        }

        console.log("Restaurant updated successfully");

        // Emit Real-time Event
        if (req.io) {
            req.io.emit('restaurant_updated', updatedRestaurant);
        }

        res.json(updatedRestaurant);
    } catch (err) {
        console.error("Error updating restaurant:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get single restaurant by ID
router.get('/:id', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id).populate('owner', 'name');
        if (!restaurant) return res.status(404).json({ msg: 'Restaurant not found' });
        res.json(restaurant);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Get menu for a restaurant
router.get('/:id/menu', async (req, res) => {
    try {
        const menu = await MenuItem.find({ restaurant: req.params.id });
        res.json(menu);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Add menu item (Admin)
router.post('/:id/menu', async (req, res) => {
    try {
        const menuItem = new MenuItem({
            restaurant: req.params.id,
            ...req.body
        });
        const savedItem = await menuItem.save();

        // Emit Real-time Event
        if (req.io) {
            req.io.emit('menu_updated', {
                restaurantId: req.params.id,
                action: 'add',
                item: savedItem
            });
        }

        res.json(savedItem);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Update menu item
router.put('/menu/:itemId', async (req, res) => {
    try {
        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.itemId,
            req.body,
            { new: true }
        );

        // Emit Real-time Event
        if (req.io) {
            req.io.emit('menu_updated', {
                restaurantId: updatedMenuItem.restaurant,
                action: 'update',
                item: updatedMenuItem
            });
        }

        res.json(updatedMenuItem);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Delete menu item
router.delete('/menu/:itemId', async (req, res) => {
    try {
        const item = await MenuItem.findByIdAndDelete(req.params.itemId);

        // Emit Real-time Event
        if (req.io && item) {
            req.io.emit('menu_updated', {
                restaurantId: item.restaurant,
                action: 'delete',
                itemId: req.params.itemId
            });
        }

        res.json({ msg: 'Menu item removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
