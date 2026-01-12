const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');

// Get all orders (Admin)
router.get('/admin/all', async (req, res) => {
    try {
        console.log("GET /api/orders/admin/all called");
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('user', 'name email')
            .populate('restaurant', 'name image');
        console.log(`Found ${orders.length} orders`);
        res.json(orders);
    } catch (err) {
        console.error("Error in GET /orders/admin/all:", err);
        res.status(500).send('Server Error');
    }
});

// Update order status/details (Admin/Vendor)
// Update order status/details (Admin/Vendor)
router.put('/:id/status', async (req, res) => {
    console.log(`PUT /orders/${req.params.id}/status called with body:`, req.body);
    const { status, estimatedDeliveryTime } = req.body;
    const updateFields = {};
    if (status) updateFields.status = status;
    if (estimatedDeliveryTime) updateFields.estimatedDeliveryTime = estimatedDeliveryTime;

    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true, runValidators: false }
        ).populate('user', 'name email').populate('restaurant', 'name image').populate('deliveryPerson', 'name phoneNumber bikeNumber');

        if (!order) {
            console.log(`Order ${req.params.id} not found for status update`);
            return res.status(404).json({ msg: 'Order not found' });
        }

        console.log(`Order ${req.params.id} updated to status: ${order.status}`);

        // ----------------------------------------------------
        // AUTO-ASSIGNMENT TRIGGER: When status becomes 'out_for_delivery'
        // ----------------------------------------------------
        if (order.status === 'out_for_delivery' && !order.deliveryPerson) {
            console.log("Status is out_for_delivery, attempting auto-assignment...");
            try {
                const deliveryPartners = await User.find({ role: 'delivery' });
                if (deliveryPartners.length > 0) {
                    const partnersWithLoad = await Promise.all(deliveryPartners.map(async (partner) => {
                        const load = await Order.countDocuments({
                            deliveryPerson: partner._id,
                            status: { $nin: ['delivered', 'cancelled'] }
                        });
                        return { ...partner.toObject(), load };
                    }));
                    partnersWithLoad.sort((a, b) => a.load - b.load);
                    const bestDriver = partnersWithLoad[0];

                    order.deliveryPerson = bestDriver._id;
                    await order.save();

                    console.log(`Order ${order._id} assigned to ${bestDriver.name} on Out For Delivery`);

                    // Notify Driver
                    if (req.io) {
                        req.io.to(bestDriver.firebaseUid).emit('new_delivery_task', order);
                    }

                    // Populate and re-emit to User so they see the driver details
                    const populatedOrder = await Order.findById(order._id)
                        .populate('user', 'name email')
                        .populate('restaurant', 'name image')
                        .populate('items.menuItem', 'name price description')
                        .populate('deliveryPerson', 'name phoneNumber bikeNumber'); // Populated!

                    if (req.io) {
                        const userId = populatedOrder.user?._id || populatedOrder.user;
                        if (userId) {
                            const fullUser = await User.findById(userId);
                            if (fullUser && fullUser.firebaseUid) {
                                req.io.to(fullUser.firebaseUid).emit('order_updated', populatedOrder);
                            }
                        }
                    }

                    // Return populated order in response
                    return res.json(populatedOrder);
                } else {
                    console.log("No delivery partners available for assignment.");
                }
            } catch (assignErr) {
                console.error("Error in auto-assignment during status update:", assignErr);
            }
        }
        // ----------------------------------------------------

        // ----------------------------------------------------

        // Emit real-time update
        if (req.io) {
            try {
                // Notify Customer
                const userId = order.user?._id || order.user;
                if (userId) {
                    const fullUser = await User.findById(userId);
                    if (fullUser && fullUser.firebaseUid) {
                        req.io.to(fullUser.firebaseUid).emit('order_updated', order);
                    }
                }

                // Notify Delivery Partner (NEW)
                if (order.deliveryPerson) {
                    const driverId = order.deliveryPerson?._id || order.deliveryPerson;
                    const driver = await User.findById(driverId);
                    if (driver && driver.firebaseUid) {
                        console.log(`Emitting delivery_order_updated to driver ${driver.name}`);
                        req.io.to(driver.firebaseUid).emit('delivery_order_updated', order);
                    }
                }

            } catch (e) {
                console.error("Socket emit error:", e);
            }
        }

        res.json(order);
    } catch (err) {
        console.error("Error in PUT /orders/:id/status:", err);
        res.status(500).send('Server Error');
    }
});

