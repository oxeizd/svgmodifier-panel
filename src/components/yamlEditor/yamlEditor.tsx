import { CodeEditor } from '@grafana/ui';
import { MONACO_OPTIONS } from './constants';
import React, { useCallback, useMemo, useRef } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { configSchema as importedConfigSchema } from './yamlSchema';

interface EditorInstance {
  provider?: { dispose: () => void };
  cleanup?: () => void;
  container?: HTMLElement | null;
}

const YamlEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
  const configSchema = useMemo(() => importedConfigSchema, []);
  const editorRef = useRef<EditorInstance>({});

  const handleEditorDidMount = useCallback(
    (editor: any, monaco: any) => {
      if (editorRef.current.provider) {
        try {
          editorRef.current.provider.dispose();
        } catch (e) {}
        editorRef.current.provider = undefined;
      }

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
            } catch (error) {}
          }

          return { suggestions };
        } catch (error) {
          return { suggestions: [] };
        }
      };

      const provider = monaco.languages.registerCompletionItemProvider('yaml', {
        triggerCharacters: ['\n', ' ', ':'],
        provideCompletionItems,
      });
      editorRef.current.provider = provider;

      const container = editor.getDomNode?.() || null;
      editorRef.current.container = container;

      let resizeTimeout: number | null = null;
      const resizeObserver = new ResizeObserver(() => {
        if (resizeTimeout !== null) {
          window.clearTimeout(resizeTimeout);
        }
        resizeTimeout = window.setTimeout(() => editor.layout(), 50) as unknown as number;
      });

      if (container) {
        try {
          resizeObserver.observe(container);
        } catch (e) {}
      }

      const handleWindowResize = () => {
        if (resizeTimeout !== null) {
          window.clearTimeout(resizeTimeout);
        }
        resizeTimeout = window.setTimeout(() => editor.layout(), 50) as unknown as number;
      };

      window.addEventListener('resize', handleWindowResize);

      const cleanup = () => {
        try {
          provider.dispose();
        } catch (e) {}
        try {
          resizeObserver.disconnect();
        } catch (e) {}
        window.removeEventListener('resize', handleWindowResize);
        if (resizeTimeout !== null) {
          window.clearTimeout(resizeTimeout);
          resizeTimeout = null;
        }
        editorRef.current.provider = undefined;
        editorRef.current.container = null;
      };

      editorRef.current.cleanup = cleanup;
      return cleanup;
    },
    [configSchema]
  );

  React.useEffect(() => {
    const current = editorRef.current;
    return () => {
      if (current?.cleanup) {
        try {
          current.cleanup();
        } catch (e) {}
      } else if (current?.provider) {
        try {
          current.provider.dispose();
        } catch (e) {}
      }
    };
  }, []);

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
    },
    [onChange]
  );

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
