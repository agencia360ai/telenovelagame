import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { useFleet, FLEET_KINDS, FLEET_UNITS } from "../context/FleetContext";
import { UnitIcon } from "./UnitIcon";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

/**
 * Lobby fleet strip — a small card per UNLOCKED unit plus a FLEET button that
 * opens the roster window with EVERY unit and its unlock progress. Purely
 * informational: units are not a resource, nothing is bought or counted.
 */
export function FleetPanel() {
  const fleet = useFleet();
  const [rosterOpen, setRosterOpen] = useState(false);
  const unlocked = FLEET_KINDS.filter((k) => fleet.isUnlocked(k));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          {unlocked.map((kind) => (
            <View key={kind} style={styles.card}>
              <UnitIcon kind={kind} emoji={FLEET_UNITS[kind].icon} size={20} />
              <Text style={styles.name}>{FLEET_UNITS[kind].label}</Text>
            </View>
          ))}
        </ScrollView>
        <Pressable style={styles.fleetBtn} onPress={() => setRosterOpen(true)}>
          <Text style={styles.fleetBtnText}>FLEET</Text>
        </Pressable>
      </View>

      {/* Roster window — every unit with its unlock status. */}
      <Modal
        visible={rosterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRosterOpen(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setRosterOpen(false)}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>FLEET</Text>

            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator
              indicatorStyle="white"
            >
              {FLEET_KINDS.map((kind) => {
                const cfg = FLEET_UNITS[kind];
                const locked = !fleet.isUnlocked(kind);
                return (
                  <View key={kind} style={styles.rosterRow}>
                    {locked ? (
                      <Text style={styles.rosterIcon}>🔒</Text>
                    ) : (
                      <UnitIcon kind={kind} emoji={cfg.icon} size={28} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rosterName}>{cfg.label}</Text>
                      {locked ? (
                        <Text style={styles.rosterSub}>
                          Unlocks at {cfg.unlock} calls —{" "}
                          {fleet.callsCompleted}/{cfg.unlock}
                        </Text>
                      ) : (
                        <Text style={styles.rosterReady}>Ready to dispatch</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              style={styles.closeBtn}
              onPress={() => setRosterOpen(false)}
            >
              <Text style={styles.closeText}>CLOSE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: sizes.spacing.md, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "stretch", gap: 6 },
  scrollRow: { gap: 6, alignItems: "stretch", paddingRight: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.dispatch.panelLight,
    borderColor: colors.dispatch.border,
    borderWidth: 1,
    borderRadius: sizes.radius.md,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  name: { color: colors.dispatch.text, fontSize: 11, fontWeight: "800" },
  fleetBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "rgba(34, 211, 238, 0.14)",
    borderColor: "rgba(34, 211, 238, 0.4)",
    borderWidth: 1,
    borderRadius: sizes.radius.md,
  },
  fleetBtnText: {
    color: colors.dispatch.cyan,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Roster modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: sizes.spacing.lg,
  },
  sheet: {
    backgroundColor: colors.dispatch.panel,
    borderColor: colors.dispatch.border,
    borderWidth: 1,
    borderRadius: sizes.radius.lg,
    padding: sizes.spacing.md,
    gap: 10,
    maxHeight: "80%",
  },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetTitle: {
    color: colors.dispatch.cyan,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  rosterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.dispatch.panelLight,
    borderColor: colors.dispatch.border,
    borderWidth: 1,
    borderRadius: sizes.radius.md,
    padding: 10,
    marginBottom: 8,
  },
  rosterIcon: { fontSize: 24 },
  rosterName: { color: colors.dispatch.text, fontSize: 14, fontWeight: "800" },
  rosterSub: { color: colors.dispatch.amber, fontSize: 11, fontWeight: "600" },
  rosterReady: { color: colors.dispatch.answer, fontSize: 11, fontWeight: "600" },
  closeBtn: {
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: colors.dispatch.panelLight,
    borderRadius: sizes.radius.md,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
  },
  closeText: {
    color: colors.dispatch.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
