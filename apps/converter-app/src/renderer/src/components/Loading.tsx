import { cx } from '../utils';

export interface LoadingProps {
  className?: string;
  color?: string;
  size?: number;
}

export const Loading = ({ className, color, size = 48 }: LoadingProps) => (
  <div
    className={cx('Loading', 'flex justify-center', className)}
    style={{
      fontSize: `${size}px`,
      width: '1em',
      height: '1em',
    }}
  >
    <div
      className={cx('animate-spin w-full h-full border rounded-full border-t-transparent', color ? '' : 'border-white')}
      style={{
        borderColor: color ? `${color} transparent transparent transparent` : undefined,
        borderWidth: '0.1em',
      }}
    ></div>
  </div>
);
