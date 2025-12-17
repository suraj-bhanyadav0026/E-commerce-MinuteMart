const db = require('./config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

console.log('🌱 Seeding MinuteMart database...\n');

// Clear existing data
db.exec(`
    DELETE FROM reviews;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM wishlist;
    DELETE FROM cart;
    DELETE FROM recently_viewed;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM addresses;
    DELETE FROM users;
    DELETE FROM coupons;
    DELETE FROM newsletter;
`);

// Create categories
const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'Latest gadgets and electronics', image: 'electronics.jpg' },
    { name: 'Fashion', slug: 'fashion', description: 'Trendy clothing and accessories', image: 'fashion.jpg' },
    { name: 'Groceries', slug: 'groceries', description: 'Fresh groceries and daily essentials', image: 'groceries.jpg' },
    { name: 'Home & Living', slug: 'home-living', description: 'Home decor and furniture', image: 'home.jpg' },
    { name: 'Beauty & Health', slug: 'beauty-health', description: 'Beauty products and health essentials', image: 'beauty.jpg' },
    { name: 'Sports & Fitness', slug: 'sports-fitness', description: 'Sports equipment and fitness gear', image: 'sports.jpg' },
    { name: 'Books & Stationery', slug: 'books-stationery', description: 'Books, notebooks and office supplies', image: 'books.jpg' },
    { name: 'Toys & Games', slug: 'toys-games', description: 'Toys, games and entertainment', image: 'toys.jpg' }
];

const insertCategory = db.prepare('INSERT INTO categories (name, slug, description, image) VALUES (?, ?, ?, ?)');
const categoryIds = {};

categories.forEach(cat => {
    const result = insertCategory.run(cat.name, cat.slug, cat.description, cat.image);
    categoryIds[cat.slug] = result.lastInsertRowid;
});

console.log('✅ Categories created');

