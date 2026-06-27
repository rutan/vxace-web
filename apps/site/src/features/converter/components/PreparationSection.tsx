import styles from '../ConverterApp.module.css';
import { cx } from '../lib/cx';
import { WbrText, type WbrTextValue } from './WbrText';

export const PreparationSection = ({
  copy,
}: {
  copy: {
    heading: WbrTextValue;
    body: string;
    items: Array<{ heading: string; body: string }>;
  };
}) => (
  <section className={cx(styles.section)} aria-labelledby="preparation-heading">
    <div className={cx(styles.sectionGrid, styles.shell)}>
      <div className={styles.sectionHeading}>
        <p className={styles.step}>Step 0</p>
        <h2 id="preparation-heading">
          <WbrText value={copy.heading} />
        </h2>
      </div>
      <div className={styles.sectionBody}>
        <p>{copy.body}</p>
        <ol className={styles.preparationList}>
          {copy.items.map((item, index) => (
            <li className={styles.preparationItem} key={item.heading}>
              <span className={styles.preparationNumber}>{index + 1}</span>
              <div>
                <h3>{item.heading}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);
