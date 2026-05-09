import { useI18nContext } from '../i18n';
import { cx } from '../utils';
import { Loading } from './Loading';

export interface ConversionProgressScreenProps {
  className?: string;
}

export const ConversionProgressScreen = ({ className }: ConversionProgressScreenProps) => {
  const { LL } = useI18nContext();

  return (
    <section className={cx('ConversionProgressScreen', 'flex items-center justify-center', className)}>
      <div className="fixed top-0 left-0 flex flex-col gap-4 h-full w-full items-center justify-center">
        <Loading size={64} color="#3cc" />
        <p className="text-lg text-slate-700">{LL.progress.converting()}</p>
      </div>
    </section>
  );
};
