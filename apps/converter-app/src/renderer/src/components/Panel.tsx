import { JSX, ReactNode } from 'react';
import { cx } from '../utils';

export interface PanelProps {
  className?: string;
  children?: ReactNode | ReactNode[];
  as?: keyof JSX.IntrinsicElements;
  testId?: string;
}

export const Panel = ({ children, as: Component = 'section', className, testId }: PanelProps) => (
  <Component className={cx('Panel', 'bg-white rounded-xl border-slate-500 p-4', className)} data-testid={testId}>
    {children}
  </Component>
);
