# Avatar Skins — Guía de Layer AI

Sistema de skins 2D para el avatar del despachador. Los skins son **puramente
cosméticos** (identidad y estatus, nunca ventaja de juego) y viven en tres tiers,
cada uno con un trabajo distinto de monetización:

| Tier | Cómo se consigue | Para qué sirve |
|------|------------------|----------------|
| **rank** | Gratis al llegar a un rango | Retención del free-to-play |
| **premium** | Gemas (moneda dura) | Monetización directa |
| **prestige** | Rango **+** gemas | El flex máximo — más ingresos de ballenas |

Todo el sistema funciona **sin arte todavía**: si un skin no tiene imagen,
`SkinAvatar` dibuja un placeholder con el color de acento. Cuando pegas la URL de
Layer, se enciende solo.

---

## 1. Dónde vive cada cosa

- Catálogo y reglas de desbloqueo → `src/game/skins.ts`
- Registro de imágenes (lo que editas al agregar arte) → `SKIN_IMAGES` en `src/game/assets.ts`
- Estado del jugador (poseído/equipado, persistencia) → `src/context/WardrobeContext.tsx`
- Pantalla de vestuario → `src/screens/WardrobeScreen.tsx`
- Cliente de Layer (generación programática opcional) → `src/lib/layer.ts`

---

## 2. Instalar / configurar Layer AI

Layer (app.layer.ai) es una plataforma **web**, no un paquete de npm. "Instalarlo"
para este proyecto son tres pasos:

1. **Cuenta + workspace.** Entra a app.layer.ai e inicia sesión. El proyecto ya
   usa un workspace (su ID está en `EXPO_PUBLIC_LAYER_WORKSPACE_ID`, en
   `.env.example`). Usa ese mismo workspace o crea uno nuevo y actualiza el ID.

2. **Variables de entorno.** Copia `.env.example` a `.env` y completa:
   ```
   EXPO_PUBLIC_LAYER_WORKSPACE_ID=<tu workspace>
   EXPO_PUBLIC_LAYER_API_KEY=          # opcional, solo para generación programática
   ```
   La API key **no es necesaria** para el flujo manual recomendado abajo. Solo
   habilita `generateSkinImage()` en `src/lib/layer.ts`.

3. **(Opcional) Hosting.** Para servir los PNG exportados, usa Supabase Storage o
   cualquier CDN (`EXPO_PUBLIC_CDN_BASE`). También puedes bundlear las imágenes en
   `assets/skins/` y usar `require()`.

---

## 2.b Generación batch offline (script — recomendado para todo el set)

Los skins son **un solo dispatcher** con distinta vestimenta por rank/tier, en
estilo comic cel-shade, **pre-generados y bundleados para todos** (no se generan
en runtime). El script lo hace en un comando:

```
npm run generate-skins              # genera los que falten
npm run generate-skins -- --force   # regenera todos
npm run generate-skins -- rookie night_shift   # solo algunos
```

Qué hace: usa un personaje fijo + estilo fijo y solo cambia el outfit por skin,
baja cada PNG a `assets/skins/<id>.png`, e imprime el bloque `SKIN_IMAGES` listo
para pegar (con `require()`, o sea bundle offline).

Config verificada (ya funcionando):

- Endpoint: `https://api.app.layer.ai/graphql` (GraphQL).
- Mutation: `createInference` con `sync:false` (¡`sync:true` se cuelga!), luego
  se hace **polling** vía `getWorkspaceById(...){ inferences(input:{first}){ edges{
  node{ id status files{ url } } } } }`. El script ya hace esto solo.
- **Style obligatorio.** La API exige al menos un style; el style controla el
  look (manda sobre el prompt). El default es **"Cel-shaded"**
  (`0ca885b8-1c3b-46b1-a89d-e4dc851623af`), ya puesto en
  `EXPO_PUBLIC_LAYER_STYLE_ID`. Otros útiles: "Comic" (`b25235d2-…`).

Lo único que necesitas para correrlo: tener `EXPO_PUBLIC_LAYER_API_KEY`,
`_WORKSPACE_ID` y `_STYLE_ID` en `.env` (los tres ya están). Los prompts
(personaje + outfit por skin) viven en `scripts/generate-skins.ts`.

