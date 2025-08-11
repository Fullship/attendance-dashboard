# QUICK COOLIFY DEPLOYMENT CHECKLIST

## 🚀 IMMEDIATE ACTION PLAN

Since local Docker has I/O issues, deploy directly to Coolify:

### ✅ Step 1: Use Existing Dockerfile
- Your current `Dockerfile` is already optimized
- No need for the `Dockerfile.optimized` that's having issues
- It has HTTP configuration for your domain

### ✅ Step 2: Push to GitHub
```bash
# Make sure your latest changes are committed and pushed
git add .
git commit -m "Ready for Coolify deployment"
git push origin main
```

### ✅ Step 3: Coolify Setup

#### Services Needed:
1. **PostgreSQL Database**
2. **Redis Cache**  
3. **Main Application**

#### Application Configuration:
```
Name: attendance-dashboard
Repository: Fullship/attendance-dashboard
Branch: main
Build Method: Dockerfile
Dockerfile: Dockerfile (default)
Domain: my.fullship.net
Port: 3002
SSL/TLS: ❌ DISABLED
```

#### Environment Variables:
```env
NODE_ENV=production
PORT=3002
SERVE_STATIC=true
ENABLE_CLUSTERING=false
REACT_APP_API_URL=http://my.fullship.net/api

# Replace <service-names> with actual Coolify service names
DB_HOST=<postgres-service-name>
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19

REDIS_HOST=<redis-service-name>
REDIS_PORT=6379

# Generate these with: openssl rand -base64 32
JWT_SECRET=YOUR_STRONG_JWT_SECRET_HERE
SESSION_SECRET=YOUR_STRONG_SESSION_SECRET_HERE
```

### ✅ Step 4: Test After Deployment
1. `http://my.fullship.net/` → React app
2. `http://my.fullship.net/health` → JSON health status  
3. `http://my.fullship.net/api/auth/login` → API response

### ✅ Step 5: Database Setup
Connect to PostgreSQL in Coolify and run:
```sql
ALTER TABLE users RENAME COLUMN password TO password_hash;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_admin) 
VALUES ('admin', 'admin@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Admin', 'User', TRUE) 
ON CONFLICT (email) DO NOTHING;
```

### ✅ Step 6: Login Test
Try logging in with:
- Email: `admin@company.com`
- Password: `admin123`

## 📁 FILES READY FOR DEPLOYMENT

All the necessary files are created and ready:
- ✅ `Dockerfile` (existing, working)
- ✅ `DEPLOYMENT_GUIDE.md` (detailed instructions)
- ✅ `MANUAL_TEST_PLAN.md` (testing procedures)
- ✅ `.env.production.template` (environment variables)
- ✅ `init-database.sql` (updated schema)

## 🎯 SUCCESS CRITERIA

After deployment, you should have:
- ✅ Frontend at `http://my.fullship.net/`
- ✅ API at `http://my.fullship.net/api/*`
- ✅ Admin API at `http://my.fullship.net/api/admin/*` 
- ✅ Working login with admin credentials
- ✅ Database connectivity
- ✅ Redis caching

**The Docker I/O issue is bypassed by using Coolify's build system directly.**
