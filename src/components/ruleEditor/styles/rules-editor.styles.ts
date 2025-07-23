import { css } from "@emotion/css"

export const styles = {
  container: css`
    background: #181b1f;
    border-radius: 2px;
    border: 1px solid #262a2e;
  `,
  header: css`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
    border-bottom: 1px solid #262a2e;
    
    h5 {
      margin: 0 0 4px 0;
      color: #c7d0d9;
      font-size: 14px;
      font-weight: 600;
    }
  `,
  modeSelector: css`
    margin-top: 4px;
  `,
  headerRight: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 32px;
  `,
  ruleCount: css`
    color: #8b949e;
    font-size: 12px;
  `,
  visualEditor: css`
    padding: 0;
  `,
  table: css`
    width: 100%;
    border-collapse: collapse;
    
    th {
      background: #262a2e;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 500;
      color: #8b949e;
      border-bottom: 1px solid #30363d;
    }
    
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #262a2e;
      vertical-align: middle;
    }
  `,
  tableRow: css`
    &:hover {
      background: rgba(56, 139, 253, 0.1);
    }
  `,
  ruleName: css`
    strong {
      color: #c7d0d9;
      font-size: 13px;
      display: block;
    }
  `,
  emptyState: css`
    text-align: center;
    padding: 48px 32px;
    color: #8b949e;
    
    h6 {
      margin: 8px 0 4px 0;
      color: #c7d0d9;
      font-size: 14px;
    }
    
    p {
      margin: 0 0 20px 0;
      font-size: 12px;
    }
  `,
  emptyIcon: css`
    font-size: 32px;
    margin-bottom: 8px;
  `,
}
