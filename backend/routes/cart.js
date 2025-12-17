const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get cart
router.get('/', authMiddleware, (req, res) => {
    try {
        const items = db.prepare(`
            SELECT c.id, c.quantity, p.id as product_id, p.uuid as product_uuid, 
                   p.name, p.slug, p.price, p.mrp, p.discount_percent, p.images, p.stock,
                   p.is_flash_sale, p.flash_sale_price, p.flash_sale_end
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `).all(req.user.id);

        const cartItems = items.map(item => {
            let effectivePrice = item.price;
            if (item.is_flash_sale && item.flash_sale_price && new Date(item.flash_sale_end) > new Date()) {
                effectivePrice = item.flash_sale_price;
            }
            return {
                ...item,
                images: JSON.parse(item.images || '[]'),
                effectivePrice,
                itemTotal: effectivePrice * item.quantity
            };
        });

        const subtotal = cartItems.reduce((sum, item) => sum + item.itemTotal, 0);
        const totalMrp = cartItems.reduce((sum, item) => sum + (item.mrp || item.price) * item.quantity, 0);
        const discount = totalMrp - subtotal;

        res.json({
            items: cartItems,
            summary: {
                itemCount: cartItems.length,
                totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
                subtotal,
                totalMrp,
                discount,
                shipping: subtotal >= 500 ? 0 : 40,
                total: subtotal + (subtotal >= 500 ? 0 : 40)
            }
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Failed to get cart' });
    }
});

// Add to cart
router.post('/add', authMiddleware, (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // Get product
        const product = db.prepare('SELECT id, stock FROM products WHERE id = ? OR uuid = ?').get(productId, productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check stock
        if (product.stock < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        // Check if already in cart
        const existing = db.prepare('SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);

        if (existing) {
            const newQuantity = existing.quantity + quantity;
            if (newQuantity > product.stock) {
                return res.status(400).json({ error: 'Cannot add more items. Stock limit reached.' });
            }
            db.prepare('UPDATE cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQuantity, existing.id);
        } else {
            db.prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, product.id, quantity);
        }

        // Get updated cart count
        const cartCount = db.prepare('SELECT SUM(quantity) as count FROM cart WHERE user_id = ?').get(req.user.id).count || 0;

        res.json({ message: 'Added to cart', cartCount });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

// Update cart item
router.put('/update/:itemId', authMiddleware, (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        const item = db.prepare(`
            SELECT c.*, p.stock FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.id = ? AND c.user_id = ?
        `).get(itemId, req.user.id);

        if (!item) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        if (quantity > item.stock) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        db.prepare('UPDATE cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, itemId);

        res.json({ message: 'Cart updated' });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// Remove from cart
router.delete('/remove/:itemId', authMiddleware, (req, res) => {
    try {
        const { itemId } = req.params;

        const result = db.prepare('DELETE FROM cart WHERE id = ? AND user_id = ?').run(itemId, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Failed to remove from cart' });
    }
});

// Clear cart
router.delete('/clear', authMiddleware, (req, res) => {
    try {
        db.prepare('DELETE FROM cart WHERE user_id = ?').run(req.user.id);
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

// Get cart count
router.get('/count', authMiddleware, (req, res) => {
    try {
        const result = db.prepare('SELECT SUM(quantity) as count FROM cart WHERE user_id = ?').get(req.user.id);
        res.json({ count: result.count || 0 });
    } catch (error) {
        console.error('Get cart count error:', error);
        res.status(500).json({ error: 'Failed to get cart count' });
    }
});

// Apply coupon
router.post('/apply-coupon', authMiddleware, (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Coupon code is required' });
        }

        const coupon = db.prepare(`
            SELECT * FROM coupons
            WHERE code = ? AND is_active = 1
            AND (valid_from IS NULL OR valid_from <= datetime('now'))
            AND (valid_until IS NULL OR valid_until >= datetime('now'))
            AND (usage_limit IS NULL OR used_count < usage_limit)
        `).get(code.toUpperCase());

        if (!coupon) {
            return res.status(400).json({ error: 'Invalid or expired coupon' });
        }

        // Get cart total
        const cart = db.prepare(`
            SELECT SUM(p.price * c.quantity) as total
            FROM cart c JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `).get(req.user.id);

        if (!cart.total || cart.total < coupon.min_purchase) {
            return res.status(400).json({ error: `Minimum purchase of ₹${coupon.min_purchase} required` });
        }

        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = (cart.total * coupon.value) / 100;
            if (coupon.max_discount && discount > coupon.max_discount) {
                discount = coupon.max_discount;
            }
        } else {
            discount = coupon.value;
        }

        res.json({
            coupon: {
                code: coupon.code,
                type: coupon.type,
                value: coupon.value
            },
            discount: Math.round(discount * 100) / 100
        });
    } catch (error) {
        console.error('Apply coupon error:', error);
        res.status(500).json({ error: 'Failed to apply coupon' });
    }
});

module.exports = router;

