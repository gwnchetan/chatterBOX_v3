# ChatterBOX v3.1 - Quick Start Guide

Fast setup instructions for Windows, macOS, and Linux.

## ⚡ Super Quick Setup (3 steps)

### 1. Prerequisites Check

```bash
# Check if Node.js is installed (should be >= 20.0.0)
node --version
npm --version
```

❌ **Don't have Node.js?** Download from [nodejs.org](https://nodejs.org/)

### 2. Install Dependencies

From the project root directory:

```bash
npm run install-all
```

### 3. Configure Environment

Copy example files:

```bash
# On Windows (PowerShell)
Copy-Item chatterbox-server\.env.example chatterbox-server\.env
Copy-Item chatterbox-client\.env.example chatterbox-client\.env.local

# On macOS/Linux
cp chatterbox-server/.env.example chatterbox-server/.env
cp chatterbox-client/.env.example chatterbox-client/.env.local
```

Edit both files and fill in your API keys:
- `chatterbox-server/.env` - Add MongoDB URI, Cloudinary credentials
- `chatterbox-client/.env.local` - Add Google Client ID, Giphy API key

### 4. Run!

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📋 Operating System Specific Instructions

### Windows (PowerShell)

```powershell
# Clone repository
git clone https://github.com/gwnchetan/chatterBOX_v3.git
cd chatterBOXv3.1

# Install Node.js dependencies
npm run install-all

# Copy environment files
Copy-Item chatterbox-server\.env.example chatterbox-server\.env
Copy-Item chatterbox-client\.env.example chatterbox-client\.env.local

# Edit your .env files in VS Code
code chatterbox-server\.env
code chatterbox-client\.env.local

# Run development server
npm run dev

# When done, stop with: Ctrl + C
```

**Troubleshooting Windows:**
- If `npm run install-all` fails, try: `npm install; cd chatterbox-client; npm install; cd ..\chatterbox-server; npm install`
- If port is in use, set: `$env:PORT=5001` before running dev

### macOS

```bash
# Install Node.js (if not already installed)
# Using Homebrew: brew install node@20

# Clone repository
git clone https://github.com/gwnchetan/chatterBOX_v3.git
cd chatterBOXv3.1

# Install dependencies
npm run install-all

# Copy environment files
cp chatterbox-server/.env.example chatterbox-server/.env
cp chatterbox-client/.env.example chatterbox-client/.env.local

# Edit your .env files
nano chatterbox-server/.env
# or
code chatterbox-server/.env

# Run development server
npm run dev

# Press Ctrl + C to stop
```

**Troubleshooting macOS:**
- If permission denied, use: `sudo npm install -g npm`
- Check if port 5000 is in use: `lsof -i :5000`

### Linux (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # v20.x.x
npm --version   # 10.x.x

# Clone repository
git clone https://github.com/gwnchetan/chatterBOX_v3.git
cd chatterBOXv3.1

# Install dependencies
npm run install-all

# Copy environment files
cp chatterbox-server/.env.example chatterbox-server/.env
cp chatterbox-client/.env.example chatterbox-client/.env.local

# Edit your .env files
nano chatterbox-server/.env
nano chatterbox-client/.env.local

# Run development server
npm run dev

# Press Ctrl + C to stop
```

### Linux (Fedora/RHEL)

```bash
# Install Node.js
sudo dnf module install nodejs:20

# Verify installation
node --version
npm --version

# Rest is same as Ubuntu/Debian above
```

---

## 🔑 Getting API Credentials (Quick Links)

1. **MongoDB** - [Create Free Database](https://www.mongodb.com/cloud/atlas)
2. **Cloudinary** - [Sign Up Free](https://cloudinary.com/users/register/free)
3. **Google OAuth** - [Get Client ID](https://console.cloud.google.com/)
4. **Giphy API** - [Get API Key](https://giphy.com/developer)

---

## 📱 Available Commands

```bash
# Frontend
cd chatterbox-client
npm run dev      # Dev server on localhost:5173
npm run build    # Build for production
npm run lint     # Check code quality

# Backend
cd ../chatterbox-server
npm run dev      # Dev server on localhost:5000

# From root
npm run dev      # Both dev servers (requires concurrently)
npm run build    # Production build
npm start        # Production start
npm run install-all  # Install all dependencies
```

---

## ✅ Verify Installation

```bash
# Verify setup
npm test    # Run verification script (if added to package.json)

# Or manually verify
node --version     # Check >= 20.0.0
npm --version      # Check >= 10.0.0
npm ls             # List installed packages
npm audit          # Check for security issues
```

---

## 🔍 Check If It's Working

After running `npm run dev`, you should see:

```
  VITE v7.2.4  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help

> chatterbox-server@1.0.0 dev
> nodemon index.js

[nodemon] 3.1.0
[nodemon] to restart at any time, type `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,json
MongoDB connected
listening on port 5000
```

Visit [http://localhost:5173](http://localhost:5173) - You should see the ChatterBOX login screen!

---

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `Module not found` | Run: `npm run install-all` |
| `Port 5000 in use` | Change PORT in .env or kill the process |
| `MongoDB connection error` | Check MONGO_URI in .env |
| `Cannot find module 'react'` | Run: `cd chatterbox-client && npm install` |
| `.env file not found` | Copy from .env.example and fill in values |
| `Vite dev server won't start` | Try: `npm cache clean --force && npm install` |

---

## 📚 Need Help?

- **Setup Issues?** See [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Dependencies?** See [DEPENDENCIES.md](DEPENDENCIES.md)
- **Package Details?** See [PACKAGE_MANIFEST.txt](PACKAGE_MANIFEST.txt)
- **Full README?** See [README.md](README.md)

---

## 🎯 What's Next?

1. ✅ Complete setup above
2. 📝 Edit `chatterbox-server/.env` with your credentials
3. 📝 Edit `chatterbox-client/.env.local` with your credentials
4. 🚀 Run `npm run dev`
5. 🌐 Open http://localhost:5173 in browser
6. 💬 Start building!

---

**Happy Coding! 🚀**

Last Updated: March 2024
