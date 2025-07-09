# AI Features Setup Guide

## Environment Variables

The AI features require the following environment variables to be configured:

### Required Variables

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here
```

### Optional Variables (with defaults)

```bash
# Deployment Type: "self-hosted" or "saas"
DEPLOYMENT_TYPE=self-hosted

# AI Model Configuration
AI_MODEL=gpt-4o-mini

# AI Limits (only used when DEPLOYMENT_TYPE=saas)
AI_MAX_CONTEXT_WINDOW=4000
AI_MAX_GENERATIONS_PER_MONTH=50
```

## Configuration by Deployment Type

### Self-Hosted Deployment

For self-hosted deployments, AI features are **free and unlimited** when properly configured:

1. Set `DEPLOYMENT_TYPE=self-hosted`
2. Configure your `OPENAI_API_KEY`
3. Optionally customize `AI_MODEL` and `AI_MAX_CONTEXT_WINDOW`

### SaaS Deployment

For SaaS deployments, AI features are **subscription-based**:

1. Set `DEPLOYMENT_TYPE=saas`
2. Configure your `OPENAI_API_KEY`
3. Set up subscription management with Polar.sh
4. Configure monthly limits with `AI_MAX_GENERATIONS_PER_MONTH` and `AI_MAX_CONTEXT_WINDOW`

## Getting Started

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Configure AI Settings

Edit your `.env` file and set:

```bash
# For self-hosted (free)
OPENAI_API_KEY=sk-your-openai-api-key
DEPLOYMENT_TYPE=self-hosted

# For SaaS (subscription-based)
OPENAI_API_KEY=sk-your-openai-api-key
DEPLOYMENT_TYPE=saas
AI_MAX_GENERATIONS_PER_MONTH=100
```

### 3. Run Database Migrations

```bash
pnpm tsx src/database/migrate.ts
```

### 4. Start the Application

```bash
# Development
pnpm dev

# Docker (self-hosted)
docker compose up

# Docker (development)
docker compose -f docker-compose.dev.yaml up
```

## Feature Behavior

### When AI is Disabled

- **No OPENAI_API_KEY**: Button shows "OpenAI API key not configured" (self-hosted) or "AI features require a Pro subscription" (SaaS)
- **Button always visible**: Users can see the AI feature and understand what they're missing

### When AI is Enabled

- **Self-hosted**: Unlimited usage with configured API key
- **SaaS**: Usage tracked and limited by subscription plan

## Troubleshooting

### AI Button Shows "OpenAI API key not configured"

- Check that `OPENAI_API_KEY` is set in your `.env` file
- Verify the API key is valid and has sufficient credits
- Ensure the key starts with `sk-`

### AI Button Shows "AI features require a Pro subscription"

- This appears in SaaS mode when no active subscription is found
- Set up subscription management with Polar.sh
- Check database for active subscription record

### AI Generation Fails

- Check application logs for detailed error messages
- Verify OpenAI API key permissions and quota
- Ensure the AI model (`AI_MODEL`) is accessible with your API key 