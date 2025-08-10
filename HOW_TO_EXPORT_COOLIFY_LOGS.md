# 📋 How to Export Coolify Application Logs

## 🎯 Export Full Application Logs from Coolify

### Method 1: Via Coolify Dashboard (Recommended)

1. **Go to your Coolify dashboard**
2. **Navigate to your attendance dashboard application**
3. **Click on "Logs" or "Show Logs"**
4. **Look for these options:**
   - **"Download Logs"** button
   - **"Export Logs"** option
   - **"Show Debug Logs"** (for more detailed output)

5. **Select time range:** Choose recent deployment/startup logs
6. **Download/Copy the logs**

### Method 2: Via Coolify Container Logs

1. **In your application page in Coolify:**
2. **Find "Container" or "Runtime Logs" section**
3. **Look for logs from the last 30 minutes**
4. **Copy all logs** (especially startup logs)

### Method 3: Via Terminal (if you have server access)

```bash
# Get container ID for your app
docker ps | grep attendance

# Get logs from the container
docker logs <container-id> --tail 200

# Or get all logs
docker logs <container-id> > app-logs.txt
```

## 🔍 What Logs to Look For

### **Critical Log Sections:**

1. **Application Startup:**
   ```
   Starting server...
   Environment: production
   Port: 3002
   ```

2. **Database Connection Attempts:**
   ```
   Connecting to database...
   DB_HOST: attendance-db
   DB_PORT: 5432
   DB_NAME: attendance_dashboard
   ```

3. **Error Messages:**
   ```
   Error: connect ECONNREFUSED
   FATAL: database does not exist
   Authentication failed
   ```

4. **Environment Variables (redacted):**
   ```
   Environment variables loaded:
   DB_HOST=attendance-db
   DB_PORT=5432
   JWT_SECRET=[REDACTED]
   ```

## 📤 How to Share Logs with Me

### **Option A: Copy & Paste**
- Copy the logs from Coolify
- Paste them in your next message
- **Important:** Remove/redact any passwords or sensitive data

### **Option B: Save to File**
- Save logs to a text file
- Attach the file to your message

### **Option C: Key Sections Only**
If logs are very long, share these specific sections:
1. **Application startup logs** (first 50 lines)
2. **Database connection attempts**
3. **Any error messages**
4. **Environment variable loading** (with passwords redacted)

## 🚨 Security Note

**Before sharing, please redact:**
- Database passwords (`DB_PASSWORD`)
- JWT secrets (`JWT_SECRET`) 
- Any other sensitive tokens

Replace them with `[REDACTED]` like:
```
DB_PASSWORD=[REDACTED]
JWT_SECRET=[REDACTED]
```

## 🎯 What I'll Look For

Once you share the logs, I'll check:
1. **Database connection string** - is it trying to connect to the right host?
2. **Environment variables** - are they being loaded correctly?
3. **PostgreSQL errors** - specific connection/auth failures
4. **Network issues** - can the app reach the database service?
5. **SSL/TLS errors** - certificate or SSL configuration issues

---
**The logs will show us exactly what's happening during startup and login attempts!**
