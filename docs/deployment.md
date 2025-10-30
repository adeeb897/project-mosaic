# Project Mosaic - Deployment Guide

> **Deploy anywhere: Cloud, Local, or Hybrid**

## Overview

Project Mosaic supports flexible deployment options to suit different needs:

- **☁️ Cloud Deployment**: Fully managed, scalable, production-ready
- **💻 Local Deployment**: Self-hosted on your machine or private server
- **🔀 Hybrid Deployment**: Mix cloud and local components

All configurations are controlled via environment variables and configuration files, making it easy to switch between deployment modes.

---

## Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/your-org/project-mosaic.git
cd project-mosaic

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Start development servers
npm run dev

# Access dashboard
open http://localhost:3000
```

### Docker Compose (Recommended for Local)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Deployment Modes

### Mode 1: Full Cloud (Production)

**Best for**: Production deployments, scaling to many users, minimal infrastructure management

**Components**:
- Backend: Cloud platform (Vercel, Railway, Render)
- Database: Managed PostgreSQL (Supabase, Neon, AWS RDS)
- Redis: Managed Redis (Upstash, Redis Cloud)
- Sandboxes: E2B Cloud
- Observability: LangSmith

**Environment Configuration**:

```bash
# .env.production

# Core
NODE_ENV=production
PORT=3000

# LLM Provider
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...

# Sandbox (Cloud)
SANDBOX_PROVIDER=e2b
E2B_API_KEY=e2b_...

# Database (Managed)
DATABASE_URL=postgresql://user:pass@db.example.com:5432/mosaic

# Redis (Managed)
REDIS_URL=redis://default:pass@redis.example.com:6379

# Observability
LANGSMITH_API_KEY=lsv2_pt_...
LANGSMITH_PROJECT=mosaic-prod
LANGSMITH_TRACING=true

# Frontend
NEXT_PUBLIC_API_URL=https://api.mosaic.your-domain.com
NEXT_PUBLIC_WS_URL=wss://api.mosaic.your-domain.com
```

**Deployment Steps**:

1. **Deploy Backend**:
   ```bash
   # Railway
   railway up

   # Or Vercel (if using serverless)
   vercel deploy --prod

   # Or Render
   render deploy
   ```

2. **Deploy Frontend**:
   ```bash
   cd frontend
   npm run build
   vercel deploy --prod
   ```

3. **Set up Database**:
   ```bash
   # Run migrations
   npm run db:migrate

   # Seed initial data (optional)
   npm run db:seed
   ```

---

### Mode 2: Full Local (Development/Self-Hosted)

**Best for**: Development, testing, cost-conscious deployments, air-gapped environments

**Components**:
- Backend: Local Node.js process
- Database: Docker PostgreSQL
- Redis: Docker Redis
- Sandboxes: Docker containers
- Observability: Local logs (optional LangSmith)

**Environment Configuration**:

```bash
# .env.development

# Core
NODE_ENV=development
PORT=3000

# LLM Provider (use local model)
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Or use OpenAI for better results
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-proj-...

# Sandbox (Local Docker)
SANDBOX_PROVIDER=docker
DOCKER_HOST=unix:///var/run/docker.sock

# Database (Local)
DATABASE_URL=postgresql://mosaic:mosaic@localhost:5432/mosaic

# Redis (Local)
REDIS_URL=redis://localhost:6379

# Observability (Optional)
# LANGSMITH_API_KEY=lsv2_pt_...
# LANGSMITH_PROJECT=mosaic-dev
```

**Docker Compose Setup**:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: mosaic
      POSTGRES_USER: mosaic
      POSTGRES_PASSWORD: mosaic
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://mosaic:mosaic@postgres:5432/mosaic
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /var/run/docker.sock:/var/run/docker.sock  # For Docker sandbox
    command: npm run dev

  frontend:
    build: ./frontend
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
      - NEXT_PUBLIC_WS_URL=ws://localhost:3000
    volumes:
      - ./frontend:/app
    command: npm run dev

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    command: serve

volumes:
  postgres_data:
  redis_data:
  ollama_data:
```

**Deployment Steps**:

```bash
# Start all services
docker-compose up -d

# Wait for services to be ready
sleep 10

# Run database migrations
docker-compose exec backend npm run db:migrate

# Pull Ollama model (if using local LLM)
docker-compose exec ollama ollama pull llama3.2

# View logs
docker-compose logs -f

# Access dashboard
open http://localhost:3001
```

---

