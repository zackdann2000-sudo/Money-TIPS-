# GreenScore — app Expo (OneSignal)

Este site é Next.js (web). Esta pasta contém o que é necessário para o app **Expo/React Native**
quando ele for criado. Nada aqui é usado pelo site.

## Instalação (dentro do projeto Expo)

```bash
npx create-expo-app greenscore-mobile && cd greenscore-mobile
npx expo install onesignal-expo-plugin react-native-onesignal expo-constants
# copie mobile/app.json (ajuste nome/slug) e mobile/components/PushTestButton.tsx
npx expo prebuild            # o plugin exige dev client / build nativo (não funciona no Expo Go)
npx expo run:android
```

1. Em `app.json`, substitua `COLE_AQUI_SEU_ONESIGNAL_APP_ID` pelo App ID do painel OneSignal
   (Settings → Keys & IDs). Em produção troque `"mode": "development"` por `"production"`.
2. O botão `PushTestButton` chama `OneSignal.User.pushSubscription.optIn()` — no Android 13+
   isso dispara o pedido de permissão `POST_NOTIFICATIONS`.
3. Para vincular o dispositivo ao usuário do site, chame `OneSignal.login(String(userId))`
   após o login (o site web já faz o mesmo com o SDK web).
