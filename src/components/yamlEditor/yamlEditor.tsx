import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { CodeEditor } from '@grafana/ui';
import type { StandardEditorProps } from '@grafana/data';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { setDiagnosticsOptions } from 'monaco-yaml';
import { configSchema } from './yamlSchema';

// Декларация интерфейсов для работы с folding API
interface FoldingController {
  getFoldingModel(): Promise<FoldingModel | null>;
}

interface FoldingModel {
  getAllRegions(): FoldingRegion[];
  dispose(): void;
}

interface FoldingRegion {
  isCollapsed: boolean;
  startLineNumber: number;
  endLineNumber: number;
}

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

const STORAGE_KEY = 'yaml-editor-folding-state';

const YamlEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = useRef<monacoEditor.IDisposable | null>(null);
  const [initialValue] = useState(value || 'changes:\n  ');

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

  const saveFoldingState = useCallback(async (editor: monacoEditor.editor.IStandaloneCodeEditor) => {
    try {
      const foldingController = editor.getContribution('editor.contrib.folding') as unknown as FoldingController;
      if (!foldingController?.getFoldingModel) {
        return;
      }

      const foldingModel = await foldingController.getFoldingModel();
      if (!foldingModel) {
        return;
      }

      const regions = foldingModel.getAllRegions();
      const state = regions
        .filter((region) => region.isCollapsed)
        .map((region) => `${region.startLineNumber}:${region.endLineNumber}`)
        .join(';');

      localStorage.setItem(STORAGE_KEY, state);
      foldingModel.dispose();
    } catch (error) {
      console.error('Error saving folding state:', error);
    }
  }, []);

  const restoreFoldingState = useCallback(async (editor: monacoEditor.editor.IStandaloneCodeEditor) => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (!savedState) {
        return;
      }

      const foldingController = editor.getContribution('editor.contrib.folding') as unknown as FoldingController;
      if (!foldingController?.getFoldingModel) {
        return;
      }

      const foldingModel = await foldingController.getFoldingModel();
      if (!foldingModel) {
        return;
      }

      const regions = foldingModel.getAllRegions();
      savedState.split(';').forEach((range) => {
        const [start, end] = range.split(':').map(Number);
        const region = regions.find((r) => r.startLineNumber === start && r.endLineNumber === end);
        if (region && !region.isCollapsed) {
          region.isCollapsed = true;
        }
      });

      foldingModel.dispose();

      const currentSelection = editor.getSelection();
      if (currentSelection) {
        editor.setSelection(currentSelection);
      }
    } catch (error) {
      console.error('Error restoring folding state:', error);
    }
  }, []);

  useEffect(() => {
    setDiagnosticsOptions({
      validate: false,
      enableSchemaRequest: false,
      schemas: [],
    });

    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  const handleEditorDidMount = useCallback(
    (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
      editorRef.current = editor;

      // Восстановление состояния сворачивания
      restoreFoldingState(editor);

      // Сохранение состояния при изменениях
      editor.onDidChangeModelContent(() => saveFoldingState(editor));
      editor.onDidChangeModelDecorations(() => saveFoldingState(editor));

      // Регистрация провайдера автодополнения
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
    [getEditorContext, createSuggestion, restoreFoldingState, saveFoldingState]
  );

  const handleBlur = useCallback(
    (value: string) => {
      onChange(value);
      if (editorRef.current) {
        saveFoldingState(editorRef.current);
      }
    },
    [onChange, saveFoldingState]
  );

  const handleSave = useCallback(
    (value: string) => {
      onChange(value);
      if (editorRef.current) {
        saveFoldingState(editorRef.current);
      }
    },
    [onChange, saveFoldingState]
  );

  return (
    <CodeEditor
      value={initialValue}
      language="yaml"
      width="100%"
      height="500px"
      showMiniMap={false}
      onBlur={handleBlur}
      onSave={handleSave}
      onEditorDidMount={handleEditorDidMount}
      monacoOptions={monacoOptions}
    />
  );
};

export default React.memo(YamlEditor);
