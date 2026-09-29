# Deployment Checklist

Follow this step-by-step checklist to deploy your Signal-to-Opportunity Analysis application.

## ✅ Pre-Deployment Setup

### 1. Prepare Separate Repositories

```bash
# Run the preparation scripts
python scripts/prepare-backend-repo.py
python scripts/prepare-frontend-repo.py
```

### 2. Create GitHub Repositories

1. Go to GitHub and create two new repositories:
   - `signal-analysis-backend` (public or private)
   - `signal-analysis-frontend` (public or private)

### 3. Push Backend to GitHub

```bash
cd ../signal-analysis-backend
git init
git add .
git commit -m "Initial backend commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/signal-analysis-backend.git
git push -u origin main
```

### 4. Push Frontend to GitHub

```bash
cd ../signal-analysis-frontend
git init
git add .
git commit -m "Initial frontend commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/signal-analysis-frontend.git
git push -u origin main
```

## ✅ Backend Deployment (Render)

### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up or log in
- Connect your GitHub account

### 2. Deploy Backend Service

1. Click "New +" → "Web Service"
2. Connect your `signal-analysis-backend` repository
3. Configure the service:
   - **Name**: `signal-analysis-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or paid for better performance)

### 3. Set Environment Variables

In Render dashboard, add these environment variables:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
ENVIRONMENT=production
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

**Important**: Replace `your-frontend-domain` with your actual Vercel domain (you'll get this after frontend deployment).

### 4. Deploy and Test

1. Click "Create Web Service"
2. Wait for deployment to complete
3. Test the health endpoint: `https://your-backend.onrender.com/health`
4. Note your backend URL for frontend configuration

## ✅ Frontend Deployment (Vercel)

### 1. Create Vercel Account
- Go to [vercel.com](https://vercel.com)
- Sign up or log in with GitHub

### 2. Deploy Frontend

1. Click "New Project"
2. Import your `signal-analysis-frontend` repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Set Environment Variables

In Vercel dashboard, add these environment variables:

```
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_ENVIRONMENT=production
```

**Important**: Replace `your-backend.onrender.com` with your actual Render backend URL.

### 4. Deploy and Test

1. Click "Deploy"
2. Wait for deployment to complete
3. Test your application at the provided Vercel URL

## ✅ Post-Deployment Configuration

### 1. Update Backend CORS

1. Go back to your Render dashboard
2. Update the `CORS_ORIGINS` environment variable with your Vercel URL:
   ```
   CORS_ORIGINS=https://your-app.vercel.app
   ```
3. Redeploy the backend service

### 2. Test End-to-End

1. Visit your Vercel frontend URL
2. Test the complete workflow:
   - Create session
   - Generate opportunities
   - Select opportunities
   - Verify API calls work

### 3. Set Up Custom Domains (Optional)

#### For Render (Backend):
1. Go to Settings → Custom Domains
2. Add your custom domain
3. Configure DNS records

#### For Vercel (Frontend):
1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records

## ✅ Monitoring and Maintenance

### 1. Set Up Monitoring

#### Render:
- Monitor logs in the Render dashboard
- Set up health check alerts
- Monitor resource usage

#### Vercel:
- Use Vercel Analytics
- Monitor build logs
- Set up error tracking

### 2. Environment Management

- Keep environment variables secure
- Rotate API keys regularly
- Monitor usage and costs

### 3. Updates and Maintenance

- Set up automatic deployments on git push
- Monitor for security updates
- Regular testing of the deployed application

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `CORS_ORIGINS` is set correctly in Render
   - Ensure frontend URL matches exactly

2. **API Connection Errors**
   - Check `VITE_API_BASE_URL` in Vercel
   - Verify backend is running on Render

3. **Build Failures**
   - Check build logs in respective dashboards
   - Verify all dependencies are listed correctly

4. **Environment Variable Issues**
   - Ensure all required variables are set
   - Check for typos in variable names

### Debug Steps

1. Check deployment logs
2. Test API endpoints directly
3. Use browser developer tools
4. Verify environment variables are loaded

## 📞 Support

If you encounter issues:

1. Check the deployment logs first
2. Verify all environment variables
3. Test API endpoints independently
4. Check CORS configuration
5. Consult Render and Vercel documentation

## 🎉 Success!

Once everything is working:

- Your backend will be live at: `https://your-backend.onrender.com`
- Your frontend will be live at: `https://your-app.vercel.app`
- Both will auto-deploy when you push to GitHub

Congratulations on successfully deploying your Signal-to-Opportunity Analysis application!