import { ReactNode } from 'react';
import { cx } from '../utils';
import { Panel } from './Panel';

export const StepSection = ({
  children,
  description,
  status,
  step,
  testId,
  title,
}: {
  children: ReactNode;
  description?: string;
  status: 'active' | 'complete' | 'error' | 'pending';
  step: string;
  testId?: string;
  title: string;
}) => {
  const isPending = status === 'pending';

  return (
    <Panel className={cx('StepSection', 'grid gap-4', isPending && 'opacity-50')} testId={testId}>
      <h2 className="flex items-center gap-2">
        <div
          className={cx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            status === 'complete'
              ? 'bg-emerald-700 text-white'
              : status === 'error'
                ? 'bg-red-700 text-white'
                : status === 'active'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-600',
          )}
        >
          {step}
        </div>
        <div className={cx('text-xl font-bold text-slate-800')}>{title}</div>
      </h2>
      <div className="grid gap-4 pl-10">
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        {children}
      </div>
    </Panel>
  );
};
