// MinuteMart - Futuristic E-Commerce Platform
// ============================================

const API_URL = '/api';
let currentUser = null;
let cart = { items: [], summary: {} };

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const mainContent = document.getElementById('mainContent');
const toastContainer = document.getElementById('toastContainer');

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    // Hide loading screen after content loads
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 1500);
    
    // Initialize theme
    initTheme();
    
    // Check authentication
    await checkAuth();
    
    // Initialize components
    initNavigation();
    initSearch();
    initCountdown();
    initHeroAnimations();
    
    // Load home page data
    loadHomePage();
    
    // Init event listeners
    initEventListeners();
});

// ============================================
// THEME MANAGEMENT
// ============================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// ============================================
// AUTHENTICATION
// ============================================

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        updateAuthUI(false);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            updateAuthUI(true);
            await updateCartCount();
            await updateWishlistCount();
        } else {
            localStorage.removeItem('token');
            updateAuthUI(false);
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        updateAuthUI(false);
    }
}

function updateAuthUI(isLoggedIn) {
    const guestMenu = document.getElementById('guestMenu');
    const loggedInMenu = document.getElementById('loggedInMenu');
    const userName = document.getElementById('userName');
    const mobileUserSection = document.getElementById('mobileUserSection');
    
    if (isLoggedIn && currentUser) {
        guestMenu.style.display = 'none';
        loggedInMenu.style.display = 'block';
        userName.textContent = currentUser.firstName;
        
        if (mobileUserSection) {
            mobileUserSection.innerHTML = `
                <div class="mobile-user-info">
                    <i class="fas fa-user-circle"></i>
                    <span>Hello, ${currentUser.firstName}</span>
                </div>
                <a href="#" class="mobile-menu-item" data-page="dashboard">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
                <a href="#" class="mobile-menu-item" data-page="orders">
                    <i class="fas fa-box"></i> My Orders
                </a>
                <a href="#" class="mobile-menu-item logout-mobile" id="logoutMobile">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
            document.getElementById('logoutMobile')?.addEventListener('click', logout);
        }
    } else {
        guestMenu.style.display = 'block';
        loggedInMenu.style.display = 'none';
        userName.textContent = 'Account';
        
        if (mobileUserSection) {
            mobileUserSection.innerHTML = `
                <a href="#" class="mobile-menu-item" data-page="login">
                    <i class="fas fa-sign-in-alt"></i> Login / Sign Up
                </a>
            `;
        }
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI(true);
            showToast('Login successful! Welcome back.', 'success');
            navigateTo('home');
            await updateCartCount();
            await updateWishlistCount();
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Login failed. Please try again.', 'error');
    }
}

async function register(userData) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI(true);
            showToast('Registration successful! Welcome to MinuteMart.', 'success');
            navigateTo('home');
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Registration failed. Please try again.', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI(false);
    showToast('Logged out successfully', 'info');
    navigateTo('home');
    document.getElementById('cartCount').textContent = '0';
    document.getElementById('wishlistCount').textContent = '0';
}

// ============================================
// NAVIGATION
// ============================================

function initNavigation() {
    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMobileMenu = document.getElementById('closeMobileMenu');
    
    mobileMenuBtn?.addEventListener('click', () => {
        mobileMenu.classList.add('active');
    });
    
    closeMobileMenu?.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
    });
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Page navigation
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            const filter = link.dataset.filter;
            navigateTo(page, filter);
            mobileMenu.classList.remove('active');
        });
    });
    
    // Category navigation
    document.querySelectorAll('[data-category]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            navigateTo('products', `category=${category}`);
            mobileMenu.classList.remove('active');
        });
    });
    
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Cart button
    document.getElementById('cartBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showToast('Please login to view your cart', 'warning');
            navigateTo('login');
        } else {
            navigateTo('cart');
        }
    });
    
    // Wishlist button
    document.getElementById('wishlistBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showToast('Please login to view your wishlist', 'warning');
            navigateTo('login');
        } else {
            navigateTo('wishlist');
        }
    });
}

function navigateTo(page, params = '') {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show target page
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Load page data
        switch (page) {
            case 'home':
                loadHomePage();
                break;
            case 'products':
                loadProductsPage(params);
                break;
            case 'cart':
                loadCartPage();
                break;
            case 'checkout':
                loadCheckoutPage();
                break;
            case 'dashboard':
                loadDashboardPage();
                break;
            case 'orders':
                loadOrdersPage();
                break;
            case 'wishlist':
                loadWishlistPage();
                break;
            case 'profile':
                loadProfilePage();
                break;
        }
    }
}

// ============================================
// HOME PAGE
// ============================================

async function loadHomePage() {
    await Promise.all([
        loadFlashSaleProducts(),
        loadCategories(),
        loadFeaturedProducts(),
        loadBestSellers()
    ]);
    
    // Animate stats
    animateStats();
}

async function loadFlashSaleProducts() {
    try {
        const response = await fetch(`${API_URL}/products?flashSale=true&limit=6`);
        const data = await response.json();
        
        const container = document.getElementById('flashSaleProducts');
        if (data.products && data.products.length > 0) {
            container.innerHTML = data.products.map(product => createProductCard(product, true)).join('');
        } else {
            container.innerHTML = '<p class="no-products">No flash sale products available</p>';
        }
        
        initProductCardEvents();
    } catch (error) {
        console.error('Failed to load flash sale products:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/products/categories/all`);
        const categories = await response.json();
        
        const container = document.getElementById('categoriesGrid');
        const icons = {
            'electronics': 'fa-laptop',
            'fashion': 'fa-tshirt',
            'groceries': 'fa-apple-alt',
            'home-living': 'fa-couch',
            'beauty-health': 'fa-spa',
            'sports-fitness': 'fa-dumbbell',
            'books-stationery': 'fa-book',
            'toys-games': 'fa-gamepad'
        };
        
        container.innerHTML = categories.map(cat => `
            <div class="category-card" data-category="${cat.slug}">
                <div class="category-icon">
                    <i class="fas ${icons[cat.slug] || 'fa-tag'}"></i>
                </div>
                <span class="category-name">${cat.name}</span>
                <span class="category-count">${cat.product_count || 0} Products</span>
            </div>
        `).join('');
        
        // Add click events
        container.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                navigateTo('products', `category=${card.dataset.category}`);
            });
        });
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

