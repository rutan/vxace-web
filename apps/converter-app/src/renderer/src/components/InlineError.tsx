export interface InlineErrorProps {
  message: string;
  title: string;
}

export const InlineError = ({ message, title }: InlineErrorProps) => {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-3 text-red-950">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-sm">{message}</p>
    </section>
  );
};
