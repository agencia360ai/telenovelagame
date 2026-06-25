# Plan de acción — Editor → exportar misiones en `mission@1`

## Contexto / problema
El editor `editor-dispatcher-v2.html` autora diálogos y exporta `dispatcher-game.json` en un
**esquema de autoría** (story-style): `game_plot.{prologue, weeks[].plot_call, weeks[].weekend}`
y `daily_calls.library`, con beats `dialogue|decision|cliffhanger|chapter_end`, `decision.choices`,
`characters_on_scene`, `background`, `media`, `effects`.

El juego consume otro esquema: **`mission@1`** (`src/content/missions/*.json`) con `schema`,
`caller`, `units`, `assets`, beats `dialogue|decision|dispatch|outcome` y choices a nivel de beat.
Hasta hoy la conversión se hizo **a mano** y solo para algunas daily calls; **no existía migrador**.

Objetivo: el editor exporta también `mission@1`, **sin cambios visuales** (los autores ya conocen
la UI).

## Decisiones tomadas (con el usuario)
1. Convertir **daily + plot + weekend**.
2. **Mismo botón "Exportar JSON"**: baja 2 archivos (autoría intacto + misiones convertidas).
3. Detectar dispatch/unidad por **`tags.unit` + outcomes estándar**, con **validación y aviso**.

## Convención de conversión (derivada de `src/content/missions/caso_cocina.json`)
- El **último `decision`** (el de "Dispatch") → beat `type:"dispatch"` con `correct` desde
  `tags.unit`, `explanation` = narración del final bueno, `next:"_outcome"`.
- Los `chapter_end` (fin_ok/fin_bad/fin_ignore) se **descartan** (su texto bueno va a `explanation`).
- Beat único `{id:"_outcome", type:"outcome", deploy_media:{key:"deploy-<unidad>", role:"deploy"}}`.
- `speaker:"voice"`→`"caller"`; se quitan `background`, `characters_on_scene`, `media` por-beat;
  se conservan `effects`/`gem_cost`/`premium`. `decision.prompt`→`beat.prompt`,
  `decision.choices`→`beat.choices`.
- Narrativa (plot/weekend, sin dispatch): se conserva el grafo; los `chapter_end` se conservan
  como `dialogue` que fluyen a un único `outcome` terminal `_end`.

### Mapas
- `fire→firefighters`, `police→police`, `ambulance→ambulance`, `animal_control→animal_control`,
  `none→no_unit` (todos válidos en `DispatchType`, `src/game/types.ts`).
- `category` (calendario) desde `kind`: `daily_call→daily`, `plot_call|prologue→game_plot`,
  `weekend→weekend`.
- `reward` por dificultad `{1:5, 2:8, 3:12}`; `time_limit_seconds:15`.

## Implementado en el editor (solo dentro de `<script>`)
- Bloque convertidor `toMission1(chap, gameMeta)` + helpers `m1_*` (detección de dispatch,
  explicación, caller, assets, variables, narrativa).
- `m1_validate(...)` acumula avisos (daily sin `tags.unit`, sin dispatch detectable, ids duplicados)
  y los muestra con `alert` al exportar (sin UI nueva).
- El handler de `#exp` ahora descarga **dos** archivos: `dispatcher-game.json` (autoría, idéntico)
  y `dispatcher-missions.json` = `{ missions: mission@1[], calendar: { game_plot_sequence,
  week_template_hint } }`.
- Se restauró el **UTF‑8** correcto de la UI (·, ▲, ▼, →, ✕, ⠿, ▶) que el traspaso había roto;
  ningún cambio de layout/estilo.

## Dependencias del proyecto
1. ✅ **Hecho** — `src/screens/MissionScreen.tsx`: maneja misiones que terminan en `outcome`
   **sin** `dispatch` (narrativas): conserva líneas de `narrator`, cierra con tarjeta
   "SCENE COMPLETE", otorga XP y llama `calendar.completeMission(id, true)`.
2. ✅ **Hecho** — `MissionScreen.senderName` usa el mapa opcional `Mission.speakers`
   (`src/lib/missions/types.ts`); el editor exporta ese mapa desde `characters`.
3. ⏳ **Pendiente (contenido)** — Poblar `GAME_PLOT_SEQUENCE`
   (`src/content/calendar/gamePlot.ts`) y el pool `weekend` con los nuevos ids, y registrar las
   misiones en `src/content/missions/index.ts`. Esto se hace al volcar el export del editor.
4. ⏳ **Pendiente (assets)** — Las `assets[].key` sintetizadas (`deploy-<unidad>`, o la key del
   `media` de autoría) deben existir en `src/game/assets.ts` o caerán al fallback de video.

## Verificación
1. Abrir el editor → Importar `dispatcher-game.json` → **Exportar JSON** → bajan **2** archivos.
2. `dispatcher-missions.json` trae `{missions, calendar}`.
3. Copiar 1–2 `missions[]` a `src/content/missions/<id>.json`, registrarlas en `index.ts`,
   correr `npm run validate-missions` → válidas (incluye `category`).
4. `npx tsc --noEmit` sin errores (los `correct` mapeados son `DispatchType` válidos).
5. Forzar una daily sin `tags.unit` y exportar → `alert` listando el capítulo.