async function loadFeaturedProducts() {
    try {
        const response = await fetch(`${API_URL}/products?featured=true&limit=8`);
        const data = await response.json();
        
        const container = document.getElementById('featuredProducts');
        if (data.products && data.products.length > 0) {
            container.innerHTML = data.products.map(product => createProductCard(product)).join('');
        }
        
        initProductCardEvents();
    } catch (error) {
        console.error('Failed to load featured products:', error);
    }
}

async function loadBestSellers(category = 'all') {
    try {
        let url = `${API_URL}/products?sort=popularity&limit=8`;
        if (category !== 'all') {
            url += `&category=${category}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        const container = document.getElementById('bestSellers');
        if (data.products && data.products.length > 0) {
            container.innerHTML = data.products.map(product => createProductCard(product)).join('');
        }
        
        initProductCardEvents();
    } catch (error) {
        console.error('Failed to load best sellers:', error);
    }
}

function createProductCard(product, isSlider = false) {
    const image = product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/300';
    const hasDiscount = product.discount_percent > 0;
    const isFlashSale = product.is_flash_sale;
    const effectivePrice = isFlashSale && product.flash_sale_price ? product.flash_sale_price : product.price;
    
    const stars = '★'.repeat(Math.round(product.rating || 0)) + '☆'.repeat(5 - Math.round(product.rating || 0));
    
    return `
        <div class="product-card ${isSlider ? 'slider-card' : ''}" data-product-id="${product.id}" data-product-slug="${product.slug}">
            <div class="product-image">
                <img src="${image}" alt="${product.name}" loading="lazy">
                <div class="product-badges">
                    ${hasDiscount ? `<span class="product-badge badge-sale">-${product.discount_percent}%</span>` : ''}
                    ${isFlashSale ? `<span class="product-badge badge-flash">⚡ Flash</span>` : ''}
                    ${product.is_featured ? `<span class="product-badge badge-new">Featured</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="action-btn wishlist-btn" data-product-id="${product.id}" title="Add to Wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="action-btn quick-view-btn" data-product-slug="${product.slug}" title="Quick View">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <span class="product-category">${product.category_name || product.brand || 'Product'}</span>
                <h3 class="product-name">
                    <a href="#" data-product-slug="${product.slug}">${product.name}</a>
                </h3>
                <div class="product-rating">
                    <span class="stars">${stars}</span>
                    <span class="rating-count">(${product.review_count || 0})</span>
                </div>
                <div class="product-price">
                    <span class="current-price">₹${formatPrice(effectivePrice)}</span>
                    ${hasDiscount || isFlashSale ? `<span class="original-price">₹${formatPrice(product.mrp || product.price)}</span>` : ''}
                    ${hasDiscount ? `<span class="discount-tag">${product.discount_percent}% off</span>` : ''}
                </div>
                <button class="add-to-cart-btn" data-product-id="${product.id}">
                    <i class="fas fa-shopping-cart"></i>
                    Add to Cart
                </button>
            </div>
        </div>
    `;
}

function initProductCardEvents() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const productId = btn.dataset.productId;
            await addToCart(productId);
        });
    });
    
    // Wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const productId = btn.dataset.productId;
            await toggleWishlist(productId, btn);
        });
    });
    
    // Quick view buttons
    document.querySelectorAll('.quick-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const slug = btn.dataset.productSlug;
            showQuickView(slug);
        });
    });
    
    // Product name links
    document.querySelectorAll('.product-name a, .product-card').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart-btn') || e.target.closest('.action-btn')) return;
            e.preventDefault();
            const slug = el.dataset.productSlug || el.closest('.product-card')?.dataset.productSlug;
            if (slug) {
                loadProductDetail(slug);
            }
        });
    });
}

// ============================================
// PRODUCTS PAGE
// ============================================

let currentFilters = {
    category: '',
    search: '',
    minPrice: '',
    maxPrice: '',
    brand: '',
    sort: 'newest',
    page: 1,
    featured: '',
    flashSale: ''
};

async function loadProductsPage(params = '') {
    // Parse params
    if (params) {
        const searchParams = new URLSearchParams(params);
        currentFilters = {
            ...currentFilters,
            category: searchParams.get('category') || '',
            search: searchParams.get('search') || '',
            featured: searchParams.get('featured') || '',
            flashSale: searchParams.get('flashSale') || '',
            page: 1
        };
    }
    
    // Update page title
    const title = document.getElementById('productsTitle');
    const currentCategory = document.getElementById('currentCategory');
    
    if (currentFilters.category) {
        const catName = currentFilters.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        title.textContent = catName;
        currentCategory.textContent = catName;
    } else if (currentFilters.search) {
        title.textContent = `Search: "${currentFilters.search}"`;
        currentCategory.textContent = 'Search Results';
    } else if (currentFilters.flashSale) {
        title.textContent = 'Flash Sale';
        currentCategory.textContent = 'Flash Sale';
    } else if (currentFilters.featured) {
        title.textContent = 'Featured Products';
        currentCategory.textContent = 'Featured';
    } else {
        title.textContent = 'All Products';
        currentCategory.textContent = 'Products';
    }
    
    // Load filters
    await loadFilters();
    
    // Load products
    await loadProducts();
    
    // Init filter events
    initFilterEvents();
}

async function loadFilters() {
    // Load categories
    try {
        const response = await fetch(`${API_URL}/products/categories/all`);
        const categories = await response.json();
        
        const container = document.getElementById('categoryFilters');
        container.innerHTML = categories.map(cat => `
            <label class="filter-option">
                <input type="checkbox" value="${cat.slug}" ${currentFilters.category === cat.slug ? 'checked' : ''}>
                <span>${cat.name} (${cat.product_count || 0})</span>
            </label>
        `).join('');
    } catch (error) {
        console.error('Failed to load category filters:', error);
    }
    
    // Load brands
    try {
        const response = await fetch(`${API_URL}/products/brands/all`);
        const brands = await response.json();
        
        const container = document.getElementById('brandFilters');
        container.innerHTML = brands.map(b => `
            <label class="filter-option">
                <input type="checkbox" value="${b.brand}" ${currentFilters.brand === b.brand ? 'checked' : ''}>
                <span>${b.brand} (${b.product_count})</span>
            </label>
        `).join('');
    } catch (error) {
        console.error('Failed to load brand filters:', error);
    }
}

