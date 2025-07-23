import { css } from "@emotion/css"

export const styles = {
  container: css`
    padding: 0;
  `,
  header: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #262a2e;
  `,
  headerLeft: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  headerRight: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  ruleCount: css`
    color: #8b949e;
    font-size: 12px;
  `,
  groupsContainer: css`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  groupCard: css`
    background: rgba(204, 204, 220, 0.03);
    border: 1px solid #262a2e;
    border-radius: 6px;
    overflow: hidden;
  `,
  ungroupedCard: css`
    border-color: #404040;
    background: rgba(100, 100, 100, 0.05);
  `,
  emptyGroupCard: css`
    border-color: #666;
    background: rgba(255, 255, 0, 0.02);
    border-style: dashed;
  `,
  groupHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid #262a2e;
  `,
  groupTitle: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex: 1;
    
    h6 {
      margin: 0;
      color: #c7d0d9;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      
      &:hover {
        color: #58a6ff;
      }
    }
  `,
  editingContainer: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  `,
  validationError: css`
    color: #f85149;
    font-size: 11px;
    margin-top: 2px;
  `,
  groupActions: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  rulesContainer: css`
    padding: 8px;
  `,
  ruleItem: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid #2d3036;
    border-radius: 4px;
    
    &:hover {
      background: rgba(56, 139, 253, 0.1);
      border-color: #388bfd;
    }
  `,
  ruleInfo: css`
    flex: 1;
    min-width: 0;
  `,
  ruleName: css`
    margin-bottom: 2px;
  `,
  editableName: css`
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    
    strong {
      color: #c7d0d9;
      font-size: 12px;
    }
    
    &:hover strong {
      color: #58a6ff;
    }
  `,
  ruleId: css`
    color: #8b949e;
    font-size: 10px;
    font-family: monospace;
  `,
  ruleActions: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  emptyGroup: css`
    text-align: center;
    padding: 24px;
    color: #8b949e;
    
    p {
      margin: 0 0 12px 0;
      font-size: 12px;
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
  createGroupModal: css`
    min-width: 300px;
  `,
  collapsedCard: css`
    border-color: #404040;
    background: rgba(100, 100, 100, 0.02);
  `,
  emptyIndicator: css`
    color: #f1c40f;
    font-size: 10px;
    font-weight: normal;
    margin-left: 8px;
    opacity: 0.8;
  `,
  collapsedInfo: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.01);
    border-top: 1px solid #262a2e;
  `,
  collapsedText: css`
    color: #8b949e;
    font-size: 11px;
    font-style: italic;
  `,
}
