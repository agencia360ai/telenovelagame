# Implementación: Orden explícito para `game_plot` y `weekend`

> Documento de implementación derivado del plan aprobado.
> Alcance: **Part A** (implementar orden por campo `order`). **Part B** queda como análisis (ver final), no se implementa aquí.

## Resumen del cambio

Hoy `Mission.order` existe pero nadie lo consume; `game_plot` se ordena con un array hardcodeado (`GAME_PLOT_SEQUENCE`) y `weekend` se sirve al azar. Tras este cambio:

- El campo **`order`** de la misión es la fuente de verdad del orden, autorado desde el editor.
- `game_plot` se sirve en orden ascendente de `order` (con `unlock` opcional migrado a la misión).
- `weekend` se sirve **secuencialmente** por `order`, con un puntero `weekendIndex` (espejo de `gamePlotIndex`).
- El editor emite `order` para plot/weekend y **alerta** si dos misiones de la misma categoría comparten `order`.
- `validate-missions` falla ante `order` duplicado por categoría (gate de CI).

**Principio de diseño:** las listas ordenadas se pasan por parámetro al scheduler (se mantiene puro). Esto deja la puerta abierta a "tracks" futuros (Part B) sin refactor.

---

## Orden de ejecución recomendado

1. Tipos (`types.ts`) — base para todo lo demás.
2. Secuenciador (`gamePlot.ts`).
3. Scheduler (`schedule.ts`) + tipos de calendario (`calendar/types.ts`).
4. Contexto (`CalendarContext.tsx`).
5. Editor HTML.
6. Validador CI.
7. Verificación end-to-end.

---

## 1. `src/lib/missions/types.ts`

**1.1** Actualizar el doc de `order` (≈línea 133) para que aplique a `game_plot` **y** `weekend`:

```ts
/** Orden de servido para misiones secuenciales (game_plot y weekend). Menor = primero. */
order?: number;
```

**1.2** Agregar campo opcional de gating (migración de lo que hoy vive en `GAME_PLOT_SEQUENCE`). Colocar junto a `order`:

```ts
/**
 * Gating opcional para misiones ordenadas (hoy honrado solo en game_plot).
 * Si la condición no se cumple esa semana, la entrada se reintenta más tarde.
 */
unlock?: { minRank?: number; minWeek?: number };
```

> No se añaden `track`/`pack`/`requires` (Part B).

---

## 2. `src/content/calendar/gamePlot.ts`

Reemplazar el contenido orientado a array por helpers puros sobre `Mission[]`.

**2.1** Eliminar `GAME_PLOT_SEQUENCE` y el tipo `GamePlotEntry`.

**2.2** Conservar `GamePlotContext` y reescribir `isPlotUnlocked` para operar sobre una misión:

```ts
import { Mission } from "../../lib/missions/types";

/** Context que el scheduler usa para evaluar el gating de una misión. */
export type GamePlotContext = { rankIndex: number; week: number };

/** Orden estable ascendente por `order` (ausente = 0). */
export function sortByOrder(missions: Mission[]): Mission[] {
  return [...missions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** ¿La misión está desbloqueada para esta semana/rango? */
export function isPlotUnlocked(m: Mission, ctx: GamePlotContext): boolean {
  const u = m.unlock;
  if (!u) return true;
  if (u.minRank !== undefined && ctx.rankIndex < u.minRank) return false;
  if (u.minWeek !== undefined && ctx.week < u.minWeek) return false;
  return true;
}
```

**2.3** Actualizar el comentario de cabecera del archivo: el orden ya no se mantiene a mano; viene del campo `order` autorado en el editor. Para agregar un capítulo: autorar una misión con `"category": "game_plot"` y su `order`.

> ⚠️ `armed-robbery.json` ya trae `"category": "game_plot"`, `"order": 1` pero está fuera de rotación (`void`) en [index.ts:54](../src/content/missions/index.ts). Sin cambios necesarios; queda compatible.

