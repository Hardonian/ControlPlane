import { SchemaDefinition, GeneratedSDK, SDKGeneratorConfig } from '../core';

export function generatePythonSDK(
  schemas: SchemaDefinition[],
  config: SDKGeneratorConfig
): GeneratedSDK {
  const files = new Map<string, string>();

  const typesContent = generatePythonTypesFile(schemas);
  files.set('controlplane_sdk/types.py', typesContent);

  const clientContent = generatePythonClientFile(config);
  files.set('controlplane_sdk/client.py', clientContent);

  const initContent = generatePythonInitFile();
  files.set('controlplane_sdk/__init__.py', initContent);

  const modelsInitContent = generatePythonModelsInitFile(schemas);
  files.set('controlplane_sdk/models/__init__.py', modelsInitContent);

  const validationContent = generatePythonValidationFile(schemas);
  files.set('controlplane_sdk/validation.py', validationContent);

  const readmeContent = generateReadme('Python', config);
  files.set('README.md', readmeContent);

  const packageConfig = {
    name: 'controlplane-sdk',
    version: config.sdkVersion,
    description: 'ControlPlane SDK for Python - generated from canonical contracts',
    python_requires: '>=3.8',
    packages: ['controlplane_sdk', 'controlplane_sdk.models'],
    install_requires: ['pydantic>=2.0.0', 'httpx>=0.24.0', 'typing-extensions>=4.5.0'],
    extras_require: {
      dev: ['pytest>=7.0.0', 'mypy>=1.0.0', 'ruff>=0.1.0'],
    },
    classifiers: [
      'Development Status :: 4 - Beta',
      'Intended Audience :: Developers',
      'License :: OSI Approved :: Apache Software License',
      'Programming Language :: Python :: 3',
      'Programming Language :: Python :: 3.8',
      'Programming Language :: Python :: 3.9',
      'Programming Language :: Python :: 3.10',
      'Programming Language :: Python :: 3.11',
      'Programming Language :: Python :: 3.12',
    ],
    license: 'Apache-2.0',
  };

  return {
    language: 'python',
    files,
    packageConfig,
  };
}

