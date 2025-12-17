const express = require('express');
const db = require('../config/database');
const { optionalAuth, authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all products with filters
router.get('/', optionalAuth, (req, res) => {
    try {
        const {
            category,
            search,
            minPrice,
            maxPrice,
            brand,
            sort,
            page = 1,
            limit = 12,
            featured,
            flashSale
        } = req.query;

        let query = `
            SELECT p.*, c.name as category_name, c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (category) {
            query += ` AND (c.slug = ? OR c.id = ?)`;
            params.push(category, category);
        }

        if (search) {
            query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ? OR p.tags LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (minPrice) {
            query += ` AND p.price >= ?`;
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            query += ` AND p.price <= ?`;
            params.push(parseFloat(maxPrice));
        }

        if (brand) {
            query += ` AND p.brand = ?`;
            params.push(brand);
        }

        if (featured === 'true') {
            query += ` AND p.is_featured = 1`;
        }

        if (flashSale === 'true') {
            query += ` AND p.is_flash_sale = 1 AND p.flash_sale_end > datetime('now')`;
        }

        // Count total
        const countQuery = query.replace('SELECT p.*, c.name as category_name, c.slug as category_slug', 'SELECT COUNT(*) as total');
        const total = db.prepare(countQuery).get(...params).total;

        // Sorting
        switch (sort) {
            case 'price_low':
                query += ` ORDER BY p.price ASC`;
                break;
            case 'price_high':
                query += ` ORDER BY p.price DESC`;
                break;
            case 'newest':
                query += ` ORDER BY p.created_at DESC`;
                break;
            case 'rating':
                query += ` ORDER BY p.rating DESC`;
                break;
            case 'popularity':
                query += ` ORDER BY p.sold_count DESC`;
                break;
            default:
                query += ` ORDER BY p.created_at DESC`;
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const products = db.prepare(query).all(...params);

        // Parse JSON fields
        const formattedProducts = products.map(p => ({
            ...p,
            images: JSON.parse(p.images || '[]'),
            specifications: JSON.parse(p.specifications || '{}'),
            tags: JSON.parse(p.tags || '[]')
        }));

        res.json({
            products: formattedProducts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

// Get single product
router.get('/:slug', optionalAuth, (req, res) => {
    try {
        const { slug } = req.params;

        const product = db.prepare(`
            SELECT p.*, c.name as category_name, c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.slug = ? OR p.uuid = ?
        `).get(slug, slug);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Track recently viewed
        if (req.user) {
            db.prepare(`
                INSERT OR REPLACE INTO recently_viewed (user_id, product_id, viewed_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `).run(req.user.id, product.id);
        }

        // Get related products
        const related = db.prepare(`
            SELECT * FROM products
            WHERE category_id = ? AND id != ?
            ORDER BY RANDOM()
            LIMIT 4
        `).all(product.category_id, product.id);

        res.json({
            ...product,
            images: JSON.parse(product.images || '[]'),
            specifications: JSON.parse(product.specifications || '{}'),
            tags: JSON.parse(product.tags || '[]'),
            related: related.map(p => ({
                ...p,
                images: JSON.parse(p.images || '[]')
            }))
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
});

// Get categories
router.get('/categories/all', (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            GROUP BY c.id
            ORDER BY c.name
        `).all();

        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// Get brands
router.get('/brands/all', (req, res) => {
    try {
        const brands = db.prepare(`
            SELECT DISTINCT brand, COUNT(*) as product_count
            FROM products
            WHERE brand IS NOT NULL AND brand != ''
            GROUP BY brand
            ORDER BY brand
        `).all();

        res.json(brands);
    } catch (error) {
        console.error('Get brands error:', error);
        res.status(500).json({ error: 'Failed to get brands' });
    }
});

// Get flash sale products
router.get('/deals/flash-sale', (req, res) => {
    try {
        const products = db.prepare(`
            SELECT * FROM products
            WHERE is_flash_sale = 1 AND flash_sale_end > datetime('now')
            ORDER BY flash_sale_end ASC
            LIMIT 10
        `).all();

        res.json(products.map(p => ({
            ...p,
            images: JSON.parse(p.images || '[]')
        })));
    } catch (error) {
        console.error('Get flash sale error:', error);
        res.status(500).json({ error: 'Failed to get flash sale products' });
    }
});

// Get featured products
router.get('/featured/all', (req, res) => {
    try {
        const products = db.prepare(`
            SELECT * FROM products
            WHERE is_featured = 1
            ORDER BY created_at DESC
            LIMIT 8
        `).all();

        res.json(products.map(p => ({
            ...p,
            images: JSON.parse(p.images || '[]')
        })));
    } catch (error) {
        console.error('Get featured error:', error);
        res.status(500).json({ error: 'Failed to get featured products' });
    }
});

// Search suggestions
router.get('/search/suggestions', (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.json([]);
        }

        const products = db.prepare(`
            SELECT name, slug FROM products
            WHERE name LIKE ?
            LIMIT 5
        `).all(`%${q}%`);

        const categories = db.prepare(`
            SELECT name, slug FROM categories
            WHERE name LIKE ?
            LIMIT 3
        `).all(`%${q}%`);

        res.json({
            products: products.map(p => ({ name: p.name, slug: p.slug, type: 'product' })),
            categories: categories.map(c => ({ name: c.name, slug: c.slug, type: 'category' }))
        });
    } catch (error) {
        console.error('Search suggestions error:', error);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

module.exports = router;