> Nota de consistencia: el style fija el LOOK, pero el rostro no queda 100%
> idéntico entre los 8 (el prompt describe el mismo personaje, sin lock de cara).
> Para clavar la misma cara, crea un **Style propio** entrenado con retratos de tu
> personaje y usa su id. Regenera uno suelto con `npm run generate-skins -- <id> --force`.

## 3. Flujo para crear un skin (manual, alternativa)

1. Genera la imagen en Layer con el prompt de la sección 5.
2. Exporta **PNG**, cuadrado (1024×1024), fondo transparente o muy oscuro.
3. Súbela a tu CDN/Supabase (o ponla en `assets/skins/`).
4. Pega la URL (o el `require(...)`) en `SKIN_IMAGES` en `src/game/assets.ts`:
   ```ts
   export const SKIN_IMAGES = {
     rookie: "",
     neon_pink: "https://tu-cdn.com/skins/neon_pink.png",  // ← así
     ...
   };
   ```
5. Listo. El skin aparece con su arte en el vestuario y en el lobby al equiparse.

---

## 4. Estilo de arte (mantenlo consistente)

Para que todos los skins se vean de la misma familia, fija estos parámetros en
cada generación:

- Retrato de medio cuerpo de **un/a operador/a de central 911**, de frente.
- Estética **telenovela + sala de despacho nocturna**, dramática, cinematográfica.
- Encuadre cuadrado, sujeto centrado, fondo oscuro o transparente (combina con el
  viewport `#070A12`).
- Iluminación con un **rim light cian** (`#22D3EE`) para el mood de central.
- Estilo coherente entre todos (mismo render: semi-realista estilizado).

Negative prompt sugerido: `texto, watermark, marcos, manos deformes, fondo
recargado, baja resolución`.

---

## 5. Prompts por skin (listos para pegar en Layer)

> Prefijo común para todos (pégalo antes de cada prompt):
> *"Stylized semi-realistic half-body portrait of a 911 emergency dispatch
> operator, facing forward, telenovela cinematic mood, dark dispatch-center
> background, cyan rim light, centered, square framing —"*

- **rookie** (Cadete · default): *"…rookie dispatcher in a plain navy trainee
  uniform, neutral confident expression, simple headset."*
- **night_shift** (Turno Nocturno · rango 1): *"…dispatcher in a dark blue night-
  shift uniform, city lights bokeh behind, calm focused look, sleek headset."*
- **senior_blues** (Veterana de Línea · rango 2): *"…seasoned senior dispatcher in
  a steel-blue uniform with a small service pin, experienced steady gaze."*
- **supervisor_dress** (Gala de Supervisor · rango 3): *"…supervisor in a formal
  dress uniform with gold epaulettes and shoulder braid, commanding posture,
  amber accent lighting."*
- **neon_pink** (Neón Corazón · premium 40💎): *"…glamorous dispatcher, dramatic
  telenovela style, hot-pink neon lighting, bold magenta highlights, stylish
  modern headset, confident smile."*
- **midnight_glam** (Glamour de Medianoche · premium 60💎): *"…elegant dispatcher in
  black silk, midnight purple city-lights glow, sophisticated glamorous look."*
- **golden_hero** (Héroe Dorado · prestige rango 4 + 100💎): *"…heroic commander
  dispatcher bathed in golden light, gold-trimmed uniform, proud legendary pose,
  subtle glow."*
- **director_legend** (Leyenda de la Central · prestige rango 6 + 150💎): *"…the
  station director, ultimate prestige, pink-and-gold dramatic lighting, ornate
  uniform with gold insignia, iconic legendary presence."*

---

## 6. Agregar un skin nuevo

1. Añade un objeto a `SKINS` en `src/game/skins.ts` (id, name, tier,
   `rankRequired`, `gemCost`, `accent`).
2. Añade su `id` a `SKIN_IMAGES` en `src/game/assets.ts` (string vacío al inicio).
3. Genera el arte con Layer y pega la URL. Nada más.

---

## 7. Generación programática (opcional)

Si configuras `EXPO_PUBLIC_LAYER_API_KEY`, puedes generar dentro de la app con
`generateSkinImage()` (`src/lib/layer.ts`). El endpoint y el formato exacto de la
respuesta dependen de tu plan de Layer — confírmalos en la documentación de la API
de tu workspace y ajusta `GENERATE_ENDPOINT` antes de usarlo en producción. Sin la
key, la función devuelve `null` y la app usa lo que haya en `SKIN_IMAGES`.
