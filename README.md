# Kitch &co. — B2B Order Management Platform

<img width="1916" height="1053" alt="Screenshot 2026-04-17 192306" src="https://github.com/user-attachments/assets/f2f5a8be-986e-4ab5-baf6-1d694bc38703" />

<img width="1917" height="1036" alt="Screenshot 2026-04-17 192324" src="https://github.com/user-attachments/assets/e42ae033-5e50-48dc-99c0-a6f8e2e54daa" />

<img width="1901" height="1032" alt="Screenshot 2026-04-17 192339" src="https://github.com/user-attachments/assets/64b15aa9-3694-448a-95aa-f24f097c0849" />
<img width="1904" height="1034" alt="Screenshot 2026-04-17 192355" src="https://github.com/user-attachments/assets/7e7d9734-c2a4-43f8-b81d-120509f6f488" />





**A live, production B2B ordering platform connecting cafes and restaurants to a central kitchen.**

[🌐 Live Demo](https://rottokitch.com) · [📁 Repository](https://github.com/Joyy183/Rotto-system)



---

## 📌 Overview

**Kitch &co.** is a full-stack web application built for central kitchen operations. It connects partner shops (cafes, restaurants) directly to the kitchen — allowing them to browse a live menu, place orders, track delivery status in real time, and communicate with support, all from a single dashboard.

The platform features two separate role-based interfaces:
- **Admin Dashboard** — full kitchen management, analytics, and shop oversight
- **Shop (Cashier) Dashboard** — ordering, live tracking, and order history

---

## ✨ Features

### 🏪 Landing Page
- Professional Arabic/English bilingual marketing page
- 4-step onboarding flow explanation
- Partner showcase with live stats (orders/month, daily supply, product count)
- Login gate with JWT session persistence

### 👨‍💼 Admin Dashboard
| Feature | Description |
|---|---|
| **Dashboard** | Real-time stats — total orders, revenue, active shops, pending count |
| **Analytics** | Monthly revenue chart + orders chart (by shop) via Chart.js |
| **Product Summary** | Filterable daily product breakdown with quantities and totals |
| **Shops** | Manage all registered shop accounts |
| **Orders** | View pending/preparing orders, filter by shop and date |
| **Returns** | Track and manage return requests |
| **Orders History** | Full searchable order log with invoice generation |
| **Archive** | Archived completed orders with date and status filters |
| **Reports** | Generate daily/weekly/monthly/all-time PDF reports per shop |
| **Support Inbox** | Threaded support messages from all shops with reply functionality |
| **Shop Data** | Per-shop analytics and data breakdown |

### 🛒 Shop (Cashier) Dashboard
| Feature | Description |
|---|---|
| **New Order** | Browse categorized menu (Bakery, Pastry, Jars, Bread, Sandwiches, Salads, Whole Cakes) |
| **Menu Search** | Search items by name in real time |
| **Live Orders** | Real-time order status tracking (Pending → Preparing → Delivered) |
| **My History** | Personal order history with daily/weekly/monthly filters |
| **Support** | Send messages and receive replies from admin |

---

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** — REST API server
- **MongoDB** + **Mongoose** — database and data modeling
- **Socket.io** — real-time order updates and live notifications
- **JWT** — authentication and role-based access control
- **bcrypt** — password hashing

### Frontend
- **Vanilla JavaScript** — single-page application logic
- **Tailwind CSS** — utility-first styling
- **Chart.js** — analytics charts and graphs
- **jsPDF** — invoice and report PDF generation
- Bilingual support — **Arabic (RTL) + English (LTR)**

---

## 📁 Project Structure

```
rotto-system/
├── rotto-backend/
│   ├── server.js              ← Entry point (Express + Socket.io)
│   ├── package.json
│   ├── .env.example
│   ├── models/
│   │   ├── User.js            ← Users (admin + shops), bcrypt hashed passwords
│   │   ├── Order.js           ← Orders with full status flow
│   │   ├── Return.js          ← Returns / مرتجعات
│   │   ├── Support.js         ← Support chat threads
│   │   └── Archive.js         ← Archived orders
│   ├── routes/
│   │   ├── auth.js            ← POST /api/login
│   │   ├── admin.js           ← POST /api/admin/create-user, GET /api/admin/shops
│   │   ├── orders.js          ← GET/POST/PUT /api/orders, archive
│   │   ├── returns.js         ← GET/POST /api/returns
│   │   └── support.js         ← GET/POST /api/support, reply, mark-read
│   └── middleware/
│       └── auth.js            ← JWT protect + requireRole guard
└── rotto_system_v5.html       ← Frontend (single-file SPA)
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/login` | Public | Login → returns JWT |
| POST | `/api/admin/create-user` | Admin | Create shop account |
| GET | `/api/admin/shops` | Admin | List all shop accounts |
| DELETE | `/api/admin/shops/:id` | Admin | Delete shop account |
| POST | `/api/orders` | Shop | Submit new order |
| GET | `/api/orders` | Any | Admin = all, Shop = own |
| PUT | `/api/orders/:id` | Any | Update status (admin) / cancel (shop) |
| POST | `/api/orders/archive` | Admin | Archive completed orders |
| GET | `/api/orders/archive` | Admin | List archived orders |
| POST | `/api/returns` | Any | Register return |
| GET | `/api/returns` | Any | Admin = all, Shop = own |
| GET | `/api/support` | Any | Admin = all threads, Shop = own |
| POST | `/api/support/message` | Shop | Send support message |
| POST | `/api/support/:id/reply` | Admin | Reply to support thread |
| PATCH | `/api/support/:id/read` | Admin | Mark thread as read |

---

## 🚀 Local Setup (5 minutes)

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### 1. Clone the repo
```bash
git clone https://github.com/Joyy183/Rotto-system.git
cd Rotto-system/rotto-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

### 4. Run the server
```bash
node server.js
```

### 5. Open the frontend
Open `rotto_system_v5.html` in your browser, or serve it with any static file server.

The app will auto-connect to `http://localhost:5000`.

---

## 📸 Screenshots

### Landing Page
> A bilingual marketing page with partner showcase and login gate

### Admin Dashboard
> Real-time stats, revenue charts, and full order management

### Orders & Reports
> Filter by shop and date, generate PDF reports

### Shop View — New Order
> Categorized menu with search, add to cart, and submit

### Support Inbox
> Threaded messaging between shops and admin

---

## 👥 Roles

| Role | Access |
|------|--------|
| **Admin** | Full platform access — all shops, orders, returns, reports, support |
| **Shop (Cashier)** | Own orders, menu, live tracking, order history, support |

Sessions are persisted via `localStorage` JWT tokens with automatic expiry handling.

---

## 🔒 Security

- All routes protected via JWT middleware
- Role-based access (`requireRole('admin')` guard on admin routes)
- Passwords hashed with bcrypt before storage
- `.env` used for all secrets — never committed to repo

---

## 📄 License

Built as a production system for **Kitch &co. — Central Kitchen & Catering**.  
© Kitch &co. 2025. All rights reserved.
