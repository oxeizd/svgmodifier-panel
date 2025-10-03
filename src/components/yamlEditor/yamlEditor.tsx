import { CodeEditor } from '@grafana/ui';
import type { StandardEditorProps } from '@grafana/data';
import { configSchema as importedConfigSchema } from './yamlSchema';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { MONACO_OPTIONS, EditorContext, SuggestionItem } from './constants';
import React, { useRef, useEffect, useCallback, useMemo } from 'react';

const YamlEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = useRef<monacoEditor.IDisposable | null>(null);

  // Мемоизируем схему
  const configSchema = useMemo(() => importedConfigSchema, []);

  const getEditorContext = useCallback(
    (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position): EditorContext => {
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
    },
    []
  );

  const createSuggestion = useCallback(
    (item: SuggestionItem, range: monacoEditor.IRange): monacoEditor.languages.CompletionItem => ({
      ...item,
      kind: monacoEditor.languages.CompletionItemKind.Property,
      range,
      insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: item.documentation || undefined,
    }),
    []
  );

  // Оптимизированный обработчик завершения кода с кэшированием
  const provideCompletionItems = useCallback(
    (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position) => {
      const context = getEditorContext(model, position);
      const word = model.getWordUntilPosition(position);

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monacoEditor.languages.CompletionItem[] = [];
      const currentRequestKeys = new Set<string>();

      // Быстрая фильтрация условий с ранним выходом
      for (const { condition, items } of configSchema) {
        if (condition(context)) {
          const resolvedItems = typeof items === 'function' ? items(context) : items;

          for (const item of resolvedItems) {
            const uniqueKey = `${item.label}-${item.insertText}`;
            if (!currentRequestKeys.has(uniqueKey)) {
              currentRequestKeys.add(uniqueKey);
              suggestions.push(createSuggestion(item, range));
            }
          }
        }
      }

      return { suggestions };
    },
    [getEditorContext, createSuggestion, configSchema]
  );

  const handleEditorDidMount = useCallback(
    (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
      editorRef.current = editor;

      // Регистрируем провайдер автодополнения сразу
      completionProviderRef.current = monaco.languages.registerCompletionItemProvider('yaml', {
        triggerCharacters: ['\n', ' ', ':'],
        provideCompletionItems,
      });
    },
    [provideCompletionItems]
  );

  useEffect(() => {
    return () => {
      completionProviderRef.current?.dispose();
    };
  }, []);

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
      monacoOptions={MONACO_OPTIONS}
    />
  );
};

export default React.memo(YamlEditor);
