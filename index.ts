import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Could not access feature flag']);

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
