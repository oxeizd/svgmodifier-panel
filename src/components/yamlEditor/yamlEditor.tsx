import { CodeEditor } from '@grafana/ui';
import { MONACO_OPTIONS } from './constants';
import React, { useCallback, useMemo, useRef } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { configSchema as importedConfigSchema } from './yamlSchema';

interface CompletionContext {
  lineContent: string;
  position: any;
  model: any;
  currentIndent: number;
  prevLine: string;
}

const YamlEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
  const configSchema = useMemo(() => importedConfigSchema, []);
  const providerRef = useRef<{ dispose: () => void } | null>(null);

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
    },
    [onChange]
  );

  const handleEditorDidMount = useCallback(
    (editor: any, monaco: any) => {
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }

      const provideCompletionItems = async (model: any, position: any) => {
        const lineContent = model.getLineContent(position.lineNumber);

        if (lineContent.trim() === '' && position.column <= 2) {
          return { suggestions: [] };
        }

        const context: CompletionContext = {
          lineContent,
          position,
          model,
          currentIndent: (lineContent.match(/^\s*/)?.[0] || '').length,
          prevLine: position.lineNumber > 1 ? model.getLineContent(position.lineNumber - 1) : '',
        };

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];
        const seenKeys = new Set<string>();

        for (const entry of configSchema) {
          try {
            if (entry.condition && !(await entry.condition(context))) {
              continue;
            }

            const items = typeof entry.items === 'function' ? await entry.items(context) : entry.items;

            for (const item of items) {
              const key = `${item.label}-${item.insertText || item.label}`;
              if (seenKeys.has(key)) {
                continue;
              }

              seenKeys.add(key);
              suggestions.push({
                label: item.label,
                kind: monaco.languages.CompletionItemKind.Property,
                insertText: item.insertText || item.label,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              });
            }
          } catch (err) {
            continue;
          }
        }

        return { suggestions };
      };

      providerRef.current = monaco.languages.registerCompletionItemProvider('yaml', {
        triggerCharacters: ['\n', ' ', ':'],
        provideCompletionItems,
      });

      return () => {
        if (providerRef.current) {
          providerRef.current.dispose();
          providerRef.current = null;
        }
      };
    },
    [configSchema]
  );

  React.useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ minHeight: '500px' }}>
      <CodeEditor
        value={value || 'changes:\n  '}
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
