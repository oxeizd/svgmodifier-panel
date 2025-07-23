import { css } from "@emotion/css"

export const styles = {
  yamlEditor: css`
    padding: 16px;
  `,
  yamlHint: css`
    margin-top: 16px;
    background: rgba(56, 139, 253, 0.1);
    border-radius: 6px;
    border-left: 3px solid #388bfd;
    overflow: hidden;
  `,
  hintHeader: css`
    padding: 12px 16px;
    background: rgba(56, 139, 253, 0.1);
    border-bottom: 1px solid rgba(56, 139, 253, 0.2);
    cursor: pointer;
    
    span {
      color: #c7d0d9;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `,
  hintContent: css`
    padding: 16px;
    
    p {
      margin: 0 0 8px 0;
      color: #c7d0d9;
      font-size: 12px;
      
      strong {
        color: #58a6ff;
      }
    }
    
    pre {
      margin: 8px 0 16px 0;
      font-size: 11px;
      color: #8b949e;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      line-height: 1.4;
      background: rgba(0, 0, 0, 0.2);
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
    }
    
    ul {
      margin: 0;
      padding-left: 16px;
      
      li {
        color: #8b949e;
        font-size: 11px;
        margin-bottom: 4px;
      }
    }
  `,
}
