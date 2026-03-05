const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  'react-native-svg': 'react-native-svg',
};

module.exports = config;
