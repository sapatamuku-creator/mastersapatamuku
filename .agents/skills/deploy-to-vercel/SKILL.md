---
name: deploy-to-vercel
description: Deployment configuration, build optimization, and environment setup for Vercel. Use when configuring vercel.json, edge functions, rewrites, headers, serverless deployment, or troubleshooting Vercel preview/production deployments.
---

# Deploy to Vercel

Deployment configuration, preview environments, and production optimizations for Vercel.

## When to Use

- Configuring `vercel.json` for routing, headers, rewrites, and redirects
- Setting up static site and edge function deployments
- Managing environment variables and build environments
- Troubleshooting deployment failures, routing loops, or 404/500 errors on Vercel
- Optimizing caching and headers for CDN delivery

## Best Practices

### 1. Configuration Structure (`vercel.json`)
- Use clean `routes` or `rewrites` without conflicting wildcards.
- Ensure security and cache headers are defined:
  ```json
  {
    "cleanUrls": true,
    "trailingSlash": false,
    "headers": [
      {
        "source": "/assets/(.*)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      }
    ]
  }
  ```

### 2. Environment Variables
- Keep secret keys in Vercel Project Settings, never in repository.
- Use distinct environments: Production, Preview, Development.

### 3. Static Site Routing
- Single Page Applications / Multi-page static routing:
  Ensure subpaths route properly without breaking direct asset access.

## Verification Checklist

- [ ] `vercel.json` is valid JSON
- [ ] No circular rewrite loops
- [ ] Assets load with proper cache headers
- [ ] Subdomains and custom domains resolve correctly
