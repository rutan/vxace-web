import { cx } from '../utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'normal' | 'primary';
  children?: React.ReactNode | React.ReactNode[];
}

export const Button = ({ variant = 'normal', children, ...rest }: ButtonProps) => {
  return (
    <button
      className={cx(
        'Button',
        'inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border',
        variant === 'primary'
          ? 'border-emerald-700 bg-emerald-700 px-3.5 text-white transition hover:bg-emerald-800 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-emerald-300 disabled:bg-emerald-300 disabled:text-white/70'
          : 'border-slate-300 bg-white px-3.5 text-slate-800 transition hover:bg-slate-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400',
      )}
      {...rest}
    >
      {children}
    </button>
  );
};