### Mode 3: Hybrid (Flexible)

**Best for**: Balancing cost and convenience, sensitive data requirements

Mix and match components based on your needs:

**Example: Cloud Backend + Local Sandboxes**
- Good for: Keeping agent execution on-premise while using cloud services
- Backend, DB, Redis: Cloud
- Sandboxes: Local Docker
- LLM: Your choice

**Example: Local Backend + Cloud LLM**
- Good for: Development with production-quality AI
- Backend, DB, Redis, Sandboxes: Local
- LLM: OpenAI/Anthropic

**Environment Configuration**:

```bash
# Hybrid example: Cloud services + Local sandboxes

NODE_ENV=production
PORT=3000

# Cloud LLM
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Local sandboxes (privacy/cost)
SANDBOX_PROVIDER=docker
DOCKER_HOST=unix:///var/run/docker.sock

# Cloud database
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/mosaic

# Cloud Redis
REDIS_URL=redis://default:pass@redis.upstash.io:6379

# Cloud observability
LANGSMITH_API_KEY=lsv2_pt_...
LANGSMITH_PROJECT=mosaic-hybrid
```

---

## Platform-Specific Guides

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Add Redis
railway add --plugin redis

# Deploy
railway up

# Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set E2B_API_KEY=e2b_...

# View logs
railway logs
```

### Deploy to Vercel (Serverless)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy backend (as serverless functions)
cd backend
vercel --prod

# Deploy frontend
cd ../frontend
vercel --prod

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add DATABASE_URL
```

**Note**: Serverless requires adjustments for long-running agents. Consider using background jobs (Inngest, Trigger.dev) or containerized deployment.

### Deploy to AWS

**ECS/Fargate**:

```bash
# Build and push Docker image
docker build -t mosaic-backend ./backend
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag mosaic-backend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/mosaic-backend:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/mosaic-backend:latest

# Create ECS task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create/update service
aws ecs update-service --cluster mosaic --service mosaic-backend --task-definition mosaic-backend
```

**Example task-definition.json**:

```json
{
  "family": "mosaic-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/mosaic-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:mosaic/db-url"
        }
      ]
    }
  ]
}
```

### Deploy to Google Cloud Run

```bash
# Build and submit
gcloud builds submit --tag gcr.io/PROJECT_ID/mosaic-backend

# Deploy
gcloud run deploy mosaic-backend \
  --image gcr.io/PROJECT_ID/mosaic-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "OPENAI_API_KEY=openai-key:latest" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300s
```

### Deploy to DigitalOcean App Platform

```bash
# Create app via doctl
doctl apps create --spec .do/app.yaml

# Or use web console and link GitHub repo
```

**Example .do/app.yaml**:

```yaml
name: mosaic
region: nyc

services:
  - name: backend
    github:
      repo: your-org/project-mosaic
      branch: main
      deploy_on_push: true
    build_command: cd backend && npm install && npm run build
    run_command: cd backend && npm start
    environment_slug: node-js
    envs:
      - key: NODE_ENV
        value: production
      - key: OPENAI_API_KEY
        value: ${OPENAI_API_KEY}
        type: SECRET

databases:
  - name: mosaic-db
    engine: PG
    version: "16"

  - name: mosaic-redis
    engine: REDIS
    version: "7"
```

---

## Database Setup

### Run Migrations

```bash
# Development
npm run db:migrate

# Production
NODE_ENV=production npm run db:migrate
```

### Manual Setup

```sql
-- Create database
CREATE DATABASE mosaic;

-- Run schema
\i migrations/001-initial-schema.sql
\i migrations/002-add-agents.sql
-- ... etc
```

### Backup & Restore

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## Scaling

### Horizontal Scaling (Multiple Instances)

Project Mosaic is designed to scale horizontally:

```bash
# Run multiple backend instances
pm2 start npm --name "mosaic-1" -- start
pm2 start npm --name "mosaic-2" -- start
pm2 start npm --name "mosaic-3" -- start

# Use load balancer (nginx, HAProxy, AWS ALB)
```

**Requirements**:
- Redis for cross-instance event bus
- Sticky sessions for WebSocket connections
- Shared database

**Example nginx config**:

```nginx
upstream mosaic_backend {
    ip_hash;  # Sticky sessions for WebSocket
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name mosaic.example.com;

    location / {
        proxy_pass http://mosaic_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Vertical Scaling (More Resources)

Increase resources per instance:

```bash
# Docker
docker run -m 4g --cpus 2 mosaic-backend

