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
        {{ $t('Refer Friends to') }}
        <br>
        {{ $t('Get More Tickets') }}
      </li>
    </ul>

    <p>
      {{ $t('We will email you when your ticket is called and a spot has opened for your Specialty Commissions creation. Once your ticket is chosen, you will be able to submit your order. Raffle drawings will occur on a weekly basis until every ticket holder has been called.') }}
    </p>

    <SfHeading
      :level="2"
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

    <ul class="_list">
      <li>
        {{ $t('More registrants from your unique link = more tickets + better odds for you!') }}
      </li>

      <li>
        {{ $t('When anyone clicks this link and reserves their spot, you will receive an additional ticket.') }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import ParticipantData from '../models/participant-data.model';
import Ticket from '../models/ticket.model';

export default Vue.extend({
  name: 'RafflePending',
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
.raffle-pending {
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
}
</style>