---

## 3. `src/lib/calendar/schedule.ts` y `src/lib/calendar/types.ts`

### 3.1 `calendar/types.ts`

- `WeekSchedule`: agregar
  ```ts
  /** La misión weekend colocada esta semana (null si no hay/agotadas). */
  weekendMissionId: string | null;
  ```
- `CalendarState`: agregar
  ```ts
  /** Cuántas entradas weekend se han consumido (puntero de secuencia). */
  weekendIndex: number;
  ```

### 3.2 `schedule.ts`

**Imports:** reemplazar el import de `GAME_PLOT_SEQUENCE`/`GamePlotEntry`/`isPlotUnlocked` por:

```ts
import { GamePlotContext, isPlotUnlocked } from "../../content/calendar/gamePlot";
```

**`resolveNextPlot`** — ahora recibe la lista ya ordenada:

```ts
export function resolveNextPlot(
  plotList: Mission[],
  plotIndex: number,
  ctx: GamePlotContext
): string | null {
  const m = plotList[plotIndex];
  if (!m) return null;
  return isPlotUnlocked(m, ctx) ? m.id : null;
}
```

**`resolveNextWeekend`** — nuevo, secuencial sin gating:

```ts
export function resolveNextWeekend(
  weekendList: Mission[],
  weekendIndex: number
): string | null {
  return weekendList[weekendIndex]?.id ?? null;
}
```

**`generateWeek`** — agregar parámetro `weekendMissionId`:

```ts
export function generateWeek(
  week: number,
  template: DayTemplate[],
  pools: MissionPools,
  plotMissionId: string | null,
  weekendMissionId: string | null,   // ← nuevo
  rng: Rng = Math.random
): WeekSchedule {
```

En el loop de slots, reemplazar la rama `weekend`:

```ts
} else if (kind === "weekend") {
  // Secuencial por `order`. Fallback a daily si no hay weekend autorado/agotado.
  id = weekendMissionId ?? drawFrom(pools.daily, usedDaily);
}
```

> El `usedWeekend` y `pools.weekend` dejan de usarse en la selección (el pool aleatorio se retira). Mantener `MissionPools.weekend` en la firma por compatibilidad de `buildPools`, o eliminarlo si se limpia también `CalendarContext`. **Decisión:** conservar el campo `weekend` en `MissionPools` pero ya no leerlo aquí (cambio mínimo); el pool ordenado se construye en el contexto. Eliminar la variable local `usedWeekend` si queda sin uso.

En el `return`, añadir `weekendMissionId`:

```ts
return { week, days, gamePlotDayId, gamePlotMissionId: plotMissionId, weekendMissionId };
```

---

## 4. `src/context/CalendarContext.tsx`

**4.1 Imports:** agregar `sortByOrder` de `gamePlot` y `resolveNextWeekend` de `schedule`.

**4.2 Listas ordenadas** (junto a `buildPools`):

```ts
function buildPlotList(): Mission[] {
  return sortByOrder(getMissionsByCategory("game_plot"));
}
function buildWeekendList(): Mission[] {
  return sortByOrder(getMissionsByCategory("weekend"));
}
```

**4.3 `buildWeek`** — agregar `weekendIndex` y resolver el weekend:

```ts
function buildWeek(
  week: number,
  plotIndex: number,
  weekendIndex: number,   // ← nuevo
  rankIndex: number
): CalendarState {
  const plotMissionId = resolveNextPlot(buildPlotList(), plotIndex, { rankIndex, week });
  const weekendMissionId = resolveNextWeekend(buildWeekendList(), weekendIndex);
  const schedule = generateWeek(
    week,
    DEFAULT_WEEK_TEMPLATE,
    buildPools(),
    plotMissionId,
    weekendMissionId,   // ← nuevo
  );
  return {
    week,
    dayIndex: firstPlayableDay(schedule),
    missionIndexInDay: 0,
    gamePlotIndex: plotIndex,
    weekendIndex,        // ← nuevo
    schedule,
    completedThisWeek: 0,
    correctThisWeek: 0,
  };
}
```

