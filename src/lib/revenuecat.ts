import Constants from "expo-constants";

const isMock = Constants.expoConfig?.extra?.mockIAP ?? true;

export type GemPack = {
  id: string;
  gems: number;
  price: string;
  label: string;
};

export const GEM_PACKS: GemPack[] = [
  { id: "gems_20", gems: 20, price: "$1.99", label: "20 Gemas" },
  { id: "gems_50", gems: 50, price: "$3.99", label: "50 Gemas" },
  { id: "gems_120", gems: 120, price: "$7.99", label: "120 Gemas" },
  { id: "gems_300", gems: 300, price: "$14.99", label: "300 Gemas" },
];

export async function purchaseGemPack(
  packId: string
): Promise<{ success: boolean; gems: number }> {
  const pack = GEM_PACKS.find((p) => p.id === packId);
  if (!pack) return { success: false, gems: 0 };

  if (isMock) {
    console.log(`[RevenueCat Mock] Purchased ${pack.label}`);
    return { success: true, gems: pack.gems };
  }

  console.log("[RevenueCat] Real purchase not implemented yet");
  return { success: false, gems: 0 };
}

export async function restorePurchases(): Promise<void> {
  if (isMock) {
    console.log("[RevenueCat Mock] Restore purchases");
    return;
  }
}
