const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Generate order number
function generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MM${timestamp}${random}`;
}

// Create order
router.post('/create', authMiddleware, (req, res) => {
    try {
        const { shippingAddress, paymentMethod, couponCode, notes } = req.body;

        if (!shippingAddress) {
            return res.status(400).json({ error: 'Shipping address is required' });
        }

        // Get cart items
        const cartItems = db.prepare(`
            SELECT c.*, p.id as product_id, p.name, p.price, p.stock,
                   p.is_flash_sale, p.flash_sale_price, p.flash_sale_end
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `).all(req.user.id);

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of cartItems) {
            if (item.quantity > item.stock) {
                return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
            }

            let price = item.price;
            if (item.is_flash_sale && item.flash_sale_price && new Date(item.flash_sale_end) > new Date()) {
                price = item.flash_sale_price;
            }

            const itemTotal = price * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                productId: item.product_id,
                quantity: item.quantity,
                price,
                total: itemTotal
            });
        }

        // Apply coupon if provided
        let discount = 0;
        if (couponCode) {
            const coupon = db.prepare(`
                SELECT * FROM coupons
                WHERE code = ? AND is_active = 1
                AND (valid_from IS NULL OR valid_from <= datetime('now'))
                AND (valid_until IS NULL OR valid_until >= datetime('now'))
                AND (usage_limit IS NULL OR used_count < usage_limit)
            `).get(couponCode.toUpperCase());

            if (coupon && subtotal >= coupon.min_purchase) {
                if (coupon.type === 'percentage') {
                    discount = (subtotal * coupon.value) / 100;
                    if (coupon.max_discount && discount > coupon.max_discount) {
                        discount = coupon.max_discount;
                    }
                } else {
                    discount = coupon.value;
                }

                // Update coupon usage
                db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(coupon.id);
            }
        }

        const shipping = subtotal >= 500 ? 0 : 40;
        const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
        const total = subtotal - discount + shipping + tax;

        // Create order
        const orderUuid = uuidv4();
        const orderNumber = generateOrderNumber();

        const orderResult = db.prepare(`
            INSERT INTO orders (uuid, user_id, order_number, subtotal, discount, shipping_cost, tax, total, 
                               payment_method, shipping_address, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            orderUuid,
            req.user.id,
            orderNumber,
            subtotal,
            discount,
            shipping,
            tax,
            total,
            paymentMethod || 'cod',
            JSON.stringify(shippingAddress),
            notes || null
        );

        const orderId = orderResult.lastInsertRowid;

        // Add order items and update stock
        const insertItem = db.prepare(`
            INSERT INTO order_items (order_id, product_id, quantity, price, total)
            VALUES (?, ?, ?, ?, ?)
        `);

        const updateStock = db.prepare(`
            UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ?
        `);

        for (const item of orderItems) {
            insertItem.run(orderId, item.productId, item.quantity, item.price, item.total);
            updateStock.run(item.quantity, item.quantity, item.productId);
        }

        // Clear cart
        db.prepare('DELETE FROM cart WHERE user_id = ?').run(req.user.id);

        res.status(201).json({
            message: 'Order placed successfully',
            order: {
                uuid: orderUuid,
                orderNumber,
                total,
                status: 'pending'
            }
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Get user orders
router.get('/', authMiddleware, (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        let query = `
            SELECT * FROM orders WHERE user_id = ?
        `;
        const params = [req.user.id];

        if (status) {
            query += ` AND status = ?`;
            params.push(status);
        }

        // Count total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const total = db.prepare(countQuery).get(...params).total;

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const orders = db.prepare(query).all(...params);

        // Get order items for each order
        const ordersWithItems = orders.map(order => {
            const items = db.prepare(`
                SELECT oi.*, p.name, p.slug, p.images
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `).all(order.id);

            return {
                ...order,
                shippingAddress: JSON.parse(order.shipping_address),
                items: items.map(item => ({
                    ...item,
                    images: JSON.parse(item.images || '[]')
                }))
            };
        });

        res.json({
            orders: ordersWithItems,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
});

// Get single order
router.get('/:orderNumber', authMiddleware, (req, res) => {
    try {
        const { orderNumber } = req.params;

        const order = db.prepare(`
            SELECT * FROM orders
            WHERE (order_number = ? OR uuid = ?) AND user_id = ?
        `).get(orderNumber, orderNumber, req.user.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const items = db.prepare(`
            SELECT oi.*, p.name, p.slug, p.images
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(order.id);

        res.json({
            ...order,
            shippingAddress: JSON.parse(order.shipping_address),
            billingAddress: order.billing_address ? JSON.parse(order.billing_address) : null,
            items: items.map(item => ({
                ...item,
                images: JSON.parse(item.images || '[]')
            }))
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to get order' });
    }
});

// Cancel order
router.put('/:orderNumber/cancel', authMiddleware, (req, res) => {
    try {
        const { orderNumber } = req.params;

        const order = db.prepare(`
            SELECT * FROM orders
            WHERE (order_number = ? OR uuid = ?) AND user_id = ?
        `).get(orderNumber, orderNumber, req.user.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status !== 'pending' && order.status !== 'confirmed') {
            return res.status(400).json({ error: 'Order cannot be cancelled' });
        }

        // Restore stock
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        for (const item of items) {
            db.prepare('UPDATE products SET stock = stock + ?, sold_count = sold_count - ? WHERE id = ?')
                .run(item.quantity, item.quantity, item.product_id);
        }

        // Update order status
        db.prepare(`
            UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(order.id);

        res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

// Track order
router.get('/:orderNumber/track', authMiddleware, (req, res) => {
    try {
        const { orderNumber } = req.params;

        const order = db.prepare(`
            SELECT status, created_at, updated_at FROM orders
            WHERE (order_number = ? OR uuid = ?) AND user_id = ?
        `).get(orderNumber, orderNumber, req.user.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Generate tracking timeline based on status
        const timeline = [
            { status: 'pending', label: 'Order Placed', completed: true, date: order.created_at },
            { status: 'confirmed', label: 'Order Confirmed', completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) },
            { status: 'processing', label: 'Processing', completed: ['processing', 'shipped', 'delivered'].includes(order.status) },
            { status: 'shipped', label: 'Shipped', completed: ['shipped', 'delivered'].includes(order.status) },
            { status: 'delivered', label: 'Delivered', completed: order.status === 'delivered' }
        ];

        res.json({
            currentStatus: order.status,
            timeline
        });
    } catch (error) {
        console.error('Track order error:', error);
        res.status(500).json({ error: 'Failed to track order' });
    }
});

module.exports = router;

