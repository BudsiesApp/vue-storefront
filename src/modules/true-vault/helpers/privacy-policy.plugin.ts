import Vue from 'vue';

const PrivacyPolicyPluginFactory = (config: any) => ({
  install () {
    if (!Vue.prototype.$privacyPolicy) {
      Object.defineProperties(Vue.prototype, {
        $privacyPolicy: {
          get: function () {
            return config.privacyPolicy;
          }
        }
      })
    }
  }
})

export {
  PrivacyPolicyPluginFactory
}
