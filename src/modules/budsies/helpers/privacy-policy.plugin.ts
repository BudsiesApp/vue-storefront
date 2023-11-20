import Vue from 'vue';
import config from 'config';

const PrivacyPolicyPlugin = {
  install () {
    if (!Vue.prototype.$privacyPolicy) {
      Object.defineProperties(Vue.prototype, {
        $privacyPolicy: {
          get: function () {
            return config.budsies.privacyPolicy;
          }
        }
      })
    }
  }
}

export {
  PrivacyPolicyPlugin
}
