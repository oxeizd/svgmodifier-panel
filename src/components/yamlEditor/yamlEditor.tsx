import { CodeEditor } from '@grafana/ui';
import { MONACO_OPTIONS } from './constants';
import React, { useCallback, useMemo } from 'react';
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

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
    },
    [onChange]
  );

  const handleEditorDidMount = useCallback(
    (editor: any, monaco: any) => {
      const provideCompletionItems = async (model: any, position: any) => {
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

        const context: CompletionContext = {
          lineContent,
          position,
          model,
          currentIndent: (lineContent.match(/^\s*/)![0] || '').length,
          prevLine: model.getLineContent(position.lineNumber - 1) || '',
        };

        const suggestions: any[] = [];
        const seenKeys = new Set<string>();

        for (const entry of configSchema) {
          if (entry.condition && !(await entry.condition(context))) {
            continue;
          }

          const items = typeof entry.items === 'function' ? await entry.items(context) : entry.items;

          for (const item of items) {
            const key = `${item.label}-${item.insertText}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);

              suggestions.push({
                label: item.label,
                kind: monaco.languages.CompletionItemKind.Property,
                insertText: item.insertText || item.label,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              });
            }
          }
        }

        const uniqueSuggestions = suggestions.filter(
          (suggestion, index, self) =>
            index === self.findIndex((s) => s.label === suggestion.label && s.insertText === suggestion.insertText)
        );

        return { suggestions: uniqueSuggestions };
      };

      const provider = monaco.languages.registerCompletionItemProvider('yaml', {
        triggerCharacters: ['\n', ' ', ':'],
        provideCompletionItems,
      });

      return () => {
        provider.dispose();
      };
    },
    [configSchema]
  );

  const defaultValue = 'changes:\n  ';

  return (
    <div style={{ minHeight: '500px' }}>
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
