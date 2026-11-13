const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const manifest = require(path.join(root, 'package.json'))
const lock = fs.readFileSync(path.join(root, 'yarn.lock'), 'utf8')
const shared = manifest.dependencies['@storefront-ui/shared']
const vue = manifest.dependencies['@storefront-ui/vue']

const installedVue = require(path.join(root, 'node_modules/@storefront-ui/vue/package.json'))

function verify (sharedUrl, vueUrl, lockfile, indirectShared) {
  assert.match(sharedUrl, /^https:\/\/github\.com\/BudsiesApp\/storefront-ui\/releases\/download\/(?:packages-[^/]+|package-preview-[a-f0-9]{64}|(?:[A-Za-z0-9._~-]|%[0-9A-Fa-f]{2})+_[a-f0-9]{7})\/storefront-ui-shared\.tgz$/)
  assert.strictEqual(vueUrl, sharedUrl.replace('storefront-ui-shared.tgz', 'storefront-ui-vue.tgz'))
  assert(lockfile.includes(sharedUrl) && lockfile.includes(vueUrl))
  assert(!lockfile.includes('gitpkg-budsies-xi.vercel.app'))
  assert.strictEqual(indirectShared, sharedUrl)
}

verify(shared, vue, lock, installedVue.dependencies['@storefront-ui/shared'])
const stableShared = 'https://github.com/BudsiesApp/storefront-ui/releases/download/optimuspro_123abcd/storefront-ui-shared.tgz'
const stableVue = stableShared.replace('storefront-ui-shared.tgz', 'storefront-ui-vue.tgz')
verify(stableShared, stableVue, stableShared + stableVue, stableShared)
const branchShared = stableShared.replace('optimuspro_123abcd', 'feature%2Fcheckout_123abcd')
const branchVue = branchShared.replace('storefront-ui-shared.tgz', 'storefront-ui-vue.tgz')
verify(branchShared, branchVue, branchShared + branchVue, branchShared)
assert.throws(() => verify(branchShared.replace('%2F', '/'), branchVue, branchShared + branchVue, branchShared))
assert.throws(() => verify(stableShared.replace('123abcd', '123abcg'), stableVue, stableShared + stableVue, stableShared))
const previewShared = `https://github.com/BudsiesApp/storefront-ui/releases/download/package-preview-${'a'.repeat(64)}/storefront-ui-shared.tgz`
const previewVue = previewShared.replace('storefront-ui-shared.tgz', 'storefront-ui-vue.tgz')
verify(previewShared, previewVue, previewShared + previewVue, previewShared)
assert.throws(() => verify(previewShared, vue, previewShared + vue, previewShared))
assert.throws(() => verify(previewShared, previewVue, previewShared + previewVue, shared))
assert.throws(() => verify(previewShared.replace('a'.repeat(64), 'g'.repeat(64)), previewVue, previewShared + previewVue, previewShared))
const oldShared = 'https://gitpkg-budsies-xi.vercel.app/BudsiesApp/storefront-ui/packages/shared?3ff374628936ba579a9bbb2a634c6c3ce9db6ac5'
assert.throws(() => verify(oldShared, vue, lock, oldShared))
assert.throws(() => verify(shared, vue, lock, oldShared))
assert.throws(() => verify(shared, vue, lock + oldShared, shared))
assert(!installedVue.scripts.postinstall && !installedVue.scripts.prepublish)
console.log('Storefront UI release dependency contract passed')