async function loadProducts() {
    const params = new URLSearchParams();
    
    if (currentFilters.category) params.append('category', currentFilters.category);
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice);
    if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice);
    if (currentFilters.brand) params.append('brand', currentFilters.brand);
    if (currentFilters.sort) params.append('sort', currentFilters.sort);
    if (currentFilters.featured) params.append('featured', currentFilters.featured);
    if (currentFilters.flashSale) params.append('flashSale', currentFilters.flashSale);
    params.append('page', currentFilters.page);
    params.append('limit', 12);
    
    try {
        const response = await fetch(`${API_URL}/products?${params.toString()}`);
        const data = await response.json();
        
        const container = document.getElementById('productsGrid');
        const countEl = document.getElementById('productsCount');
        
        countEl.textContent = `${data.pagination.total} products`;
        
        if (data.products && data.products.length > 0) {
            container.innerHTML = data.products.map(product => createProductCard(product)).join('');
            initProductCardEvents();
        } else {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-icon">📦</div>
                    <h3 class="empty-title">No products found</h3>
                    <p class="empty-text">Try adjusting your filters or search terms</p>
                </div>
            `;
        }
        
        // Render pagination
        renderPagination(data.pagination);
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

function initFilterEvents() {
    // Sort select
    document.getElementById('sortSelect')?.addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        currentFilters.page = 1;
        loadProducts();
    });
    
    // Category filters
    document.querySelectorAll('#categoryFilters input').forEach(input => {
        input.addEventListener('change', () => {
            const checked = document.querySelectorAll('#categoryFilters input:checked');
            currentFilters.category = checked.length > 0 ? Array.from(checked).map(c => c.value).join(',') : '';
            currentFilters.page = 1;
            loadProducts();
        });
    });
    
    // Brand filters
    document.querySelectorAll('#brandFilters input').forEach(input => {
        input.addEventListener('change', () => {
            const checked = document.querySelectorAll('#brandFilters input:checked');
            currentFilters.brand = checked.length > 0 ? Array.from(checked).map(c => c.value).join(',') : '';
            currentFilters.page = 1;
            loadProducts();
        });
    });
    
    // Price filter
    document.getElementById('applyPriceFilter')?.addEventListener('click', () => {
        currentFilters.minPrice = document.getElementById('minPrice').value;
        currentFilters.maxPrice = document.getElementById('maxPrice').value;
        currentFilters.page = 1;
        loadProducts();
    });
    
    // Clear filters
    document.getElementById('clearFilters')?.addEventListener('click', () => {
        currentFilters = { ...currentFilters, category: '', search: '', minPrice: '', maxPrice: '', brand: '', page: 1 };
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
        document.querySelectorAll('.filter-options input').forEach(i => i.checked = false);
        loadProducts();
    });
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    if (pagination.page > 1) {
        html += `<button class="page-btn" data-page="${pagination.page - 1}"><i class="fas fa-chevron-left"></i></button>`;
    }
    
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === 1 || i === pagination.pages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
            html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === pagination.page - 3 || i === pagination.page + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }
    
    if (pagination.page < pagination.pages) {
        html += `<button class="page-btn" data-page="${pagination.page + 1}"><i class="fas fa-chevron-right"></i></button>`;
    }
    
    container.innerHTML = html;
    
    container.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilters.page = parseInt(btn.dataset.page);
            loadProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ============================================
// PRODUCT DETAIL
// ============================================

async function loadProductDetail(slug) {
    navigateTo('productDetail');
    
    try {
        const response = await fetch(`${API_URL}/products/${slug}`, {
            headers: getAuthHeaders()
        });
        const product = await response.json();
        
        const container = document.getElementById('productDetail');
        document.getElementById('productName').textContent = product.name;
        document.getElementById('productCategoryLink').textContent = product.category_name || 'Products';
        document.getElementById('productCategoryLink').dataset.category = product.category_slug;
        
        const images = product.images || ['https://via.placeholder.com/500'];
        const specs = product.specifications || {};
        const stars = '★'.repeat(Math.round(product.rating || 0)) + '☆'.repeat(5 - Math.round(product.rating || 0));
        const effectivePrice = product.is_flash_sale && product.flash_sale_price ? product.flash_sale_price : product.price;
        
        container.innerHTML = `
            <div class="product-detail-grid">
                <div class="product-gallery">
                    <div class="gallery-thumbnails">
                        ${images.map((img, i) => `
                            <div class="thumbnail ${i === 0 ? 'active' : ''}" data-image="${img}">
                                <img src="${img}" alt="Thumbnail ${i + 1}">
                            </div>
                        `).join('')}
                    </div>
                    <div class="main-image">
                        <img src="${images[0]}" alt="${product.name}" id="mainProductImage">
                    </div>
                </div>
                
                <div class="product-detail-info">
                    <h1>${product.name}</h1>
                    
                    <div class="product-detail-rating">
                        <span class="stars">${stars}</span>
                        <span>${product.rating || 0} (${product.review_count || 0} reviews)</span>
                        <span class="separator">|</span>
                        <span>${product.sold_count || 0} sold</span>
                    </div>
                    
                    <div class="product-detail-price">
                        <span class="detail-current-price">₹${formatPrice(effectivePrice)}</span>
                        ${product.mrp > effectivePrice ? `<span class="detail-original-price">₹${formatPrice(product.mrp)}</span>` : ''}
                        ${product.discount_percent > 0 ? `<span class="discount-tag">${product.discount_percent}% off</span>` : ''}
                    </div>
                    
                    <p class="product-description">${product.description || 'No description available.'}</p>
                    
                    <div class="product-options">
                        <label class="option-label">Quantity</label>
                        <div class="quantity-selector">
                            <button class="qty-btn" id="qtyMinus">-</button>
                            <span class="qty-value" id="qtyValue">1</span>
                            <button class="qty-btn" id="qtyPlus">+</button>
                        </div>
                        <p style="margin-top: 10px; color: var(--text-muted);">${product.stock > 0 ? `${product.stock} items in stock` : 'Out of stock'}</p>
                    </div>
                    
                    <div class="product-actions-detail">
                        <button class="btn btn-primary btn-glow" id="addToCartDetail" data-product-id="${product.id}" ${product.stock < 1 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i>
                            ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                        <button class="btn btn-outline" id="addToWishlistDetail" data-product-id="${product.id}">
                            <i class="far fa-heart"></i>
                            Wishlist
                        </button>
                    </div>
                    
                    ${Object.keys(specs).length > 0 ? `
                        <div class="product-specs">
                            <h3 style="margin-bottom: 15px;">Specifications</h3>
                            ${Object.entries(specs).map(([key, value]) => `
                                <div class="spec-row">
                                    <span class="spec-label">${key}</span>
                                    <span class="spec-value">${value}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${product.related && product.related.length > 0 ? `
                <div class="related-products" style="margin-top: 60px;">
                    <h2 class="section-title">Related Products</h2>
                    <div class="products-grid" style="margin-top: 30px;">
                        ${product.related.map(p => createProductCard(p)).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
        // Init events
        let quantity = 1;
        
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.addEventListener('click', () => {
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                document.getElementById('mainProductImage').src = thumb.dataset.image;
            });
        });
        
        document.getElementById('qtyMinus')?.addEventListener('click', () => {
            if (quantity > 1) {
                quantity--;
                document.getElementById('qtyValue').textContent = quantity;
            }
        });
        
        document.getElementById('qtyPlus')?.addEventListener('click', () => {
            if (quantity < product.stock) {
                quantity++;
                document.getElementById('qtyValue').textContent = quantity;
            }
        });
        
        document.getElementById('addToCartDetail')?.addEventListener('click', () => {
            addToCart(product.id, quantity);
        });
        
        document.getElementById('addToWishlistDetail')?.addEventListener('click', (e) => {
            toggleWishlist(product.id, e.target.closest('button'));
        });
        
        initProductCardEvents();
    } catch (error) {
        console.error('Failed to load product:', error);
        showToast('Failed to load product details', 'error');
    }
}

async function showQuickView(slug) {
    try {
        const response = await fetch(`${API_URL}/products/${slug}`);
        const product = await response.json();
        
        const modal = document.getElementById('quickViewModal');
        const content = document.getElementById('quickViewContent');
        
        const image = product.images?.[0] || 'https://via.placeholder.com/400';
        const effectivePrice = product.is_flash_sale && product.flash_sale_price ? product.flash_sale_price : product.price;
        
        content.innerHTML = `
            <button class="modal-close" onclick="document.getElementById('quickViewModal').classList.remove('active')">&times;</button>
            <div class="quick-view-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 30px;">
                <div class="quick-view-image">
                    <img src="${image}" alt="${product.name}" style="width: 100%; border-radius: var(--radius-md);">
                </div>
                <div class="quick-view-info">
                    <h2 style="margin-bottom: 15px;">${product.name}</h2>
                    <div class="product-detail-price" style="margin-bottom: 20px;">
                        <span class="detail-current-price">₹${formatPrice(effectivePrice)}</span>
                        ${product.mrp > effectivePrice ? `<span class="detail-original-price">₹${formatPrice(product.mrp)}</span>` : ''}
                    </div>
                    <p style="color: var(--text-secondary); margin-bottom: 25px;">${product.description?.substring(0, 200)}...</p>
                    <button class="btn btn-primary btn-block" onclick="addToCart(${product.id}); document.getElementById('quickViewModal').classList.remove('active');">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <button class="btn btn-outline btn-block" style="margin-top: 10px;" onclick="loadProductDetail('${product.slug}'); document.getElementById('quickViewModal').classList.remove('active');">
                        View Details
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        modal.querySelector('.modal-overlay')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    } catch (error) {
        console.error('Failed to load quick view:', error);
    }
}

// ============================================
// CART
// ============================================

async function addToCart(productId, quantity = 1) {
    if (!currentUser) {
        showToast('Please login to add items to cart', 'warning');
        navigateTo('login');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ productId, quantity })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Added to cart!', 'success');
            document.getElementById('cartCount').textContent = data.cartCount;
        } else {
            showToast(data.error || 'Failed to add to cart', 'error');
        }
    } catch (error) {
        showToast('Failed to add to cart', 'error');
    }
}

