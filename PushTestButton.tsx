import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Constants from "expo-constants";
import { LogLevel, OneSignal } from "react-native-onesignal";

/**
 * Inicializa o OneSignal (uma vez) e expõe um botão de teste que solicita
 * a permissão de notificação no Android/iOS via optIn().
 */
export function usePushSetup(userId?: string | null) {
  useEffect(() => {
    const appId = (Constants.expoConfig?.extra as { oneSignalAppId?: string } | undefined)?.oneSignalAppId;
    if (!appId || appId.startsWith("COLE_AQUI")) return;
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    OneSignal.initialize(appId);
    if (userId) OneSignal.login(userId);
  }, [userId]);
}

export default function PushTestButton() {
  const [status, setStatus] = useState<string>("aguardando");

  useEffect(() => {
    const listener = (event: { current: { optedIn: boolean; id?: string | null } }) => {
      setStatus(event.current.optedIn ? `inscrito (${event.current.id?.slice(0, 8) ?? "?"}…)` : "não inscrito");
    };
    OneSignal.User.pushSubscription.addEventListener("change", listener);
    return () => OneSignal.User.pushSubscription.removeEventListener("change", listener);
  }, []);

  const onPress = async () => {
    setStatus("solicitando permissão…");
    try {
      OneSignal.User.pushSubscription.optIn(); // Android 13+: abre o prompt POST_NOTIFICATIONS
      const granted = await OneSignal.Notifications.requestPermission(true);
      setStatus(granted ? "permissão concedida ✓" : "permissão negada");
    } catch (error) {
      setStatus(`erro: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Pressable onPress={onPress} style={{ backgroundColor: "#00a844", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "800" }}>🔔 Testar notificação (OneSignal optIn)</Text>
      </Pressable>
      <Text style={{ color: "#89a193", fontSize: 12 }}>Status: {status}</Text>
    </View>
  );
}
