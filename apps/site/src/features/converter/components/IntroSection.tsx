import styles from '../ConverterApp.module.css';
import { WbrText, type WbrTextValue } from './WbrText';

export const IntroSection = ({ copy }: { copy: { heading: WbrTextValue; body: string } }) => (
  <section className={styles.intro} aria-labelledby="converter-heading">
    <div className={styles.shell}>
      <h1 id="converter-heading">
        <WbrText value={copy.heading} />
      </h1>
      <p>{copy.body}</p>
    </div>
  </section>
);