async function updateCartCount() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/cart/count`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        document.getElementById('cartCount').textContent = data.count || 0;
    } catch (error) {
        console.error('Failed to update cart count:', error);
    }
}

async function loadCartPage() {
    if (!currentUser) {
        navigateTo('login');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/cart`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        cart = data;
        
        const container = document.getElementById('cartLayout');
        
        if (!data.items || data.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🛒</div>
                    <h3 class="empty-title">Your cart is empty</h3>
                    <p class="empty-text">Looks like you haven't added anything to your cart yet.</p>
                    <button class="btn btn-primary" onclick="navigateTo('products')">Start Shopping</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="cart-items">
                <h3 style="margin-bottom: 20px;">Cart Items (${data.summary.totalQuantity})</h3>
                ${data.items.map(item => `
                    <div class="cart-item" data-item-id="${item.id}">
                        <div class="cart-item-image">
                            <img src="${item.images?.[0] || 'https://via.placeholder.com/100'}" alt="${item.name}">
                        </div>
                        <div class="cart-item-details">
                            <h3><a href="#" onclick="loadProductDetail('${item.slug}')">${item.name}</a></h3>
                            <span class="cart-item-price">₹${formatPrice(item.effectivePrice)}</span>
                        </div>
                        <div class="quantity-selector">
                            <button class="qty-btn cart-qty-minus" data-item-id="${item.id}">-</button>
                            <span class="qty-value">${item.quantity}</span>
                            <button class="qty-btn cart-qty-plus" data-item-id="${item.id}" data-stock="${item.stock}">+</button>
                        </div>
                        <button class="remove-item" data-item-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-summary">
                <h3 class="summary-title">Order Summary</h3>
                <div class="summary-row">
                    <span>Subtotal (${data.summary.totalQuantity} items)</span>
                    <span class="value">₹${formatPrice(data.summary.subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>Discount</span>
                    <span class="value" style="color: #22c55e;">-₹${formatPrice(data.summary.discount)}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping</span>
                    <span class="value">${data.summary.shipping === 0 ? 'FREE' : '₹' + data.summary.shipping}</span>
                </div>
                <div class="coupon-form">
                    <input type="text" class="coupon-input" placeholder="Coupon code" id="couponInput">
                    <button class="coupon-btn" id="applyCouponBtn">Apply</button>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <span class="value">₹${formatPrice(data.summary.total)}</span>
                </div>
                <button class="checkout-btn" onclick="navigateTo('checkout')">
                    Proceed to Checkout
                </button>
            </div>
        `;
        
        // Init cart events
        initCartEvents();
    } catch (error) {
        console.error('Failed to load cart:', error);
        showToast('Failed to load cart', 'error');
    }
}

function initCartEvents() {
    // Quantity buttons
    document.querySelectorAll('.cart-qty-minus').forEach(btn => {
        btn.addEventListener('click', async () => {
            const itemId = btn.dataset.itemId;
            const qtyEl = btn.parentElement.querySelector('.qty-value');
            const currentQty = parseInt(qtyEl.textContent);
            if (currentQty > 1) {
                await updateCartItem(itemId, currentQty - 1);
            }
        });
    });
    
    document.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.addEventListener('click', async () => {
            const itemId = btn.dataset.itemId;
            const stock = parseInt(btn.dataset.stock);
            const qtyEl = btn.parentElement.querySelector('.qty-value');
            const currentQty = parseInt(qtyEl.textContent);
            if (currentQty < stock) {
                await updateCartItem(itemId, currentQty + 1);
            }
        });
    });
    
    // Remove buttons
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', async () => {
            const itemId = btn.dataset.itemId;
            await removeCartItem(itemId);
        });
    });
    
    // Coupon
    document.getElementById('applyCouponBtn')?.addEventListener('click', applyCoupon);
}

