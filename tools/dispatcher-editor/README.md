# Dispatcher Editor

Editor de diálogos (HTML standalone) para autorar el contenido de DISPATCHER: el **arco
principal** (`Game Plot`) y el **pool de llamadas** (`Daily Calls`). Corre en el navegador, sin
servidor ni dependencias.

## Archivos
- `editor-dispatcher-v2.html` — el editor. Ábrelo con doble clic en cualquier navegador.
- `ACTION-PLAN.md` — plan de la actualización que añadió la exportación a `mission@1`.
- `README.md` — este archivo.

## Uso
1. Abre `editor-dispatcher-v2.html`.
2. **Importar** un `dispatcher-game.json` existente, o empezar de cero.
3. Edita capítulos/beats. El trabajo se autoguarda en `localStorage` del navegador.
4. **Exportar JSON** descarga **dos** archivos:
   - **`dispatcher-game.json`** — formato de autoría (el de siempre). Es el que vuelves a
     **Importar** en el editor: es la fuente editable y redondea (round-trip).
   - **`dispatcher-missions.json`** — formato **`mission@1`** que consume el juego (ver abajo).

> El navegador puede preguntar "¿permitir descargar varios archivos?" la primera vez. Acepta.

## Qué contiene `dispatcher-missions.json`
```jsonc
{
  "missions": [ /* una entrada mission@1 por capítulo (daily, plot y weekend) */ ],
  "calendar": {
    "game_plot_sequence": [ { "missionId": "w1_plot" }, ... ], // orden de la trama por semana
    "week_template_hint": { "months": 3, "weeks": 12, "daily_calls_per_day": 3 }
  }
}
```

### Cómo se convierte (resumen)
| Autoría | `mission@1` |
| --- | --- |
| `kind: daily_call / plot_call / weekend` | `category: daily / game_plot / weekend` |
| último `decision` que lleva a finales | beat `type: "dispatch"` (`correct` = `tags.unit`) |
| `tags.unit` (`fire`,`police`,`ambulance`,`animal_control`,`none`) | `firefighters`/`police`/`ambulance`/`animal_control`/`no_unit` |
| narración del final bueno | `explanation` del dispatch |
| `chapter_end` (finales) | se colapsan en un beat `outcome` |
| `speaker: "voice"` | `speaker: "caller"` |
| `decision.prompt` / `decision.choices` | `prompt` / `choices` a nivel de beat |

Las llamadas **daily** terminan en un `dispatch` + `outcome`. Los capítulos **narrativos**
(plot/weekend) no tienen dispatch: conservan su grafo y terminan en un `outcome`.

### Avisos al exportar
Si una daily call no tiene `tags.unit`, no se detecta su dispatch, o hay ids duplicados, el export
muestra un `alert` listando los capítulos a revisar (igual exporta).

## Llevar las misiones al juego
1. Toma cada entrada de `missions[]` y guárdala como `src/content/missions/<id>.json`.
2. Regístrala en `src/content/missions/index.ts` (`BUNDLED_MISSIONS`).
3. `npm run validate-missions` para verificar el esquema.
4. Para la trama, copia `calendar.game_plot_sequence` a
   `src/content/calendar/gamePlot.ts` (`GAME_PLOT_SEQUENCE`).

## Limitaciones conocidas (ver `ACTION-PLAN.md`)
- Los capítulos **narrativos** (plot/weekend) son `mission@1` válidos, pero para ser **jugables**
  de punta a punta requieren un ajuste en `MissionScreen` (manejar misiones sin `dispatch`) y un
  mapa de nombres de speakers (mara/grandma/lily).
- Las `assets[].key` se sintetizan por convención (`deploy-<unidad>` y la `key` del `media` de
  autoría); deben existir en `src/game/assets.ts` o caerán al fallback de video.
