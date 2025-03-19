import React, { useRef, useEffect } from 'react';
import { CodeEditor } from '@grafana/ui';
import type { StandardEditorProps } from '@grafana/data';
import type * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { setDiagnosticsOptions } from 'monaco-yaml';
import { configSchema } from './yamlSchema';

type SuggestionItem = {
  label: string;
  insertText: string;
};

type EditorContext = {
  currentIndent: number;
  lineContent: string;
  prevLine: string;
  position: monacoEditor.Position;
  model: monacoEditor.editor.ITextModel;
};

const YamlEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    setDiagnosticsOptions({
      validate: false,
      enableSchemaRequest: false,
      schemas: [],
    });
  }, []);

  const handleEditorDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
    editorRef.current = editor;

    monaco.languages.registerCompletionItemProvider('yaml', {
      triggerCharacters: ['\n'],
      provideCompletionItems: (model, position) => {
        const context = getEditorContext(model, position, monaco);
        const word = model.getWordUntilPosition(position);

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Собираем уникальные подсказки
        const uniqueSuggestions = new Map<string, monacoEditor.languages.CompletionItem>();

        configSchema.forEach(({ condition, items }) => {
          if (condition(context)) {
            const resolvedItems = typeof items === 'function' ? items(context) : items;
            resolvedItems.forEach((item) => {
              // Создаем уникальный ключ на основе label и insertText
              const uniqueKey = `${item.label}-${item.insertText}`;
              if (!uniqueSuggestions.has(uniqueKey)) {
                uniqueSuggestions.set(uniqueKey, createSuggestion(item, range, monaco));
              }
            });
          }
        });

        return { suggestions: Array.from(uniqueSuggestions.values()) };
      },
    });
  };

  const getEditorContext = (
    model: monacoEditor.editor.ITextModel,
    position: monacoEditor.Position,
    monaco: typeof monacoEditor
  ): EditorContext => {
    const lineContent = model.getLineContent(position.lineNumber);
    const prevLine = position.lineNumber > 1 ? model.getLineContent(position.lineNumber - 1) : '';

    const currentIndent = lineContent.substring(0, position.column).match(/^\s*/)?.[0].length || 0;

    return {
      currentIndent,
      lineContent,
      prevLine,
      position,
      model,
    };
  };

  const createSuggestion = (
    item: SuggestionItem,
    range: monacoEditor.IRange,
    monaco: typeof monacoEditor
  ): monacoEditor.languages.CompletionItem => ({
    ...item,
    kind: monaco.languages.CompletionItemKind.Property,
    range,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
  });

  return (
    <CodeEditor
      value={value || 'changes:\n  '}
      language="yaml"
      width="100%"
      height="500px"
      showMiniMap={false}
      onBlur={onChange}
      onSave={onChange}
      onEditorDidMount={handleEditorDidMount}
      monacoOptions={{
        folding: true,
        foldingStrategy: 'indentation', // Стратегия сворачивания (например, по отступам)
        foldingHighlight: true, // Подсветка области сворачивания
        lineNumbers: 'on',
        tabSize: 2,
        minimap: { enabled: false },
        wordWrap: 'on',
        wrappingIndent: 'indent',
        suggest: {
          snippetsPreventQuickSuggestions: false,
          showWords: false,
          showSnippets: true,
        },
        quickSuggestions: {
          other: false,
          comments: false,
          strings: true,
        },
        suggestOnTriggerCharacters: false, // Отключает подсказки при вводе триггерных символов
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
      }}
    />
  );
};

export default YamlEditor;