async function updateCartItem(itemId, quantity) {
    try {
        const response = await fetch(`${API_URL}/cart/update/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ quantity })
        });
        
        if (response.ok) {
            loadCartPage();
            updateCartCount();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update cart', 'error');
        }
    } catch (error) {
        showToast('Failed to update cart', 'error');
    }
}

async function removeCartItem(itemId) {
    try {
        const response = await fetch(`${API_URL}/cart/remove/${itemId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('Item removed from cart', 'success');
            loadCartPage();
            updateCartCount();
        } else {
            showToast('Failed to remove item', 'error');
        }
    } catch (error) {
        showToast('Failed to remove item', 'error');
    }
}

async function applyCoupon() {
    const code = document.getElementById('couponInput').value.trim();
    if (!code) {
        showToast('Please enter a coupon code', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/cart/apply-coupon`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(`Coupon applied! You saved ₹${formatPrice(data.discount)}`, 'success');
            loadCartPage();
        } else {
            showToast(data.error || 'Invalid coupon', 'error');
        }
    } catch (error) {
        showToast('Failed to apply coupon', 'error');
    }
}

// ============================================
// CHECKOUT
// ============================================

async function loadCheckoutPage() {
    if (!currentUser) {
        navigateTo('login');
        return;
    }
    
    // Load addresses and cart
    try {
        const [addressRes, cartRes] = await Promise.all([
            fetch(`${API_URL}/user/addresses`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/cart`, { headers: getAuthHeaders() })
        ]);
        
        const addresses = await addressRes.json();
        const cartData = await cartRes.json();
        
        if (!cartData.items || cartData.items.length === 0) {
            navigateTo('cart');
            return;
        }
        
        const container = document.getElementById('checkoutLayout');
        
        container.innerHTML = `
            <div class="checkout-form">
                <div class="checkout-section">
                    <h3>Shipping Address</h3>
                    ${addresses.length > 0 ? `
                        <div class="address-list">
                            ${addresses.map((addr, i) => `
                                <label class="address-option">
                                    <input type="radio" name="address" value="${addr.id}" ${i === 0 ? 'checked' : ''}>
                                    <div class="address-card">
                                        <span class="address-type">${addr.type}</span>
                                        <p>${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}</p>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                    ` : ''}
                    <button class="btn btn-outline" style="margin-top: 15px;" id="addNewAddress">
                        <i class="fas fa-plus"></i> Add New Address
                    </button>
                    
                    <div class="new-address-form" id="newAddressForm" style="display: none; margin-top: 20px;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Street Address</label>
                                <input type="text" id="streetAddress" class="form-input" placeholder="Street address">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>City</label>
                                <input type="text" id="city" class="form-input" placeholder="City">
                            </div>
                            <div class="form-group">
                                <label>State</label>
                                <input type="text" id="state" class="form-input" placeholder="State">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>PIN Code</label>
                                <input type="text" id="pincode" class="form-input" placeholder="PIN Code">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="checkout-section">
                    <h3>Payment Method</h3>
                    <div class="payment-options">
                        <label class="payment-option">
                            <input type="radio" name="payment" value="cod" checked>
                            <div class="payment-card">
                                <i class="fas fa-money-bill-wave"></i>
                                <span>Cash on Delivery</span>
                            </div>
                        </label>
                        <label class="payment-option">
                            <input type="radio" name="payment" value="card">
                            <div class="payment-card">
                                <i class="fas fa-credit-card"></i>
                                <span>Credit/Debit Card</span>
                            </div>
                        </label>
                        <label class="payment-option">
                            <input type="radio" name="payment" value="upi">
                            <div class="payment-card">
                                <i class="fas fa-mobile-alt"></i>
                                <span>UPI</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="cart-summary">
                <h3 class="summary-title">Order Summary</h3>
                ${cartData.items.map(item => `
                    <div style="display: flex; gap: 15px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                        <img src="${item.images?.[0] || 'https://via.placeholder.com/60'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius-sm);">
                        <div style="flex: 1;">
                            <p style="font-weight: 500;">${item.name}</p>
                            <p style="color: var(--text-muted); font-size: 14px;">Qty: ${item.quantity}</p>
                        </div>
                        <span style="font-weight: 600;">₹${formatPrice(item.itemTotal)}</span>
                    </div>
                `).join('')}
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span class="value">₹${formatPrice(cartData.summary.subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping</span>
                    <span class="value">${cartData.summary.shipping === 0 ? 'FREE' : '₹' + cartData.summary.shipping}</span>
                </div>
                <div class="summary-row">
                    <span>Tax (18% GST)</span>
                    <span class="value">₹${formatPrice(cartData.summary.subtotal * 0.18)}</span>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <span class="value">₹${formatPrice(cartData.summary.total + cartData.summary.subtotal * 0.18)}</span>
                </div>
                <button class="checkout-btn" id="placeOrderBtn">
                    Place Order
                </button>
            </div>
        `;
        
        // Style for checkout
        const style = document.createElement('style');
        style.textContent = `
            .checkout-form { display: flex; flex-direction: column; gap: 25px; }
            .checkout-section { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 25px; }
            .checkout-section h3 { margin-bottom: 20px; }
            .address-list { display: flex; flex-direction: column; gap: 15px; }
            .address-option { cursor: pointer; }
            .address-option input { display: none; }
            .address-card { padding: 20px; border: 2px solid var(--border-color); border-radius: var(--radius-md); transition: var(--transition-fast); }
            .address-option input:checked + .address-card { border-color: var(--primary); background: rgba(99, 102, 241, 0.1); }
            .address-type { display: inline-block; padding: 3px 10px; background: var(--primary); color: white; font-size: 12px; border-radius: var(--radius-sm); margin-bottom: 10px; text-transform: uppercase; }
            .payment-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .payment-option { cursor: pointer; }
            .payment-option input { display: none; }
            .payment-card { padding: 20px; border: 2px solid var(--border-color); border-radius: var(--radius-md); text-align: center; transition: var(--transition-fast); }
            .payment-card i { font-size: 24px; margin-bottom: 10px; color: var(--primary); display: block; }
            .payment-option input:checked + .payment-card { border-color: var(--primary); background: rgba(99, 102, 241, 0.1); }
            .form-input { width: 100%; padding: 12px 15px; background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); margin-top: 8px; }
            .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            @media (max-width: 768px) { .payment-options { grid-template-columns: 1fr; } .form-row { grid-template-columns: 1fr; } }
        `;
        document.head.appendChild(style);
        
        // Events
        document.getElementById('addNewAddress')?.addEventListener('click', () => {
            document.getElementById('newAddressForm').style.display = 'block';
        });
        
        document.getElementById('placeOrderBtn')?.addEventListener('click', placeOrder);
    } catch (error) {
        console.error('Failed to load checkout:', error);
        showToast('Failed to load checkout', 'error');
    }
}

async function placeOrder() {
    const selectedAddress = document.querySelector('input[name="address"]:checked');
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
    
    let shippingAddress;
    
    if (selectedAddress) {
        // Use selected address (simplified for demo)
        const addressCard = selectedAddress.parentElement.querySelector('p');
        shippingAddress = { address: addressCard.textContent };
    } else {
        // Use new address
        const street = document.getElementById('streetAddress')?.value;
        const city = document.getElementById('city')?.value;
        const state = document.getElementById('state')?.value;
        const pincode = document.getElementById('pincode')?.value;
        
        if (!street || !city || !state || !pincode) {
            showToast('Please fill in the shipping address', 'warning');
            return;
        }
        
        shippingAddress = { street, city, state, pincode, country: 'India' };
    }
    
    try {
        const response = await fetch(`${API_URL}/orders/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                shippingAddress,
                paymentMethod
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(`Order placed successfully! Order #${data.order.orderNumber}`, 'success');
            updateCartCount();
            navigateTo('orders');
        } else {
            showToast(data.error || 'Failed to place order', 'error');
        }
    } catch (error) {
        showToast('Failed to place order', 'error');
    }
}

