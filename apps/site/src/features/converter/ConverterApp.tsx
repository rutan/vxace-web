import type { ConverterCopy, I18nLang } from '$i18n';
import { AdvancedSettingsSection } from './components/AdvancedSettingsSection';
import { ConversionSection } from './components/ConversionSection';
import { GameSettingsSection } from './components/GameSettingsSection';
import { IntroSection } from './components/IntroSection';
import { PreparationSection } from './components/PreparationSection';
import { ProjectSelectionSection } from './components/ProjectSelectionSection';
import styles from './ConverterApp.module.css';
import { useConverterApp } from './hooks/useConverterApp';

type Props = {
  copy: ConverterCopy;
  lang: I18nLang;
};

export const ConverterApp = ({ copy, lang }: Props) => {
  const converter = useConverterApp({ copy });

  return (
    <div className={styles.app} {...converter.dragHandlers}>
      <IntroSection copy={copy.intro} />

      <div className={styles.sections}>
        <PreparationSection copy={copy.preparation} />
        <ProjectSelectionSection {...converter.projectSelectionProps} copy={copy.projectSelection} lang={lang} />
        <GameSettingsSection {...converter.gameSettingsProps} copy={copy.gameSettings} />
        <AdvancedSettingsSection {...converter.advancedSettingsProps} copy={copy.advancedSettings} />
        <ConversionSection {...converter.conversionProps} copy={copy.conversion} lang={lang} />
      </div>
    </div>
  );
};
