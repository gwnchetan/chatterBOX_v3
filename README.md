# ChatterBOX v3.1

A modern, responsive social media web application built with a focus on UI/UX excellence, scalability, and robust security.

## 🚀 Features

### **1. Authentication System**
*   **Dual-Screen Interface**: Seamless toggle between Login and Registration forms using a split-screen design.
*   **Frontend Validation**: Comprehensive real-time validation for emails, passwords, usernames, and more.
*   **Browser Autofill Customization**: Custom styling to prevent default browser autofill colors from clashing with the dark theme.
*   **Secure Inputs**: Controlled components with state management.

### **2. Design System (UI/UX)**
*   **Theme Engine**: Built-in **Light** and **Dark** modes, toggleable via `data-theme` attribute (no hard-coded colors).
*   **Variable-Based CSS**: A strict single source of truth (`index.css`) defining:
    *   Semantic Color Palettes (Surface, Text, Primary, Accent, Error)
    *   Responsive Spacing & Typography
    *   Consistent Border Radius & Shadows
*   **Animations**: Smooth `fadeInUp` transitions for interactions and subtle floating illustrations.
*   **Typography**: Uses the modern "Outfit" font family for a premium, friendly aesthetic.

## 🛠️ Tech Stack

*   **Frontend**: React.js (Vite)
*   **Styling**: Pure CSS3 (CSS Variables, Flexbox/Grid)
*   **Backend**: Node.js, Express (Initial Setup)
*   **Fonts**: Google Fonts (Outfit)

## 📂 Project Structure

```
chatterBOXv3.1/
├── chatterbox-client/    # React Frontend
│   ├── src/
│   │   ├── pages/        # Login, Feed, etc.
│   │   ├── assets/       # Images & Icons
│   │   ├── index.css     # Global Design System
│   │   └── App.jsx       # Main Entry
│   └── ...
├── chatterbox-server/    # Node Backend
└── ...
```

## 🎨 Theme Usage

The application defaults to **Dark Mode**. To switch themes, use the toggle button on the login screen or manually change the HTML attribute:

```html
<!-- Dark Mode (Default) -->
<html data-theme="dark">

<!-- Light Mode -->
<html data-theme="light">
```

## 📥 Setup & Run

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/gwnchetan/chatterBOX_v3.git
    cd chatterBOX_v3
    ```

2.  **Install Client Dependencies**:
    ```bash
    cd chatterbox-client
    npm install
    npm run dev
    ```

3.  **Install Server Dependencies**:
    ```bash
    cd ../chatterbox-server
    npm install
    node index.js
    ```
