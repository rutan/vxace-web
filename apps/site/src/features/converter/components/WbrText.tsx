import { Fragment } from 'react';

export type WbrTextValue = string | string[];

export const WbrText = ({ value }: { value: WbrTextValue }) => {
  if (typeof value === 'string') return value;

  return (
    <>
      {value.map((part, index) => (
        <Fragment key={`${index}:${part}`}>
          {index > 0 ? <wbr /> : null}
          {part}
        </Fragment>
      ))}
    </>
  );
};
