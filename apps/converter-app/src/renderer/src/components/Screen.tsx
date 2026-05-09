import { Children, isValidElement } from 'react';

export interface ScreenProps {
  current: string;
  children?: ScreenItemElement | ScreenItemElement[];
}

export const Screen = ({ children, current }: ScreenProps) => {
  return (
    <>
      {Children.map(children, (child) => {
        if (!isValidElement<ScreenItemProps>(child)) return null;
        return child.props.name === current ? child : null;
      })}
    </>
  );
};

export interface ScreenItemProps {
  name: string;
  children?: React.ReactNode | React.ReactNode[];
}

export const ScreenItem = ({ children }: ScreenItemProps) => {
  return <>{children}</>;
};

type ScreenItemElement = React.ReactElement<ScreenItemProps, typeof ScreenItem>;
