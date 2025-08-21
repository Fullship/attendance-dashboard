# Cloud ISAPI Event Listener

A cloud-deployable service that receives events from Hikvision access control devices and forwards them to your local attendance dashboard.

## Features

- ✅ Receives ISAPI events from Hikvision devices
- ✅ Forwards events to local attendance dashboard
- ✅ Built-in authentication (optional)
- ✅ Health monitoring and statistics
- ✅ Cloud-ready with Docker support
- ✅ Railway.app deployment ready
- ✅ Real-time event processing

## Quick Deploy to Railway.app

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/click-to-deploy)

1. Click the Railway deploy button above
2. Set environment variables:
   - `LOCAL_SERVER_URL`: Your local server URL (e.g., `http://91.74.30.166:3002`)
   - `LOCAL_API_KEY`: Secure API key for authentication
3. Deploy and get your Railway URL
4. Configure your Hikvision device to send events to: `https://your-railway-app.railway.app/ISAPI/Event/notification`

## Manual Deployment

### Deploy to Railway.app

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Deploy:**
   ```bash
   cd cloud-isapi-listener
   railway init
   railway up
   ```

4. **Set environment variables:**
   ```bash
   railway variables set LOCAL_SERVER_URL=http://your-public-ip:3002
   railway variables set LOCAL_API_KEY=your-secure-api-key
   ```

### Deploy to Other Cloud Providers

#### Heroku
```bash
# Install Heroku CLI and login
heroku create your-isapi-listener
git add .
git commit -m "Initial commit"
git push heroku main
heroku config:set LOCAL_SERVER_URL=http://your-public-ip:3002
heroku config:set LOCAL_API_KEY=your-secure-api-key
```

#### DigitalOcean App Platform
1. Create new app from this repository
2. Set environment variables in the app settings
3. Deploy

#### Render.com
1. Connect your repository
2. Set environment variables
3. Deploy

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file with your settings**

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 8080 |
| `LOCAL_SERVER_URL` | Your local attendance dashboard URL | Yes | - |
| `LOCAL_API_KEY` | API key for authentication | Yes | - |
| `ENABLE_AUTH` | Enable Basic auth for device | No | false |
| `BASIC_AUTH_USERNAME` | Basic auth username | No | admin |
| `BASIC_AUTH_PASSWORD` | Basic auth password | No | admin123 |

### Hikvision Device Configuration

Configure your device's HTTP Listening settings:

```
Event Alarm IP Address: your-cloud-server-domain
URL: https://your-cloud-server/ISAPI/Event/notification
Port: 443 (or 80 for HTTP)
Protocol: HTTP
```

## API Endpoints

- `POST /ISAPI/Event/notification` - Main event receiver
- `GET /health` - Health check
- `GET /stats` - Event statistics
- `ALL /ISAPI/*` - Catch-all for other ISAPI requests

## Event Flow

1. **Hikvision Device** → Sends event → **Cloud ISAPI Listener**
2. **Cloud ISAPI Listener** → Forwards event → **Your Local Attendance Dashboard**
3. **Local Dashboard** → Processes and stores event → **Database**

## Monitoring

- **Health Check**: `GET /health`
- **Statistics**: `GET /stats`
- **Logs**: Check your cloud provider's log interface

## Security

- Optional Basic authentication for device connections
- HTTPS support (recommended for production)
- API key authentication for local server forwarding
- No sensitive data storage in cloud

## Troubleshooting

### Device Not Sending Events
1. Check device HTTP Listening configuration
2. Verify cloud server URL is accessible
3. Check device network connectivity
4. Review cloud server logs

### Events Not Reaching Local Server
1. Verify `LOCAL_SERVER_URL` is correct and accessible
2. Check `LOCAL_API_KEY` configuration
3. Ensure local server endpoint exists
4. Review firewall settings

### Performance Issues
1. Monitor `/stats` endpoint
2. Check cloud provider metrics
3. Scale cloud instance if needed
4. Review network latency

## Support

For issues related to:
- **Hikvision Device Configuration**: Check device documentation
- **Cloud Deployment**: Contact your cloud provider support
- **Local Integration**: Check your attendance dashboard logs