const _originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Could not access feature flag')) {
    return;
  }
  _originalConsoleError(...args);
};

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
