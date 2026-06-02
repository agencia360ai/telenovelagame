import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ?? "";
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ?? "";

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function getMediaUrl(key: string): string {
  const cdnBase = Constants.expoConfig?.extra?.cdnBase;
  if (cdnBase) {
    return `${cdnBase}/${key}`;
  }
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/media/${key}`;
  }
  return key;
}
