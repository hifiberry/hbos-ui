/**
 * The file enables to import all sandbox routes in a one-shot manner.
 * There should not be any reason to edit this file.
 */

/**
 * @typedef {Object} SandboxRoute
 * @property {string} path - The route path
 * @property {string} name - The route name
 * @property {Function} component - The component loader function
 */

const modules = import.meta.glob('./*.vue')

/** @type {SandboxRoute[]} */
const routes = []

delete modules['./index.vue']
delete modules['./bundle.vue']
delete modules['./example.vue']

for (const name in modules) {
  const path = name.replace(/(\.\/|\.vue)/g, '')
  routes.push({ path, name: `sandbox-${ path }`, component: (await modules[name]()).default })
}
export default routes
