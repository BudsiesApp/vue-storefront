const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const manifest = require(path.join(root, 'package.json'))
const lock = fs.readFileSync(path.join(root, 'yarn.lock'), 'utf8')
const shared = manifest.dependencies['@storefront-ui/shared']
const vue = manifest.dependencies['@storefront-ui/vue']
const prefix = 'https://github.com/BudsiesApp/storefront-ui/releases/download/'

const installedVue = require(path.join(root, 'node_modules/@storefront-ui/vue/package.json'))

function verify (sharedUrl, vueUrl, lockfile, indirectShared) {
  assert.match(sharedUrl, /^https:\/\/github\.com\/BudsiesApp\/storefront-ui\/releases\/download\/packages-[^/]+\/storefront-ui-shared\.tgz$/)
  assert.strictEqual(vueUrl, sharedUrl.replace('storefront-ui-shared.tgz', 'storefront-ui-vue.tgz'))
  assert(sharedUrl.startsWith(prefix))
  assert(lockfile.includes(sharedUrl) && lockfile.includes(vueUrl))
  assert(!lockfile.includes('gitpkg-budsies-xi.vercel.app'))
  assert.strictEqual(indirectShared, sharedUrl)
}

verify(shared, vue, lock, installedVue.dependencies['@storefront-ui/shared'])
const oldShared = 'https://gitpkg-budsies-xi.vercel.app/BudsiesApp/storefront-ui/packages/shared?3ff374628936ba579a9bbb2a634c6c3ce9db6ac5'
assert.throws(() => verify(oldShared, vue, lock, oldShared))
assert.throws(() => verify(shared, vue, lock, oldShared))
assert.throws(() => verify(shared, vue, lock + oldShared, shared))
assert(!installedVue.scripts.postinstall && !installedVue.scripts.prepublish)
console.log('Storefront UI release dependency contract passed')
