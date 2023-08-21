<template>
  <div
    class="subscription-form"
  >
    <validation-observer
      ref="validationObserver"
      v-slot="{passes}"
      slim
    >
      <form
        @submit.prevent="() => passes(() => onSubmitForm())"
        class="_form"
      >
        <validation-provider
          v-slot="{errors}"
          rules="required|email"
          slim
          name="E-mail"
        >
          <SfInput
            v-model="email"
            class="_input"
            :name="emailInputName"
            :label="$t('E-mail address')"
            :disabled="isSubmitting"
            :valid="!errors.length"
            :error-message="errors[0]"
          />
        </validation-provider>

        <MSpinnerButton class="_button" :show-spinner="isSubmitting">
          {{ buttonText }}
        </MSpinnerButton>
      </form>
    </validation-observer>
  </div>
</template>

<script lang="ts">
import { extend, ValidationProvider, ValidationObserver } from 'vee-validate';
import { email, required } from 'vee-validate/dist/rules';
import Vue, { PropType } from 'vue';

import { SfInput } from '@storefront-ui/vue';
import Task from '@vue-storefront/core/lib/sync/types/Task';

import MSpinnerButton from 'theme/components/molecules/m-spinner-button.vue';

extend('required', {
  ...required,
  message: 'Field is required'
});

extend('email', email);

export default Vue.extend({
  name: 'MSubscriptionForm',
  components: {
    SfInput,
    MSpinnerButton,
    ValidationProvider,
    ValidationObserver
  },
  props: {
    name: {
      type: String,
      required: true
    },
    buttonText: {
      type: String,
      required: true
    },
    successMessage: {
      type: String,
      required: true
    },
    subscribeAction: {
      type: Function as PropType<(email: string) => Promise<Task>>,
      required: true
    }
  },
  data () {
    return {
      email: '',
      isSubmitting: false
    };
  },
  computed: {
    emailInputName (): string {
      return this.name + '-email-input';
    }
  },
  methods: {
    async onSubmitForm (): Promise<void> {
      if (this.isSubmitting) {
        return;
      }

      this.isSubmitting = true;

      try {
        const response = await this.subscribeAction(this.email);

        if (response.result.errorMessage) {
          const validationObserver = this.$refs.validationObserver as InstanceType<typeof ValidationObserver>;

          validationObserver.setErrors({
            [this.emailInputName]: response.result.errorMessage
          })
          return;
        }
      } finally {
        this.isSubmitting = false;
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.subscription-form {
  ._form {
    display: flex;
    flex-direction: column;
    align-items: center;

    ._input {
      flex: unset;
      width: 100%;
    }

    ._button {
      margin-top: var(--spacer-sm);
    }
  }

  .m-spinner-button {
    margin-left: var(--spacer-base);
    --button-font-size: var(--font-xs);
    --button-padding: calc(var(--spacer-base) * 0.56) var(--spacer-base);
  }
}
</style>
