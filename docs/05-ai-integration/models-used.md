# Models Used

> AI models used in Baby Bloom Sydney and their configurations.

## Overview

_Catalog of AI models, their use cases, and configurations._

---

## Primary Model: Claude

### Model Selection

| Use Case | Model | Rationale |
|----------|-------|-----------|
| Profile generation | Claude 3.5 Sonnet | Good balance of quality/cost |
| Document verification | Claude 3.5 Sonnet | Vision capabilities |
| Email generation | Claude 3.5 Sonnet | Professional writing |
| Complex analysis | Claude 3 Opus | Higher quality when needed |

### Model Versions

| Model | Version | Use |
|-------|---------|-----|
| Claude 3.5 Sonnet | claude-3-5-sonnet-20241022 | Primary model |
| Claude 3 Opus | claude-3-opus-20240229 | Complex tasks |
| Claude 3 Haiku | claude-3-haiku-20240307 | Simple/fast tasks |

---

## Model Configuration

### Default Settings

```typescript
const defaultConfig = {
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  temperature: 0.7,
};
```

### Per-Feature Settings

| Feature | Temperature | Max Tokens | Notes |
|---------|-------------|------------|-------|
| Profile bio | 0.7 | 500 | Creative, engaging |
| Document verification | 0.2 | 1000 | Accurate, consistent |
| Email drafts | 0.5 | 400 | Professional, varied |
| Data extraction | 0.1 | 500 | Precise, deterministic |

---

## API Configuration

### Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### Client Setup

```typescript
// lib/ai/client.ts
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODELS = {
  default: 'claude-3-5-sonnet-20241022',
  fast: 'claude-3-haiku-20240307',
  powerful: 'claude-3-opus-20240229',
} as const;
```

---

## Cost Estimates

### Pricing (as of 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3 Opus | $15.00 | $75.00 |
| Claude 3 Haiku | $0.25 | $1.25 |

### Estimated Monthly Costs

| Feature | Calls/Month | Avg Tokens | Est. Cost |
|---------|-------------|------------|-----------|
| Profile generation | 500 | 2000 | ~$15 |
| Document verification | 500 | 3000 | ~$25 |
| Email generation | 1000 | 1500 | ~$25 |
| **Total** | | | **~$65** |

_Note: Estimates based on expected usage. Actual costs may vary._

---

## Rate Limiting

### Anthropic API Limits

| Tier | Requests/min | Tokens/min |
|------|--------------|------------|
| Tier 1 | 60 | 40,000 |
| Tier 2 | 1,000 | 80,000 |
| Tier 3 | 2,000 | 160,000 |

### Application Rate Limiting

```typescript
// Per-user limits
const USER_LIMITS = {
  profileGeneration: { max: 5, window: '1h' },
  verification: { max: 3, window: '1h' },
  emailGeneration: { max: 10, window: '1h' },
};
```

---

## Error Handling

### Retry Strategy

```typescript
const retryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

async function callWithRetry(fn: () => Promise<any>) {
  let lastError;
  for (let i = 0; i < retryConfig.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error.status === 429) {
        // Rate limited - wait and retry
        await sleep(retryConfig.initialDelayMs * Math.pow(2, i));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}
```

### Error Types

| Error | Handling |
|-------|----------|
| 429 Rate Limited | Retry with backoff |
| 500 Server Error | Retry up to 3 times |
| 400 Bad Request | Log and return error |
| Network Error | Retry with backoff |

---

## Monitoring

### Metrics to Track

| Metric | Description |
|--------|-------------|
| `ai_request_count` | Total API calls |
| `ai_request_latency` | Response time |
| `ai_request_errors` | Failed requests |
| `ai_tokens_used` | Token consumption |
| `ai_cost_estimate` | Estimated cost |

### Logging

```typescript
// Log every AI call
logger.info('AI Request', {
  feature: 'profile_generation',
  model: 'claude-3-5-sonnet',
  input_tokens: 150,
  output_tokens: 450,
  latency_ms: 1200,
  user_id: 'xxx',
});
```

---

## Future Considerations

### Potential Additions

| Model/Service | Use Case |
|---------------|----------|
| OpenAI GPT-4 | Fallback option |
| Embedding models | Semantic search |
| Fine-tuned model | Domain-specific tasks |

### Evaluation Criteria

- Quality of output
- Latency
- Cost
- Reliability
- Privacy/compliance

---

**Last Updated:** _YYYY-MM-DD_
**Status:** 🔴 Not Started
