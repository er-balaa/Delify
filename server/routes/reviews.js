const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

// Submit a Review
router.post('/', async (req, res) => {
    const { user, restaurant, order, rating, comment } = req.body;

    try {
        // 1. Create Review
        const newReview = new Review({
            user,
            restaurant,
            order,
            rating,
            comment
        });
        await newReview.save();

        // 2. Mark Order as Rated
        await Order.findByIdAndUpdate(order, { isRated: true });

        // 3. Recalculate Restaurant Average Rating
        const reviews = await Review.find({ restaurant });
        const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        const avgRating = (totalRating / reviews.length).toFixed(1); // One decimal place

        await Restaurant.findByIdAndUpdate(restaurant, { rating: avgRating });

        res.json({ msg: 'Review submitted and rating updated', newRating: avgRating });

    } catch (err) {
        console.error("Error submitting review:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
