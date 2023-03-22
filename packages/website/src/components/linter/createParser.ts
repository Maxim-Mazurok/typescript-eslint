import type { VirtualTypeScriptEnvironment } from '@typescript/vfs';
import { createVirtualTypeScriptEnvironment } from '@typescript/vfs';
import type { ParserOptions } from '@typescript-eslint/types';
import type { TSESLint } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

import type { PlaygroundSystem } from '../playground/types';
import { defaultParseSettings } from './config';
import type { ParseSettings, UpdateModel, WebLinterModule } from './types';

export function createParser(
  system: PlaygroundSystem,
  compilerOptions: ts.CompilerOptions,
  onUpdate: (model: UpdateModel) => void,
  utils: WebLinterModule,
): TSESLint.Linter.ParserModule & {
  updateConfig: (compilerOptions: ts.CompilerOptions) => void;
} {
  const registeredFiles = new Set<string>();

  const createEnv = (
    compilerOptions: ts.CompilerOptions,
  ): VirtualTypeScriptEnvironment => {
    return createVirtualTypeScriptEnvironment(
      system,
      Array.from(registeredFiles),
      window.ts,
      compilerOptions,
    );
  };

  let compilerHost = createEnv(compilerOptions);

  return {
    updateConfig(compilerOptions): void {
      compilerHost = createEnv(compilerOptions);
    },
    parseForESLint: (
      text: string,
      options: ParserOptions = {},
    ): TSESLint.Linter.ESLintParseResult => {
      const filePath = options.filePath ?? '/file.ts';

      // if text is empty use empty line to avoid error
      const code = text || '\n';

      if (registeredFiles.has(filePath)) {
        compilerHost.updateFile(filePath, code);
      } else {
        registeredFiles.add(filePath);
        compilerHost.createFile(filePath, code);
      }

      const parseSettings: ParseSettings = {
        ...defaultParseSettings,
        code: code,
        codeFullText: code,
        filePath: filePath,
      };

      const program = compilerHost.languageService.getProgram();
      if (!program) {
        throw new Error('Failed to get program');
      }

      const tsAst = program.getSourceFile(filePath)!;

      const converted = utils.astConverter(tsAst, parseSettings, true);

      const scopeManager = utils.analyze(converted.estree, {
        globalReturn: options.ecmaFeatures?.globalReturn ?? false,
        sourceType: options.sourceType ?? 'module',
      });

      const checker = program.getTypeChecker();

      onUpdate({
        storedAST: converted.estree,
        storedTsAST: tsAst,
        storedScope: scopeManager,
        program: program,
      });

      return {
        ast: converted.estree,
        services: {
          program,
          esTreeNodeToTSNodeMap: converted.astMaps.esTreeNodeToTSNodeMap,
          tsNodeToESTreeNodeMap: converted.astMaps.tsNodeToESTreeNodeMap,
          getSymbolAtLocation: node =>
            checker.getSymbolAtLocation(
              converted.astMaps.esTreeNodeToTSNodeMap.get(node),
            ),
          getTypeAtLocation: node =>
            checker.getTypeAtLocation(
              converted.astMaps.esTreeNodeToTSNodeMap.get(node),
            ),
        },
        scopeManager,
        visitorKeys: utils.visitorKeys,
      };
    },
  };
}
