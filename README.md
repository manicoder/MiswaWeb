# Miswa International - Website & Admin Panel

A modern, full-stack web application for Miswa International - a leading manufacturer and exporter of premium children's products, specializing in educational toys and children's wear.

## 🌟 Features

### Public Website
- **Homepage** - Showcase of brands and company overview
- **About Us** - Company information, mission, and vision
- **Brands** - Display of MyLittleTales and Tynee Tots brands
- **Catalogs** - Product catalog browsing and downloads
- **Blog** - Blog posts and articles
- **Careers** - Job listings and application system
- **Contact** - Contact form with inquiry management

### Admin Panel
- **Dashboard** - Overview of inquiries and content management
- **Brands Management** - CRUD operations for brands
- **Catalogs Management** - Manage product catalogs
- **Blog Management** - Create, edit, and manage blog posts
- **Careers Management** - Post and manage job openings
- **Company Info Management** - Update company details
- **Inquiries Management** - View and export customer inquiries

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI 0.115.6
- **Language**: Python 3.13
- **Server**: Uvicorn (ASGI)
- **Database**: MongoDB with Motor (async driver)
- **Validation**: Pydantic v2
- **Other**: 
  - aiohttp (HTTP client)
  - BeautifulSoup4 (web scraping)
  - python-dotenv (environment management)

### Frontend
- **Framework**: React 19.0.0
- **Language**: TypeScript 5.9.3
- **Build Tool**: Create React App + CRACO
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Radix UI + shadcn/ui (40+ components)
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Notifications**: Sonner (toast notifications)

## 📁 Project Structure

```
Miswa-main/
├── backend/
│   ├── server.py              # FastAPI application
│   ├── requirements.txt       # Python dependencies
│   ├── start.sh              # Startup script
│   └── .env                  # Environment variables
│
└── frontend/
    ├── public/
    │   └── index.html        # HTML template
    ├── src/
    │   ├── components/       # Reusable components
    │   │   ├── Navbar.tsx
    │   │   ├── Footer.tsx
    │   │   └── ui/          # 46 shadcn/ui components
    │   ├── pages/           # Page components
    │   │   ├── Home.tsx
    │   │   ├── About.tsx
    │   │   ├── Brands.tsx
    │   │   ├── Catalogs.tsx
    │   │   ├── Blog.tsx
    │   │   ├── BlogDetail.tsx
    │   │   ├── Careers.tsx
    │   │   ├── Contact.tsx
    │   │   └── admin/       # Admin pages
    │   ├── hooks/           # Custom React hooks
    │   ├── lib/             # Utility functions
    │   ├── utils/           # API client
    │   ├── App.tsx          # Main app component
    │   └── index.tsx        # Entry point
    ├── package.json
    ├── tsconfig.json
    └── tailwind.config.js
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+** (3.13 recommended)
- **Node.js 18+** and **Yarn**
- **MongoDB** (local or Atlas cloud)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Create/update `.env` file:
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=miswa
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   PORT=8000
   ```

   **For MongoDB Atlas** (cloud):
   ```env
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=miswa_international
   CORS_ORIGINS=http://localhost:3000
   ```

5. **Start the server**:
   ```bash
   ./start.sh
   # Or manually:
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

   Backend will be available at: `http://localhost:8000`
   API docs available at: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Configure environment variables** (optional for local dev):
   Create `.env` file:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8000
   NODE_ENV=development
   ```

4. **Start development server**:
   ```bash
   yarn start
   ```

   Frontend will be available at: `http://localhost:3000`

## 🔧 Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `miswa` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `*` |
| `PORT` | Server port | `8000` |

### Frontend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | `http://localhost:8000` |
| `NODE_ENV` | Environment mode | `development` |

## 📡 API Endpoints

### Brands
- `GET /api/brands` - Get all brands
- `POST /api/brands` - Create brand
- `PUT /api/brands/{id}` - Update brand
- `DELETE /api/brands/{id}` - Delete brand

### Catalogs
- `GET /api/catalogs` - Get all catalogs
- `POST /api/catalogs` - Create catalog
- `PUT /api/catalogs/{id}` - Update catalog
- `DELETE /api/catalogs/{id}` - Delete catalog

### Blogs
- `GET /api/blogs` - Get all blogs
- `GET /api/blogs/{slug}` - Get blog by slug
- `POST /api/blogs` - Create blog
- `PUT /api/blogs/{id}` - Update blog
- `DELETE /api/blogs/{id}` - Delete blog

### Careers
- `GET /api/careers` - Get all careers
- `POST /api/careers` - Create career
- `PUT /api/careers/{id}` - Update career
- `DELETE /api/careers/{id}` - Delete career

### Inquiries
- `POST /api/inquiries` - Create inquiry
- `GET /api/inquiries` - Get all inquiries
- `GET /api/inquiries/export` - Export inquiries as CSV
- `DELETE /api/inquiries/{id}` - Delete inquiry

### Company Info
- `GET /api/company-info` - Get company information
- `PUT /api/company-info` - Update company information

**Full API documentation**: Visit `http://localhost:8000/docs` when backend is running

## 🚢 Deployment

### Railway Deployment

**📖 Full Guide**: See [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md) for detailed step-by-step instructions.

**⚡ Quick Start**: See [`RAILWAY_QUICK_START.md`](./RAILWAY_QUICK_START.md) for a checklist.

**Quick steps**:
1. Push code to GitHub
2. Create Railway project
3. Set up MongoDB (Atlas or Railway service)
4. Deploy backend (Root Directory: `backend`)
5. Deploy frontend (Root Directory: `frontend`)
6. Configure environment variables
7. Update CORS settings

### Docker Deployment

**Backend Dockerfile** (create in `backend/`):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
```

**Frontend Dockerfile** (create in `frontend/`):
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🧪 Testing

### Test Backend API
```bash
curl http://localhost:8000/api/brands
```

### Test MongoDB Connection
```bash
cd backend
python3 test_db.py
```

## 📝 Scripts

### Backend
- `./start.sh` - Start development server

### Frontend
- `yarn start` - Start development server
- `yarn build` - Build for production
- `yarn test` - Run tests

## 🔐 Default Data

On first startup, the backend automatically initializes:
- **MyLittleTales** brand
- **Tynee Tots** brand
- Default company information

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for Miswa International.

## 📞 Support

For support, contact: info@miswainternational.com

## 🎯 Roadmap

- [ ] User authentication system
- [ ] File upload functionality
- [ ] Email notifications
- [ ] Analytics dashboard
- [ ] Multi-language support

---

**Built with ❤️ for Miswa International**
