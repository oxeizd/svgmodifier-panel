import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { CodeEditor } from '@grafana/ui';
import type { StandardEditorProps } from '@grafana/data';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
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
  // Add a ref to track the completion provider disposal
  const completionProviderRef = useRef<monacoEditor.IDisposable | null>(null);

  const monacoOptions = useMemo(
    () => ({
      folding: true,
      foldingStrategy: 'indentation' as const,
      foldingHighlight: true,
      lineNumbers: 'on' as const,
      tabSize: 2,
      minimap: { enabled: false },
      wordWrap: 'on' as const,
      wrappingIndent: 'indent' as const,
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
      suggestOnTriggerCharacters: false,
      autoClosingBrackets: 'always' as const,
      autoClosingQuotes: 'always' as const,
    }),
    []
  );

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
    }),
    []
  );

  useEffect(() => {
    setDiagnosticsOptions({
      validate: false,
      enableSchemaRequest: false,
      schemas: [],
    });

    // Cleanup function to dispose of the completion provider when component unmounts
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
        completionProviderRef.current = null;
      }
    };
  }, []);

  const handleEditorDidMount = useCallback(
    (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
      editorRef.current = editor;

      // Dispose of any existing completion provider before creating a new one
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }

      // Register the completion provider and store the disposable
      completionProviderRef.current = monaco.languages.registerCompletionItemProvider('yaml', {
        triggerCharacters: ['\n'],
        provideCompletionItems: (model, position) => {
          const context = getEditorContext(model, position);
          const word = model.getWordUntilPosition(position);

          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          // Clear suggestions for this specific completion request
          const suggestions: monacoEditor.languages.CompletionItem[] = [];
          const currentRequestKeys = new Set<string>();

          configSchema.forEach(({ condition, items }) => {
            if (condition(context)) {
              const resolvedItems = typeof items === 'function' ? items(context) : items;
              resolvedItems.forEach((item) => {
                const uniqueKey = `${item.label}-${item.insertText}`;
                if (!currentRequestKeys.has(uniqueKey)) {
                  currentRequestKeys.add(uniqueKey);
                  suggestions.push(createSuggestion(item, range));
                }
              });
            }
          });

          return { suggestions };
        },
      });
    },
    [getEditorContext, createSuggestion]
  );

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
      monacoOptions={monacoOptions}
    />
  );
};

export default React.memo(YamlEditor);
