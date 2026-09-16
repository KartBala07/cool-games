const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { webcrypto } = require('node:crypto');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../app.js'), 'utf8');

// Execute the entire browser script, including startup, with small DOM/canvas stubs.
function setup(crypto = webcrypto) {
  const drawing = new Proxy({}, { get: () => () => drawing, set: () => true });
  function element() {
    const classes = new Set();
    return {
      hidden: false, children: [], dataset: {}, attributes: {}, handlers: {},
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
      },
      addEventListener(name, callback) { this.handlers[name] = callback; },
      setAttribute(name, value) { this.attributes[name] = value; },
      append(...children) { this.children.push(...children); },
      getContext: () => drawing,
      close() { this.open = false; },
      click() { this.onclick?.(); },
    };
  }
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  get('pin-dots').children = Array.from({ length: 4 }, element);
  get('arcade').hidden = true;
  const document = Object.assign(element(), {
    hidden: false, getElementById: get, createElement: element, querySelectorAll: () => [],
  });
  const location = { protocol: 'https:', href: 'https://example.test/cool-games/' };
  const window = Object.assign(element(), { location, scrollTo() {} });
  const context = vm.createContext({
    document, window, location, crypto, TextEncoder, Uint8Array, navigator: {},
    localStorage: { getItem() { return null; }, setItem() {} },
    setInterval() {}, cancelAnimationFrame() {}, requestAnimationFrame() {},
  });
  vm.runInContext(source, context);
  return { get, document, window, context, enter: code => vm.runInContext(
    `(async () => { for (const d of ${JSON.stringify(code)}) await digit(d); })()`, context),
  };
}

test('startup succeeds and the games passcode opens all six games', async () => {
  const app = setup();
  assert.equal(app.get('game-grid').children.length, 6);
  await app.enter('1807');
  assert.equal(app.get('arcade').hidden, false);
  assert.equal(app.get('lock-screen').hidden, true);
  app.get('game-grid').children[0].click();
  assert.equal(app.get('play-screen').hidden, false);
  assert.equal(app.get('start-button').textContent, "Let's play");
});

test('Instagram passcode navigates to Instagram without unlocking games', async () => {
  const app = setup();
  await app.enter('1857');
  assert.equal(app.window.location.href, 'https://www.instagram.com');
  assert.equal(app.get('arcade').hidden, true);
});

test('wrong code stays locked and allows a successful retry', async () => {
  const app = setup();
  await app.enter('0000');
  assert.equal(app.get('arcade').hidden, true);
  assert.equal(app.get('pin-message').textContent, "That code didn't match. Try again.");
  assert.equal(app.get('pin-dots').attributes['aria-label'], '0 of 4 digits entered');
  await app.enter('1807');
  assert.equal(app.get('arcade').hidden, false);
});

test('clear and delete let the user correct the code', async () => {
  const app = setup();
  await app.enter('99');
  app.get('clear-pin').click();
  assert.equal(app.get('pin-dots').attributes['aria-label'], '0 of 4 digits entered');
  await app.enter('189');
  app.get('delete-pin').click();
  await app.enter('07');
  assert.equal(app.get('arcade').hidden, false);
});

test('leaving the window relocks the arcade', async () => {
  const app = setup();
  await app.enter('1807');
  app.window.handlers.blur();
  assert.equal(app.get('arcade').hidden, true);
  assert.equal(app.get('lock-screen').hidden, false);
});

test('a pending passcode cannot unlock or redirect after locking', async () => {
  for (const code of ['1807', '1857']) {
    let complete;
    const app = setup({ subtle: { digest: (...args) => new Promise(resolve => {
      complete = async () => resolve(await webcrypto.subtle.digest(...args));
    }) } });
    await app.enter(code.slice(0, 3));
    const pending = app.enter(code.slice(3));
    app.window.handlers.blur();
    await complete();
    await pending;
    assert.equal(app.get('arcade').hidden, true);
    assert.equal(app.window.location.href, 'https://example.test/cool-games/');
  }
});
