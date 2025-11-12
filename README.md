# OpenAPI → Cloudflare Worker Mock Generator

> Convert any OpenAPI 3.x schema into a fully functional Cloudflare Worker mock API in seconds — entirely in your browser.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenAPI 3.x](https://img.shields.io/badge/OpenAPI-3.x-green.svg)](https://www.openapis.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)

## 🚀 Features

- **🌐 100% Client-Side** - No server required, runs entirely in your browser
- **⚡ Instant Generation** - Paste schema, click generate, deploy
- **🎯 Smart Fallbacks** - Multiple mock data generation strategies
- **🔒 Safe Code Output** - Properly escaped, production-ready JavaScript
- **🎨 Dark Theme UI** - Beautiful, modern interface
- **📦 Zero Dependencies** - Pure HTML, CSS, and JavaScript
- **🔧 Extensible** - Modular codebase ready for customization

## 🎯 Use Cases

- **Frontend Development** - Mock backends before API implementation
- **Testing & QA** - Reliable, consistent test data
- **Demos & Prototypes** - Quick API mocking for presentations
- **CI/CD Pipelines** - Temporary mock endpoints for testing
- **API Documentation** - Interactive examples with real responses

## 🛠️ Quick Start

### Option 1: Use Online (Recommended)

Simply open `index.html` in your browser - no installation needed!

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/openapi-worker-generator.git
cd openapi-worker-generator

# Open in browser
open index.html  # macOS
# or
start index.html  # Windows
# or
xdg-open index.html  # Linux
```

## 📖 How It Works

1. **Paste Schema** - Add your OpenAPI 3.x JSON schema
2. **Select Fallback Mode** - Choose how to generate mock data
3. **Generate** - Click the button to create your worker
4. **Deploy** - Copy or download `worker.js` and `wrangler.toml`

### Deployment

```bash
# Install Wrangler (Cloudflare's CLI)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy your worker
wrangler deploy
```

## 🎨 Fallback Modes

The generator uses a smart example precedence system:

### Example Priority (Highest to Lowest)
1. **Named examples**: `responses[status].content[type].examples[name].value`
2. **Inline example**: `responses[status].content[type].example`
3. **Schema example**: `responses[status].content[type].schema.example`
4. **Selected fallback mode** (see below)

### Fallback Strategies

#### 1. Basic Stub (Default)
```json
{
  "ok": true,
  "mocked": true,
  "path": "/users"
}
```
Simple, reliable response when no schema is available.

#### 2. Schema-Typed Stub
```json
{
  "id": 0,
  "name": "string",
  "email": "user@example.com",
  "active": false
}
```
Generates typed mock data based on your schema definitions.

#### 3. JSON-Schema-Faker Pre-generation
```json
{
  "id": 847,
  "name": "xkpqwmfhzt",
  "email": "user529@example.com",
  "active": true
}
```
Creates realistic, randomized mock data with variety.

## 📋 Example OpenAPI Schema

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Users API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "List all users",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "example": [
                  { "id": 1, "name": "Alice" },
                  { "id": 2, "name": "Bob" }
                ]
              }
            }
          }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "summary": "Get user by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "integer" }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "integer" },
                    "name": { "type": "string" },
                    "email": { "type": "string", "format": "email" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## 🔧 Generated Worker Features

The generated Cloudflare Worker includes:

- ✅ **Regex-based routing** - Fast path matching with parameter support
- ✅ **CORS headers** - Pre-configured for cross-origin requests
- ✅ **OPTIONS handling** - Automatic preflight request support
- ✅ **Content negotiation** - Respects `Content-Type` from schema
- ✅ **Status codes** - Uses correct HTTP status from your spec
- ✅ **404 handling** - Graceful fallback for unmatched routes
- ✅ **No runtime dependencies** - Pure JavaScript, no external libs

## 🏗️ Architecture

```
openapi-worker-generator/
├── index.html          # Main UI structure
├── style.css           # Dark theme styling
├── app.js              # Core generator logic
│   ├── Utilities       # Escaping, regex, type generation
│   ├── Parser          # OpenAPI schema parsing
│   ├── Generator       # Worker code generation
│   └── UI              # Event handlers, display
└── README.md           # This file
```

## 🎯 Supported OpenAPI Features

| Feature | Supported | Notes |
|---------|-----------|-------|
| OpenAPI 3.0.x | ✅ | Full support |
| OpenAPI 3.1.x | ✅ | Full support |
| Path parameters | ✅ | `{id}` converted to regex |
| Query parameters | ⚠️ | Ignored (mocks don't validate) |
| Request bodies | ⚠️ | Ignored (mocks return examples) |
| Multiple responses | ✅ | Uses first 2xx or first available |
| Examples | ✅ | Named, inline, and schema examples |
| Content types | ✅ | Respects `Content-Type` header |
| Security | ⚠️ | Not validated (future feature) |
| Callbacks | ❌ | Not supported |
| Links | ❌ | Not supported |

## 🔮 Roadmap

Future enhancements planned:

- [ ] **Authentication mocking** - Basic/Bearer token validation
- [ ] **Delay simulation** - `x-mock-delay` extension support
- [ ] **Query param overrides** - `?__status=404&__example=error`
- [ ] **TypeScript output** - Optional TS worker generation
- [ ] **Multiple workers** - Split by tag/path prefix
- [ ] **Request logging** - Optional console/analytics integration
- [ ] **State simulation** - POST/PUT/DELETE state tracking
- [ ] **Webhook forwarding** - Proxy real requests to external URLs

## 🤝 Contributing

Contributions are welcome! The codebase is designed to be modular and extensible.


## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need for instant API mocking during frontend development
- Built for developers who need reliable mock APIs without complex setup
- Designed with Cloudflare Workers' simplicity and performance in mind

