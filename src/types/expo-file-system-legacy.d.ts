// The download manager loads expo-file-system's legacy API lazily so the app
// still builds before the package is installed. This ambient declaration keeps
// the type checker happy without forcing the dependency to be present.
declare module "expo-file-system/legacy";
