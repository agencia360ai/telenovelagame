const _consoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Could not access feature flag')) {
    return;
  }
  _consoleError(...args);
};

const { registerRootComponent } = require('expo');
const { default: App } = require('./App');

registerRootComponent(App);
