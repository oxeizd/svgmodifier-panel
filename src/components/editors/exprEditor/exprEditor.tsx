import React, { useState } from 'react';
import { Button, Input, TextArea } from '@grafana/ui';
import { Expr } from 'types';
import { styles } from './styles';

export const ExpressionsEditor: React.FC<{ value: Expr[]; onChange: (v: Expr[]) => void }> = ({
  value = [],
  onChange,
}) => {
  const [editingindex, setEditingindex] = useState<number | null>(null);
  const [editRef, setEditRef] = useState('');

  const handleAdd = () => {
    const next = value.length + 1;
    // Генерируем уникальный refId
    let newRefId = `exp${next}`;
    let counter = 1;
    while (value.some((expr) => expr.refId === newRefId)) {
      newRefId = `exp${next}_${counter}`;
      counter++;
    }

    onChange([...value, { refId: newRefId, expression: '' }]);
  };

  // Функция для проверки дублирования refId
  const isRefIdDuplicate = (newRefId: string, currentIndex: number): boolean => {
    return value.some((expr, index) => index !== currentIndex && expr.refId === newRefId);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleCalcBlur = (index: number, calc: string) => {
    if (calc !== value[index]?.expression) {
      const updated = [...value];
      updated[index] = { ...updated[index], expression: calc };
      onChange(updated);
    }
  };

  const startEdit = (index: number) => {
    setEditingindex(index);
    setEditRef(value[index]?.refId ?? `exp${index + 1}`);
  };

  const saveEdit = (index: number) => {
    const trimmed = editRef.trim();

    if (!trimmed) {
      cancelEdit();
      return;
    }

    // Проверяем на дублирование
    if (isRefIdDuplicate(trimmed, index)) {
      // Просто закрываем редактирование, не меняя refId
      cancelEdit();
      return;
    }

    setEditingindex(null);
    const updated = [...value];
    updated[index] = { ...updated[index], refId: trimmed };
    onChange(updated);
  };

  const cancelEdit = () => {
    setEditingindex(null);
  };

  const onKeyDownRef = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      saveEdit(index);
    }
    if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.list} className="expressions-list">
        {value.map((expr, index) => {
          const isEditing = editingindex === index;
          const displayRef = expr.refId || `exp${index + 1}`;
          const trimmed = editRef.trim();
          const isDuplicate = isEditing && trimmed ? isRefIdDuplicate(trimmed, index) : false;

          return (
            <div key={expr.refId || index} style={styles.expression}>
              <div style={styles.row}>
                {isEditing ? (
                  <Input
                    value={editRef}
                    onChange={(e) => setEditRef(e.currentTarget.value)}
                    onKeyDown={(e) => onKeyDownRef(e, index)}
                    onBlur={() => saveEdit(index)}
                    autoFocus
                    width={12}
                    invalid={isDuplicate}
                  />
                ) : (
                  <button type="button" onClick={() => startEdit(index)} style={styles.refButton}>
                    {displayRef}
                  </button>
                )}

                <Button
                  icon="trash-alt"
                  size="md"
                  variant="secondary"
                  fill="text"
                  onClick={() => handleRemove(index)}
                  tooltip="remove expression"
                />
              </div>

              <TextArea
                placeholder="$refId.legend:total + $refid:last"
                defaultValue={expr.expression}
                onBlur={(e) => handleCalcBlur(index, e.currentTarget.value)}
                rows={2}
              />
            </div>
          );
        })}
      </div>

      <Button icon="plus" variant="secondary" onClick={handleAdd} style={styles.addButton}>
        Add expression
      </Button>
    </div>
  );
};
