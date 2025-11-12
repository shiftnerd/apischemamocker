// ============================================================================
// OpenAPI to Cloudflare Worker Mock Generator
// ============================================================================

// State
let generatedWorkerCode = '';
let generatedWranglerConfig = '';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely escape strings for embedding in JavaScript template literals
 */
function escapeForTemplateLiteral(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')
        .replace(/\r\n/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

/**
 * Safely escape strings for embedding in RegExp patterns
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert OpenAPI path to regex pattern
 * /users/{id} -> /users/([^/]+)
 */
function pathToRegex(path) {
    const escaped = path.replace(/{[^}]+}/g, (match) => '([^/]+)');
    return '^' + escapeRegex(escaped) + '$';
}

/**
 * Generate typed stub from schema
 */
function generateTypedStub(schema) {
    if (!schema) return null;
    
    switch (schema.type) {
        case 'object':
            const obj = {};
            if (schema.properties) {
                for (const [key, prop] of Object.entries(schema.properties)) {
                    obj[key] = generateTypedStub(prop);
                }
            }
            return obj;
            
        case 'array':
            return schema.items ? [generateTypedStub(schema.items)] : [];
            
        case 'string':
            if (schema.enum && schema.enum.length > 0) return schema.enum[0];
            if (schema.format === 'email') return 'user@example.com';
            if (schema.format === 'date') return '2025-01-01';
            if (schema.format === 'date-time') return '2025-01-01T00:00:00Z';
            if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
            return schema.default !== undefined ? schema.default : 'string';
            
        case 'number':
        case 'integer':
            return schema.default !== undefined ? schema.default : 0;
            
        case 'boolean':
            return schema.default !== undefined ? schema.default : false;
            
        default:
            return null;
    }
}

/**
 * Generate JSF (JSON Schema Faker) mock data
 */
function generateJSFMock(schema) {
    if (!schema) return null;
    
    const generateValue = (s) => {
        switch (s.type) {
            case 'object':
                const obj = {};
                if (s.properties) {
                    for (const [key, prop] of Object.entries(s.properties)) {
                        obj[key] = generateValue(prop);
                    }
                }
                return obj;
                
            case 'array':
                const count = s.minItems || 2;
                return Array.from({ length: count }, () => 
                    s.items ? generateValue(s.items) : 'item'
                );
                
            case 'string':
                if (s.enum && s.enum.length > 0) {
                    return s.enum[Math.floor(Math.random() * s.enum.length)];
                }
                if (s.format === 'email') return `user${Math.floor(Math.random() * 1000)}@example.com`;
                if (s.format === 'date') return '2025-01-15';
                if (s.format === 'date-time') return '2025-01-15T14:30:00Z';
                if (s.format === 'uuid') return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${randomHex(4)}-${randomHex(12)}`;
                if (s.format === 'uri') return 'https://example.com';
                return s.default !== undefined ? s.default : randomString(10);
                
            case 'number':
                const numMin = s.minimum || 0;
                const numMax = s.maximum || 1000;
                return Math.random() * (numMax - numMin) + numMin;
                
            case 'integer':
                const intMin = s.minimum || 0;
                const intMax = s.maximum || 1000;
                return Math.floor(Math.random() * (intMax - intMin + 1)) + intMin;
                
            case 'boolean':
                return Math.random() > 0.5;
                
            default:
                return null;
        }
    };
    
    return generateValue(schema);
}

function randomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randomHex(length) {
    const chars = '0123456789abcdef';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ============================================================================
// OpenAPI Parser
// ============================================================================

function parseOpenAPISchema(schemaText, fallbackMode) {
    let schema;
    try {
        schema = JSON.parse(schemaText);
    } catch (e) {
        throw new Error('Invalid JSON: ' + e.message);
    }
    
    if (!schema.openapi || !schema.openapi.startsWith('3.')) {
        throw new Error('Only OpenAPI 3.x is supported');
    }
    
    const routes = [];
    const paths = schema.paths || {};
    
    for (const [path, pathItem] of Object.entries(paths)) {
        const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
        
        for (const method of methods) {
            if (!pathItem[method]) continue;
            
            const operation = pathItem[method];
            const responses = operation.responses || {};
            
            // Find first successful response (2xx)
            let statusCode = '200';
            let responseObj = null;
            
            for (const [code, resp] of Object.entries(responses)) {
                if (code.startsWith('2')) {
                    statusCode = code;
                    responseObj = resp;
                    break;
                }
            }
            
            if (!responseObj) {
                // No 2xx response, use first available
                const firstCode = Object.keys(responses)[0];
                if (firstCode) {
                    statusCode = firstCode;
                    responseObj = responses[firstCode];
                }
            }
            
            let example = null;
            let contentType = 'application/json';
            let schema = null;
            
            if (responseObj && responseObj.content) {
                // Try to get application/json first, or first available
                const content = responseObj.content['application/json'] || 
                              Object.values(responseObj.content)[0];
                
                if (content) {
                    contentType = responseObj.content['application/json'] ? 
                                'application/json' : 
                                Object.keys(responseObj.content)[0];
                    
                    // Priority: named examples > inline example > schema example
                    if (content.examples) {
                        const exampleNames = Object.keys(content.examples);
                        if (exampleNames.length > 0) {
                            const firstExample = content.examples[exampleNames[0]];
                            example = firstExample.value || firstExample;
                        }
                    } else if (content.example !== undefined) {
                        example = content.example;
                    } else if (content.schema && content.schema.example !== undefined) {
                        example = content.schema.example;
                    }
                    
                    schema = content.schema;
                }
            }
            
            // Generate fallback if no example
            if (example === null) {
                if (fallbackMode === 'typed' && schema) {
                    example = generateTypedStub(schema);
                } else if (fallbackMode === 'jsf' && schema) {
                    example = generateJSFMock(schema);
                } else {
                    // Basic stub
                    example = {
                        ok: true,
                        mocked: true,
                        path: path
                    };
                }
            }
            
            routes.push({
                method: method.toUpperCase(),
                path: path,
                regex: pathToRegex(path),
                status: statusCode,
                example: example,
                contentType: contentType,
                summary: operation.summary || ''
            });
        }
    }
    
    return {
        info: schema.info || {},
        routes: routes
    };
}

// ============================================================================
// Worker Code Generator
// ============================================================================

function generateWorkerCode(parsedSchema) {
    const { routes } = parsedSchema;
    
    // Build routes array with safe escaping
    const routesCode = routes.map(route => {
        const exampleJson = JSON.stringify(route.example, null, 2);
        const escapedExample = escapeForTemplateLiteral(exampleJson);
        
        return `  {
    method: "${route.method}",
    path: "${escapeForTemplateLiteral(route.path)}",
    re: new RegExp("${escapeForTemplateLiteral(route.regex)}"),
    status: ${route.status},
    contentType: "${route.contentType}",
    example: \`${escapedExample}\`
  }`;
    }).join(',\n');
    
    return `// Cloudflare Worker Mock API
// Generated from OpenAPI schema
// This worker provides mock responses based on your API specification

const ROUTES = [
${routesCode}
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname;
    
    // CORS headers (adjust as needed)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Find matching route
    for (const route of ROUTES) {
      if (route.method === method && route.re.test(pathname)) {
        // Parse example back to object/array
        let responseBody;
        try {
          responseBody = JSON.parse(route.example);
        } catch (e) {
          responseBody = route.example;
        }
        
        return new Response(
          JSON.stringify(responseBody, null, 2),
          {
            status: parseInt(route.status, 10) || 200,
            headers: {
              'content-type': route.contentType,
              ...corsHeaders
            }
          }
        );
      }
    }
    
    // No route matched
    return new Response(
      JSON.stringify({ error: 'Not Found', path: pathname }),
      {
        status: 404,
        headers: {
          'content-type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
};`;
}

// ============================================================================
// Wrangler Config Generator
// ============================================================================

function generateWranglerConfig(parsedSchema) {
    const { info } = parsedSchema;
    const name = (info.title || 'my-mock-api')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    return `name = "${name}"
main = "worker.js"
compatibility_date = "2025-01-15"

# Deployment configuration
# Run: npx wrangler deploy

# For local development:
# Run: npx wrangler dev

[vars]
# Add environment variables here
# API_KEY = "your-key-here"
`;
}

// ============================================================================
// UI Functions
// ============================================================================

function displayOperations(routes) {
    const container = document.getElementById('operationsList');
    
    if (routes.length === 0) {
        container.innerHTML = '<p class="placeholder">No operations found in schema</p>';
        return;
    }
    
    container.innerHTML = routes.map(route => `
        <div class="operation-item">
            <div class="operation-header">
                <span class="method-badge method-${route.method.toLowerCase()}">${route.method}</span>
                <span class="operation-path">${route.path}</span>
            </div>
            <div class="operation-meta">
                ${route.summary ? `<span>${route.summary}</span>` : ''}
                <span class="status-badge">${route.status}</span>
                <span>${route.contentType}</span>
            </div>
        </div>
    `).join('');
}

function updateCodeDisplay(elementId, code) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<code>${escapeHTML(code)}</code>`;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    console.log('Success:', message);
}

// ============================================================================
// Event Handlers
// ============================================================================

function handleGenerate() {
    const schemaText = document.getElementById('schemaInput').value.trim();
    const fallbackMode = document.getElementById('fallbackMode').value;
    
    if (!schemaText) {
        showError('Please paste an OpenAPI schema');
        return;
    }
    
    try {
        const parsed = parseOpenAPISchema(schemaText, fallbackMode);
        
        generatedWorkerCode = generateWorkerCode(parsed);
        generatedWranglerConfig = generateWranglerConfig(parsed);
        
        updateCodeDisplay('workerCode', generatedWorkerCode);
        updateCodeDisplay('wranglerConfig', generatedWranglerConfig);
        
        displayOperations(parsed.routes);
        
        showSuccess('Worker generated successfully!');
    } catch (error) {
        showError(error.message);
    }
}

function handleCopy(elementId) {
    const element = document.getElementById(elementId);
    const code = element.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        const button = document.querySelector(`[data-copy="${elementId}"]`);
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        showError('Failed to copy: ' + err.message);
    });
}

function handleDownload(filename) {
    let content;
    
    if (filename === 'worker.js') {
        content = generatedWorkerCode;
    } else if (filename === 'wrangler.toml') {
        content = generatedWranglerConfig;
    }
    
    if (!content) {
        showError('Please generate the worker first');
        return;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Generate button
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);
    
    // Copy buttons
    document.querySelectorAll('[data-copy]').forEach(button => {
        button.addEventListener('click', (e) => {
            const elementId = e.target.getAttribute('data-copy');
            handleCopy(elementId);
        });
    });
    
    // Download buttons
    document.querySelectorAll('[data-download]').forEach(button => {
        button.addEventListener('click', (e) => {
            const filename = e.target.getAttribute('data-download');
            handleDownload(filename);
        });
    });
});
