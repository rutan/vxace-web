import { useState } from 'react';
import styles from './styles.module.css';

export type DemoProps = {
  copy: {
    play: string;
    title: string;
  };
  url: string;
};

export const Demo = ({ copy, url }: DemoProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className={styles.container}>
      {isPlaying ? (
        <iframe title={copy.title} className={styles.iframe} src={url} width="100%" height="100%" allowFullScreen />
      ) : (
        <button className={styles.startButton} onClick={() => setIsPlaying(true)} type="button">
          {copy.play}
        </button>
      )}
    </div>
  );
};
