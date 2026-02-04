import { SchemaDefinition, GeneratedSDK, SDKGeneratorConfig } from '../core';

export function generateGoSDK(
  schemas: SchemaDefinition[],
  config: SDKGeneratorConfig
): GeneratedSDK {
  const files = new Map<string, string>();

  const typesContent = generateGoTypesFile(schemas);
  files.set('types.go', typesContent);

  const clientContent = generateGoClientFile(config);
  files.set('client.go', clientContent);

  const validationContent = generateGoValidationFile(schemas);
  files.set('validation.go', validationContent);

  const readmeContent = generateReadme('Go', config);
  files.set('README.md', readmeContent);

  const packageConfig = {
    module: `github.com/${config.organization}/sdk-go`,
    goVersion: '1.21',
    version: config.sdkVersion,
    description: 'ControlPlane SDK for Go - generated from canonical contracts',
  };

  return {
    language: 'go',
    files,
    packageConfig,
  };
}

function generateGoTypesFile(schemas: SchemaDefinition[]): string {
  const lines: string[] = [];
  lines.push('// Auto-generated from ControlPlane contracts');
  lines.push('// DO NOT EDIT MANUALLY - regenerate from source');
  lines.push('');
  lines.push('package controlplane');
  lines.push('');
  lines.push('import (');
  lines.push('\t"time"');
  lines.push(')');
  lines.push('');

  const groupedSchemas = schemas.reduce(
    (acc, schema) => {
      if (!acc[schema.category]) acc[schema.category] = [];
      acc[schema.category].push(schema);
      return acc;
    },
    {} as Record<string, SchemaDefinition[]>
  );

  for (const [category, categorySchemas] of Object.entries(groupedSchemas)) {
    lines.push(`// ${category.toUpperCase()} schemas`);
    lines.push('');

    for (const schema of categorySchemas) {
      lines.push(...generateGoSchemaCode(schema));
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateGoSchemaCode(schema: SchemaDefinition): string[] {
  const lines: string[] = [];
  const jsonSchema = schema.jsonSchema;

  if (jsonSchema.enum) {
    // Generate enum type for Go
    lines.push(`type ${schema.name} string`);
    lines.push('');
    lines.push('const (');
    for (const value of jsonSchema.enum) {
      const constName = value.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      lines.push(`\t${schema.name}${constName} ${schema.name} = "${value}"`);
    }
    lines.push(')');
  } else if (jsonSchema.type === 'object' && jsonSchema.properties) {
    // Generate struct for objects
    lines.push(`type ${schema.name} struct {`);

    const required = jsonSchema.required || [];
    for (const [key, value] of Object.entries(jsonSchema.properties as Record<string, any>)) {
      const goType = jsonSchemaTypeToGo(value);
      const isRequired = required.includes(key);
      const jsonTag = isRequired ? `json:"${key}"` : `json:"${key},omitempty"`;

      lines.push(`\t${capitalizeFirst(key)} ${goType} \`${jsonTag}\``);
    }

    lines.push('}');
  } else if (jsonSchema.anyOf || jsonSchema.oneOf) {
    // Generate interface for union types (simplified)
    lines.push(`// ${schema.name} is a union type (simplified as interface{})`);
    lines.push(`type ${schema.name} interface{}`);
  } else {
    lines.push(`type ${schema.name} ${jsonSchemaTypeToGo(jsonSchema)}`);
  }

  return lines;
}

function jsonSchemaTypeToGo(schema: any): string {
  if (!schema) return 'interface{}';

  if (schema.$ref) {
    return schema.$ref.replace('#/definitions/', '');
  }

  if (schema.enum) {
    return 'string';
  }

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') return 'time.Time';
      if (schema.format === 'uuid') return 'string';
      if (schema.format === 'uri') return 'string';
      return 'string';
    case 'number':
      return 'float64';
    case 'integer':
      return 'int';
    case 'boolean':
      return 'bool';
    case 'array':
      if (schema.items) {
        return `[]${jsonSchemaTypeToGo(schema.items)}`;
      }
      return '[]interface{}';
    case 'object':
      if (schema.additionalProperties) {
        return `map[string]${jsonSchemaTypeToGo(schema.additionalProperties)}`;
      }
      return 'map[string]interface{}';
    default:
      return 'interface{}';
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateGoClientFile(config: SDKGeneratorConfig): string {
  return `// Auto-generated ControlPlane SDK Client
// DO NOT EDIT MANUALLY - regenerate from source

package controlplane

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ClientConfig holds configuration for the ControlPlane client
type ClientConfig struct {
	BaseURL    string
	APIKey     string
	Timeout    time.Duration
	HTTPClient *http.Client
}

// ControlPlaneClient is the main SDK client
type ControlPlaneClient struct {
	config          ClientConfig
	contractVersion ContractVersion
	client          *http.Client
}

// NewClient creates a new ControlPlane SDK client
func NewClient(config ClientConfig) *ControlPlaneClient {
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}
	if config.HTTPClient == nil {
		config.HTTPClient = &http.Client{Timeout: config.Timeout}
	}

	return &ControlPlaneClient{
		config: config,
		contractVersion: ContractVersion{
			Major: ${config.contractVersion.split('.')[0]},
			Minor: ${config.contractVersion.split('.')[1]},
			Patch: ${config.contractVersion.split('.')[2]},
		},
		client: config.HTTPClient,
	}
}

// GetContractVersion returns the contract version used by this client
func (c *ControlPlaneClient) GetContractVersion() ContractVersion {
	return c.contractVersion
}

func (c *ControlPlaneClient) serializeVersion(v ContractVersion) string {
	return fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
}

func (c *ControlPlaneClient) defaultHeaders() map[string]string {
	headers := map[string]string{
		"Content-Type":       "application/json",
		"X-Contract-Version": c.serializeVersion(c.contractVersion),
	}
	if c.config.APIKey != "" {
		headers["Authorization"] = fmt.Sprintf("Bearer %s", c.config.APIKey)
	}
	return headers
}

// Request makes an HTTP request to the ControlPlane API
func (c *ControlPlaneClient) Request(ctx context.Context, method, path string, body interface{}) (*http.Response, error) {
	var bodyReader *bytes.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBody)
	} else {
		bodyReader = bytes.NewReader([]byte{})
	}

	url := fmt.Sprintf("%s%s", c.config.BaseURL, path)
	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, err
	}

	for key, value := range c.defaultHeaders() {
		req.Header.Set(key, value)
	}

	return c.client.Do(req)
}
`;
}

function generateGoValidationFile(schemas: SchemaDefinition[]): string {
  return `// Auto-generated validation utilities
// DO NOT EDIT MANUALLY - regenerate from source

package controlplane

import (
	"encoding/json"
	"fmt"
)

// Validate checks if data can be unmarshaled into the target type
func Validate(data []byte, target interface{}) error {
	return json.Unmarshal(data, target)
}

// SafeValidate validates data and returns the error if validation fails
func SafeValidate(data []byte, target interface{}) error {
	if err := json.Unmarshal(data, target); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}
	return nil
}
`;
}

function generateReadme(language: string, config: SDKGeneratorConfig): string {
  return `# ControlPlane SDK for ${language}

Auto-generated SDK from ControlPlane contracts v${config.contractVersion}.

## Installation

\`\`\`bash
go get github.com/${config.organization}/sdk-go
\`\`\`

## Usage

\`\`\`go
package main

import (
    "context"
    "log"
    
    "github.com/${config.organization}/sdk-go"
)

func main() {
    client := controlplane.NewClient(controlplane.ClientConfig{
        BaseURL: "https://api.controlplane.io",
        APIKey:  "your-api-key",
    })

    ctx := context.Background()
    resp, err := client.Request(ctx, "GET", "/health", nil)
    if err != nil {
        log.Fatal(err)
    }
    defer resp.Body.Close()
}
\`\`\`

## Versioning

This SDK follows semantic versioning and tracks the ControlPlane contract version:
- SDK version: ${config.sdkVersion}
- Contract version: ${config.contractVersion}

## Regeneration

This SDK is auto-generated. Do not edit manually.
To regenerate, run: \`sdk-gen --language go\`
`;
}