// Create new order
router.post('/', async (req, res) => {
    const { user, restaurant, items, totalAmount, deliveryAddress } = req.body;

    try {
        // user coming from frontend is firebaseUid, find db _id
        const userDoc = await User.findOne({ firebaseUid: user });
        if (!userDoc) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // AUTO-SAVE ADDRESS: Update User Address if provided
        if (deliveryAddress) {
            await User.findByIdAndUpdate(userDoc._id, { address: deliveryAddress });
        }

        if (!restaurant || !items || items.length === 0 || !totalAmount || !deliveryAddress) {
            return res.status(400).json({ msg: 'Please provide all required fields' });
        }

        const newOrder = new Order({
            user: userDoc._id,
            restaurant,
            items,
            totalAmount,
            deliveryAddress
        });

        const order = await newOrder.save();

        // ----------------------------------------------------
        // LOGIC: Auto-Assign Removed (Moved to Status Update)
        // ----------------------------------------------------

        // Notify Admins
        if (req.io) {
            req.io.emit('new_order_admin', order);
            // Notify Specific Restaurant Vendor
            req.io.to(restaurant).emit('new_vendor_order', order);
        }

        res.json(order);

        // Automatic simulation removed to allow manual admin control only


    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get user orders
router.get('/user/:firebaseUid', async (req, res) => {
    try {
        const userDoc = await User.findOne({ firebaseUid: req.params.firebaseUid });
        if (!userDoc) {
            // If user never logged in or synced, they have no orders
            return res.json([]);
        }

        const orders = await Order.find({
            user: userDoc._id,
            isVisibleToUser: { $ne: false } // Include if true or field missing (backwards compatibility)
        })
            .sort({ createdAt: -1 })
            .populate('restaurant', 'name image')
            .populate('items.menuItem', 'name price description')
            .populate('deliveryPerson', 'name phoneNumber bikeNumber');

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get orders assigned to a specific delivery partner
router.get('/delivery-partner/:firebaseUid', async (req, res) => {
    try {
        const userDoc = await User.findOne({ firebaseUid: req.params.firebaseUid });
        if (!userDoc) return res.status(404).json({ msg: 'User not found' });

        const orders = await Order.find({ deliveryPerson: userDoc._id })
            .sort({ createdAt: -1 })
            .populate('restaurant', 'name address')
            .populate('user', 'name');

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Vendor Dashboard Data
router.get('/vendor/:firebaseUid/dashboard', async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Find restaurant owned by this user (Validate by Email first as per requirements, then ID)
        const restaurant = await require('../models/Restaurant').findOne({
            $or: [
                { ownerEmail: user.email },
                { owner: user._id }
            ]
        });

        if (!restaurant) {
            return res.json({
                restaurant: null,
                orders: [],
                stats: { totalOrders: 0, activeOrders: 0, completedOrders: 0, totalRevenue: 0 }
            });
        }

        // Find orders for this restaurant
        const orders = await Order.find({ restaurant: restaurant._id })
            .sort({ createdAt: -1 })
            .populate('user', 'name email')
            .populate('items.menuItem', 'name price');

        const stats = {
            totalOrders: orders.length,
            activeOrders: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
            completedOrders: orders.filter(o => o.status === 'delivered').length,
            totalRevenue: orders
                .filter(o => o.status !== 'cancelled')
                .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)
        };

        res.json({
            restaurant,
            orders,
            stats
        });

    } catch (err) {
        console.error("Error in Vendor Dashboard:", err);
        res.status(500).send('Server Error');
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    console.log(`DELETE /orders/${req.params.id} called`);
    try {
        // Soft Delete: Hide from user, keep for Admin/Vendor
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { isVisibleToUser: false },
            { new: true }
        );

        if (!order) {
            console.log(`Order ${req.params.id} not found for deletion`);
            return res.status(404).json({ msg: 'Order not found' });
        }
        console.log(`Order ${req.params.id} soft-deleted (hidden from user)`);
        res.json({ msg: 'Order hidden from user dashboard' });
    } catch (err) {
        console.error("Error deleting order:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