**4.4 Estado inicial / `reset`:** pasar `weekendIndex = 0`:

```ts
useState<CalendarState>(() => buildWeek(1, 0, 0, 0));
// ...
const reset = useCallback(() => {
  loaded.current = true;
  setState(buildWeek(1, 0, 0, rankRef.current));
}, []);
```

**4.5 `completeMission`:** avanzar `weekendIndex` igual que `gamePlotIndex`:

```ts
const weekendIndex =
  prev.schedule.weekendMissionId &&
  missionId === prev.schedule.weekendMissionId
    ? prev.weekendIndex + 1
    : prev.weekendIndex;
// ... incluir weekendIndex en el objeto devuelto
return { ...prev, dayIndex, missionIndexInDay, gamePlotIndex, weekendIndex, /* ... */ };
```

**4.6 `startNextWeek`:** propagar el puntero:

```ts
const startNextWeek = useCallback(() => {
  setState((prev) =>
    buildWeek(prev.week + 1, prev.gamePlotIndex, prev.weekendIndex, rankRef.current)
  );
}, []);
```

**4.7 `isValidState`:** tolerar estados persistidos viejos sin `weekendIndex` (no rechazarlos). Tras `JSON.parse`, si `saved.weekendIndex` es `undefined`, asignar `0` antes de `setState`, o relajar el guard. **Recomendado:** normalizar en la carga:

```ts
if (isValidState(saved)) {
  if (typeof saved.weekendIndex !== "number") saved.weekendIndex = 0;
  if (saved.schedule && saved.schedule.weekendMissionId === undefined)
    saved.schedule.weekendMissionId = null;
  setState(saved);
}
```

---

## 5. Editor: `tools/dispatcher-editor/editor-dispatcher-v2.html`

**5.1 Poblar `order` en plot/weekend.** Hoy `toMission1` hace `if(chap.week!=null)m.order=chap.week;` (≈línea 455), pero los capítulos `plot_call`/`weekend` no tienen `.week`. Derivar el orden del número de su semana contenedora **sin mutar el modelo de autoría**.

Opción recomendada — calcular un mapa `chapter → order` en `m1_collectChapters` y aplicarlo al final de `toMission1`:

```js
function m1_collectChapters(){
  const plot=[], weekend=[], daily=(game.daily_calls.library||[]).slice();
  const orderOf=new Map();
  if(game.game_plot.prologue)plot.push(game.game_plot.prologue);
  (game.game_plot.weeks||[]).forEach((wk,i)=>{
    const ord=(wk.week!=null)?wk.week:(i+1);
    if(wk.plot_call){ orderOf.set(wk.plot_call, ord); plot.push(wk.plot_call); }
    if(wk.weekend){ orderOf.set(wk.weekend, ord); weekend.push(wk.weekend); }
  });
  return { plot, weekend, daily, orderOf, all:plot.concat(weekend,daily) };
}
```

En `m1_buildExport`, pasar el `order` a la conversión (o setearlo tras `toMission1`):

```js
function m1_buildExport(){
  const { plot, all, orderOf }=m1_collectChapters();
  return {
    missions: all.map(c=>{
      const m=toMission1(c,game);
      if(orderOf.has(c)) m.order=orderOf.get(c);   // ← plot/weekend
      return m;
    }),
    calendar: { /* ...sin cambios... */ }
  };
}
```

> El prólogo (`kind:"prologue"`) no recibe `order` (no participa en la secuencia jugable; se filtra igual que hoy en `game_plot_sequence`).

**5.2 Alerta de colisión** en `m1_validate` (≈línea 507). Recibe `m1_collectChapters().all` pero necesita conocer el `order`; reusar el mismo cálculo. Añadir al final de `m1_validate`:

