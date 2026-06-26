import React, { useEffect } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { CinematicImage } from "../components/CinematicImage";
import { IMAGES } from "../game/assets";

type Props = NativeStackScreenProps<RootStackParamList, "IntroCinematic">;

// The "NIGHT SHIFT" establishing shot, shown after the prologue (first launch)
// or on its own (subsequent launches), right before the dispatch menu.
const INTRO_IMAGE_KEY = "dispatch-center";

export function IntroCinematicScreen({ navigation }: Props) {
  const goToMenu = () => navigation.replace("DispatchLobby");

  // If the image asset is missing, don't trap the player — go straight to menu.
  useEffect(() => {
    if (!IMAGES[INTRO_IMAGE_KEY]) goToMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!IMAGES[INTRO_IMAGE_KEY]) return null;

  return (
    <CinematicImage
      source={IMAGES[INTRO_IMAGE_KEY]}
      tag="DISPATCH CENTER · LIVE"
      title="NIGHT SHIFT"
      caption="The city is calling. Every second counts, operator."
      onComplete={goToMenu}
    />
  );
}
