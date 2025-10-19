import { CodeEditor } from '@grafana/ui';
import { MONACO_OPTIONS } from './constants';
import React, { useCallback, useMemo, useRef } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { configSchema as importedConfigSchema } from './yamlSchema';

interface EditorInstance {
  cleanup?: () => void;
}

const YamlEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
  const configSchema = useMemo(() => importedConfigSchema, []);
  const editorRef = useRef<EditorInstance | null>(null);

  const handleEditorDidMount = useCallback(
    (editor: any, monaco: any) => {
      const provideCompletionItems = async (model: any, position: any) => {
        try {
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
            currentIndent: lineContent.substring(0, position.column - 1).match(/^\s*/)?.[0]?.length || 0,
            prevLine: position.lineNumber > 1 ? model.getLineContent(position.lineNumber - 1) : '',
          };

          const suggestions: any[] = [];
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
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: item.insertText || item.label,
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  documentation: item.documentation,
                  detail: item.detail,
                  range,
                });
              }
            } catch (error) {
              console.warn('Error processing schema entry:', error);
            }
          }

          return { suggestions };
        } catch (error) {
          console.error('Error in completion provider:', error);
          return { suggestions: [] };
        }
      };

      // Регистрируем провайдер
      const provider = monaco.languages.registerCompletionItemProvider('yaml', {
        triggerCharacters: ['\n', ' ', ':'],
        provideCompletionItems,
      });

      // Настройка ResizeObserver
      const container = editor.getDomNode();
      if (!container) {
        return;
      }

      let resizeTimeout: NodeJS.Timeout;
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => editor.layout(), 50);
      });

      resizeObserver.observe(container);

      const handleWindowResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => editor.layout(), 50);
      };

      window.addEventListener('resize', handleWindowResize);

      const cleanup = () => {
        provider.dispose();
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleWindowResize);
        clearTimeout(resizeTimeout);
      };

      editorRef.current = { cleanup };
      return cleanup;
    },
    [configSchema]
  );

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
    },
    [onChange]
  );

  React.useEffect(() => {
    return () => {
      if (editorRef.current?.cleanup) {
        editorRef.current.cleanup();
      }
    };
  }, []);

  const defaultValue = 'changes:\n  ';

  return (
    <div style={{ minHeight: '500px', position: 'relative' }}>
      <CodeEditor
        value={value || defaultValue}
        language="yaml"
        height="500px"
        width="100%"
        showMiniMap={false}
        showLineNumbers={true}
        onBlur={handleChange}
        onSave={handleChange}
        onEditorDidMount={handleEditorDidMount}
        monacoOptions={MONACO_OPTIONS}
      />
    </div>
  );
};

export default YamlEditor;
