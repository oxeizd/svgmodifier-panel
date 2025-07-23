import { css } from "@emotion/css"

export const styles = {
  configModal: css`
    min-width: 700px;
    max-width: 90vw;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `,
  tabContent: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
    max-height: 60vh;
  `,
  modalFooter: css`
    border-top: 1px solid #262a2e;
    padding: 12px 0 0 0;
    margin-top: 16px;
  `,
}
