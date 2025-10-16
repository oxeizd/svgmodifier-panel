import { CodeEditor } from '@grafana/ui';
import { MONACO_OPTIONS } from './constants';
import React, { useCallback, useMemo } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { configSchema as importedConfigSchema } from './yamlSchema';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

const YamlEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
  const configSchema = useMemo(() => importedConfigSchema, []);

  const provideCompletionItems = useCallback(
    async (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position) => {
      const lineContent = model.getLineContent(position.lineNumber);
      if (lineContent.trim() === '' && position.column <= 2) {
        return { suggestions: [] };
      }

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const context = {
        lineContent,
        position,
        model,
        currentIndent: lineContent.substring(0, position.column - 1).match(/^\s*/)?.[0].length || 0,
        prevLine: position.lineNumber > 1 ? model.getLineContent(position.lineNumber - 1) : '',
      };

      const suggestions: monacoEditor.languages.CompletionItem[] = [];
      const seenKeys = new Set<string>();

      for (const entry of configSchema) {
        try {
          if (entry.condition && !(await entry.condition(context))) {
            continue;
          }

          let items: any[] = [];
          if (typeof entry.items === 'function') {
            const result = entry.items(context);
            items = result instanceof Promise ? await result : result;
          } else {
            items = [...entry.items];
          }

          for (const item of items) {
            const key = `${item.label}-${item.insertText}`;
            if (seenKeys.has(key)) {
              continue;
            }
            seenKeys.add(key);

            suggestions.push({
              label: item.label,
              kind: monacoEditor.languages.CompletionItemKind.Property,
              insertText: item.insertText || item.label,
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: item.documentation,
              detail: item.detail,
              range,
            });
          }
        } catch {}
      }

      return { suggestions };
    },
    [configSchema]
  );

  const handleEditorDidMount = useCallback(
    async (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
      let provider: monacoEditor.IDisposable;

      await new Promise<void>((resolve) => {
        provider = monaco.languages.registerCompletionItemProvider('yaml', {
          triggerCharacters: ['\n', ' ', ':'],
          provideCompletionItems,
        });

        setTimeout(() => {
          resolve();
        }, 0);
      });

      await new Promise<void>((resolve) => {
        let resizeTimeout: NodeJS.Timeout;
        const resizeObserver = new ResizeObserver(() => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            editor.layout();
          }, 50);
        });

        const container = editor.getDomNode();
        if (container) {
          resizeObserver.observe(container);
        }

        const handleWindowResize = () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => editor.layout(), 50);
        };
        window.addEventListener('resize', handleWindowResize);

        (editor as any).__cleanup = () => {
          provider.dispose();
          resizeObserver.disconnect();
          window.removeEventListener('resize', handleWindowResize);
          clearTimeout(resizeTimeout);
        };

        resolve();
      });

      return async () => {
        const cleanup = (editor as any).__cleanup;
        if (cleanup) {
          cleanup();
        }
      };
    },
    [provideCompletionItems]
  );

  return (
    <div style={{ minHeight: '500px' }}>
      <CodeEditor
        value={value || 'changes:\n  '}
        language="yaml"
        height="500px"
        showMiniMap={false}
        showLineNumbers={true}
        onBlur={onChange}
        onSave={onChange}
        onEditorDidMount={handleEditorDidMount}
        monacoOptions={MONACO_OPTIONS}
      />
    </div>
  );
};

export default YamlEditor;