# Kubernetes
resources:
  requests:
    memory: "4Gi"
    cpu: "2000m"
  limits:
    memory: "8Gi"
    cpu: "4000m"
```

### Agent Scaling

Distribute agents across instances:

```typescript
// Use Redis-based agent registry
const agentRegistry = new RedisAgentRegistry(redis);

// Agents automatically distributed
await agentRegistry.register(agent);
```

---

## Monitoring & Health Checks

### Health Endpoint

```bash
# Check backend health
curl http://localhost:3000/health

# Response
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "sandbox": "available"
  },
  "agents": {
    "active": 5,
    "total": 10
  }
}
```

### Logs

```bash
# View logs (Docker Compose)
docker-compose logs -f backend

# View logs (PM2)
pm2 logs mosaic

# View logs (Railway)
railway logs

# View logs (Kubernetes)
kubectl logs -f deployment/mosaic-backend
```

### Metrics

Integrate with your monitoring solution:

```typescript
// Prometheus metrics
import { register, Counter, Gauge } from 'prom-client';

const agentCounter = new Counter({
  name: 'mosaic_agents_total',
  help: 'Total number of agents created'
});

const activeAgents = new Gauge({
  name: 'mosaic_agents_active',
  help: 'Number of currently active agents'
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Security Considerations

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS for all endpoints
- [ ] Set secure secrets (rotate regularly)
- [ ] Enable CORS with specific origins
- [ ] Implement rate limiting
- [ ] Set up firewall rules
- [ ] Enable database SSL
- [ ] Use secrets manager (AWS Secrets, Vault)
- [ ] Implement authentication (JWT, OAuth)
- [ ] Regular security updates
- [ ] Enable observability/audit logs

### Environment Variables Security

```bash
# Never commit secrets to git
echo ".env*" >> .gitignore

# Use secrets manager
# AWS
aws secretsmanager create-secret --name mosaic/openai-key --secret-string "sk-..."

# GCP
echo -n "sk-..." | gcloud secrets create openai-key --data-file=-

# Railway
railway variables set OPENAI_API_KEY=sk-...

# Vercel
vercel env add OPENAI_API_KEY production
```

---

## Troubleshooting

### Common Issues

**Database connection failed**:
```bash
# Check connection
psql $DATABASE_URL

# Verify DATABASE_URL format
postgresql://user:password@host:port/database
```

**Redis connection failed**:
```bash
# Check Redis
redis-cli -u $REDIS_URL ping

# Should return: PONG
```

**Sandbox creation timeout**:
```bash
# Check Docker (if using Docker sandbox)
docker ps

# Check E2B status (if using E2B)
curl https://api.e2b.dev/health
```

**Out of memory**:
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Or in package.json
"start": "NODE_OPTIONS='--max-old-space-size=4096' node dist/index.js"
```

---

## Cost Estimation

### Cloud Deployment (Small Scale)

| Component | Provider | Cost/Month |
|-----------|----------|------------|
| Backend Hosting | Railway | $5-20 |
| Database | Supabase Free | $0 |
| Redis | Upstash Free | $0 |
| Sandboxes (E2B) | E2B | $10-50 |
| LLM (OpenAI) | OpenAI | $20-100 |
| Observability | LangSmith | $0-50 |
| **Total** | | **$35-220** |

### Local Deployment

| Component | Cost |
|-----------|------|
| Everything | **$0** |
| LLM (OpenAI) | $20-100 (optional) |

### Enterprise Scale (1000+ agents)

Contact for custom pricing and architecture consultation.

---

## Backup & Disaster Recovery

### Automated Backups

```bash
# Cron job for daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/mosaic-$(date +\%Y\%m\%d).sql.gz
```

### Disaster Recovery Plan

1. **Database**: Restore from latest backup
2. **Redis**: Rebuild from database (ephemeral data)
3. **Agent state**: Restore from event store
4. **Files**: Restore from filesystem backup

---

## Support

- **Documentation**: [https://mosaic.dev/docs](https://mosaic.dev/docs)
- **Community Discord**: [https://discord.gg/mosaic](https://discord.gg/mosaic)
- **GitHub Issues**: [https://github.com/mosaic/mosaic/issues](https://github.com/mosaic/mosaic/issues)

---

## Next Steps

- Set up development environment: `npm run dev`
- Deploy to production: Choose your platform above
- Configure custom deployment: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- Extend with plugins: See [EXTENSIBILITY.md](./EXTENSIBILITY.md)
