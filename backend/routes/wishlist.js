const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get wishlist
router.get('/', authMiddleware, (req, res) => {
    try {
        const items = db.prepare(`
            SELECT w.id, w.created_at as added_at, 
                   p.id as product_id, p.uuid as product_uuid, p.name, p.slug, 
                   p.price, p.mrp, p.discount_percent, p.images, p.stock, p.rating
            FROM wishlist w
            JOIN products p ON w.product_id = p.id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `).all(req.user.id);

        res.json(items.map(item => ({
            ...item,
            images: JSON.parse(item.images || '[]'),
            inStock: item.stock > 0
        })));
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ error: 'Failed to get wishlist' });
    }
});

// Add to wishlist
router.post('/add', authMiddleware, (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        const product = db.prepare('SELECT id FROM products WHERE id = ? OR uuid = ?').get(productId, productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if already in wishlist
        const existing = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);
        if (existing) {
            return res.status(400).json({ error: 'Already in wishlist' });
        }

        db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, product.id);

        const count = db.prepare('SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?').get(req.user.id).count;

        res.json({ message: 'Added to wishlist', wishlistCount: count });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ error: 'Failed to add to wishlist' });
    }
});

// Remove from wishlist
router.delete('/remove/:productId', authMiddleware, (req, res) => {
    try {
        const { productId } = req.params;

        const product = db.prepare('SELECT id FROM products WHERE id = ? OR uuid = ?').get(productId, productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const result = db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, product.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Item not in wishlist' });
        }

        res.json({ message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
});

// Check if product is in wishlist
router.get('/check/:productId', authMiddleware, (req, res) => {
    try {
        const { productId } = req.params;

        const product = db.prepare('SELECT id FROM products WHERE id = ? OR uuid = ?').get(productId, productId);
        if (!product) {
            return res.json({ inWishlist: false });
        }

        const exists = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);

        res.json({ inWishlist: !!exists });
    } catch (error) {
        console.error('Check wishlist error:', error);
        res.status(500).json({ error: 'Failed to check wishlist' });
    }
});

// Move to cart
router.post('/move-to-cart/:productId', authMiddleware, (req, res) => {
    try {
        const { productId } = req.params;

        const product = db.prepare('SELECT id, stock FROM products WHERE id = ? OR uuid = ?').get(productId, productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.stock < 1) {
            return res.status(400).json({ error: 'Product out of stock' });
        }

        // Check if already in cart
        const inCart = db.prepare('SELECT id FROM cart WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);
        if (inCart) {
            // Just remove from wishlist
            db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, product.id);
            return res.json({ message: 'Already in cart. Removed from wishlist.' });
        }

        // Add to cart
        db.prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)').run(req.user.id, product.id);
        
        // Remove from wishlist
        db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, product.id);

        res.json({ message: 'Moved to cart' });
    } catch (error) {
        console.error('Move to cart error:', error);
        res.status(500).json({ error: 'Failed to move to cart' });
    }
});

// Get wishlist count
router.get('/count', authMiddleware, (req, res) => {
    try {
        const count = db.prepare('SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?').get(req.user.id).count;
        res.json({ count });
    } catch (error) {
        console.error('Get wishlist count error:', error);
        res.status(500).json({ error: 'Failed to get wishlist count' });
    }
});

module.exports = router;