function generatePythonTypesFile(schemas: SchemaDefinition[]): string {
  const lines: string[] = [];
  lines.push('# Auto-generated from ControlPlane contracts');
  lines.push('# DO NOT EDIT MANUALLY - regenerate from source');
  lines.push('');
  lines.push('from __future__ import annotations');
  lines.push('from datetime import datetime');
  lines.push('from typing import Any, Dict, List, Optional, Union, Literal');
  lines.push('from pydantic import BaseModel, Field');
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
    lines.push(`# ${category.toUpperCase()} schemas`);
    lines.push('');

    for (const schema of categorySchemas) {
      lines.push(...generatePythonSchemaCode(schema));
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generatePythonSchemaCode(schema: SchemaDefinition): string[] {
  const lines: string[] = [];
  const jsonSchema = schema.jsonSchema;

  if (jsonSchema.enum) {
    // Generate Literal type for enums
    const values = jsonSchema.enum.map((e: string) => `'${e}'`).join(', ');
    lines.push(`${schema.name} = Literal[${values}]`);
  } else if (jsonSchema.type === 'object' && jsonSchema.properties) {
    // Generate Pydantic model for objects
    lines.push(`class ${schema.name}(BaseModel):`);

    const required = jsonSchema.required || [];
    for (const [key, value] of Object.entries(jsonSchema.properties as Record<string, any>)) {
      const isRequired = required.includes(key);
      const pythonType = jsonSchemaTypeToPython(value, isRequired);

      if (value.description) {
        lines.push(`    ${key}: ${pythonType} = Field(description="${value.description}")`);
      } else {
        lines.push(`    ${key}: ${pythonType}`);
      }
    }
  } else if (jsonSchema.anyOf || jsonSchema.oneOf) {
    const variants = jsonSchema.anyOf || jsonSchema.oneOf;
    const unionType = variants.map((v: any) => jsonSchemaTypeToPython(v, true)).join(' | ');
    lines.push(`${schema.name} = ${unionType}`);
  } else {
    lines.push(`${schema.name} = ${jsonSchemaTypeToPython(jsonSchema, true)}`);
  }

  return lines;
}

function jsonSchemaTypeToPython(schema: any, required: boolean): string {
  if (!schema) return 'Any';

  if (schema.$ref) {
    return schema.$ref.replace('#/definitions/', '');
  }

  if (schema.enum) {
    return `Literal[${schema.enum.map((e: string) => `'${e}'`).join(', ')}]`;
  }

  let baseType: string;

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') baseType = 'datetime';
      else if (schema.format === 'uuid') baseType = 'str';
      else if (schema.format === 'uri') baseType = 'str';
      else baseType = 'str';
      break;
    case 'number':
    case 'integer':
      baseType = 'float';
      break;
    case 'boolean':
      baseType = 'bool';
      break;
    case 'array':
      if (schema.items) {
        baseType = `List[${jsonSchemaTypeToPython(schema.items, true)}]`;
      } else {
        baseType = 'List[Any]';
      }
      break;
    case 'object':
      if (schema.additionalProperties) {
        baseType = `Dict[str, ${jsonSchemaTypeToPython(schema.additionalProperties, true)}]`;
      } else if (schema.properties) {
        const props = Object.entries(schema.properties as Record<string, any>)
          .map(([key, value]) => {
            const propRequired = schema.required?.includes(key);
            return `${key}: ${jsonSchemaTypeToPython(value, propRequired)}`;
          })
          .join(', ');
        baseType = `Dict[str, Any]`;
      } else {
        baseType = 'Dict[str, Any]';
      }
      break;
    default:
      baseType = 'Any';
  }

  return required ? baseType : `Optional[${baseType}]`;
}

function generatePythonClientFile(config: SDKGeneratorConfig): string {
  return `# Auto-generated ControlPlane SDK Client
# DO NOT EDIT MANUALLY - regenerate from source

from dataclasses import dataclass
from typing import Optional, Dict, Any
import httpx
from .types import ContractVersion

@dataclass
class ClientConfig:
    base_url: str
    api_key: Optional[str] = None
    timeout: float = 30.0

class ControlPlaneClient:
    def __init__(self, config: ClientConfig):
        self.config = config
        self.contract_version = ContractVersion(
            major=${config.contractVersion.split('.')[0]},
            minor=${config.contractVersion.split('.')[1]},
            patch=${config.contractVersion.split('.')[2]}
        )
        self._client = httpx.Client(
            base_url=config.base_url,
            timeout=config.timeout,
            headers=self._default_headers()
        )

    def _default_headers(self) -> Dict[str, str]:
        headers = {
            'Content-Type': 'application/json',
            'X-Contract-Version': self._serialize_version(self.contract_version),
        }
        if self.config.api_key:
            headers['Authorization'] = f'Bearer {self.config.api_key}'
        return headers

    def _serialize_version(self, version: ContractVersion) -> str:
        return f'{version.major}.{version.minor}.{version.patch}'

    def get_contract_version(self) -> ContractVersion:
        return self.contract_version

    def request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        response = self._client.request(method, path, **kwargs)
        response.raise_for_status()
        return response.json()

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
`;
}

function generatePythonInitFile(): string {
  return `# Auto-generated ControlPlane SDK
# DO NOT EDIT MANUALLY - regenerate from source

from .types import *
from .client import ControlPlaneClient, ClientConfig
from .validation import validate, safe_validate

__all__ = [
    'ControlPlaneClient',
    'ClientConfig',
    'validate',
    'safe_validate',
]
`;
}

function generatePythonModelsInitFile(schemas: SchemaDefinition[]): string {
  const lines: string[] = [];
  lines.push('# Auto-generated models module');
  lines.push('# DO NOT EDIT MANUALLY - regenerate from source');
  lines.push('');

  for (const schema of schemas) {
    lines.push(`from ..types import ${schema.name}`);
  }

  return lines.join('\n');
}

function generatePythonValidationFile(schemas: SchemaDefinition[]): string {
  return `# Auto-generated validation utilities
# DO NOT EDIT MANUALLY - regenerate from source

from typing import Type, TypeVar, Union
from pydantic import BaseModel, ValidationError

T = TypeVar('T', bound=BaseModel)

def validate(model_class: Type[T], data: dict) -> T:
    \"\"\"Validate and parse data into a Pydantic model.\"\"\"
    return model_class.model_validate(data)

def safe_validate(model_class: Type[T], data: dict) -> Union[T, ValidationError]:
    \"\"\"Safely validate data, returning the error if validation fails.\"\"\"
    try:
        return validate(model_class, data)
    except ValidationError as e:
        return e
`;
}

function generateReadme(language: string, config: SDKGeneratorConfig): string {
  return `# ControlPlane SDK for ${language}

Auto-generated SDK from ControlPlane contracts v${config.contractVersion}.

## Installation

\`\`\`bash
pip install controlplane-sdk
\`\`\`

## Usage

\`\`\`python
from controlplane_sdk import ControlPlaneClient, ClientConfig, JobRequest

client = ControlPlaneClient(
    ClientConfig(
        base_url='https://api.controlplane.io',
        api_key='your-api-key'
    )
)

# Use the client...
\`\`\`

## Versioning

This SDK follows semantic versioning and tracks the ControlPlane contract version:
- SDK version: ${config.sdkVersion}
- Contract version: ${config.contractVersion}

## Regeneration

This SDK is auto-generated. Do not edit manually.
To regenerate, run: \`sdk-gen --language python\`
`;
}
