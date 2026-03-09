// // NotificationTooltip.tsx
// import React, { useEffect, useRef, useState } from 'react';
// import ReactDOM from 'react-dom';
// import { useTheme2 } from '@grafana/ui';

// export interface NotificationTooltipProps {
//   header: string;
//   count: number;
//   dataSourceNames?: string[];
//   show: boolean;
//   targetRef: React.RefObject<HTMLElement>;
// }

// export const NotificationTooltip: React.FC<NotificationTooltipProps> = ({
//   header = 'Влияние оказано на',
//   count = 0,
//   dataSourceNames = [],
//   show,
//   targetRef,
// }) => {
//   const theme = useTheme2();
//   const tooltipRef = useRef<HTMLDivElement>(null);
//   const [coords, setCoords] = useState({ x: 0, y: 0 });

//   // Функция для расчета позиции (только top-right)
//   const calculatePosition = () => {
//     if (!tooltipRef.current || !targetRef?.current) {return;}

//     const targetRect = targetRef.current.getBoundingClientRect();
//     const tooltipRect = tooltipRef.current.getBoundingClientRect();

//     const padding = 8;

//     // Всегда позиционируем в правом верхнем углу целевого элемента
//     let x = targetRect.right - tooltipRect.width - padding;
//     let y = targetRect.top + padding;

//     // Проверка границ экрана
//     if (x < padding) {x = padding;}
//     if (x + tooltipRect.width > window.innerWidth - padding) {
//       x = window.innerWidth - tooltipRect.width - padding;
//     }

//     if (y < padding) {y = padding;}
//     if (y + tooltipRect.height > window.innerHeight - padding) {
//       y = window.innerHeight - tooltipRect.height - padding;
//     }

//     setCoords({ x, y });
//   };

//   // Обновляем позицию при изменении
//   useEffect(() => {
//     if (!show) {return;}

//     calculatePosition();

//     const handleScroll = () => calculatePosition();
//     const handleResize = () => calculatePosition();

//     window.addEventListener('scroll', handleScroll);
//     window.addEventListener('resize', handleResize);

//     return () => {
//       window.removeEventListener('scroll', handleScroll);
//       window.removeEventListener('resize', handleResize);
//     };
//   }, [show, targetRef, dataSourceNames]);

//   if (!show) {return null;}

//   // Стили в стиле другого тултипа
//   const containerStyles: React.CSSProperties = {
//     position: 'fixed',
//     left: coords.x,
//     top: coords.y,
//     backgroundColor: theme.colors.background.secondary,
//     padding: '12px',
//     borderRadius: '5px',
//     pointerEvents: 'none',
//     boxShadow: '0 3px 12px rgba(0, 0, 0, 0.3)',
//     zIndex: 1000,
//     maxWidth: '300px',
//     overflow: 'auto',
//     wordWrap: 'break-word',
//     border: `1px solid ${theme.colors.border.weak}`,
//     whiteSpace: 'normal',
//     fontFamily: theme.typography.fontFamily,
//   };

//   const headerStyles: React.CSSProperties = {
//     color: theme.colors.text.secondary,
//     marginBottom: '8px',
//     fontSize: '12px',
//     borderBottom: `1px solid ${theme.colors.border.weak}`,
//     paddingBottom: '4px',
//   };

//   const countStyles: React.CSSProperties = {
//     color: theme.colors.primary.text,
//     fontSize: '22px',
//     fontWeight: 'bold',
//     marginBottom: '8px',
//     textAlign: 'center',
//   };

//   const countUnitStyles: React.CSSProperties = {
//     fontSize: '11px',
//     marginLeft: '2px',
//     color: theme.colors.text.secondary,
//   };

//   const sourcesHeaderStyles: React.CSSProperties = {
//     color: theme.colors.text.secondary,
//     fontSize: '10px',
//     marginBottom: '4px',
//   };

//   const listStyles: React.CSSProperties = {
//     listStyle: 'none',
//     margin: 0,
//     padding: 0,
//     maxHeight: '120px',
//     overflowY: 'auto',
//   };

//   const listItemStyles: React.CSSProperties = {
//     color: theme.colors.text.primary,
//     fontSize: '11px',
//     padding: '2px 0',
//     borderBottom: `1px solid ${theme.colors.border.weak}`,
//     whiteSpace: 'nowrap',
//     overflow: 'hidden',
//     textOverflow: 'ellipsis',
//   };

//   const emptyStyles: React.CSSProperties = {
//     color: theme.colors.text.disabled,
//     fontStyle: 'italic',
//     fontSize: '11px',
//     textAlign: 'center',
//     padding: '4px 0',
//   };

//   const content = (
//     <div ref={tooltipRef} style={containerStyles}>
//       <div style={headerStyles}>{header}</div>

//       <div style={countStyles}>
//         {count}
//         <span style={countUnitStyles}>шт</span>
//       </div>

//       {dataSourceNames && dataSourceNames.length > 0 ? (
//         <>
//           <div style={sourcesHeaderStyles}>Источники:</div>
//           <ul style={listStyles}>
//             {dataSourceNames.slice(0, 5).map((name, index) => (
//               <li key={index} style={listItemStyles} title={name}>
//                 {name.length > 25 ? name.substring(0, 22) + '...' : name}
//               </li>
//             ))}
//             {dataSourceNames.length > 5 && (
//               <li style={{...listItemStyles, fontStyle: 'italic'}}>
//                 +{dataSourceNames.length - 5} еще
//               </li>
//             )}
//           </ul>
//         </>
//       ) : (
//         <div style={emptyStyles}>Нет данных</div>
//       )}
//     </div>
//   );

//   return ReactDOM.createPortal(content, document.body);
// };

// export const useNotificationTooltip = (initialShow = false) => {
//   const [show, setShow] = useState(initialShow);

//   const showTooltip = () => setShow(true);
//   const hideTooltip = () => setShow(false);
//   const toggleTooltip = () => setShow(prev => !prev);

//   return {
//     show,
//     showTooltip,
//     hideTooltip,
//     toggleTooltip
//   };
// };
