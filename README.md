# JAMU KITO Landing Page

Premium standalone landing page for **JAMU KITO INTERNASIONAL**.

## 🚀 Overview

This repository contains the standalone landing page for JAMU KITO, optimized for high performance and direct integration with the production backend.

### Key Features
- **Standalone Architecture**: Focused only on the Home page and Essential components.
- **Production-Ready**: Connects directly to `https://jamukitointernasional.base44.app/`.
- **Dynamic Redirection**: All administrative and checkout links automatically redirect to the primary platform.
- **Mobile Optimized**: Responsive design tested for high conversion on all devices.

## 🛠 Tech Stack
- **Frontend**: Vite + React
- **Styling**: Tailwind CSS + Shadcn/ui
- **Logic**: Base44 SDK for real-time product synchronization
- **Animations**: Framer Motion + Lucide React icons

## 📦 Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SIRAJcrypto11/jamukitolandingpage.git
   cd jamukitolandingpage
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file with the following:
   ```env
   VITE_BASE44_APP_ID="6937a573d12f0f67c2233fb6"
   VITE_BASE44_BACKEND_URL="https://jamukitointernasional.base44.app/"
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🚢 Deployment (Vercel)

1. Connect this repository to **Vercel**.
2. Add the `.env` variables in **Vercel Project Settings**.
3. Deploy!

---
© 2026 PT JAMUKITO INTERNATIONAL - All Rights Reserved.
