# ChatterBOX v3.1 - Dependencies & Requirements

This document lists all dependencies and system requirements for the ChatterBOX project.

## 🖥️ System Requirements

| Requirement | Version | Type |
|-------------|---------|------|
| Node.js | >= 20.0.0 | Required |
| npm | >= 10.0.0 | Required |
| MongoDB | >= 4.4 | Required |
| Git | Latest | Recommended |

### Optional Services

- **Cloudinary** - Image hosting and processing
- **Google Cloud** - OAuth 2.0 authentication
- **Giphy** - GIF integration
- **Nodemailer** - Email notifications (requires SMTP)

## 📦 Root Dependencies

**Location**: `/package.json`

| Package | Version | Purpose |
|---------|---------|---------|
| concurrently | ^8.2.2 | Run multiple npm scripts simultaneously |

### Dev Dependencies

None at root level.

## 🎨 Frontend Dependencies

**Location**: `/chatterbox-client/package.json`

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @ffmpeg/ffmpeg | ^0.12.15 | FFmpeg WebAssembly - Video/audio processing |
| @ffmpeg/util | ^0.12.2 | FFmpeg utilities |
| @react-oauth/google | ^0.13.0 | Google OAuth integration |
| @tanstack/react-query | ^5.90.20 | Server state management |
| axios | ^1.13.2 | HTTP client for API calls |
| chatterbox-root | file:.. | Root package reference |
| date-fns | ^4.1.0 | Date formatting and manipulation |
| emoji-picker-react | ^4.16.1 | Emoji selection UI component |
| jwt-decode | ^4.0.0 | Decode JWT tokens |
| rc-slider | ^11.1.9 | Slider component |
| react | ^19.2.0 | React framework |
| react-dom | ^19.2.0 | React DOM rendering |
| react-easy-crop | ^5.5.6 | Image cropping component |
| react-intersection-observer | ^10.0.2 | Intersection Observer for lazy loading |
| react-player | ^3.4.0 | Media player component |
| react-router-dom | ^7.10.1 | Client-side routing |
| react-virtuoso | ^4.18.1 | Virtual scrolling for performance |
| socket.io-client | ^4.8.3 | WebSocket client for real-time communication |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @eslint/js | ^9.39.1 | ESLint rules |
| @types/react | ^19.2.5 | TypeScript definitions for React |
| @types/react-dom | ^19.2.3 | TypeScript definitions for React DOM |
| @vitejs/plugin-react | ^5.1.1 | Vite React plugin |
| @welldone-software/why-did-you-render | ^10.0.1 | Debug unnecessary renders |
| eslint | ^9.39.1 | JavaScript linter |
| eslint-plugin-react-hooks | ^7.0.1 | ESLint rules for React Hooks |
| eslint-plugin-react-refresh | ^0.4.24 | ESLint rules for Vite React refresh |
| globals | ^16.5.0 | Global variable definitions |
| vite | ^7.2.4 | Build tool and dev server |

**Install Frontend Dependencies**:
```bash
cd chatterbox-client
npm install
```

## 🔧 Backend Dependencies

**Location**: `/chatterbox-server/package.json`

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| axios | ^1.13.2 | HTTP client for external APIs |
| bcrypt | ^6.0.0 | Password hashing and verification |
| chatterbox-root | file:.. | Root package reference |
| cloudinary | ^2.8.0 | Image hosting API client |
| compression | ^1.8.1 | Gzip compression for responses |
| cors | ^2.8.5 | CORS middleware |
| dotenv | ^16.4.5 | Environment variable loader |
| express | ^5.2.1 | Web framework |
| google-auth-library | ^10.5.0 | Google OAuth verification |
| jsonwebtoken | ^9.0.3 | JWT token creation and verification |
| mongoose | ^9.0.2 | MongoDB ODM |
| nodemailer | ^7.0.11 | Email sending |
| socket.io | ^4.8.3 | WebSocket server for real-time communication |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| nodemon | ^3.1.11 | Auto-restart server on file changes |

**Install Backend Dependencies**:
```bash
cd chatterbox-server
npm install
```

## 🔐 Security-Related Packages

1. **bcrypt** - Securely hash passwords
2. **jsonwebtoken** - Authenticate users with JWTs
3. **google-auth-library** - Verify Google OAuth tokens
4. **cors** - Control cross-origin requests
5. **dotenv** - Manage sensitive environment variables

## 📊 Total Dependency Count

- **Root**: 1 production dependency
- **Frontend**: 24 production dependencies + 7 dev dependencies
- **Backend**: 13 production dependencies + 1 dev dependency
- **Total**: 38 production dependencies + 8 dev dependencies

## 🔄 Dependency Update Strategy

### Regular Updates
```bash
# Check for outdated packages
npm outdated

# Update to latest versions (respecting semver)
npm update
```

### Major Version Updates
```bash
# Install specific version
npm install package_name@latest
```

**Note**: Always test after major version updates.

## 📋 Verification Commands

### Check Node.js Version
```bash
node --version  # Should be >= 20.0.0
npm --version   # Should be >= 10.0.0
```

### Verify All Dependencies Are Installed
```bash
# Root
npm ls

# Frontend
cd chatterbox-client
npm ls

# Backend
cd ../chatterbox-server
npm ls
```

### Check for Security Vulnerabilities
```bash
npm audit

# Fix automatically (if possible)
npm audit fix
```

### Check for Outdated Packages
```bash
npm outdated
```

## 🆘 Dependency Issues

### Issue: "Module not found"
```bash
# Remove and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Version conflicts
```bash
# Clear npm cache
npm cache clean --force

# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Peer Dependencies
Some packages may warn about peer dependencies. These are usually warnings and can be ignored if:
- The peer package is optional
- A compatible version is installed elsewhere

## 📈 Performance Dependencies

The following packages are critical for performance:

1. **vite** - Fast module bundling
2. **compression** - Response compression 
3. **react-virtuoso** - Virtual scrolling
4. **@tanstack/react-query** - Caching and state management
5. **socket.io** - Efficient WebSocket communication

## 🔗 External Services

In addition to npm packages, the application depends on:

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| MongoDB Atlas | Database | Yes (limited) |
| Cloudinary | Image hosting | Yes (limited) |
| Google Cloud | OAuth 2.0 | Yes |
| Giphy | GIF API | Yes |

## 📝 License Information

All dependencies are open-source and compatible with the ISC license used by this project.

---

**Last Updated**: March 2024  
**Node Version**: >= 20.0.0  
**npm Version**: >= 10.0.0