// ============================================
// WISHLIST
// ============================================

async function toggleWishlist(productId, button) {
    if (!currentUser) {
        showToast('Please login to add items to wishlist', 'warning');
        navigateTo('login');
        return;
    }
    
    const isInWishlist = button?.classList.contains('active');
    
    try {
        if (isInWishlist) {
            await fetch(`${API_URL}/wishlist/remove/${productId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            button?.classList.remove('active');
            button?.querySelector('i')?.classList.replace('fas', 'far');
            showToast('Removed from wishlist', 'info');
        } else {
            await fetch(`${API_URL}/wishlist/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ productId })
            });
            button?.classList.add('active');
            button?.querySelector('i')?.classList.replace('far', 'fas');
            showToast('Added to wishlist!', 'success');
        }
        
        updateWishlistCount();
    } catch (error) {
        showToast('Failed to update wishlist', 'error');
    }
}

async function updateWishlistCount() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/wishlist/count`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        document.getElementById('wishlistCount').textContent = data.count || 0;
    } catch (error) {
        console.error('Failed to update wishlist count:', error);
    }
}

async function loadWishlistPage() {
    if (!currentUser) {
        navigateTo('login');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/wishlist`, {
            headers: getAuthHeaders()
        });
        const items = await response.json();
        
        const container = document.getElementById('wishlistContent');
        
        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💝</div>
                    <h3 class="empty-title">Your wishlist is empty</h3>
                    <p class="empty-text">Save items you love to your wishlist.</p>
                    <button class="btn btn-primary" onclick="navigateTo('products')">Explore Products</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="products-grid">
                ${items.map(item => createProductCard({
                    ...item,
                    id: item.product_id,
                    uuid: item.product_uuid
                })).join('')}
            </div>
        `;
        
        initProductCardEvents();
    } catch (error) {
        console.error('Failed to load wishlist:', error);
        showToast('Failed to load wishlist', 'error');
    }
}

// ============================================
// DASHBOARD & ORDERS
// ============================================

async function loadDashboardPage() {
    if (!currentUser) {
        navigateTo('login');
        return;
    }
    
    document.getElementById('dashboardUserName').textContent = currentUser.firstName;
    
    try {
        const response = await fetch(`${API_URL}/user/dashboard`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        const container = document.getElementById('dashboardContent');
        
        container.innerHTML = `
            <div class="dashboard-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px;">
                <div class="stat-card">
                    <div class="stat-card-icon"><i class="fas fa-box"></i></div>
                    <div class="stat-card-value">${data.stats.totalOrders}</div>
                    <div class="stat-card-label">Total Orders</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon" style="color: #f59e0b;"><i class="fas fa-clock"></i></div>
                    <div class="stat-card-value">${data.stats.pendingOrders}</div>
                    <div class="stat-card-label">Pending Orders</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon" style="color: #ef4444;"><i class="fas fa-heart"></i></div>
                    <div class="stat-card-value">${data.stats.wishlistCount}</div>
                    <div class="stat-card-label">Wishlist Items</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon" style="color: #22c55e;"><i class="fas fa-rupee-sign"></i></div>
                    <div class="stat-card-value">₹${formatPrice(data.stats.totalSpent || 0)}</div>
                    <div class="stat-card-label">Total Spent</div>
                </div>
            </div>
            
            <div class="dashboard-sections" style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
                <div class="recent-orders">
                    <h3 style="margin-bottom: 20px;">Recent Orders</h3>
                    ${data.recentOrders && data.recentOrders.length > 0 ? `
                        <div class="orders-list">
                            ${data.recentOrders.map(order => `
                                <div class="order-mini" style="display: flex; justify-content: space-between; padding: 15px; background: var(--bg-glass); border-radius: var(--radius-md); margin-bottom: 10px;">
                                    <div>
                                        <span style="font-family: 'Orbitron'; font-weight: 600;">#${order.order_number}</span>
                                        <span style="color: var(--text-muted); margin-left: 15px;">${new Date(order.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <span class="order-status status-${order.status}">${order.status}</span>
                                    <span style="font-weight: 600;">₹${formatPrice(order.total)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color: var(--text-muted);">No orders yet</p>'}
                    <button class="btn btn-outline" style="margin-top: 15px;" onclick="navigateTo('orders')">View All Orders</button>
                </div>
                
                <div class="quick-actions">
                    <h3 style="margin-bottom: 20px;">Quick Actions</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button class="btn btn-outline" onclick="navigateTo('profile')"><i class="fas fa-user"></i> Edit Profile</button>
                        <button class="btn btn-outline" onclick="navigateTo('wishlist')"><i class="fas fa-heart"></i> View Wishlist</button>
                        <button class="btn btn-outline" onclick="navigateTo('cart')"><i class="fas fa-shopping-cart"></i> View Cart</button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

async function loadOrdersPage() {
    if (!currentUser) {
        navigateTo('login');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        const container = document.getElementById('ordersContent');
        
        if (!data.orders || data.orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3 class="empty-title">No orders yet</h3>
                    <p class="empty-text">Start shopping to see your orders here.</p>
                    <button class="btn btn-primary" onclick="navigateTo('products')">Start Shopping</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="orders-list">
                ${data.orders.map(order => `
                    <div class="order-card">
                        <div class="order-header">
                            <div>
                                <span class="order-id">#${order.order_number}</span>
                                <span class="order-date">${new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                            <span class="order-status status-${order.status}">${order.status}</span>
                        </div>
                        <div class="order-items">
                            ${order.items.slice(0, 3).map(item => `
                                <div class="order-item">
                                    <div class="order-item-image">
                                        <img src="${item.images?.[0] || 'https://via.placeholder.com/60'}" alt="${item.name}">
                                    </div>
                                    <div>
                                        <p style="font-weight: 500;">${item.name}</p>
                                        <p style="color: var(--text-muted); font-size: 14px;">Qty: ${item.quantity} × ₹${formatPrice(item.price)}</p>
                                    </div>
                                </div>
                            `).join('')}
                            ${order.items.length > 3 ? `<p style="color: var(--text-muted);">+${order.items.length - 3} more items</p>` : ''}
                        </div>
                        <div class="order-footer">
                            <span class="order-total">Total: ₹${formatPrice(order.total)}</span>
                            <div style="display: flex; gap: 10px;">
                                ${order.status === 'pending' ? `<button class="btn btn-outline" onclick="cancelOrder('${order.order_number}')">Cancel</button>` : ''}
                                <button class="btn btn-primary" onclick="trackOrder('${order.order_number}')">Track Order</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Failed to load orders:', error);
        showToast('Failed to load orders', 'error');
    }
}

async function cancelOrder(orderNumber) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
        const response = await fetch(`${API_URL}/orders/${orderNumber}/cancel`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('Order cancelled successfully', 'success');
            loadOrdersPage();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to cancel order', 'error');
        }
    } catch (error) {
        showToast('Failed to cancel order', 'error');
    }
}

async function trackOrder(orderNumber) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderNumber}/track`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        const modal = document.getElementById('quickViewModal');
        const content = document.getElementById('quickViewContent');
        
        content.innerHTML = `
            <button class="modal-close" onclick="document.getElementById('quickViewModal').classList.remove('active')">&times;</button>
            <div style="padding: 30px;">
                <h2 style="margin-bottom: 30px;">Order Tracking - #${orderNumber}</h2>
                <div class="tracking-timeline">
                    ${data.timeline.map((step, i) => `
                        <div class="tracking-step ${step.completed ? 'completed' : ''}" style="display: flex; gap: 20px; margin-bottom: 25px;">
                            <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: ${step.completed ? 'var(--gradient-primary)' : 'var(--bg-glass)'}; border: 2px solid ${step.completed ? 'var(--primary)' : 'var(--border-color)'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                                ${step.completed ? '<i class="fas fa-check"></i>' : i + 1}
                            </div>
                            <div style="flex: 1; padding-bottom: 20px; border-left: 2px solid ${step.completed ? 'var(--primary)' : 'var(--border-color)'}; margin-left: -35px; padding-left: 35px;">
                                <h4 style="margin-bottom: 5px;">${step.label}</h4>
                                ${step.date ? `<p style="color: var(--text-muted); font-size: 14px;">${new Date(step.date).toLocaleString()}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        showToast('Failed to load tracking info', 'error');
    }
}

// ============================================
// PROFILE
// ============================================

async function loadProfilePage() {
    if (!currentUser) {
        navigateTo('login');
        return;
    }
    
    const container = document.getElementById('profileContent');
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div class="profile-section" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 30px;">
                <h3 style="margin-bottom: 25px;">Personal Information</h3>
                <form id="profileForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>First Name</label>
                            <input type="text" id="profileFirstName" value="${currentUser.firstName || ''}" class="form-input">
                        </div>
                        <div class="form-group">
                            <label>Last Name</label>
                            <input type="text" id="profileLastName" value="${currentUser.lastName || ''}" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" value="${currentUser.email}" class="form-input" disabled>
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="profilePhone" value="${currentUser.phone || ''}" class="form-input">
                    </div>
                    <button type="submit" class="btn btn-primary">Update Profile</button>
                </form>
            </div>
            
            <div class="profile-section" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 30px;">
                <h3 style="margin-bottom: 25px;">Change Password</h3>
                <form id="passwordForm">
                    <div class="form-group">
                        <label>Current Password</label>
                        <input type="password" id="currentPassword" class="form-input" placeholder="Enter current password">
                    </div>
                    <div class="form-group">
                        <label>New Password</label>
                        <input type="password" id="newPassword" class="form-input" placeholder="Enter new password">
                    </div>
                    <div class="form-group">
                        <label>Confirm New Password</label>
                        <input type="password" id="confirmPassword" class="form-input" placeholder="Confirm new password">
                    </div>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>
            </div>
        </div>
    `;
    
    // Add style for form inputs
    const style = document.createElement('style');
    style.textContent = `
        .form-input { width: 100%; padding: 12px 15px; background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); margin-top: 8px; }
        .form-input:focus { border-color: var(--primary); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 500; }
    `;
    document.head.appendChild(style);
    
    // Form events
    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const response = await fetch(`${API_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    firstName: document.getElementById('profileFirstName').value,
                    lastName: document.getElementById('profileLastName').value,
                    phone: document.getElementById('profilePhone').value
                })
            });
            
            if (response.ok) {
                showToast('Profile updated successfully', 'success');
                await checkAuth();
            } else {
                showToast('Failed to update profile', 'error');
            }
        } catch (error) {
            showToast('Failed to update profile', 'error');
        }
    });
    
    document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    currentPassword: document.getElementById('currentPassword').value,
                    newPassword
                })
            });
            
            if (response.ok) {
                showToast('Password changed successfully', 'success');
                document.getElementById('passwordForm').reset();
            } else {
                const data = await response.json();
                showToast(data.error || 'Failed to change password', 'error');
            }
        } catch (error) {
            showToast('Failed to change password', 'error');
        }
    });
}

// ============================================
// SEARCH
// ============================================

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const suggestions = document.getElementById('searchSuggestions');
    
    let debounceTimer;
    
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            suggestions.classList.remove('active');
            return;
        }
        
        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`${API_URL}/products/search/suggestions?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (data.products?.length > 0 || data.categories?.length > 0) {
                    let html = '';
                    
                    if (data.categories?.length > 0) {
                        html += '<div class="suggestion-group"><span class="suggestion-label">Categories</span>';
                        data.categories.forEach(c => {
                            html += `<a href="#" class="suggestion-item" data-category="${c.slug}">${c.name}</a>`;
                        });
                        html += '</div>';
                    }
                    
                    if (data.products?.length > 0) {
                        html += '<div class="suggestion-group"><span class="suggestion-label">Products</span>';
                        data.products.forEach(p => {
                            html += `<a href="#" class="suggestion-item" data-product="${p.slug}">${p.name}</a>`;
                        });
                        html += '</div>';
                    }
                    
                    suggestions.innerHTML = html;
                    suggestions.classList.add('active');
                    
                    // Add click events
                    suggestions.querySelectorAll('[data-category]').forEach(el => {
                        el.addEventListener('click', (e) => {
                            e.preventDefault();
                            navigateTo('products', `category=${el.dataset.category}`);
                            suggestions.classList.remove('active');
                            searchInput.value = '';
                        });
                    });
                    
                    suggestions.querySelectorAll('[data-product]').forEach(el => {
                        el.addEventListener('click', (e) => {
                            e.preventDefault();
                            loadProductDetail(el.dataset.product);
                            suggestions.classList.remove('active');
                            searchInput.value = '';
                        });
                    });
                } else {
                    suggestions.classList.remove('active');
                }
            } catch (error) {
                console.error('Search failed:', error);
            }
        }, 300);
    });
    
    searchForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            navigateTo('products', `search=${encodeURIComponent(query)}`);
            suggestions.classList.remove('active');
        }
    });
    
    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestions.classList.remove('active');
        }
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await login(email, password);
    });
    
    // Signup form
    document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await register({
            firstName: document.getElementById('signupFirstName').value,
            lastName: document.getElementById('signupLastName').value,
            email: document.getElementById('signupEmail').value,
            phone: document.getElementById('signupPhone').value,
            password: document.getElementById('signupPassword').value
        });
    });
    
    // Password toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
    
    // Newsletter form
    document.getElementById('newsletterForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input').value;
        
        try {
            const response = await fetch(`${API_URL}/user/newsletter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            if (response.ok) {
                showToast('Subscribed successfully!', 'success');
                e.target.reset();
            } else {
                const data = await response.json();
                showToast(data.error || 'Subscription failed', 'error');
            }
        } catch (error) {
            showToast('Subscription failed', 'error');
        }
    });
    
    // Category tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadBestSellers(btn.dataset.tab);
        });
    });
    
    // Hero buttons
    document.getElementById('exploreBtn')?.addEventListener('click', () => navigateTo('products'));
    document.getElementById('dealsBtn')?.addEventListener('click', () => navigateTo('products', 'flashSale=true'));
    
    // Promo banners
    document.querySelectorAll('.promo-banner button').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            if (category) {
                navigateTo('products', `category=${category}`);
            }
        });
    });
}

// ============================================
// UTILITIES
// ============================================

function formatPrice(price) {
    return parseFloat(price || 0).toLocaleString('en-IN');
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function initCountdown() {
    const updateCountdown = () => {
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        
        const diff = endOfDay - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    };
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function animateStats() {
    const stats = document.querySelectorAll('.stat-number[data-count]');
    
    stats.forEach(stat => {
        const target = parseInt(stat.dataset.count);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const animate = () => {
            current += step;
            if (current < target) {
                stat.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(animate);
            } else {
                stat.textContent = target.toLocaleString() + '+';
            }
        };
        
        // Only animate if element is visible
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                animate();
                observer.disconnect();
            }
        });
        
        observer.observe(stat);
    });
}

function initHeroAnimations() {
    // Create particles
    const particlesContainer = document.getElementById('heroParticles');
    if (particlesContainer) {
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: rgba(99, 102, 241, ${Math.random() * 0.5 + 0.2});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${Math.random() * 10 + 10}s ease-in-out infinite;
                animation-delay: ${Math.random() * 5}s;
            `;
            particlesContainer.appendChild(particle);
        }
    }
}

// Add CSS for suggestions
const suggestionStyle = document.createElement('style');
suggestionStyle.textContent = `
    .suggestion-group { padding: 10px 0; border-bottom: 1px solid var(--border-color); }
    .suggestion-group:last-child { border-bottom: none; }
    .suggestion-label { display: block; padding: 5px 15px; font-size: 12px; color: var(--text-muted); text-transform: uppercase; }
    .suggestion-item { display: block; padding: 10px 15px; color: var(--text-primary); transition: var(--transition-fast); }
    .suggestion-item:hover { background: var(--bg-glass); color: var(--primary); }
    @keyframes slideOut { to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(suggestionStyle);

// Global functions for onclick handlers
window.navigateTo = navigateTo;
window.addToCart = addToCart;
window.loadProductDetail = loadProductDetail;
window.cancelOrder = cancelOrder;
window.trackOrder = trackOrder;

