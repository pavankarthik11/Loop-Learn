# LoopLearn

LoopLearn is a full-stack platform designed to connect users so they can teach and learn skills from one another.

## Project Structure

This project is divided into two main components:
- **`Frontend/`**: A React application built with Vite and Tailwind CSS.
- **`Backend/`**: A Node.js and Express REST API backed by MongoDB.

## Local Setup

### 1. Database and Environment Setup
Before starting the application, you need to set up Environment Variables for both the **Frontend** and **Backend**. 

Navigate to the `Backend/` directory and ensure your `.env` file contains your credentials (it should look something like this):
```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=*
ACCESS_TOKEN_SECRET=your_jwt_access_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_jwt_refresh_secret
REFRESH_TOKEN_EXPIRY=10d
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
GMAIL_USER=your_gmail_address
GMAIL_PASS=your_gmail_app_password
DAILY_API_KEY=your_daily_co_api_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
```

Navigate to the `Frontend/` directory and ensure your `.env` file looks like this:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_CURRENCY='$'
```

### 2. Running Locally
Open two terminal instances.

**Terminal 1 (Backend):**
```bash
cd Backend
npm install
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd Frontend
npm install
npm run dev
```

## Deployment Guide

You can easily deploy both parts of the application for free. Everything is correctly configured for direct deployment.

### Deploying the Backend (Render or Vercel)

**Option A: Render (Web Service - Recommended)**
1. Connect your GitHub repository to [Render](https://render.com/) and create a new **Web Service**.
2. Set the **Root Directory** to `Backend`.
3. Set the **Build Command** to `npm install`.
4. Set the **Start Command** to `npm start`.
5. Add your Environment variables in the dashboard and Deploy.

**Option B: Vercel**
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Before clicking deploy, click on "Edit Framework / Root Directory" and select `Backend` as the **Root Directory**.
3. Add all your Backend Environment variables.
4. Deploy! The provided `vercel.json` will automatically map your `src/index.js` as the main serverless function.

### Deploying the Frontend (Vercel or Netlify)

1. In your [Vercel](https://vercel.com) or [Netlify](https://netlify.com) dashboard, connect your GitHub repository.
2. Select the **Root Directory** as `Frontend`.
3. **Build Command**: `npm run build`
4. **Publish Directory** (Output Directory): `dist`
5. Add your Frontend `.env` variables in the dashboard.
6. Deploy! 

**Final Step:** Once the Frontend is deployed, don't forget to take the deployed Frontend URL and set it as the `CORS_ORIGIN` variable in your Backend's dashboard to ensure APIs can communicate without being blocked!
