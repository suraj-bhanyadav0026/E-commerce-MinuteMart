# ⚡ MinuteMart - Futuristic E-Commerce Platform

![MinuteMart Banner](https://img.shields.io/badge/MinuteMart-E--Commerce-6366f1?style=for-the-badge&logo=shopping-cart&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)

> A next-generation, feature-rich e-commerce platform built for the modern web. MinuteMart offers a premium shopping experience with a futuristic design, comprehensive features, and smooth performance.

## 🌟 Features

### 🛍️ Shopping Experience
- **Product Catalog** - Browse thousands of products across 8+ categories
- **Advanced Search** - Real-time search with auto-suggestions
- **Smart Filters** - Filter by category, price, brand, and rating
- **Product Sorting** - Sort by price, popularity, rating, and more
- **Quick View** - Preview products without leaving the page
- **Product Reviews** - Read and write product reviews with ratings

### 🛒 Cart & Checkout
- **Shopping Cart** - Add, remove, and update quantities
- **Coupon System** - Apply discount codes for savings
- **Multiple Payment Methods** - COD, Card, UPI options
- **Address Management** - Save multiple shipping addresses
- **Order Tracking** - Real-time order status updates

### 👤 User Features
- **User Authentication** - Secure login/signup with JWT
- **User Dashboard** - Overview of orders, wishlist, and activity
- **Wishlist** - Save favorite products for later
- **Order History** - View all past orders
- **Profile Management** - Update personal information

### ⚡ Flash Sales & Deals
- **Flash Sales** - Time-limited deals with countdown
- **Featured Products** - Curated product selections
- **Best Sellers** - Popular products by category
- **Discount Badges** - Visual discount indicators

### 🎨 Design & UX
- **Futuristic UI** - Modern, sleek interface design
- **Dark/Light Mode** - Toggle between themes
- **Responsive Design** - Works on all devices
- **Smooth Animations** - Engaging micro-interactions
- **Loading States** - Beautiful loading screens

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd /Users/surajbhan/Desktop/Minutemart
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Seed the database with sample data**
   ```bash
   npm run seed
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | demo@minutemart.com | demo123 |
| Admin | admin@minutemart.com | admin123 |

## 📁 Project Structure

```
MinuteMart/
├── backend/
│   ├── config/
│   │   ├── config.js          # App configuration
│   │   └── database.js        # SQLite setup & schema
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── products.js        # Product routes
│   │   ├── cart.js            # Shopping cart routes
│   │   ├── orders.js          # Order management
│   │   ├── user.js            # User profile routes
│   │   ├── wishlist.js        # Wishlist routes
│   │   └── reviews.js         # Product reviews
│   ├── data/
│   │   └── minutemart.db      # SQLite database
│   ├── uploads/               # Product images
│   ├── server.js              # Express server
│   └── seed.js                # Database seeder
├── frontend/
│   ├── css/
│   │   └── styles.css         # Main stylesheet
│   ├── js/
│   │   └── app.js             # Frontend JavaScript
│   └── index.html             # Main HTML file
├── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/change-password` | Change password |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:slug` | Get single product |
| GET | `/api/products/categories/all` | Get all categories |
| GET | `/api/products/brands/all` | Get all brands |
| GET | `/api/products/deals/flash-sale` | Get flash sale products |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get user cart |
| POST | `/api/cart/add` | Add to cart |
| PUT | `/api/cart/update/:itemId` | Update quantity |
| DELETE | `/api/cart/remove/:itemId` | Remove item |
| POST | `/api/cart/apply-coupon` | Apply coupon |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get user orders |
| GET | `/api/orders/:orderNumber` | Get single order |
| POST | `/api/orders/create` | Create order |
| PUT | `/api/orders/:orderNumber/cancel` | Cancel order |
| GET | `/api/orders/:orderNumber/track` | Track order |

### Wishlist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist/add` | Add to wishlist |
| DELETE | `/api/wishlist/remove/:productId` | Remove item |

## 🎯 Product Categories

1. 📱 **Electronics** - Smartphones, Laptops, Cameras, Headphones
2. 👔 **Fashion** - Clothing, Shoes, Accessories, Bags
3. 🥕 **Groceries** - Food items, Beverages, Daily essentials
4. 🏠 **Home & Living** - Furniture, Decor, Appliances
5. 💄 **Beauty & Health** - Skincare, Cosmetics, Health products
6. 🏃 **Sports & Fitness** - Equipment, Sportswear, Fitness gear
7. 📚 **Books & Stationery** - Books, Notebooks, Art supplies
8. 🎮 **Toys & Games** - Toys, Board games, RC devices

## 💳 Available Coupons

| Code | Discount | Min. Purchase |
|------|----------|---------------|
| WELCOME10 | 10% off (max ₹200) | ₹500 |
| FLAT100 | ₹100 off | ₹999 |
| SUPER20 | 20% off (max ₹500) | ₹2000 |
| NEWUSER | 15% off (max ₹300) | No minimum |

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** (better-sqlite3) - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **uuid** - Unique ID generation

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with custom properties
- **JavaScript (ES6+)** - Interactivity
- **Font Awesome** - Icons
- **Google Fonts** - Typography (Orbitron, Exo 2, Rajdhani)

## 🎨 Design Features

- **Glassmorphism** - Modern glass-effect UI elements
- **Gradient Backgrounds** - Beautiful color transitions
- **CSS Animations** - Smooth micro-interactions
- **Responsive Grid** - Flexible layouts
- **Dark Mode** - Eye-friendly dark theme
- **Custom Scrollbars** - Styled scrollbars

## 📊 Database Schema

### Core Tables
- `users` - User accounts
- `products` - Product catalog
- `categories` - Product categories
- `cart` - Shopping cart items
- `wishlist` - User wishlists
- `orders` - Order records
- `order_items` - Order line items
- `reviews` - Product reviews
- `addresses` - Shipping addresses
- `coupons` - Discount codes
- `newsletter` - Email subscribers

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation
- SQL injection prevention
- CORS protection

## 📈 Future Enhancements

- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Payment gateway integration
- [ ] Social login (Google, Facebook)
- [ ] Product comparison
- [ ] Live chat support
- [ ] Recommendation engine
- [ ] Multi-language support

## 👨‍💻 Developer

**BTech CSE Final Year Project**

---

## 📝 License

This project is created for educational purposes as a BTech CSE final year project.

---

<div align="center">

**⚡ MinuteMart - Shop Smarter, Live Better ⚡**

Made with ❤️ for BTech CSE Final Year Project

</div>

