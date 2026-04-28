import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { CodeEditor, Button, Input, Select, Modal, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { MONACO_OPTIONS } from './constants';
import { configSchema as importedConfigSchema } from './yamlSchema';
import { OptionWithActions } from './menuActions';

interface Page {
  page: string;
  code: string;
}

const YamlEditor: React.FC<StandardEditorProps<Page[]>> = ({ value, onChange }) => {
  const configSchema = useMemo(() => importedConfigSchema, []);
  const providerRef = useRef<{ dispose: () => void } | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const normalizedPages = useMemo<Page[]>(() => {
    if (Array.isArray(value) && value.every((v) => v && typeof v === 'object' && 'page' in v && 'code' in v)) {
      return value;
    }
    if (typeof value === 'string') {
      return [{ page: 'Page 1', code: value }];
    }
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value.map((code, idx) => ({ page: `Page ${idx + 1}`, code }));
    }
    return [{ page: 'Page 1', code: 'changes:\n  ' }];
  }, [value]);

  const [pages, setPages] = useState<Page[]>(normalizedPages);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [renamePageIndex, setRenamePageIndex] = useState<number | null>(null);
  const [deletePageIndex, setDeletePageIndex] = useState<number | null>(null);
  const [newPageName, setNewPageName] = useState('');

  const styles = useStyles2(() => ({
    toolbar: css`
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    `,
    pageSelector: css`
      width: 300px;
      .grafana-select-value-container {
        height: 32px !important;
        min-height: 32px !important;
        max-height: 32px !important;
        overflow: hidden;
      }
      .grafana-select-single-value {
        line-height: 1.2 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
    `,
    editorContainer: css`
      min-height: 500px;
    `,
  }));

  useEffect(() => {
    setPages(normalizedPages);
    if (activePageIndex >= normalizedPages.length) {
      setActivePageIndex(Math.max(0, normalizedPages.length - 1));
    }
  }, [normalizedPages, activePageIndex]);

  const savePages = useCallback(
    (newPages: Page[]) => {
      onChange(newPages);
    },
    [onChange]
  );

  const addPage = useCallback(() => {
    const newPage: Page = { page: `Page ${pages.length + 1}`, code: 'changes:\n  ' };
    const newPages = [...pages, newPage];
    setPages(newPages);
    setActivePageIndex(newPages.length - 1);
    savePages(newPages);
  }, [pages, savePages]);

  const confirmDeletePage = useCallback((index: number) => {
    setDeletePageIndex(index);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirmed = useCallback(() => {
    if (deletePageIndex === null) {
      return;
    }
    const index = deletePageIndex;
    if (pages.length <= 1) {
      setDeleteModalOpen(false);
      return;
    }
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    if (activePageIndex === index) {
      setActivePageIndex(Math.min(index, newPages.length - 1));
    } else if (activePageIndex > index) {
      setActivePageIndex(activePageIndex - 1);
    }
    savePages(newPages);
    setDeleteModalOpen(false);
    setDeletePageIndex(null);
  }, [deletePageIndex, pages, activePageIndex, savePages]);

  const updatePageCode = useCallback(
    (index: number, newCode: string) => {
      const newPages = [...pages];
      newPages[index] = { ...newPages[index], code: newCode };
      setPages(newPages);
      savePages(newPages);
    },
    [pages, savePages]
  );

  const openRenameModal = useCallback(
    (index: number) => {
      setRenamePageIndex(index);
      setNewPageName(pages[index].page);
      setRenameModalOpen(true);
    },
    [pages]
  );

  const saveRename = useCallback(() => {
    if (renamePageIndex !== null && newPageName.trim() && newPageName !== pages[renamePageIndex].page) {
      const newPages = [...pages];
      newPages[renamePageIndex] = { ...newPages[renamePageIndex], page: newPageName.trim() };
      setPages(newPages);
      savePages(newPages);
    }
    setRenameModalOpen(false);
    setRenamePageIndex(null);
  }, [renamePageIndex, newPageName, pages, savePages]);

  const formatOptionLabel = useCallback(
    (opt: any, { context }: any) => {
      const isInMenu = context === 'menu';
      return (
        <OptionWithActions
          label={opt.label.trim()}
          index={opt.value}
          onRename={openRenameModal}
          onDelete={confirmDeletePage}
          isAddButton={opt.isAddButton}
          showActions={!opt.isAddButton && isInMenu}
        />
      );
    },
    [openRenameModal, confirmDeletePage]
  );

  const handlePageChange = useCallback(
    (opt: any) => {
      if (opt?.isAddButton) {
        addPage();
      } else if (opt?.value !== undefined && opt.value < pages.length) {
        setActivePageIndex(opt.value);
      }
    },
    [addPage, pages.length]
  );

  const handleEditorDidMount = useCallback(
    (editor: any, monaco: any) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }
      const provideCompletionItems = async (model: any, position: any) => {
        const lineContent = model.getLineContent(position.lineNumber);
        if (lineContent.trim() === '' && position.column <= 2) {
          return { suggestions: [] };
        }
        const context = {
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
        editorRef.current = null;
        monacoRef.current = null;
      };
    },
    [configSchema]
  );

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.dispose();
      }
    };
  }, []);

  const pageOptions = useMemo(() => pages.map((p, idx) => ({ label: p.page, value: idx })), [pages]);
  const optionsWithAdd = useMemo(
    () => [...pageOptions, { label: 'Add new page...', value: pages.length, isAddButton: true }],
    [pageOptions, pages.length]
  );
  const selectValue = useMemo(
    () => pageOptions.find((opt) => opt.value === activePageIndex),
    [pageOptions, activePageIndex]
  );

  const currentPage = pages[activePageIndex];
  if (!currentPage) {
    return null;
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <Select
          className={styles.pageSelector}
          options={optionsWithAdd}
          value={selectValue}
          onChange={handlePageChange}
          formatOptionLabel={formatOptionLabel}
          placeholder="Select page"
        />
      </div>
      <div className={styles.editorContainer}>
        <CodeEditor
          key={currentPage.page}
          value={currentPage.code}
          language="yaml"
          height="500px"
          width="100%"
          showMiniMap={false}
          showLineNumbers={true}
          onBlur={(val) => updatePageCode(activePageIndex, val)}
          onSave={(val) => updatePageCode(activePageIndex, val)}
          onEditorDidMount={handleEditorDidMount}
          monacoOptions={MONACO_OPTIONS}
        />
      </div>

      <Modal title="Rename page" isOpen={renameModalOpen} onDismiss={() => setRenameModalOpen(false)}>
        <Input value={newPageName} onChange={(e) => setNewPageName(e.currentTarget.value)} autoFocus />
        <Modal.ButtonRow>
          <Button variant="secondary" onClick={() => setRenameModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveRename}>
            Save
          </Button>
        </Modal.ButtonRow>
      </Modal>

      <Modal title="Delete page" isOpen={deleteModalOpen} onDismiss={() => setDeleteModalOpen(false)}>
        <p>{`Are you sure you want to delete "${pages[deletePageIndex ?? -1]?.page}"?`}</p>
        <Modal.ButtonRow>
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteConfirmed}>
            Delete
          </Button>
        </Modal.ButtonRow>
      </Modal>
    </div>
  );
};

export default YamlEditor;
