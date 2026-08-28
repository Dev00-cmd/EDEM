// ═══════════════════════════════════════════════════════════════
//  CONFIGURATION DYNAMIQUE
//
//  Toute la configuration réelle vit dans app.json. Ce fichier ne
//  fait qu'une chose : retirer la configuration des mises à jour
//  quand on démarre POUR EXPO GO.
//
//  Pourquoi : Expo Go n'embarque pas expo-updates. Il n'accepte que
//  les projets dont le runtime vaut « exposdk:<version> ». Or
//  app.json déclare « runtimeVersion: 1.1.0 » — indispensable aux
//  mises à jour OTA en production, mais Expo Go refuse alors
//  d'ouvrir le projet.
//
//  On ne retire donc ces deux clés QUE si EXPO_GO=1 est présent
//  dans l'environnement. Les builds EAS et les mises à jour OTA,
//  eux, ne définissent jamais cette variable : ils reçoivent la
//  configuration d'app.json intacte.
//
//  Usage :  npm run go        (voir package.json)
// ═══════════════════════════════════════════════════════════════

module.exports = ({ config }) => {
  if (process.env.EXPO_GO === '1') {
    delete config.updates;
    delete config.runtimeVersion;
  }
  return config;
};