```js
// colisión de order dentro de cada categoría secuencial
["game_plot","weekend"].forEach(cat=>{
  const seenOrder=new Map();   // order -> primer id
  chaps.filter(c=>m1_kindToCategory(c.kind)===cat).forEach(c=>{
    const ord = orderForChapter(c);      // misma derivación que el export
    if(ord==null) return;
    if(seenOrder.has(ord))
      warns.push(`${cat}: order ${ord} duplicado en "${seenOrder.get(ord)}" y "${c.id}"`);
    else seenOrder.set(ord, c.id);
  });
});
```

Implementar `orderForChapter(c)` reusando el `orderOf` del `m1_collectChapters` (pasarlo a `m1_validate`, o recomputarlo). Los warnings ya se muestran en el `alert()` de exportación (≈línea 550).

> `m1_kindToCategory` ya mapea `weekend→"weekend"` y `daily_call→"daily"`, resto→`"game_plot"` (≈línea 374).

---

## 6. CI: `scripts/validate-missions.ts`

Añadir validación cruzada tras el loop por-archivo (≈línea 140). Acumular `(category, order, id)` y reportar colisiones:

```ts
// cross-file: order duplicado dentro de game_plot / weekend
const byCat: Record<string, Map<number, string>> = { game_plot: new Map(), weekend: new Map() };
for (const file of files) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
  const cat = m.category;
  if ((cat === "game_plot" || cat === "weekend") && typeof m.order === "number") {
    const seen = byCat[cat];
    if (seen.has(m.order)) {
      console.error(`✗ ${cat}: order ${m.order} duplicado en "${seen.get(m.order)}" y "${m.id}"`);
      total++;
    } else seen.set(m.order, m.id);
  }
}
```

(Integrarlo reusando el parseo ya hecho en el loop principal para no leer dos veces; lo de arriba es ilustrativo.)

---

## 7. Verificación end-to-end

1. **Compilación/typecheck:** `npx tsc --noEmit` (o el check del proyecto) sin errores tras los cambios de tipos.
2. **Editor:** abrir el HTML, importar/crear ≥2 semanas con plot y weekend, **Exportar JSON**; confirmar que `dispatcher-missions.json` trae `order` en las misiones `game_plot` y `weekend`. Forzar dos plot con el mismo `order` → el `alert()` lista la colisión.
3. **Validador CI:** `npm run validate-missions` pasa con el contenido actual; introducir `order` duplicado en dos misiones de la misma categoría → falla con error claro.
4. **Runtime (orden):** autorar 2+ `game_plot` y 2+ `weekend` con `order` 1,2,3…, agregarlos a `BUNDLED_MISSIONS`, correr la app (Expo); avanzar semanas y confirmar orden ascendente de plot y weekend, y que el puntero persiste (cerrar/reabrir → `AsyncStorage`).
5. **Compatibilidad:** con `AsyncStorage` previo (sin `weekendIndex`/`weekendMissionId`), la app carga sin romper (defaults aplicados).
6. **Weekend vacío:** sin misiones `weekend`, el sábado cae a una daily (fallback preservado).

---

## Part B — Diferido (no se implementa)

Recordatorio de las recomendaciones validadas para más adelante (todas aditivas/opcionales, default = comportamiento actual):

1. **`track`/storyline** — separar "bucket de calendario" de "narrativa ordenada"; historias de paga sin chocar con el plot base. El diseño de Part A (listas por parámetro) ya lo facilita.
2. **`requires` generalizado** (`minWeek`/`minRank`/`entitlement`/`unit`) — gating de dailies por semana o por unidad/compra. Generaliza el `unlock` introducido en Part A.
3. **`pack` + entitlements no-consumibles** — bundles mixtos tipo "Alien cases", apoyándose en el merge de catálogo remoto existente (`setMissionCatalog`).

No tocar el código por estos puntos hasta priorizarlos.
