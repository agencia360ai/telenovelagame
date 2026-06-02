import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlayerState } from "./engine/types";
import { supabase } from "./supabase";

const PLAYER_STATE_KEY = "player_state";

function stateKey(storyId: string): string {
  return `${PLAYER_STATE_KEY}:${storyId}`;
}

export async function loadPlayerState(
  storyId: string
): Promise<PlayerState | null> {
  const raw = await AsyncStorage.getItem(stateKey(storyId));
  if (!raw) return null;
  return JSON.parse(raw) as PlayerState;
}

export async function savePlayerState(state: PlayerState): Promise<void> {
  const json = JSON.stringify(state);
  await AsyncStorage.setItem(stateKey(state.story_id), json);
  mirrorToSupabase(state);
}

function mirrorToSupabase(state: PlayerState): void {
  if (!supabase) return;
  supabase
    .from("player_state")
    .upsert({
      user_id: state.user_id,
      story_id: state.story_id,
      current_chapter: state.current_chapter,
      current_beat: state.current_beat,
      variables: state.variables,
      flags: state.flags,
      gems: state.gems,
      choices_made: state.choices_made,
      completed_beats: state.completed_beats,
      updated_at: state.updated_at,
    })
    .then(
      () => {},
      () => {}
    );
}

export async function clearPlayerState(storyId: string): Promise<void> {
  await AsyncStorage.removeItem(stateKey(storyId));
}
