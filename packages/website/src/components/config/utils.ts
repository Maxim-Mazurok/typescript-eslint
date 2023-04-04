import type { TSESLint } from '@typescript-eslint/utils';
import type { JSONSchema4 } from 'json-schema';

import { isRecord } from '../ast/utils';
import { parseJSONObject } from '../lib/json';
import type { TSConfig } from '../types';
import type { ConfigOptionsField, ConfigOptionsType } from './ConfigEditor';

export function parseESLintRC(code?: string): TSESLint.Linter.Config {
  if (code) {
    try {
      const parsed = parseJSONObject(code);
      if ('rules' in parsed && isRecord(parsed.rules)) {
        return parsed as TSESLint.Linter.Config;
      }
      return { ...parsed, rules: {} };
    } catch (e) {
      console.error(e);
    }
  }
  return { rules: {} };
}

export function parseTSConfig(code?: string): TSConfig {
  if (code) {
    try {
      const parsed = window.ts.parseConfigFileTextToJson(
        '/tsconfig.json',
        code,
      );
      if (parsed.error) {
        console.error(parsed.error);
      }
      if (isRecord(parsed.config)) {
        return parsed.config as TSConfig;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return { compilerOptions: {} };
}

export function schemaItemToField(
  name: string,
  item: JSONSchema4,
): ConfigOptionsField | null {
  if (item.type === 'boolean') {
    return {
      key: name,
      type: 'boolean',
      label: item.description,
    };
  } else if (item.type === 'string' && item.enum) {
    return {
      key: name,
      type: 'string',
      label: item.description,
      enum: ['', ...(item.enum as string[])],
    };
  } else if (item.oneOf) {
    return {
      key: name,
      type: 'boolean',
      label: item.description,
      defaults: ['error', 2, 'warn', 1],
    };
  }
  return null;
}

export function schemaToConfigOptions(
  options: Record<string, JSONSchema4>,
): ConfigOptionsType[] {
  const result = Object.entries(options).reduce<
    Record<string, ConfigOptionsType>
  >((group, [name, item]) => {
    const category = item.title!;
    group[category] = group[category] ?? {
      heading: category,
      fields: [],
    };
    const field = schemaItemToField(name, item);
    if (field) {
      group[category].fields.push(field);
    }
    return group;
  }, {});

  return Object.values(result);
}