// Create products
const products = [
    // Electronics
    { name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max', description: 'The most advanced iPhone ever with A17 Pro chip, titanium design, and revolutionary camera system.', price: 134900, mrp: 149900, discount_percent: 10, category: 'electronics', brand: 'Apple', stock: 50, images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500', 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500'], specifications: { Display: '6.7" Super Retina XDR', Chip: 'A17 Pro', Camera: '48MP Main', Battery: '4422mAh' }, tags: ['smartphone', 'apple', 'flagship'], is_featured: 1, rating: 4.8, review_count: 256 },
    { name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-galaxy-s24-ultra', description: 'Ultimate Galaxy experience with Galaxy AI, 200MP camera, and S Pen included.', price: 129999, mrp: 144999, discount_percent: 10, category: 'electronics', brand: 'Samsung', stock: 45, images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500'], specifications: { Display: '6.8" QHD+ Dynamic AMOLED', Processor: 'Snapdragon 8 Gen 3', Camera: '200MP Main', Battery: '5000mAh' }, tags: ['smartphone', 'samsung', 'flagship'], is_featured: 1, rating: 4.7, review_count: 189 },
    { name: 'MacBook Pro 16" M3 Max', slug: 'macbook-pro-16-m3-max', description: 'Supercharged by M3 Max chip for unprecedented performance. The most advanced Mac ever.', price: 349900, mrp: 399900, discount_percent: 12, category: 'electronics', brand: 'Apple', stock: 20, images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'], specifications: { Display: '16.2" Liquid Retina XDR', Chip: 'M3 Max', RAM: '48GB', Storage: '1TB SSD' }, tags: ['laptop', 'apple', 'professional'], is_featured: 1, rating: 4.9, review_count: 124 },
    { name: 'Sony WH-1000XM5', slug: 'sony-wh-1000xm5', description: 'Industry-leading noise cancellation headphones with exceptional sound quality.', price: 26990, mrp: 34990, discount_percent: 23, category: 'electronics', brand: 'Sony', stock: 100, images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500'], specifications: { Driver: '30mm', 'Battery Life': '30 hours', 'Noise Cancellation': 'Industry Leading' }, tags: ['headphones', 'sony', 'wireless'], is_featured: 1, is_flash_sale: 1, flash_sale_price: 22990, rating: 4.8, review_count: 432 },
    { name: 'iPad Pro 12.9" M2', slug: 'ipad-pro-12-m2', description: 'The ultimate iPad experience with M2 chip and stunning Liquid Retina XDR display.', price: 112900, mrp: 124900, discount_percent: 10, category: 'electronics', brand: 'Apple', stock: 35, images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500'], specifications: { Display: '12.9" Liquid Retina XDR', Chip: 'M2', Storage: '256GB' }, tags: ['tablet', 'apple', 'professional'], rating: 4.7, review_count: 198 },
    { name: 'Dell XPS 15', slug: 'dell-xps-15', description: 'Premium Windows laptop with stunning 4K OLED display and powerful performance.', price: 189990, mrp: 219990, discount_percent: 14, category: 'electronics', brand: 'Dell', stock: 25, images: ['https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500'], specifications: { Display: '15.6" 4K OLED', Processor: 'Intel i9-13900H', RAM: '32GB', Storage: '1TB SSD' }, tags: ['laptop', 'dell', 'windows'], rating: 4.6, review_count: 156 },
    { name: 'Canon EOS R5', slug: 'canon-eos-r5', description: 'Revolutionary full-frame mirrorless camera with 8K video capability.', price: 339990, mrp: 379990, discount_percent: 11, category: 'electronics', brand: 'Canon', stock: 15, images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500'], specifications: { Sensor: '45MP Full Frame', Video: '8K RAW', 'AF Points': '5940' }, tags: ['camera', 'canon', 'professional'], is_featured: 1, rating: 4.9, review_count: 87 },
    { name: 'Apple Watch Ultra 2', slug: 'apple-watch-ultra-2', description: 'The most rugged and capable Apple Watch for extreme athletes and adventurers.', price: 89900, mrp: 99900, discount_percent: 10, category: 'electronics', brand: 'Apple', stock: 40, images: ['https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=500'], specifications: { Display: '49mm Always-On', 'Battery Life': '36 hours', 'Water Resistant': '100m' }, tags: ['smartwatch', 'apple', 'fitness'], rating: 4.8, review_count: 234 },
    
    // Fashion
    { name: 'Premium Leather Jacket', slug: 'premium-leather-jacket', description: 'Handcrafted genuine leather jacket with premium stitching and timeless design.', price: 8999, mrp: 14999, discount_percent: 40, category: 'fashion', brand: 'Urban Edge', stock: 30, images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'], specifications: { Material: '100% Genuine Leather', Fit: 'Regular', Care: 'Professional Clean Only' }, tags: ['jacket', 'leather', 'men'], is_featured: 1, rating: 4.6, review_count: 89 },
    { name: 'Designer Silk Saree', slug: 'designer-silk-saree', description: 'Exquisite pure silk saree with intricate zari work and traditional motifs.', price: 12999, mrp: 19999, discount_percent: 35, category: 'fashion', brand: 'Ethnic Elegance', stock: 25, images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500'], specifications: { Material: 'Pure Silk', Length: '6.3 meters', Blouse: 'Unstitched' }, tags: ['saree', 'silk', 'women', 'ethnic'], is_featured: 1, rating: 4.8, review_count: 156 },
    { name: 'Running Shoes Pro', slug: 'running-shoes-pro', description: 'Advanced cushioning technology for maximum comfort and performance.', price: 6999, mrp: 9999, discount_percent: 30, category: 'fashion', brand: 'SportX', stock: 80, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'], specifications: { Material: 'Mesh Upper', Sole: 'Rubber', Weight: '280g' }, tags: ['shoes', 'running', 'sports'], is_flash_sale: 1, flash_sale_price: 4999, rating: 4.5, review_count: 234 },
    { name: 'Classic Denim Jeans', slug: 'classic-denim-jeans', description: 'Premium quality denim with comfortable stretch and classic fit.', price: 2499, mrp: 3999, discount_percent: 38, category: 'fashion', brand: 'DenimCraft', stock: 150, images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=500'], specifications: { Material: '98% Cotton, 2% Spandex', Fit: 'Regular', Rise: 'Mid Rise' }, tags: ['jeans', 'denim', 'casual'], rating: 4.4, review_count: 312 },
    { name: 'Formal Business Suit', slug: 'formal-business-suit', description: 'Premium wool blend suit for the modern professional.', price: 15999, mrp: 24999, discount_percent: 36, category: 'fashion', brand: 'Executive Style', stock: 20, images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500'], specifications: { Material: 'Wool Blend', Fit: 'Slim Fit', Pieces: '2 (Coat + Trouser)' }, tags: ['suit', 'formal', 'men', 'business'], rating: 4.7, review_count: 67 },
    { name: 'Designer Handbag', slug: 'designer-handbag', description: 'Elegant designer handbag with premium finish and spacious compartments.', price: 4999, mrp: 7999, discount_percent: 38, category: 'fashion', brand: 'Luxe Carry', stock: 40, images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500'], specifications: { Material: 'Faux Leather', Dimensions: '30x25x12 cm', Compartments: '3' }, tags: ['handbag', 'women', 'accessories'], rating: 4.5, review_count: 178 },
    
    // Groceries
    { name: 'Organic Honey (500g)', slug: 'organic-honey-500g', description: 'Pure organic honey from Himalayan bee farms. No additives or preservatives.', price: 449, mrp: 599, discount_percent: 25, category: 'groceries', brand: 'Nature\'s Best', stock: 200, images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500'], specifications: { Weight: '500g', Type: 'Raw Organic', Origin: 'Himalayan' }, tags: ['honey', 'organic', 'natural'], rating: 4.7, review_count: 456 },
    { name: 'Premium Basmati Rice (5kg)', slug: 'premium-basmati-rice-5kg', description: 'Aged premium basmati rice with long grains and aromatic flavor.', price: 699, mrp: 899, discount_percent: 22, category: 'groceries', brand: 'Royal Grain', stock: 300, images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500'], specifications: { Weight: '5kg', Type: 'Aged Basmati', Grain: 'Extra Long' }, tags: ['rice', 'basmati', 'staples'], rating: 4.6, review_count: 789 },
    { name: 'Cold Pressed Olive Oil (1L)', slug: 'cold-pressed-olive-oil-1l', description: 'Extra virgin cold pressed olive oil from Mediterranean olives.', price: 899, mrp: 1199, discount_percent: 25, category: 'groceries', brand: 'Mediterranean Gold', stock: 150, images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'], specifications: { Volume: '1 Liter', Type: 'Extra Virgin', Extraction: 'Cold Pressed' }, tags: ['oil', 'olive', 'cooking'], is_featured: 1, rating: 4.8, review_count: 234 },
    { name: 'Assorted Dry Fruits (1kg)', slug: 'assorted-dry-fruits-1kg', description: 'Premium mix of almonds, cashews, pistachios, and raisins.', price: 1499, mrp: 1999, discount_percent: 25, category: 'groceries', brand: 'NutriNuts', stock: 100, images: ['https://images.unsplash.com/photo-1616684000067-36952fde56ec?w=500'], specifications: { Weight: '1kg', Contents: 'Mixed Dry Fruits', Storage: 'Cool & Dry Place' }, tags: ['dry fruits', 'nuts', 'healthy'], is_flash_sale: 1, flash_sale_price: 1199, rating: 4.7, review_count: 345 },
    { name: 'Green Tea Collection (100 bags)', slug: 'green-tea-collection-100', description: 'Premium green tea collection with various flavors for a healthy lifestyle.', price: 599, mrp: 799, discount_percent: 25, category: 'groceries', brand: 'Tea Valley', stock: 200, images: ['https://images.unsplash.com/photo-1556881286-fc6915169721?w=500'], specifications: { Quantity: '100 Tea Bags', Flavors: '5 Variants', Type: 'Green Tea' }, tags: ['tea', 'green tea', 'healthy'], rating: 4.5, review_count: 567 },
    
    // Home & Living
    { name: 'Memory Foam Mattress (Queen)', slug: 'memory-foam-mattress-queen', description: 'Premium memory foam mattress with cooling gel technology for restful sleep.', price: 24999, mrp: 39999, discount_percent: 38, category: 'home-living', brand: 'DreamSleep', stock: 30, images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500'], specifications: { Size: 'Queen (60x80 inches)', Thickness: '10 inches', Material: 'Memory Foam + Gel' }, tags: ['mattress', 'bedroom', 'sleep'], is_featured: 1, rating: 4.8, review_count: 234 },
    { name: 'Smart LED TV 55"', slug: 'smart-led-tv-55', description: '4K Ultra HD Smart TV with Dolby Vision and built-in streaming apps.', price: 44999, mrp: 64999, discount_percent: 31, category: 'home-living', brand: 'ViewMax', stock: 40, images: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500'], specifications: { Size: '55 inches', Resolution: '4K Ultra HD', Smart: 'Android TV 12' }, tags: ['tv', 'smart tv', 'entertainment'], is_featured: 1, rating: 4.6, review_count: 456 },
    { name: 'Modular Sofa Set', slug: 'modular-sofa-set', description: 'Contemporary modular sofa with premium fabric and customizable configuration.', price: 45999, mrp: 69999, discount_percent: 34, category: 'home-living', brand: 'ComfortLux', stock: 15, images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500'], specifications: { Seating: '5 Seater', Material: 'Premium Fabric', Type: 'L-Shaped' }, tags: ['sofa', 'furniture', 'living room'], rating: 4.7, review_count: 123 },
    { name: 'Smart Air Purifier', slug: 'smart-air-purifier', description: 'HEPA air purifier with smart controls and real-time air quality monitoring.', price: 14999, mrp: 19999, discount_percent: 25, category: 'home-living', brand: 'PureAir', stock: 60, images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500'], specifications: { Coverage: '500 sq ft', Filter: 'True HEPA H13', 'Smart Features': 'App Control' }, tags: ['air purifier', 'health', 'smart home'], is_flash_sale: 1, flash_sale_price: 11999, rating: 4.6, review_count: 234 },
    { name: 'Robot Vacuum Cleaner', slug: 'robot-vacuum-cleaner', description: 'Intelligent robot vacuum with mapping technology and auto-empty base.', price: 29999, mrp: 44999, discount_percent: 33, category: 'home-living', brand: 'CleanBot', stock: 35, images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500'], specifications: { 'Battery Life': '180 minutes', 'Suction Power': '3000Pa', Features: 'Auto-empty, Mapping' }, tags: ['vacuum', 'robot', 'smart home'], rating: 4.5, review_count: 189 },
    
    // Beauty & Health
    { name: 'Premium Skincare Set', slug: 'premium-skincare-set', description: 'Complete skincare routine with cleanser, toner, serum, and moisturizer.', price: 2999, mrp: 4999, discount_percent: 40, category: 'beauty-health', brand: 'GlowUp', stock: 80, images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500'], specifications: { Products: '4 Piece Set', 'Skin Type': 'All Skin Types', 'Key Ingredients': 'Hyaluronic Acid, Vitamin C' }, tags: ['skincare', 'beauty', 'women'], is_featured: 1, rating: 4.7, review_count: 456 },
    { name: 'Digital Blood Pressure Monitor', slug: 'digital-bp-monitor', description: 'Accurate digital BP monitor with memory function and irregular heartbeat detection.', price: 1999, mrp: 2999, discount_percent: 33, category: 'beauty-health', brand: 'HealthTrack', stock: 100, images: ['https://images.unsplash.com/photo-1559757175-5700dde675bc?w=500'], specifications: { Type: 'Upper Arm', Memory: '120 Readings', Display: 'Large LCD' }, tags: ['health', 'medical', 'monitoring'], rating: 4.6, review_count: 234 },
    { name: 'Professional Hair Dryer', slug: 'professional-hair-dryer', description: 'Salon-grade hair dryer with ionic technology and multiple heat settings.', price: 3499, mrp: 4999, discount_percent: 30, category: 'beauty-health', brand: 'StylePro', stock: 70, images: ['https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=500'], specifications: { Power: '2200W', Technology: 'Ionic + Ceramic', Settings: '3 Heat, 2 Speed' }, tags: ['hair dryer', 'beauty', 'styling'], rating: 4.5, review_count: 189 },
    { name: 'Luxury Perfume Collection', slug: 'luxury-perfume-collection', description: 'Set of 3 premium fragrances for different occasions.', price: 4999, mrp: 7999, discount_percent: 38, category: 'beauty-health', brand: 'Essence', stock: 50, images: ['https://images.unsplash.com/photo-1541643600914-78b084683601?w=500'], specifications: { Quantity: '3 x 30ml', Type: 'Eau de Parfum', Notes: 'Floral, Woody, Fresh' }, tags: ['perfume', 'fragrance', 'luxury'], is_flash_sale: 1, flash_sale_price: 3999, rating: 4.8, review_count: 267 },
    
    // Sports & Fitness
    { name: 'Professional Yoga Mat', slug: 'professional-yoga-mat', description: 'Extra thick eco-friendly yoga mat with alignment lines and carrying strap.', price: 1499, mrp: 2499, discount_percent: 40, category: 'sports-fitness', brand: 'YogaLife', stock: 100, images: ['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500'], specifications: { Thickness: '8mm', Material: 'TPE Eco-Friendly', Size: '183x61 cm' }, tags: ['yoga', 'fitness', 'exercise'], rating: 4.6, review_count: 345 },
    { name: 'Adjustable Dumbbell Set', slug: 'adjustable-dumbbell-set', description: 'Space-saving adjustable dumbbells from 5-52.5 lbs with quick change system.', price: 19999, mrp: 29999, discount_percent: 33, category: 'sports-fitness', brand: 'PowerFit', stock: 30, images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500'], specifications: { 'Weight Range': '5-52.5 lbs', Adjustment: '15 Settings', Material: 'Cast Iron + Rubber' }, tags: ['dumbbells', 'weights', 'strength'], is_featured: 1, rating: 4.7, review_count: 189 },
    { name: 'Smart Fitness Watch', slug: 'smart-fitness-watch', description: 'Advanced fitness tracker with GPS, heart rate monitor, and 7-day battery life.', price: 9999, mrp: 14999, discount_percent: 33, category: 'sports-fitness', brand: 'FitTech', stock: 80, images: ['https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500'], specifications: { 'Battery Life': '7 days', Features: 'GPS, HR, SpO2', 'Water Resistance': '5ATM' }, tags: ['smartwatch', 'fitness', 'tracker'], rating: 4.5, review_count: 456 },
    { name: 'Badminton Racket Pro', slug: 'badminton-racket-pro', description: 'Professional grade badminton racket with carbon fiber frame.', price: 2999, mrp: 4999, discount_percent: 40, category: 'sports-fitness', brand: 'ShuttlePro', stock: 60, images: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500'], specifications: { Material: 'Carbon Fiber', Weight: '85g', Tension: 'Up to 30 lbs' }, tags: ['badminton', 'racket', 'sports'], rating: 4.6, review_count: 123 },
    
    // Books & Stationery
    { name: 'Premium Notebook Set', slug: 'premium-notebook-set', description: 'Set of 5 premium hardcover notebooks with different ruling styles.', price: 799, mrp: 1299, discount_percent: 38, category: 'books-stationery', brand: 'WriteWell', stock: 150, images: ['https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500'], specifications: { Quantity: '5 Notebooks', Pages: '200 each', Paper: '100 GSM' }, tags: ['notebook', 'stationery', 'writing'], rating: 4.5, review_count: 234 },
    { name: 'Bestseller Book Collection', slug: 'bestseller-book-collection', description: 'Curated collection of 10 bestselling fiction books.', price: 2499, mrp: 3999, discount_percent: 38, category: 'books-stationery', brand: 'BookWorld', stock: 50, images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500'], specifications: { Books: '10 Titles', Genre: 'Fiction', Binding: 'Paperback' }, tags: ['books', 'fiction', 'reading'], is_featured: 1, rating: 4.8, review_count: 167 },
    { name: 'Art Supplies Kit', slug: 'art-supplies-kit', description: 'Complete art kit with colored pencils, watercolors, brushes, and sketchpad.', price: 1499, mrp: 2499, discount_percent: 40, category: 'books-stationery', brand: 'ArtistPro', stock: 80, images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500'], specifications: { Items: '50+ Pieces', Includes: 'Pencils, Watercolors, Brushes', Level: 'All Levels' }, tags: ['art', 'supplies', 'drawing'], rating: 4.6, review_count: 189 },
    
    // Toys & Games
    { name: 'LEGO Architecture Set', slug: 'lego-architecture-set', description: 'Build famous world landmarks with this detailed LEGO architecture set.', price: 4999, mrp: 6999, discount_percent: 29, category: 'toys-games', brand: 'LEGO', stock: 40, images: ['https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=500'], specifications: { Pieces: '2100+', Age: '16+', Theme: 'Architecture' }, tags: ['lego', 'building', 'collectible'], is_featured: 1, rating: 4.9, review_count: 234 },
    { name: 'Remote Control Drone', slug: 'rc-drone-4k', description: '4K camera drone with GPS, auto-return, and 30-minute flight time.', price: 12999, mrp: 19999, discount_percent: 35, category: 'toys-games', brand: 'SkyFlyer', stock: 25, images: ['https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=500'], specifications: { Camera: '4K UHD', 'Flight Time': '30 minutes', Range: '2km' }, tags: ['drone', 'rc', 'camera'], is_flash_sale: 1, flash_sale_price: 9999, rating: 4.6, review_count: 156 },
    { name: 'Board Games Collection', slug: 'board-games-collection', description: 'Family fun pack with 5 classic board games for all ages.', price: 1999, mrp: 2999, discount_percent: 33, category: 'toys-games', brand: 'GameNight', stock: 60, images: ['https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=500'], specifications: { Games: '5 Classic Games', Players: '2-6', Age: '6+' }, tags: ['board games', 'family', 'entertainment'], rating: 4.5, review_count: 189 }
];

const insertProduct = db.prepare(`
    INSERT INTO products (uuid, name, slug, description, price, mrp, discount_percent, category_id, brand, stock, images, specifications, tags, is_featured, is_flash_sale, flash_sale_price, flash_sale_end, rating, review_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Set flash sale end date to 3 days from now
const flashSaleEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

products.forEach(product => {
    insertProduct.run(
        uuidv4(),
        product.name,
        product.slug,
        product.description,
        product.price,
        product.mrp,
        product.discount_percent,
        categoryIds[product.category],
        product.brand,
        product.stock,
        JSON.stringify(product.images),
        JSON.stringify(product.specifications),
        JSON.stringify(product.tags),
        product.is_featured || 0,
        product.is_flash_sale || 0,
        product.flash_sale_price || null,
        product.is_flash_sale ? flashSaleEnd : null,
        product.rating || 0,
        product.review_count || 0
    );
});

console.log('✅ Products created');

// Create coupons
const coupons = [
    { code: 'WELCOME10', type: 'percentage', value: 10, min_purchase: 500, max_discount: 200 },
    { code: 'FLAT100', type: 'fixed', value: 100, min_purchase: 999 },
    { code: 'SUPER20', type: 'percentage', value: 20, min_purchase: 2000, max_discount: 500 },
    { code: 'NEWUSER', type: 'percentage', value: 15, min_purchase: 0, max_discount: 300 }
];

const insertCoupon = db.prepare(`
    INSERT INTO coupons (code, type, value, min_purchase, max_discount, usage_limit)
    VALUES (?, ?, ?, ?, ?, ?)
`);

coupons.forEach(coupon => {
    insertCoupon.run(coupon.code, coupon.type, coupon.value, coupon.min_purchase, coupon.max_discount || null, 1000);
});

console.log('✅ Coupons created');

// Create demo user
const demoPassword = bcrypt.hashSync('demo123', 10);
db.prepare(`
    INSERT INTO users (uuid, email, password, first_name, last_name, phone, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(uuidv4(), 'demo@minutemart.com', demoPassword, 'Demo', 'User', '9876543210', 'customer');

// Create admin user
const adminPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`
    INSERT INTO users (uuid, email, password, first_name, last_name, phone, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(uuidv4(), 'admin@minutemart.com', adminPassword, 'Admin', 'User', '9876543211', 'admin');

console.log('✅ Demo users created');

console.log('\n🎉 Database seeded successfully!\n');
console.log('Demo credentials:');
console.log('  Email: demo@minutemart.com');
console.log('  Password: demo123\n');
console.log('Admin credentials:');
console.log('  Email: admin@minutemart.com');
console.log('  Password: admin123\n');

