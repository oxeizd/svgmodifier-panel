import { css } from "@emotion/css"

export const styles = {
  sectionHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    h6 {
      margin: 0;
      color: #c7d0d9;
      font-size: 13px;
    }
  `,
  metricCard: css`
    background: rgba(204, 204, 220, 0.05);
    border: 1px solid #262a2e;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  `,
  cardHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    h6 {
      margin: 0;
      color: #c7d0d9;
      font-size: 12px;
    }
  `,
  refIdsContainer: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background: rgba(100, 100, 100, 0.1);
    border-radius: 4px;
    border: 1px solid #2d3036;
  `,
  refIdRow: css`
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
    flex-wrap: wrap;
    background: rgba(255, 255, 255, 0.05);
    padding: 8px;
    border-radius: 4px;
  `,
  thresholdsSection: css`
    margin-top: 12px;
    
    h6 {
      margin: 0 0 8px 0;
      color: #c7d0d9;
      font-size: 11px;
    }
  `,
  compactThresholds: css`
    margin-top: 6px;
  `,
  thresholdRow: css`
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 6px;
    background: rgba(255, 255, 255, 0.03);
    padding: 6px;
    border-radius: 3px;
    border: 1px solid #2d2f35;
  `,
  emptyState: css`
    text-align: center;
    padding: 24px;
    color: #8b949e;
    
    p {
      margin: 0;
      font-size: 12px;
    }
  `,
}
