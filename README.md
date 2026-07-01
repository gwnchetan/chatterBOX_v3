# chatterBOX v3
A full-stack real-time chat application with social features, media sharing, and live communication.
![Stack](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
---
## Features
- **Real-time messaging** via Socket.io
- **Follow / Friend Request system** with privacy controls
- **Media sharing** — image and video uploads via Cloudinary
- **Stories** — disappearing content like Instagram Stories
- **Google OAuth** + JWT-based authentication
- **Responsive UI** with empty state handling across all screen sizes
- **Client-side caching** with TanStack Query for optimized performance
---
## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TanStack Query |
| Backend | Node.js, Express.js |
| Real-time | Socket.io |
| Database | MongoDB (Mongoose) |
| Auth | JWT, Google OAuth 2.0 |
| Media | Cloudinary |
| Deployment | Railway (Nixpacks) |
---
## Project Structure
```
chatterBOX_v3/
├── chatterbox-client/        # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level page components
│   │   ├── context/          # React context providers
│   │   ├── services/         # API service functions
│   │   ├── lib/              # TanStack Query setup, helpers
│   │   └── utils/            # Utility functions
│   └── public/
├── chatterbox-server/        # Express + Socket.io backend
│   ├── controllers/          # Route handler logic
│   ├── middleware/            # Auth, error handling
│   ├── models/               # Mongoose schemas
│   ├── routes/               # API route definitions
│   └── utils/                # Server-side utilities
```
---
## Getting Started
### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB instance (local or Atlas)
- Cloudinary account
- Google OAuth credentials
### Installation
```bash
# Clone the repo
git clone https://github.com/gwnchetan/chatterBOX_v3.git
cd chatterBOX_v3
# Install all dependencies
npm install
cd chatterbox-client && npm install
cd ../chatterbox-server && npm install
cd ..
```
### Environment Setup
**Server** — create `chatterbox-server/.env`:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
**Client** — create `chatterbox-client/.env.local`:
```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```
### Run Locally
```bash
# Start backend
cd chatterbox-server && npm run dev
# Start frontend (new terminal)
cd chatterbox-client && npm run dev
```
---
## Deployment
This project uses **Nixpacks** for Railway deployment. The `nixpacks.json` at root handles the build configuration automatically.
---
## License
MIT
