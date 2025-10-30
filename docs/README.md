# Project Mosaic Documentation

Complete guides for building autonomous AI agents.

---

## 📚 Documentation

- **[Quick Start](quick-start.md)** - Get started in 5 minutes
- **[Architecture](../ARCHITECTURE.md)** - System design
- **[Extensibility](extensibility.md)** - Build plugins
- **[Deployment](deployment.md)** - Deploy anywhere
- **[Contributing](../CONTRIBUTING.md)** - Join the project

---

## 🎯 Example Use Cases

**Content Creation:**
```typescript
createAgent({
  name: "WriterAgent",
  goal: "Write a blog post about AI trends"
})
```

**Research:**
```typescript
createAgent({
  name: "ResearchAgent",
  goal: "Research top AI companies and compare them"
})
```

**File Organization:**
```typescript
createAgent({
  name: "OrganizerAgent",
  goal: "Organize downloads by type and date"
})
```

---

## 🔌 API Quick Reference

```http
# Create agent
POST /api/agents
{ "name": "MyAgent", "goal": "..." }

# Start agent
POST /api/agents/{id}/start

# Check progress
GET /api/agents/{id}

# Stop agent
POST /api/agents/{id}/stop
```

---

## 🐛 Quick Troubleshooting

**"OPENAI_API_KEY not found"**
```bash
# Add to .env
OPENAI_API_KEY=sk-proj-...
```

**"Redis failed"**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Agent stuck**
- Make goal more specific
- Increase maxSteps
- Check logs: `LOG_LEVEL=debug`

---

## 📖 Full Documentation

See individual guides for detailed information:
- [quick-start.md](quick-start.md)
- [extensibility.md](extensibility.md)
- [deployment.md](deployment.md)

---

**Need help?** Check [Quick Start](quick-start.md) or open an [issue](https://github.com/your-org/project-mosaic/issues).
