const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// mp4 is in Metro's default assetExts, but we add it explicitly since we now
// bundle short intro clips via require().
config.resolver.assetExts.push("glb", "gltf", "mp4");

module.exports = config;
