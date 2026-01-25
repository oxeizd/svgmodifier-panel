export const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },

  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 9,
    maxHeight: 260,
    overflowY: 'auto' as const,
    padding: 4,
  },

  expression: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },

  row: {
    display: 'flex',
    justifyContent: 'space-between',
  },

  refButton: {
    borderRadius: '6px',
    cursor: 'pointer',
    background: 'rgba(204,204,220,0.07)',
    border: '1px solid rgba(204,204,220,0.15)',
    color: '#7eb9f4',
    height: 28,
    minWidth: 60,
  },

  refInput: {
    padding: '6px 8px',
    width: 'auto',
    minWidth: 130,
  },

  addButton: {
    marginLeft: '14px',
    alignSelf: 'flex-start' as const,
    padding: '7px',
    height: 28,
  },
} as const;
