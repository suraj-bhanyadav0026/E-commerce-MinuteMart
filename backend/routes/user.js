const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Update profile
router.put('/profile', authMiddleware, (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body;

        db.prepare(`
            UPDATE users SET first_name = ?, last_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(firstName, lastName, phone || null, req.user.id);

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get addresses
router.get('/addresses', authMiddleware, (req, res) => {
    try {
        const addresses = db.prepare(`
            SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC
        `).all(req.user.id);

        res.json(addresses);
    } catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json({ error: 'Failed to get addresses' });
    }
});

// Add address
router.post('/addresses', authMiddleware, (req, res) => {
    try {
        const { type, street, city, state, pincode, country, isDefault } = req.body;

        if (!street || !city || !state || !pincode) {
            return res.status(400).json({ error: 'All address fields are required' });
        }

        // If this is default, unset other defaults
        if (isDefault) {
            db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
        }

        const result = db.prepare(`
            INSERT INTO addresses (user_id, type, street, city, state, pincode, country, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.user.id,
            type || 'home',
            street,
            city,
            state,
            pincode,
            country || 'India',
            isDefault ? 1 : 0
        );

        res.status(201).json({
            message: 'Address added successfully',
            addressId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Add address error:', error);
        res.status(500).json({ error: 'Failed to add address' });
    }
});

// Update address
router.put('/addresses/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        const { type, street, city, state, pincode, country, isDefault } = req.body;

        const address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }

        if (isDefault) {
            db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
        }

        db.prepare(`
            UPDATE addresses SET type = ?, street = ?, city = ?, state = ?, pincode = ?, country = ?, is_default = ?
            WHERE id = ?
        `).run(
            type || address.type,
            street || address.street,
            city || address.city,
            state || address.state,
            pincode || address.pincode,
            country || address.country,
            isDefault ? 1 : 0,
            id
        );

        res.json({ message: 'Address updated successfully' });
    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
});

// Delete address
router.delete('/addresses/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(id, req.user.id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Address not found' });
        }

        res.json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({ error: 'Failed to delete address' });
    }
});

// Get recently viewed
router.get('/recently-viewed', authMiddleware, (req, res) => {
    try {
        const products = db.prepare(`
            SELECT p.*, rv.viewed_at
            FROM recently_viewed rv
            JOIN products p ON rv.product_id = p.id
            WHERE rv.user_id = ?
            ORDER BY rv.viewed_at DESC
            LIMIT 10
        `).all(req.user.id);

        res.json(products.map(p => ({
            ...p,
            images: JSON.parse(p.images || '[]')
        })));
    } catch (error) {
        console.error('Get recently viewed error:', error);
        res.status(500).json({ error: 'Failed to get recently viewed' });
    }
});

// Get dashboard stats
router.get('/dashboard', authMiddleware, (req, res) => {
    try {
        const orderStats = db.prepare(`
            SELECT 
                COUNT(*) as totalOrders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as deliveredOrders,
                SUM(total) as totalSpent
            FROM orders WHERE user_id = ?
        `).get(req.user.id);

        const wishlistCount = db.prepare('SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?').get(req.user.id).count;
        const cartCount = db.prepare('SELECT SUM(quantity) as count FROM cart WHERE user_id = ?').get(req.user.id).count || 0;
        const addressCount = db.prepare('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?').get(req.user.id).count;

        const recentOrders = db.prepare(`
            SELECT order_number, status, total, created_at FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 5
        `).all(req.user.id);

        res.json({
            stats: {
                totalOrders: orderStats.totalOrders || 0,
                pendingOrders: orderStats.pendingOrders || 0,
                deliveredOrders: orderStats.deliveredOrders || 0,
                totalSpent: orderStats.totalSpent || 0,
                wishlistCount,
                cartCount,
                addressCount
            },
            recentOrders
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({ error: 'Failed to get dashboard data' });
    }
});

// Subscribe to newsletter
router.post('/newsletter', (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const existing = db.prepare('SELECT id FROM newsletter WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ error: 'Already subscribed' });
        }

        db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(email);

        res.json({ message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Newsletter subscribe error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

module.exports = router;

