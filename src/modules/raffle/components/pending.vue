<template>
  <div class="raffle-pending">
    <SfHeading :level="2" :title="$t('Congrats!')" />

    <div class="_subtitle">
      {{ $t('You have the following ticket(s):') }}
    </div>

    <ul class="_tickets-list">
      <li
        class="_ticket"
        v-for="ticket in tickets"
        :key="ticket.code"
      >
        <div class="_code">
          {{ ticket.code }}
        </div>
      </li>

      <li class="_more-tickets">
        <div class="_text">
          {{ $t('Refer Friends to') }}
          <br>
          {{ $t('Get More Tickets') }}
        </div>
      </li>
    </ul>

    <p class="_email-notification">
      {{ $t('We will email you when your ticket is called and a spot has opened for your Specialty Commissions creation. Once your ticket is chosen, you will be able to submit your order. Raffle drawings will occur on a weekly basis until every ticket holder has been called.') }}
    </p>

    <SfHeading
      class="_title"
      :level="3"
      :title="$t('Share your link with your friends to earn more raffle tickets')"
    />

    <div class="_referral-link-container">
      <a
        class="_referral-link"
        :href="referralLink"
        target="_blank"
      >
        {{ referralLink }}
      </a>

      <div class="_referral-link-copy" />
    </div>

    <div class="_referral-mobile-hint">
      {{ $t('Tap & hold link to copy') }}
    </div>

    <ul class="_list">
      <li>
        {{ $t('More registrants from your unique link = more tickets + better odds for you!') }}
      </li>

      <li>
        {{ $t('When anyone clicks this link and reserves their spot, you will receive an additional ticket.') }}
      </li>
    </ul>

    <m-social-icons class="_social-icons" />

    <SfHeading
      class="_title _good-luck"
      :level="3"
      :title="$t('Good luck!')"
    />
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import { SfHeading } from '@storefront-ui/vue';

import ParticipantData from '../models/participant-data.model';
import Ticket from '../models/ticket.model';

export default Vue.extend({
  name: 'RafflePending',
  components: {
    SfHeading
  },
  props: {
    participantData: {
      type: Object as PropType<ParticipantData>,
      required: true
    }
  },
  computed: {
    tickets (): Ticket[] {
      return this.participantData.tickets;
    },
    referralLink (): string {
      return this.participantData.referralLink;
    }
  }
})
</script>

<style lang="scss" scoped>
@import '~@storefront-ui/shared/styles/helpers/breakpoints';

.raffle-pending {

  ._subtitle {
    color: var(--c-warning);
    font-weight: var(--font-bold);
    text-align: center;
    margin-top: var(--spacer-base);
  }

  ._tickets-list {
    margin-top: var(--spacer-base);
    text-align: center;
    list-style: none;
  }

  ._ticket {
    background-image: url(../assets/ticket_background_left.png);
    background-position-x: left;
    background-repeat: no-repeat;
    display: inline-block;
    height: 100px;
    margin-bottom: 1em;
    max-width: 310px;
    min-width: 180px;
    overflow: hidden;
  }

  ._more-tickets {
    background-image: url(../assets/transparent_ticket.png);
    display: inline-block;
    height: 100px;
    margin-bottom: 1em;
    overflow: hidden;
    text-align: center;
    width: 210px;
    font-weight: var(--font-bold);

    ._text {
      margin-top: var(--spacer-base);
    }
  }

  ._email-notification {
    margin-top: var(--spacer-lg);
  }

  ._code {
    background-image: url(../assets/ticket_background_right.png);
    background-position-x: right;
    background-repeat: no-repeat;
    color: #6e3f43;
    display: block;
    font-size: 20px;
    font-weight: bold;
    line-height: 100px;
    margin-left: 55px;
    padding-right: 55px;
  }

  ._title {
    --heading-title-font-size: var(--font-xl);
  }

  ._referral-link-container {
    text-align: center;
    margin-top: var(--spacer-sm);

    ._referral-link {
      color: var(--c-primary);
    }

    ._referral-link-copy {
      background: url(../assets/btn-copy.png) no-repeat center center;
      cursor: pointer;
      display: none;
      height: 3.5em;
      vertical-align: middle;
      width: 2.5em;
    }
  }

  ._referral-mobile-hint {
    margin-top: var(--spacer-sm);
    font-size: var(--font-sm);
    text-align: center;
  }

  ._list {
    margin-top: var(--spacer-sm);
  }

  ._good-luck {
    margin-top: var(--spacer-xl);
  }

  @include for-desktop {
    ._referral-link-container {
      ._referral-link-copy {
        display: inline-block;
      }
    }

    ._referral-mobile-hint {
      display: none;
    }
  }
}
</style>
