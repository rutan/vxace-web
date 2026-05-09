import { atom, useAtomValue, useSetAtom } from 'jotai';
import { createInitialDraft, Draft } from '../../../shared';

const draftAtom = atom<Draft>(createInitialDraft());

export type DraftPatch = Partial<Omit<Draft, 'screen'>> & {
  screen?: Partial<Draft['screen']>;
};

const patchDraftAtom = atom(null, (get, set, patch: DraftPatch) => {
  const current = get(draftAtom);

  set(draftAtom, {
    ...current,
    ...patch,
    screen: patch.screen
      ? {
          ...current.screen,
          ...patch.screen,
        }
      : current.screen,
  });
});

export const useDraft = () => {
  const draft = useAtomValue(draftAtom);
  const replaceDraft = useSetAtom(draftAtom);
  const patchDraft = useSetAtom(patchDraftAtom);

  return {
    draft,
    patchDraft,
    replaceDraft,
    resetDraft: () => replaceDraft(createInitialDraft()),
  };
};
