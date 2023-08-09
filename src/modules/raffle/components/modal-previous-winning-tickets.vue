<template>
  <div class="raffle-modal-previous-winning-tickets">
    <SfModal
      class="_modal"
      :visible="isVisible"
      :title="$t('Winning Tickets')"
      @close="closeModal"
    >
      <SfHeading
        class="desktop-only"
        :level="3"
        :title="$t('Winning Tickets')"
      />

      <ul class="_tickets-list">
        <li class="_ticket" v-for="ticket in tickets" :key="ticket">
          {{ ticket }}
        </li>
      </ul>
    </SfModal>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { SfHeading, SfModal } from '@storefront-ui/vue';

import { SN_RAFFLE } from '../types/store-name';
import { GET_LAST_WINNING_TICKETS } from '../types/getter';

export default Vue.extend({
  name: 'RaffleModalPreviousWinningTickets',
  components: {
    SfHeading,
    SfModal
  },
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    modalData: {
      type: Object,
      default: () => ({}),
      required: true
    }
  },
  computed: {
    tickets (): string {
      return this.$store.getters[`${SN_RAFFLE}/${GET_LAST_WINNING_TICKETS}`];
    }
  },
  methods: {
    closeModal () {
      this.$emit('close', this.modalData.name)
    }
  }
})
</script>

<style lang="scss" scoped>
@import '~@storefront-ui/shared/styles/helpers/breakpoints';

.raffle-modal-previous-winning-tickets {
  ._tickets-list {
    list-style: none;
    display: inline-block;

    ._ticket {
      display: inline-block;
      text-align: left;
      width: 8em;
    }
  }

  @include for-desktop {
    ._modal {
      --modal-width: 100%;
    }

    ._tickets-list {
      margin-top: var(--spacer-lg);
    }

    ::v-deep{
      .sf-modal__container {
        max-width: 42rem;
      }
    }
  }
}
</style>
