/** @jest-environment node */
import Vue from 'vue';
import VueMeta from 'vue-meta';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { serverHarness } from './fixtures/output-cache';

Vue.use(VueMeta);

it('bypasses the real template for an unrendered root while retaining output hooks', async () => {
  const root = new Vue({ render: h => h('div') });
  const meta = root.$meta();
  const compile = require('lodash.template');
  const template = compile(readFileSync(resolve('src/themes/petsies-capybara/templates/index.template.html'), 'utf8'), {
    interpolate: /{{{([\s\S]+?)}}}/g
  });
  expect(() => template({ meta })).toThrow();
  let ctx;
  const h = serverHarness(value => {
    ctx = value;
    value.meta = meta;
    value.output.redirect = { path: '/target/', code: 301 };
    return '<div></div>';
  });
  h.processOutput.mockImplementation(() => template(ctx));
  h.hooks.beforeOutputRenderedResponse.mockImplementation(output => {
    ctx.server.response.setHeader('Surrogate-Key', 'redirect');
    return { output };
  });
  const res = await h.visit('/page/');
  expect(res.get('location')).toBe('/target/');
  expect(res.get('surrogate-key')).toBe('redirect');
  expect(h.processOutput).not.toHaveBeenCalled();
  expect(h.hooks.beforeOutputRenderedResponse).toHaveBeenCalledTimes(1);
  expect(h.hooks.afterOutputRenderedResponse).toHaveBeenCalledTimes(1);
});
