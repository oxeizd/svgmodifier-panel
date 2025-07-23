import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { CodeEditor } from '@grafana/ui';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { setDiagnosticsOptions } from 'monaco-yaml';
import { configSchema } from './yamlSchema';
import { css } from '@emotion/css';

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

type YamlEditorProps = {
  value: string;
  onChange: (value?: string) => void;
  context?: {
    schemas?: any[];
    data?: any[];
    options?: any;
  };
};

const YamlEditor: React.FC<YamlEditorProps> = ({ value, onChange, context }) => {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = useRef<monacoEditor.IDisposable | null>(null);
  const [errors, setErrors] = useState<monacoEditor.editor.IMarkerData[]>([]);

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
      theme: 'vs-dark',
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

  const handleBlur = () => {
    if (onChange && editorRef.current) {
      const currentValue = editorRef.current.getValue();
      onChange(currentValue || '');
    }
  };

  const handleSave = () => {
    if (onChange && editorRef.current) {
      const currentValue = editorRef.current.getValue();
      onChange(currentValue || '');
    }
  };

  useEffect(() => {
    setDiagnosticsOptions({
      validate: true,
      enableSchemaRequest: true,
      schemas: context?.schemas || [],
      format: true,
    });

    const model = editorRef.current?.getModel();
    if (model) {
      const markerListener = monacoEditor.editor.onDidChangeMarkers((uris) => {
        const currentUri = model.uri;
        if (uris.some(uri => uri.toString() === currentUri.toString())) {
          const markers = monacoEditor.editor.getModelMarkers({ resource: model.uri });
          setErrors(markers);
        }
      });

      return () => {
        markerListener.dispose();
        if (completionProviderRef.current) {
          completionProviderRef.current.dispose();
        }
      };
    }

    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, [context?.schemas]);

  const handleEditorDidMount = useCallback(
    (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
      editorRef.current = editor;

      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }

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
    <div className={yamlEditorStyles.container}>
      <div className={yamlEditorStyles.header}>
        <div className={yamlEditorStyles.status}>
          <span className={errors.length === 0 ? yamlEditorStyles.valid : yamlEditorStyles.invalid}>
            {errors.length === 0 ? "✓ Valid YAML" : `✗ ${errors.length} error(s)`}
          </span>
          {errors.length > 0 && (
            <div className={yamlEditorStyles.errors}>
              {errors.map((error, i) => (
                <div key={i} className={yamlEditorStyles.error}>
                  Line {error.startLineNumber}: {error.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <CodeEditor
        value={value || ''}
        language="yaml"
        width="100%"
        height="450px"
        showMiniMap={false}
        onBlur={handleBlur}
        onSave={handleSave}
        onEditorDidMount={handleEditorDidMount}
        monacoOptions={monacoOptions}
      />
    </div>
  );
};

const yamlEditorStyles = {
  container: css`
    border: 1px solid #262a2e;
    border-radius: 4px;
    overflow: hidden;
    background: #1a1d21;
  `,
  header: css`
    padding: 8px 16px;
    background: #262a2e;
    border-bottom: 1px solid #30363d;
  `,
  status: css`
    font-size: 12px;
    display: flex;
    flex-direction: column;
  `,
  valid: css`
    color: #3fb950;
  `,
  invalid: css`
    color: #f85149;
  `,
  errors: css`
    margin-top: 4px;
    max-height: 150px;
    overflow-y: auto;
    font-size: 11px;
  `,
  error: css`
    padding: 4px 0;
    border-bottom: 1px solid rgba(248, 81, 73, 0.2);
    &:last-child {
      border-bottom: none;
    }
  `
};

export default React.memo(YamlEditor);