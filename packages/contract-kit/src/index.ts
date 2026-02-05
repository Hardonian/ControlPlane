export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const hasString = (obj: Record<string, unknown>, key: string) =>
  isString(obj[key]);

const hasArray = (obj: Record<string, unknown>, key: string) =>
  Array.isArray(obj[key]);

const pushError = (errors: string[], message: string) => {
  errors.push(message);
};

export const validateEvent = (payload: unknown): ValidationResult => {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }
  if (!hasString(payload, 'id')) pushError(errors, 'id is required');
  if (!hasString(payload, 'source')) pushError(errors, 'source is required');
  if (!hasString(payload, 'type')) pushError(errors, 'type is required');
  if (!hasString(payload, 'timestamp'))
    pushError(errors, 'timestamp is required');
  if (!hasString(payload, 'version')) pushError(errors, 'version is required');
  if (!isRecord(payload.data)) pushError(errors, 'data must be an object');
  if (hasString(payload, 'version')) {
    const version = payload.version as string;
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      pushError(errors, 'version must be semver');
    }
  }
  return { valid: errors.length === 0, errors };
};

export const validateReport = (payload: unknown): ValidationResult => {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }
  if (!isRecord(payload.runner)) {
    pushError(errors, 'runner is required');
  } else {
    if (!hasString(payload.runner, 'name')) {
      pushError(errors, 'runner.name is required');
    }
    if (!hasString(payload.runner, 'version')) {
      pushError(errors, 'runner.version is required');
    }
  }
  if (!hasString(payload, 'status')) pushError(errors, 'status is required');
  if (!hasString(payload, 'startedAt'))
    pushError(errors, 'startedAt is required');
  if (!hasString(payload, 'finishedAt'))
    pushError(errors, 'finishedAt is required');
  if (!hasString(payload, 'summary')) pushError(errors, 'summary is required');
  return { valid: errors.length === 0, errors };
};

export const validateRunnerManifest = (payload: unknown): ValidationResult => {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }
  if (!hasString(payload, 'name')) pushError(errors, 'name is required');
  if (!hasString(payload, 'version')) pushError(errors, 'version is required');
  if (!hasString(payload, 'description'))
    pushError(errors, 'description is required');
  if (!isRecord(payload.entrypoint)) {
    pushError(errors, 'entrypoint is required');
  } else {
    if (!hasString(payload.entrypoint, 'command')) {
      pushError(errors, 'entrypoint.command is required');
    }
    if (!hasArray(payload.entrypoint, 'args')) {
      pushError(errors, 'entrypoint.args must be an array');
    }
  }
  return { valid: errors.length === 0, errors };
};

export const validateCliSurface = (payload: unknown): ValidationResult => {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }
  if (!hasString(payload, 'name')) pushError(errors, 'name is required');
  if (!hasArray(payload, 'commands')) pushError(errors, 'commands is required');
  if (!isRecord(payload.exitCodes)) pushError(errors, 'exitCodes is required');
  return { valid: errors.length === 0, errors };
};
