# 🏭 ROTTO SYSTEM v5 — Production Setup Guide

## 📁 Folder Structure

```
rotto-system/
├── rotto-backend/                ← Node.js + Express backend
│   ├── server.js                 ← Entry point (Express + Socket.io)
│   ├── package.json
│   ├── .env.example              ← Copy to .env and fill in values
│   ├── models/
│   │   ├── User.js               ← Users (admin + shops), bcrypt hashed passwords
│   │   ├── Order.js              ← Orders with full status flow
│   │   ├── Return.js             ← Returns / مرتجعات
│   │   ├── Support.js            ← Support chat threads
│   │   └── Archive.js            ← Archived orders
│   ├── routes/
│   │   ├── auth.js               ← POST /api/login
│   │   ├── admin.js              ← POST /api/admin/create-user, GET /api/admin/shops
│   │   ├── orders.js             ← GET/POST/PUT /api/orders, archive
│   │   ├── returns.js            ← GET/POST /api/returns
│   │   └── support.js            ← GET/POST /api/support, reply, mark-read
│   └── middleware/
│       └── auth.js               ← JWT protect + requireRole guard
│
└── rotto_system_v5.html          ← Frontend (zero UI changes, Firebase removed)
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

## ⚡ Local Setup (5 minutes)

### 1. Install MongoDB
```bash
# macOS
brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community

# Ubuntu / Debian
sudo apt install -y mongodb && sudo systemctl start mongodb

# Windows — download installer from https://www.mongodb.com/try/download/community
```

### 2. Install backend dependencies
```bash
cd rotto-backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET to a long random string
```

### 4. Start the backend
```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

You should see:
```
[MongoDB] connected: mongodb://127.0.0.1:27017/rotto_system
[Seed] Admin created: adminrotto2026@gmail.com  (default password: Admin@2026!)
[Seed] Admin created: adminkitch2026@gmail.com  (default password: Admin@2026!)
[Server] running on http://localhost:5000
```

### 5. Open the frontend
Open `rotto_system_v5.html` directly in your browser
(or serve it with any static file server — see below).

### 6. Login
- **Admin**: `adminrotto2026@gmail.com` / `Admin@2026!`
- ⚠️ **Change the admin password immediately after first login** (update in MongoDB or add a change-password endpoint).

---

## 🚀 Production Deployment

### Option A — VPS / Server (Recommended)

```bash
# 1. Install Node.js 20+ and MongoDB on your server

# 2. Upload files
scp -r rotto-backend/ user@your-server:/var/www/rotto/
scp rotto_system_v5.html user@your-server:/var/www/rotto/public/

# 3. Install PM2 process manager
npm install -g pm2

# 4. Configure production .env
cd /var/www/rotto/rotto-backend
cp .env.example .env
nano .env   # Set MONGO_URI, JWT_SECRET, CORS_ORIGIN

# 5. Start with PM2
pm2 start server.js --name rotto-backend
pm2 save
pm2 startup   # Auto-start on reboot

# 6. Serve frontend with Nginx
sudo nano /etc/nginx/sites-available/rotto
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve frontend
    location / {
        root /var/www/rotto/public;
        try_files $uri $uri/ /rotto_system_v5.html;
    }

    # Proxy API + Socket.io to Node.js
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/rotto /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Don't forget HTTPS:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Option B — Railway.app (Easy cloud deploy)

```bash
# 1. Push rotto-backend/ to GitHub

# 2. Create new project on railway.app
# 3. Add MongoDB plugin
# 4. Set environment variables in Railway dashboard:
#    MONGO_URI=${{MongoDB.MONGODB_URL}}
#    JWT_SECRET=your_long_random_secret
#    CORS_ORIGIN=*
#    ADMIN_EMAILS=adminrotto2026@gmail.com,adminkitch2026@gmail.com
#    PORT=5000

# 5. Deploy — Railway auto-detects Node.js

# 6. Update API_BASE in rotto_system_v5.html line:
#    const API_BASE = 'https://your-app.railway.app/api';
```

### Option C — Render.com (Free tier)

Similar to Railway — connect GitHub repo, add environment variables, deploy.

---

## 🔧 Frontend Configuration

In `rotto_system_v5.html`, find and update these two lines near the top of the `<script>` block:

```javascript
const API_BASE = 'http://localhost:5000/api';   // ← your backend URL

// And in initSocket():
socket = io('http://localhost:5000');            // ← same backend URL
```

For production, change both to your deployed server URL:
```javascript
const API_BASE = 'https://api.yourdomain.com/api';
socket = io('https://api.yourdomain.com');
```

---

## 🔐 Security Notes

1. **Change default admin passwords** immediately after first deploy
2. **JWT_SECRET** must be a long (32+ char) random string in production
3. **CORS_ORIGIN** should be set to your frontend domain in production, not `*`
4. All routes are protected — the backend never trusts frontend-supplied identity
5. Passwords are hashed with bcrypt (12 salt rounds)
6. The `shop` field on orders is always taken from the server-side JWT payload, never from the request body

---

## 💡 Socket.io Events Reference

| Event | Direction | Description |
|-------|-----------|-------------|
| `orderCreated` | Server → Clients | New order submitted by shop |
| `orderUpdated` | Server → Clients | Order status changed |
| `shopCreated` | Server → Clients | New shop account created |
| `shopDeleted` | Server → Clients | Shop account deleted |
| `returnCreated` | Server → Clients | New return registered |
| `ordersArchived` | Server → Clients | Batch archive completed |
| `supportMessage` | Server → Clients | Shop sent support message |
| `supportReply` | Server → Clients | Admin replied to support |

---

## 🛠 Troubleshooting

**MongoDB connection error**
→ Make sure MongoDB is running: `sudo systemctl status mongodb`

**CORS errors in browser**
→ Set `CORS_ORIGIN=*` in .env (or your frontend URL for production)

**401 Unauthorized on every request**
→ Check that JWT_SECRET in .env matches what was used to generate the token (restart server after changing .env)

**Socket.io not connecting**
→ Make sure the `io('URL')` in frontend matches your server URL exactly (including protocol)

**Admin password**
→ Default is `Admin@2026!` — change it by connecting to MongoDB:
```bash
mongosh rotto_system
db.users.updateOne({email:"adminrotto2026@gmail.com"},{$set:{password:"NEW_BCRYPT_HASH"}})
# Or add a change-password API endpoint
```
