# ChatterBOX v3.1 - Installation Checklist

Print this checklist and use it when setting up on a new device!

---

## 📝 Pre-Installation Checklist

- [ ] **Operating System**: Windows / macOS / Linux
- [ ] **Internet Connection**: ✓
- [ ] **Admin Access**: Available (if needed)
- [ ] **Git**: Installed (`git --version`)

---

## 🔧 System Requirements Check

### Node.js & npm Installation

- [ ] Download Node.js >= 20.0.0 from [nodejs.org](https://nodejs.org/)
- [ ] Run installer and complete installation
- [ ] Open terminal/PowerShell/Command Prompt
- [ ] Verify Node.js: `node --version` (Should show v20.x.x or higher)
- [ ] Verify npm: `npm --version` (Should show 10.x.x or higher)

**Windows Users**: Use PowerShell as Administrator
**macOS Users**: May need to use `sudo` for system-wide npm commands
**Linux Users**: May need `sudo` for some npm operations

---

## 📦 Project Setup

### Step 1: Clone Repository

- [ ] Open terminal in desired directory
- [ ] Run: `git clone https://github.com/gwnchetan/chatterBOX_v3.git`
- [ ] Navigate to directory: `cd chatterBOXv3.1`

### Step 2: Install Dependencies

- [ ] Run: `npm run install-all`
- [ ] Wait for installation to complete (5-10 minutes)
- [ ] Verify no errors in output

**Alternative (if step 2 fails):**
- [ ] `npm install` (root)
- [ ] `cd chatterbox-client && npm install` (frontend)
- [ ] `cd ../chatterbox-server && npm install` (backend)

### Step 3: Verify Installation

- [ ] Run: `npm verify`
- [ ] All checks should show ✓ signs
- [ ] No critical errors shown

---

## 🔐 API Credentials & Setup

### MongoDB Atlas (Required)

- [ ] Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- [ ] Create free cluster
- [ ] Get connection string (URI)
- [ ] Format: `mongodb+srv://username:password@cluster.mongodb.net/database...`
- [ ] Copy to clipboard

### Cloudinary (Required for image upload)

- [ ] Create account at [cloudinary.com](https://cloudinary.com/)
- [ ] Go to Dashboard
- [ ] Copy **Cloud Name**
- [ ] Copy **API Key**
- [ ] Generate/Copy **API Secret**
- [ ] Save all three values

### Google OAuth 2.0 (Optional but recommended)

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create new project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials (Web Application)
- [ ] Set authorized origins:
  - [ ] `http://localhost:5173`
  - [ ] `http://localhost:3000` (if needed)
- [ ] Copy **Client ID**

### Giphy API (Optional for GIF picker)

- [ ] Visit [giphy.com/developer](https://giphy.com/developer)
- [ ] Create app/Get API key
- [ ] Copy **API Key**

---

## 📄 Environment Variables Setup

### Backend Configuration

- [ ] Create `.env` file in `chatterbox-server/` directory
  - [ ] Option A: Copy from template: `cp chatterbox-server/.env.example chatterbox-server/.env`
  - [ ] Option B: Create manually with required fields

- [ ] Edit `chatterbox-server/.env` and fill in:
  ```
  ✓ MONGO_URI=mongodb+srv://... (from MongoDB)
  ✓ JWT_SECRET=<your-secret-key> (generate random string, min 32 chars)
  ✓ PORT=5000 (keep default or change)
  ✓ NODE_ENV=development
  ✓ CLIENT_URL=http://localhost:5173
  ✓ CLOUDINARY_CLOUD_NAME=... (from Cloudinary)
  ✓ CLOUDINARY_API_KEY=... (from Cloudinary)
  ✓ CLOUDINARY_API_SECRET=... (from Cloudinary)
  ```

- [ ] **IMPORTANT**: Do NOT commit `.env` to git!
- [ ] **IMPORTANT**: Do NOT share `.env` file!

### Frontend Configuration

- [ ] Create `.env.local` file in `chatterbox-client/` directory
  - [ ] Option A: Copy from template: `cp chatterbox-client/.env.example chatterbox-client/.env.local`
  - [ ] Option B: Create manually with required fields

- [ ] Edit `chatterbox-client/.env.local` and fill in:
  ```
  ✓ VITE_CLOUDINARY_CLOUD_NAME=... (from Cloudinary)
  ✓ VITE_GOOGLE_CLIENT_ID=... (from Google, optional)
  ✓ VITE_GIPHY_API_KEY=... (from Giphy, optional)
  ```

- [ ] **IMPORTANT**: These can be exposed (prefixed with VITE_)
- [ ] **IMPORTANT**: `.env.local` is in .gitignore

---

## 🚀 First Run

### Verify Setup

- [ ] Run: `npm verify`
- [ ] Check all items pass
- [ ] See no red ✗ marks

### Start Development Server

- [ ] Run: `npm run dev` (from root directory)
- [ ] Wait for both servers to start
- [ ] Should see:
  - [ ] Vite server on `http://localhost:5173`
  - [ ] Express server on `http://localhost:5000`
  - [ ] MongoDB connected message

### Test Frontend

- [ ] Open browser: `http://localhost:5173`
- [ ] See ChatterBOX login page
- [ ] Can interact with UI
- [ ] No console errors (press F12)

### Test Backend

- [ ] Check terminal shows no errors
- [ ] Port 5000 is listening
- [ ] MongoDB connection successful
- [ ] No error messages

---

## ✅ Installation Complete!

You're ready to start development! 🎉

### Next Steps

- [ ] Familiarize yourself with the project structure
- [ ] Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed info
- [ ] Check [DEPENDENCIES.md](DEPENDENCIES.md) for all packages
- [ ] Start building features!

### Keep Handy

- [QUICK_START.md](QUICK_START.md) - OS-specific commands
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Full setup documentation
- [DEPENDENCIES.md](DEPENDENCIES.md) - Package details
- [PACKAGE_MANIFEST.txt](PACKAGE_MANIFEST.txt) - All dependencies listed

---

## 🆘 Troubleshooting

### Issue: `npm: command not found`
- [ ] Node.js not installed correctly
- [ ] Restart terminal/computer
- [ ] Reinstall Node.js from nodejs.org

### Issue: `Cannot find module`
- [ ] Run: `npm run install-all` again
- [ ] Delete `node_modules` and run again
- [ ] Clear cache: `npm cache clean --force`

### Issue: Port already in use
- [ ] Windows: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process`
- [ ] macOS/Linux: `lsof -i :5000; kill -9 <PID>`
- [ ] Or change PORT in `.env`

### Issue: MongoDB connection failed
- [ ] Verify MONGO_URI is correct
- [ ] Check IP whitelisting in MongoDB Atlas
- [ ] Ensure MongoDB is accessible

### Issue: Cloudinary upload fails
- [ ] Verify API credentials in `.env`
- [ ] Check credentials are correct
- [ ] Check Cloudinary account settings

### Issue: Google Login not working
- [ ] Verify Client ID in `.env.local`
- [ ] Check authorized origins in Google Cloud Console
- [ ] Ensure `http://localhost:5173` is added

---

## 📞 Getting Help

1. **Read documentation**: See all .md files in root directory
2. **Check error messages**: Read terminal output carefully
3. **Verify environment variables**: Ensure all `.env` files filled correctly
4. **Restart clean**: 
   ```bash
   rm -rf node_modules package-lock.json
   npm run install-all
   npm run dev
   ```

---

## 🎯 Quick Commands Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install root dependencies |
| `npm run install-all` | Install all dependencies (root, client, server) |
| `npm run dev` | Start development servers |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm verify` | Verify setup is correct |
| `npm audit` | Check for security issues |
| `npm outdated` | Check for outdated packages |

---

## 📋 Device Setup Record

**Device Name**: ________________  
**Operating System**: ________________  
**Node.js Version**: ________________  
**Date Setup Completed**: ________________  
**All Tests Passing**: __ Yes __ No  

---

## ✨ Congratulations!

Your ChatterBOX development environment is now ready! Start building amazing features! 🚀

---

**Questions?** Check the documentation files or review the code!
