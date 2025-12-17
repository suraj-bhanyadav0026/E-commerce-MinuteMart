const express = require('express');
const db = require('../config/database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get reviews for a product
router.get('/product/:productId', optionalAuth, (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10, sort = 'newest' } = req.query;

        const product = db.prepare('SELECT id FROM products WHERE id = ? OR uuid = ? OR slug = ?').get(productId, productId, productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let orderBy = 'r.created_at DESC';
        if (sort === 'helpful') orderBy = 'r.helpful_count DESC';
        if (sort === 'rating_high') orderBy = 'r.rating DESC';
        if (sort === 'rating_low') orderBy = 'r.rating ASC';

        const total = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE product_id = ?').get(product.id).count;

        const reviews = db.prepare(`
            SELECT r.*, u.first_name, u.last_name, u.avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `).all(product.id, parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        // Get rating distribution
        const distribution = db.prepare(`
            SELECT rating, COUNT(*) as count
            FROM reviews WHERE product_id = ?
            GROUP BY rating
        `).all(product.id);

        const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        distribution.forEach(d => ratingDist[d.rating] = d.count);

        res.json({
            reviews: reviews.map(r => ({
                ...r,
                images: JSON.parse(r.images || '[]'),
                userName: `${r.first_name} ${r.last_name.charAt(0)}.`
            })),
            ratingDistribution: ratingDist,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to get reviews' });
    }
});

// Add review
router.post('/', authMiddleware, (req, res) => {
    try {
        const { productId, orderId, rating, title, comment, images } = req.body;

        if (!productId || !rating) {
            return res.status(400).json({ error: 'Product ID and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const product = db.prepare('SELECT id FROM products WHERE id = ? OR uuid = ?').get(productId, productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if user already reviewed this product
        const existing = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);
        if (existing) {
            return res.status(400).json({ error: 'You have already reviewed this product' });
        }

        // Check if user purchased this product (for verified badge)
        let isVerified = 0;
        if (orderId) {
            const purchased = db.prepare(`
                SELECT oi.id FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
            `).get(req.user.id, product.id);
            if (purchased) isVerified = 1;
        }

        db.prepare(`
            INSERT INTO reviews (user_id, product_id, order_id, rating, title, comment, images, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.user.id,
            product.id,
            orderId || null,
            rating,
            title || null,
            comment || null,
            JSON.stringify(images || []),
            isVerified
        );

        // Update product rating
        const stats = db.prepare(`
            SELECT AVG(rating) as avg_rating, COUNT(*) as count
            FROM reviews WHERE product_id = ?
        `).get(product.id);

        db.prepare(`
            UPDATE products SET rating = ?, review_count = ? WHERE id = ?
        `).run(Math.round(stats.avg_rating * 10) / 10, stats.count, product.id);

        res.status(201).json({ message: 'Review added successfully' });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ error: 'Failed to add review' });
    }
});

// Update review
router.put('/:reviewId', authMiddleware, (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, title, comment } = req.body;

        const review = db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').get(reviewId, req.user.id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        db.prepare(`
            UPDATE reviews SET rating = ?, title = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            rating || review.rating,
            title !== undefined ? title : review.title,
            comment !== undefined ? comment : review.comment,
            reviewId
        );

        // Update product rating
        const stats = db.prepare(`
            SELECT AVG(rating) as avg_rating, COUNT(*) as count
            FROM reviews WHERE product_id = ?
        `).get(review.product_id);

        db.prepare(`
            UPDATE products SET rating = ?, review_count = ? WHERE id = ?
        `).run(Math.round(stats.avg_rating * 10) / 10, stats.count, review.product_id);

        res.json({ message: 'Review updated successfully' });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});

// Delete review
router.delete('/:reviewId', authMiddleware, (req, res) => {
    try {
        const { reviewId } = req.params;

        const review = db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').get(reviewId, req.user.id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);

        // Update product rating
        const stats = db.prepare(`
            SELECT AVG(rating) as avg_rating, COUNT(*) as count
            FROM reviews WHERE product_id = ?
        `).get(review.product_id);

        db.prepare(`
            UPDATE products SET rating = ?, review_count = ? WHERE id = ?
        `).run(stats.avg_rating || 0, stats.count || 0, review.product_id);

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

// Mark review as helpful
router.post('/:reviewId/helpful', authMiddleware, (req, res) => {
    try {
        const { reviewId } = req.params;

        db.prepare('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?').run(reviewId);

        res.json({ message: 'Marked as helpful' });
    } catch (error) {
        console.error('Mark helpful error:', error);
        res.status(500).json({ error: 'Failed to mark as helpful' });
    }
});

module.exports = router;

