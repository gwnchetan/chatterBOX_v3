# ChatterBOX v3.1 - Complete Setup Guide

A modern, full-stack social media web application built with React, Node.js, Express, and MongoDB.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **npm** >= 10.0.0 (comes with Node.js)
- **MongoDB** (Local or Atlas Cloud Database) ([MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Git** (for version control)

### Optional Services (for full functionality)

- **Cloudinary** account for image hosting ([Sign up](https://cloudinary.com/))
- **Google OAuth 2.0** credentials for social login ([Get credentials](https://console.cloud.google.com/))
- **Giphy API** key for GIF picker ([Get API key](https://giphy.com/developer))

## 🚀 Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/gwnchetan/chatterBOX_v3.git
cd chatterBOXv3.1
```

### 2. Run the Installation Script

From the root directory, install all dependencies:

```bash
npm run install-all
```

This command will:
- Install root dependencies (concurrently)
- Install client dependencies
- Install server dependencies

**Or install manually:**

```bash
# Install root dependencies
npm install

# Install client dependencies
cd chatterbox-client
npm install
cd ..

# Install server dependencies
cd chatterbox-server
npm install
```

### 3. Configure Environment Variables

#### Server Configuration (`.env`)

Create a `.env` file in the `chatterbox-server/` directory:

```bash
cp chatterbox-server/.env.example chatterbox-server/.env
```

Edit `chatterbox-server/.env` and fill in your values:

```env
# MongoDB Connection URI
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chatterbox?retryWrites=true&w=majority

# JWT Secret (use a strong, random string in production)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Cloudinary Configuration (Image Hosting)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

#### Client Configuration (`.env.local`)

Create a `.env.local` file in the `chatterbox-client/` directory:

```bash
cp chatterbox-client/.env.example chatterbox-client/.env.local
```

Edit `chatterbox-client/.env.local` and fill in your values:

```env
# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name

# Google OAuth 2.0
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Giphy API
VITE_GIPHY_API_KEY=your_giphy_api_key
```

## 🔑 Getting API Keys & Credentials

### MongoDB Atlas

1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Navigate to "Database" → "Clusters" → "Connect"
4. Choose "Drivers" connection method
5. Copy the connection string (MONGO_URI)

### Cloudinary

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Go to the Dashboard
3. Find your Cloud Name, API Key, and API Secret
4. Add to `.env` files

### Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized origins:
   - `http://localhost:5173` (dev)
   - `http://localhost:3000` (if needed)
6. Copy your Client ID

### Giphy API

1. Visit [Giphy Developers](https://giphy.com/developer)
2. Create an app
3. Copy your API key

## 📱 Running the Application

### Development Mode

Run both frontend and backend concurrently:

```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:5000 (Node.js server)

### Frontend Only

```bash
cd chatterbox-client
npm run dev
```

### Backend Only

```bash
cd chatterbox-server
npm run dev
```

### Production Build

```bash
npm run build
```

This will:
- Build the frontend (React + Vite)
- Output to: `chatterbox-client/dist/`

### Production Start

```bash
npm start
```

Starts the server on the configured PORT (default: 5000)

## 📂 Project Structure

```
chatterBOXv3.1/
├── chatterbox-client/          # React Frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API & external services
│   │   ├── context/            # React Context providers
│   │   ├── utils/              # Utility functions
│   │   ├── App.jsx             # Root component
│   │   └── main.jsx            # Entry point
│   ├── package.json            # Dependencies manifest
│   └── vite.config.js          # Vite configuration
│
├── chatterbox-server/          # Node.js Backend (Express)
│   ├── controllers/            # Route handlers/business logic
│   ├── models/                 # MongoDB schemas
│   ├── routes/                 # API routes
│   ├── middleware/             # Express middleware
│   ├── utils/                  # Helper functions
│   ├── index.js                # Server entry point
│   ├── db.js                   # Database connection
│   └── package.json            # Dependencies manifest
│
├── package.json                # Root configuration
└── README.md                   # Project documentation
```

## 🛠️ Tech Stack

### Frontend
- **React** 19.2.0 - UI framework
- **Vite** 7.2.4 - Build tool & dev server
- **React Router DOM** 7.10.1 - Routing
- **Axios** 1.13.2 - HTTP client
- **React Query** 5.90.20 - Server state management
- **Socket.io Client** 4.8.3 - Real-time communication
- **FFmpeg** 0.12.15 - Video/audio processing
- **React Player** 3.4.0 - Media playback
- **Emoji Picker** 4.16.1 - Emoji selection

### Backend
- **Express** 5.2.1 - Web framework
- **MongoDB** (via Mongoose) - Database
- **Socket.io** 4.8.3 - WebSocket communication
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Cloudinary** - Image hosting
- **Nodemailer** - Email notifications
- **CORS** - Cross-origin resource sharing
- **Compression** - Response compression

## 🔐 Security Notes

⚠️ **Important Security Reminders:**

1. **Never commit `.env` files** to version control
2. **Use strong, unique JWT_SECRET** in production (minimum 32 characters)
3. **Keep API keys private** - never expose in client code (except VITE_ prefixed ones)
4. **Use HTTPS** in production
5. **Validate all user inputs** on both frontend and backend
6. **Implement rate limiting** for API endpoints
7. **Rotate API keys regularly** if compromised

## 🐛 Troubleshooting

### Port Already in Use

If port 5000 is in use:

```bash
# Linux/Mac - Find the process using port 5000
lsof -i :5000

# Windows - Find the process
netstat -ano | findstr :5000

# Kill the process or use a different port
export PORT=5001  # Linux/Mac
set PORT=5001     # Windows
```

### MongoDB Connection Error

- Verify MongoDB is running locally, or
- Check MongoDB Atlas connection string in `.env`
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify username and password are URL-encoded

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules chatterbox-client/node_modules chatterbox-server/node_modules
npm run install-all
```

### CORS Issues

- Check `CLIENT_URL` in server `.env` matches your frontend URL
- Verify CORS middleware is configured in `chatterbox-server/index.js`

### Cloudinary Upload Issues

- Verify all three credentials are correct in `.env`
- Check your Cloudinary account upload settings
- Ensure unsigned uploads are enabled (if using preset)

## 📝 Available Scripts

### Root Level

```bash
npm run install-all    # Install all dependencies
npm run build          # Build client and prepare for production
npm run start          # Start production server
npm run dev            # Run dev servers concurrently
```

### Frontend (chatterbox-client)

```bash
npm run dev            # Start Vite dev server
npm run build          # Build for production
npm run preview        # Preview production build locally
npm run lint           # Run ESLint
```

### Backend (chatterbox-server)

```bash
npm run dev            # Start with nodemon (auto-reload)
```

## 🚀 Deployment

### Deploy to Vercel/Netlify (Frontend)

```bash
npm run build
# Then deploy the chatterbox-client/dist folder
```

### Deploy to Heroku/Railway (Backend)

1. Set environment variables on the hosting platform
2. Push your code
3. Platform will automatically run `npm start`

## 📞 Support

- Check the main [README.md](README.md) for feature documentation
- Review error messages in browser console and server logs
- Check `.env` files are properly configured

## 📄 License

ISC

## 👨‍💻 Development Notes

- **Frontend**: Uses ES modules and Vite for fast development
- **Backend**: Uses CommonJS (require/module.exports)
- **Real-time**: Socket.io enables live notifications and chat
- **State**: Frontend uses React Context + React Query for state management

---

**Last Updated**: 2024  
**Node.js Requirement**: >= 20.0.0
