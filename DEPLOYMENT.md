# Deployment Guide

This guide walks you through deploying the Signal-to-Opportunity Analysis application using separate repositories for frontend and backend.

## Overview

- **Backend**: Deploy to Render (Python FastAPI)
- **Frontend**: Deploy to Vercel (React/Vite)
- **Repositories**: Separate GitHub repos for better deployment management

## Step 1: Repository Setup

### Create Two Separate Repositories

1. **Backend Repository** (`signal-analysis-backend`)
2. **Frontend Repository** (`signal-analysis-frontend`)

### Backend Repository Structure
```
signal-analysis-backend/
├── api/
├── services/
├── main.py
├── models.py
├── requirements.txt
├── render.yaml
├── Dockerfile (optional)
└── README.md
```

### Frontend Repository Structure
```
signal-analysis-frontend/
├── src/
├── public/
├── package.json
├── vite.config.ts
├── vercel.json
└── README.md
```

## Step 2: Backend Deployment (Render)

### Environment Variables for Render
Set these in your Render dashboard:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
ENVIRONMENT=production
PORT=10000
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

### Render Configuration
Create `render.yaml` in backend root:

```yaml
services:
  - type: web
    name: signal-analysis-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: OPENROUTER_API_KEY
        sync: false
      - key: ENVIRONMENT
        value: production
      - key: CORS_ORIGINS
        sync: false
```

## Step 3: Frontend Deployment (Vercel)

### Environment Variables for Vercel
Set these in your Vercel dashboard:

```
VITE_API_BASE_URL=https://your-backend-app.onrender.com
VITE_ENVIRONMENT=production
```

### Vercel Configuration
Create `vercel.json` in frontend root:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "env": {
    "VITE_API_BASE_URL": "@vite_api_base_url",
    "VITE_ENVIRONMENT": "production"
  }
}
```

## Step 4: Code Modifications for Production

### Backend Changes
1. Update CORS configuration for production
2. Add health check endpoint
3. Configure logging for production
4. Add error handling for missing environment variables

### Frontend Changes
1. Update API base URL to use environment variable
2. Add production build optimizations
3. Configure error boundaries
4. Add loading states for better UX

## Step 5: Deployment Commands

### Push to GitHub
```bash
# Backend
git init
git add .
git commit -m "Initial backend commit"
git remote add origin https://github.com/yourusername/signal-analysis-backend.git
git push -u origin main

# Frontend
git init
git add .
git commit -m "Initial frontend commit"
git remote add origin https://github.com/yourusername/signal-analysis-frontend.git
git push -u origin main
```

### Deploy to Render
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Deploy to Vercel
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

## Step 6: Post-Deployment

### Testing
1. Test API endpoints via Render URL
2. Test frontend functionality via Vercel URL
3. Verify CORS configuration
4. Test end-to-end workflow

### Monitoring
1. Set up Render logs monitoring
2. Configure Vercel analytics
3. Monitor API performance
4. Set up error tracking

## Troubleshooting

### Common Issues
1. **CORS Errors**: Update CORS_ORIGINS environment variable
2. **API Connection**: Verify VITE_API_BASE_URL is correct
3. **Build Failures**: Check dependency versions and build commands
4. **Environment Variables**: Ensure all required vars are set

### Debug Steps
1. Check Render deployment logs
2. Verify Vercel build logs
3. Test API endpoints directly
4. Check browser network tab for errors