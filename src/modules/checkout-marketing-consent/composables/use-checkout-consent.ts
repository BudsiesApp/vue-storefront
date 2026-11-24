import { computed, ref, watch } from 'vue';

import { useStore } from '@vue-storefront/core/application-services';

import { emailKey } from '../helpers';
import { STORE_NAME } from '../store/store-name';
import { ConsentSelection, MarketingConsentValue } from '../types/marketing-consent';
import { SAVE_SELECTION } from '../types/store/actions';
import { GET_HYDRATED, GET_SELECTION } from '../types/store/getters';
import { SET_SELECTION } from '../types/store/mutations';
import { useMarketingConsentSettings } from './use-marketing-consent-settings';

function createEmptyValue (): MarketingConsentValue {
  return {
    emailConsent: false,
    smsConsent: false,
    phone: ''
  };
}

export function useCheckoutConsent () {
  const store = useStore();
  const draft = ref<MarketingConsentValue>(createEmptyValue());

  const { settings, offered } = useMarketingConsentSettings();
  const selection = computed<ConsentSelection | null>(() => {
    return store.getters[`${STORE_NAME}/${GET_SELECTION}`];
  });
  const hydrated = computed<boolean>(() => {
    return store.getters[`${STORE_NAME}/${GET_HYDRATED}`];
  });

  // The email the current draft belongs to; empty until the draft is tied to an email.
  let boundEmail = '';
  let currentEmail = '';
  let hasDraftEdits = false;
  let isAssigningDraft = false;

  function assignDraft (value: MarketingConsentValue): void {
    isAssigningDraft = true;
    draft.value = value;
    isAssigningDraft = false;
  }

  function invalidateSelection (): void {
    if (!selection.value) {
      return;
    }

    store.commit(`${STORE_NAME}/${SET_SELECTION}`, null);
  }

  function restoreSelection (restored: ConsentSelection): void {
    assignDraft({
      emailConsent: restored.emailConsent === true,
      smsConsent: restored.smsConsent === true,
      phone: restored.phone
    });
  }

  function resetDraft (): void {
    invalidateSelection();
    assignDraft(createEmptyValue());
    hasDraftEdits = false;
  }

  function onDraftChange (): void {
    if (isAssigningDraft) {
      return;
    }

    if (!hasDraftEdits) {
      hasDraftEdits = true;
      boundEmail = currentEmail;
    }

    invalidateSelection();
  }

  watch(draft, onDraftChange, { flush: 'sync' });

  function findRestorableSelection (email: string): ConsentSelection | null {
    if (hasDraftEdits || !email || !selection.value) {
      return null;
    }

    return emailKey(selection.value.email) === email ? selection.value : null;
  }

  function onEmailChange (email: string): void {
    const key = emailKey(email);

    currentEmail = key;

    const restorable = findRestorableSelection(key);

    if (restorable) {
      restoreSelection(restorable);
      boundEmail = key;
    }

    if (!boundEmail || key === boundEmail) {
      return;
    }

    resetDraft();
    boundEmail = key;
  }

  async function save (email: string): Promise<void> {
    onEmailChange(email);
    boundEmail = emailKey(email);

    const savedSelection: ConsentSelection = {
      email,
      emailConsent: offered.value.email && draft.value.emailConsent,
      smsConsent: offered.value.sms && draft.value.smsConsent,
      phone: draft.value.phone
    };

    await store.dispatch(`${STORE_NAME}/${SAVE_SELECTION}`, savedSelection);
  }

  return {
    draft,
    settings,
    offered,
    hydrated,
    updateEmail: onEmailChange,
    save
  };
}
