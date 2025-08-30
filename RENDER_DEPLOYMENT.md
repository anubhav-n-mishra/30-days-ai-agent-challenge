# Deploy Lelouch AI to Render

## Step-by-Step Deployment Guide

### 1. Prepare Your Repository
- Push all your code to a GitHub repository
- Make sure all files are committed and pushed

### 2. Create Render Account
- Go to [render.com](https://render.com)
- Sign up with your GitHub account

### 3. Deploy the Application
1. **Connect Repository**:
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select your repository

2. **Configure Service**:
   - **Name**: `lelouch-ai` (or any name you prefer)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`

3. **Set Environment Variables**:
   - Add these environment variables in Render dashboard:
   ```
   SUPABASE_URL=https://ujkjrntnbhhkaxuhwxhm.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa2pybnRuYmhoa2F4dWh3eGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODM3OTYsImV4cCI6MjA3MjA1OTc5Nn0.98sfVBlhnLjicmBuZI-VG3YcoXvBj8fo42bqkQ4Tv20
   ```

4. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete (5-10 minutes)

### 4. Configure Supabase for Production
1. Go to your Supabase project settings
2. Navigate to "Authentication" → "URL Configuration"
3. Add your Render URL to:
   - **Site URL**: `https://your-app-name.onrender.com`
   - **Redirect URLs**: `https://your-app-name.onrender.com/auth`

### 5. Test Your Deployment
- Visit your Render URL
- Test authentication flow
- Verify chat functionality works
- Check chat history saving/loading

## Alternative: Using render.yaml (Recommended)
The `render.yaml` file is already created. Simply:
1. Push to GitHub
2. In Render, select "Deploy from render.yaml"
3. Connect your repository
4. Deployment will use the configuration automatically

## Important Notes
- **Free Tier**: Render free tier spins down after 15 minutes of inactivity
- **Custom Domain**: You can add a custom domain in Render settings
- **SSL**: HTTPS is automatically provided
- **Logs**: Check deployment logs in Render dashboard for troubleshooting

## Troubleshooting
- If deployment fails, check the build logs
- Ensure all dependencies are in `requirements.txt`
- Verify environment variables are set correctly
- Check Supabase URL configuration matches your deployment URL