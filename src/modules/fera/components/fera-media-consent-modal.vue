<template>
  <div class="fera-media-consent-modal" role="dialog" aria-modal="true">
    <SfModal :visible="isVisible" @close="decline">
      <form class="form" @submit.prevent="submit">
        <SfHeading
          :title="$t('Share your review')"
          :subtitle="$t('Your review was submitted successfully.')"
          :level="3"
        />

        <p class="form__description">
          {{ $t('Would you like to give us permission to use your review text, photos, and videos in marketing materials, ads, and social media?') }}
        </p>

        <SfCheckbox
          v-model="hasGrantedConsent"
          :label="$t('Yes, I give permission to use my review text, photos, and videos for marketing.')"
          class="form__checkbox"
        />

        <div class="form__actions">
          <SfButton type="submit">
            {{ $t('Continue') }}
          </SfButton>
          <SfButton type="button" class="sf-button--outline" @click="decline">
            {{ $t('No thanks') }}
          </SfButton>
        </div>
      </form>
    </SfModal>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { SfButton, SfCheckbox, SfHeading, SfModal } from '@storefront-ui/vue';

import { FeraMediaConsent } from '../types/fera-media-consent.interface';
import { FERA_STORE_NAME } from '../types/store-name';
import { CLEAR_MEDIA_CONSENT, LOG_MEDIA_CONSENT } from '../store/actions';

export default Vue.extend({
  name: 'FeraMediaConsentModal',
  components: {
    SfButton,
    SfCheckbox,
    SfHeading,
    SfModal
  },
  props: {
    isVisible: {
      type: Boolean,
      required: true
    },
    modalData: {
      type: Object,
      default: () => ({})
    }
  },
  data () {
    return {
      hasGrantedConsent: false
    };
  },
  watch: {
    isVisible (isVisible: boolean): void {
      if (isVisible) {
        this.hasGrantedConsent = false;
      }
    }
  },
  methods: {
    async submit (): Promise<void> {
      if (this.hasGrantedConsent) {
        await this.$store.dispatch(
          `${FERA_STORE_NAME}/${LOG_MEDIA_CONSENT}`,
          this.modalData.payload as FeraMediaConsent
        );
      }

      this.close();
    },
    decline (): void {
      this.close();
    },
    close (): void {
      this.hasGrantedConsent = false;
      this.$store.dispatch(`${FERA_STORE_NAME}/${CLEAR_MEDIA_CONSENT}`);
      this.$emit('close', this.modalData.name);
    }
  }
});
</script>

<style lang="scss" scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-base);

  &__description {
    margin: 0;
  }

  &__checkbox {
    align-items: flex-start;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacer-sm);
    justify-content: flex-end;
  }
}
</style>
