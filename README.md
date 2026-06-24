# 911 Dispatch

> Novela visual de toma de decisiones: eres operador del 911, atiendes llamadas de
> emergencia que se ramifican según tus decisiones y despachas a la unidad correcta
> contra el reloj.

**911 Dispatch** es una app móvil construida con **Expo / React Native**. El jugador
escucha llamadas de emergencia, toma decisiones *durante* la llamada que reescriben el
diálogo y el desenlace, y finalmente decide qué unidad enviar. Es un juego *data-driven*:
todo el contenido (llamadas, misiones ramificadas, medios) vive en archivos de datos, de
modo que añadir contenido casi nunca requiere tocar código de pantallas.

> **Nota sobre el nombre.** El repositorio arrastra una doble identidad: el `slug` es
> `corazon-en-roaming` y [app.config.ts](app.config.ts) declara el nombre
> "Corazón en Roaming", mientras [app.json](app.json) declara "911 Dispatch". **El juego
> que se está construyendo es 911 Dispatch.** "Corazón en Roaming" fue una *prueba de
> concepto* (una telenovela interactiva) cuyo motor narrativo se reutiliza para las
> misiones ramificadas del juego actual.

---

## Índice

- [Visión general](#visión-general)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Arquitectura](#arquitectura)
- [Estructura del contenido y las conversaciones](#estructura-del-contenido-y-las-conversaciones)
- [Avatares 3D y cinemáticas](#avatares-3d-y-cinemáticas)
- [Backend (Supabase) y entrega de contenido](#backend-supabase-y-entrega-de-contenido)
- [Estado actual de los sistemas](#estado-actual-de-los-sistemas)
- [Cómo correr el proyecto](#cómo-correr-el-proyecto)
- [Cómo añadir contenido](#cómo-añadir-contenido)
- [Documentación adicional](#documentación-adicional)

---

## Visión general

El juego es una **novela visual / simulador de despacho 911**:

- El jugador atiende **llamadas** y **misiones** de emergencia presentadas como escenas
  con video, diálogo revelado tap a tap y una estética tipo CCTV (esquinas, indicador
  `REC`, intro cinemática).
- En las misiones interactivas toma **decisiones a mitad de llamada** que mutan variables
  y flags, cambian el diálogo posterior e incluso cambian **cuál es la unidad correcta**.
- Al final decide a quién despachar: `police`, `firefighters` o `border_patrol`
  (ver [src/game/types.ts](src/game/types.ts)).
- Hay un bucle de progresión por **turnos de 5 llamadas**, con rangos, rachas, bonus de
  velocidad y logros, además de una **economía de gemas** que financia decisiones premium.

El motor narrativo proviene de una prueba de concepto previa, **"Corazón en Roaming"**
(una telenovela ramificada en español, ver
[src/content/stories/corazon-en-roaming.json](src/content/stories/corazon-en-roaming.json)).
Su sistema de beats/variables/condiciones es la base del sistema de misiones actual.

---

## Stack tecnológico

Versiones tomadas de [package.json](package.json):

| Área | Paquete | Versión |
| --- | --- | --- |
| Framework | `expo` | 54.0.0 |
| | `react` / `react-native` | 19.1.0 / 0.81.4 |
| Navegación | `@react-navigation/native` + `native-stack` | ^7.0.0 |
| | `react-native-screens` / `react-native-gesture-handler` | 4.16.0 / 2.28.0 |
| Animación | `react-native-reanimated` / `react-native-worklets` | 4.1.0 / 0.5.1 |
| 3D | `expo-gl` / `expo-three` / `three` | 16.0.6 / 8.0.0 / 0.166.1 |
| Media | `expo-video` / `expo-audio` | 3.0.11 / 1.0.10 |
| Backend | `@supabase/supabase-js` | ^2.45.0 |
| Persistencia | `@react-native-async-storage/async-storage` | 2.2.0 |
| Sistema de archivos | `expo-file-system` | ~19.0.11 |
| Otros | `expo-haptics`, `expo-constants`, `expo-status-bar`, `react-native-safe-area-context` | — |
| Lenguaje | TypeScript (estricto) | ~5.8.3 |

> ⚠️ **Discrepancia a tener en cuenta:** [AGENTS.md](AGENTS.md) indica leer la
> documentación de **Expo v56** antes de escribir código, pero el repo está fijado en
> **Expo 54**. Confirma la versión real con [package.json](package.json) antes de seguir
> guías de una versión distinta.

Build con **EAS** ([eas.json](eas.json), perfiles `development` / `preview` /
`production`). Bundler Metro extendido para empaquetar `.glb`, `.gltf` y `.mp4`
([metro.config.js](metro.config.js)).

---

## Estructura del proyecto

```
.
├─ App.tsx                 # Entrypoint: pila de Context providers + navegador
├─ index.ts                # Registra el componente raíz
├─ app.config.ts           # Config Expo dinámica (variables EXPO_PUBLIC_*, flags)
├─ app.json                # Config Expo estática
├─ eas.json                # Perfiles de build EAS
├─ metro.config.js         # Empaqueta .glb/.gltf/.mp4
│
├─ src/
│  ├─ components/          # UI reutilizable (Avatar3D, CutscenePlayer, DialogueBubble, …)
│  ├─ context/             # ~11 React Context providers (todo el estado global)
│  ├─ game/                # Tipos y datos núcleo (types.ts, assets.ts, ranks, achievements)
│  ├─ i18n/                # Traducciones es.json / en.json
│  ├─ lib/
│  │  ├─ supabase.ts       # Cliente Supabase (opcional)
│  │  ├─ storage.ts        # Guardado local + espejo a Supabase
│  │  ├─ audio.ts          # Motor de SFX/música
│  │  ├─ analytics.ts      # Tracking de eventos (mock)
│  │  ├─ revenuecat.ts     # Compras / gemas (mock)
│  │  ├─ streamoji.ts      # Generación de avatares GLB on-demand
│  │  ├─ missions/         # Esquema + motor de misiones ramificadas
│  │  ├─ engine/           # Motor narrativo de la telenovela (POC reutilizado)
│  │  └─ content/          # Sincronización/descarga de contenido remoto
│  ├─ navigation/          # AppNavigator (native stack)
│  ├─ screens/             # Pantallas del juego
│  └─ theme/               # Sistema de diseño (colores, tamaños, estilos de tarjeta)
│
├─ content/ · src/content/ # Contenido bundled: calls, missions, stories
├─ assets/                 # audio/, models/ (GLB/FBX), videos/, iconos
├─ supabase/migrations/    # Esquema del content framework
├─ scripts/                # Validadores y generador de manifest
└─ docs/                   # Diseño cognitivo y guías de contenido
```

---

## Arquitectura

**Punto de entrada.** [index.ts](index.ts) → [App.tsx](App.tsx) monta una pila de
**Context providers** y luego el navegador. Orden de la pila (de fuera hacia dentro):

```
GestureHandlerRootView
└─ UserIdentityProvider      # identidad anónima (Supabase o ID local)
   └─ SettingsProvider       # idioma, sonido, haptics (persistido)
      └─ I18nProvider        # función t() ES/EN
         └─ EconomyProvider  # gemas
            └─ StoryProgressProvider
               └─ NarrativeStateProvider   # variables/flags de la narrativa
                  └─ SubscriptionProvider
                     └─ DispatchProgressProvider   # XP, rangos, rachas, logros
                        └─ PaywallProvider
                           └─ AppNavigator
```

**Gestión de estado.** Solo **React Context** — no hay Redux ni Zustand. El estado se
persiste en **AsyncStorage** y se espeja a Supabase cuando está configurado.

**Navegación** ([src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx)) —
native stack, ruta inicial `Boot`:

| Ruta | Pantalla | Params |
| --- | --- | --- |
| `Boot` | [BootScreen](src/screens/BootScreen.tsx) | — |
| `Home` | [HomeScreen](src/screens/HomeScreen.tsx) | — |
| `DispatchLobby` | [DispatchLobbyScreen](src/screens/DispatchLobbyScreen.tsx) | — |
| `Call` | [CallScreen](src/screens/CallScreen.tsx) | `{ callId }` |
| `Mission` | [MissionScreen](src/screens/MissionScreen.tsx) | `{ missionId }` |
| `Reader` | [ReaderScreen](src/screens/ReaderScreen.tsx) | `{ storyId, chapterId, beatId }` |
| `Stats` | [StatsScreen](src/screens/StatsScreen.tsx) | — |
| `Paywall` | [PaywallScreen](src/screens/PaywallScreen.tsx) | — |
| `ChapterEnd` | [ChapterEndScreen](src/screens/ChapterEndScreen.tsx) | `{ type, nextChapterId? }` |
| `Shop` *(modal)* | [ShopScreen](src/screens/ShopScreen.tsx) | — |
| `Settings` *(modal)* | [SettingsScreen](src/screens/SettingsScreen.tsx) | — |

---

## Estructura del contenido y las conversaciones

El juego maneja **tres tipos de contenido**, todos basados en datos. Comparten el mismo
lenguaje de *condiciones* (variables, flags y elecciones previas).

### 1. CallScenario — llamada lineal

La forma más simple ([src/content/calls/](src/content/calls/), tipos en
[src/game/types.ts](src/game/types.ts)): una lista de mensajes revelados tap a tap y un
único despacho correcto. Sin ramificación ni estado.

```ts
export type CallScenario = {
  id: string;
  callerName: string;
  callType: string;        // "FIRE EMERGENCY", etc.
  location: string;
  video: string | number;  // fondo en loop (clave de assets, URL o require)
  introVideo?: string | number;  // cinemática que se reproduce una vez
  messages: CallMessage[];        // diálogo guionado
  correctDispatch: DispatchType;  // unidad que da recompensa
  reward: number;
  difficulty?: 1 | 2 | 3;
  correctExplanation?: string;    // se muestra al fallar (enseña el porqué)
};
```

### 2. Mission `mission@1` — llamada ramificada (el corazón del juego)

Un **grafo de beats** con decisiones a mitad de llamada. Esquema en
[src/lib/missions/types.ts](src/lib/missions/types.ts); ejemplos en
[src/content/missions/](src/content/missions/) (`armed-robbery.json`, `kitchen-fire.json`,
`border-runners.json`).

Tipos de beat: `dialogue` · `decision` · `dispatch` · `outcome`.

```ts
export type Mission = {
  schema: "mission@1";
  id: string; title: string; version: string;
  difficulty: 1 | 2 | 3;
  caller: { name: string; type: string; location: string; avatar?: string };
  reward: number; time_limit_seconds?: number;
  initial_variables?: Record<string, number>;
  initial_flags?: Record<string, boolean>;
  start: string;            // id del beat inicial
  assets: MissionAsset[];   // medios declarados una vez, referidos por `key`
  beats: MissionBeat[];     // el grafo
};
```

Las **elecciones** mutan el estado y deciden el siguiente beat; pueden costar gemas:

```ts
export type MissionChoice = {
  id: string; label: string;
  gem_cost?: number; premium?: boolean;     // gateadas por la economía
  effects?: Record<string, number>;         // p. ej. { intel: 1, score_bonus: 2 }
  set_flags?: Record<string, boolean>;
  feedback?: string;                         // nota del operador tras elegir
  next: string;
};
```

Dos mecanismos hacen la llamada reactiva:

- **Variantes condicionales** (`variants`): un beat muestra otras líneas si se cumple una
  condición (p. ej. el jugador consiguió `intel >= 2`).
- **Corrección condicional** (`correct_rules`): qué unidad es correcta depende del estado
  acumulado, no es fijo.

Ejemplo (extracto de `armed-robbery.json`): si el jugador obtuvo suficiente `intel`, el
llamante da más detalle:

```json
{
  "id": "b2",
  "type": "dialogue",
  "variants": [
    {
      "when": { "var": "intel", "op": ">=", "value": 2 },
      "lines": [
        { "speaker": "caller", "text": "Dos hombres, pasamontañas. Uno apunta a la cajera." }
      ]
    }
  ],
  "lines": [
    { "speaker": "caller", "text": "Hay un tipo con un arma. ¡Por favor, apúrense!" }
  ],
  "next": "dispatch"
}
```

**El motor** ([src/lib/missions/engine.ts](src/lib/missions/engine.ts)) son **funciones
puras** (sin React ni I/O), por lo que es testeable y podría correr en servidor:

- `initRuntime(mission)` — estado inicial (`variables`, `flags`, `choices_made`).
- `evaluateCondition(cond, rt)` — evalúa `{choice}` / `{flag}` / `{var, op, value}`.
- `resolveLines(beat, rt)` — primera variante que matchea, si no, líneas base.
- `applyChoice(rt, choice)` — aplica `effects` / `set_flags` y registra la elección.
- `resolveCorrectUnit(beat, rt)` — reglas condicionales → `default_correct` → `correct`.
- `scoreBonus(rt)` — XP extra por buenas decisiones, limitado a `MAX_SCORE_BONUS = 5`.

Flujo de un beat en [MissionScreen](src/screens/MissionScreen.tsx):

```
cargar misión (getMissionById) → initRuntime
  └─ getBeat(start)
       └─ resolveLines(beat, runtime) ── mostrar líneas (tap a tap)
            ├─ decision → mostrar choices → applyChoice → ir a choice.next
            ├─ dialogue → ir a beat.next
            └─ dispatch → resolveCorrectUnit(beat, runtime)
                            → comparar con la elección del jugador
                            → recompensa base + scoreBonus(runtime)
```

### 3. Story (telenovela) — POC reutilizada

La narrativa multi-capítulo de "Corazón en Roaming"
([src/content/stories/corazon-en-roaming.json](src/content/stories/corazon-en-roaming.json),
motor en [src/lib/engine/](src/lib/engine/)). Define **personajes con avatares por
expresión** (`neutral`, `happy`, `angry`, …), variables de relación y gemas iniciales. El
sistema de misiones replica deliberadamente su lenguaje de condiciones para mantener
consistentes el autoring y las herramientas.

---

## Avatares 3D y cinemáticas

- **[Avatar3D](src/components/Avatar3D.tsx)** — renderiza modelos GLB en tiempo real con
  `expo-gl` + `three.js` (encuadre busto/cuerpo, rotación, rim-light, animación idle, con
  geometría de respaldo si falla la carga). Se usa para el avatar del llamante/operador.
- **[Streamoji](src/lib/streamoji.ts)** — genera GLB y miniaturas PNG on-demand contra
  `glb.streamoji.com` usando `EXPO_PUBLIC_STREAMOJI_API_KEY`.
- **[CutscenePlayer](src/components/CutscenePlayer.tsx)** — reproductor de intros tipo CCTV
  a pantalla completa (letterbox, etiqueta `INCOMING`, punto `REC`, botón saltar, timeout
  defensivo para que un stream colgado no atrape al jugador). Las intros van empaquetadas
  como `.mp4` en [assets/videos/](assets/videos/) para carga instantánea.
- Los medios se declaran una vez en `mission.assets` y se referencian por `key`, resueltos
  vía caché → bundle → URL remota ([src/game/assets.ts](src/game/assets.ts)).

---

## Backend (Supabase) y entrega de contenido

El backend es **opcional**: si no hay variables de entorno, el juego corre con el contenido
empaquetado. El cliente se crea en [src/lib/supabase.ts](src/lib/supabase.ts) y se activa
con `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

**Esquema** ([supabase/migrations/0001_content_framework.sql](supabase/migrations/0001_content_framework.sql)):

| Tabla / vista | Propósito |
| --- | --- |
| `content_packs` | Temporadas / grupos comprables (free o premium) |
| `missions` | Metadata del catálogo (título, dificultad, `sort_order`, `is_published`) |
| `mission_versions` | JSON `mission@1` versionado + `checksum` (clave de caché) |
| `assets` | Cada archivo de medios (key, tipo, role, `storage_path`, `public_url`, bytes, spec) |
| `mission_progress` | Progreso por usuario y misión (`best_score`, `choice_path`) |
| `entitlements` | Packs que posee un usuario (alimenta el paywall) |
| `content_manifest` *(vista)* | Misiones publicadas en orden + sus assets, en un solo round-trip |

**RLS:** el contenido publicado es legible con la anon key; el progreso y los
entitlements son privados del dueño (`auth.uid()`). Los medios viven en un bucket público
`media`. La descarga progresiva y el prefetch viven en
[src/lib/content/](src/lib/content/) y se activan con `EXPO_PUBLIC_REMOTE_CONTENT=true`
(apagado por defecto → misiones bundled). Las misiones remotas sobrescriben a las bundled
por `id`. Detalle en [docs/CONTENT_FRAMEWORK.md](docs/CONTENT_FRAMEWORK.md).

---

## Estado actual de los sistemas

> **Última actualización: 2026-06-24.** Esta sección describe lo que existe hoy en el
> código, incluyendo sistemas que están en modo *mock*/stub. Refleja el estado en esta
> fecha y puede cambiar.

| Sistema | Estado | Dónde |
| --- | --- | --- |
| Guardado / persistencia | Implementado | [src/lib/storage.ts](src/lib/storage.ts): AsyncStorage por `story_id`, con espejo (`upsert`) a la tabla `player_state` de Supabase si está disponible |
| Identidad / cuentas | Implementado | [UserIdentityContext](src/context/UserIdentityContext.tsx): auth anónima de Supabase con fallback a un ID local (`local_…`). Sin pantalla de login |
| Audio (SFX + música) | Implementado | [src/lib/audio.ts](src/lib/audio.ts) + [src/game/assets.ts](src/game/assets.ts): `AudioManager` con precarga de SFX, música en loop y mute ligado a Ajustes |
| Localización ES/EN | Implementado | [I18nContext](src/context/I18nContext.tsx) + [src/i18n/](src/i18n/): `t(key, vars)` con interpolación `{{var}}` y fallback a inglés |
| Pantalla de Ajustes | Implementado | [SettingsScreen](src/screens/SettingsScreen.tsx): idioma, sonido, haptics, restaurar compras (persistido) |
| Bucle de juego / progresión | Implementado | [DispatchProgressContext](src/context/DispatchProgressContext.tsx): turnos de 5 llamadas, rangos, rachas, bonus de velocidad, racha diaria, logros |
| Economía de gemas | Implementado | [EconomyContext](src/context/EconomyContext.tsx) + elecciones premium (`gem_cost`) en las misiones |
| Onboarding / boot | Implementado (básico) | [BootScreen](src/screens/BootScreen.tsx): secuencia animada + cinemática opcional de apertura. La primera misión enseña la mecánica de forma implícita |
| Suscripción + trial | Implementado | [PaywallContext](src/context/PaywallContext.tsx) / [PaywallScreen](src/screens/PaywallScreen.tsx): trial de 3 días, estado persistido; gatea las llamadas al expirar |
| Compras / RevenueCat | **Mock** | [src/lib/revenuecat.ts](src/lib/revenuecat.ts): packs de gemas definidos (20/50/120/300) pero `purchaseGemPack` devuelve éxito simulado. Flags `mockIAP` / `mockSubscriptions` en [app.config.ts](app.config.ts); la compra real aún no está implementada |
| Analytics | **Mock** | [src/lib/analytics.ts](src/lib/analytics.ts): clase con eventos definidos (`story_start`, `choice_made`, …) que solo loguea a consola; `enabled = false` |
| Recompensa por anuncio | **Solo UI** | La tienda ofrece "+gemas por ver un anuncio", pero suma gemas localmente: no hay SDK de ads integrado |

> El esquema de Supabase ya prevé `entitlements` y `mission_progress`, de modo que la
> persistencia de compras y progreso en la nube está modelada aunque la capa de pago real
> siga en mock.

---

## Cómo correr el proyecto

Requisitos: Node.js y la CLI de Expo (`npx expo`). Scripts en [package.json](package.json):

```bash
npm install          # instalar dependencias
npm start            # servidor de desarrollo de Expo
npm run android      # abrir en Android
npm run ios          # abrir en iOS
npm run web          # abrir en web
npm run typecheck    # tsc --noEmit (chequeo de tipos)

# Validadores de contenido (no son tests unitarios):
npm run validate-story      # valida la story de la telenovela
npm run validate-missions   # valida misiones (ids, alcanzabilidad, speakers, assets)
npm run build-manifest      # genera un content_manifest local para subir a Supabase
```

**Variables de entorno** (`EXPO_PUBLIC_*`, leídas en [app.config.ts](app.config.ts)).
Todas son opcionales; sin ellas el juego usa contenido empaquetado y mocks:

| Variable | Para qué |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Activa Supabase (auth + contenido en la nube) |
| `EXPO_PUBLIC_CDN_BASE` | Base de CDN para medios (opcional) |
| `EXPO_PUBLIC_REMOTE_CONTENT` | `true` para usar el catálogo en la nube y descarga progresiva |
| `EXPO_PUBLIC_STREAMOJI_API_KEY` | Generación de avatares GLB |
| `EXPO_PUBLIC_MOCK_IAP` / `EXPO_PUBLIC_MOCK_SUBSCRIPTIONS` | Mantener compras/suscripción en mock |
| `EXPO_PUBLIC_REVENUECAT_KEY_IOS` / `EXPO_PUBLIC_REVENUECAT_KEY_ANDROID` | Claves de RevenueCat (cuando se implemente el pago real) |

Builds de producción/preview con EAS (`eas build`, perfiles en [eas.json](eas.json)).

---

## Cómo añadir contenido

Gracias al diseño *data-driven*, añadir una misión normalmente no requiere tocar código:

1. Crea un JSON `mission@1` en [src/content/missions/](src/content/missions/) (usa los
   existentes como plantilla).
2. Regístralo en [src/content/missions/index.ts](src/content/missions/index.ts).
3. Declara sus medios en `mission.assets` y añádelos a
   [src/game/assets.ts](src/game/assets.ts) o súbelos a Supabase.
4. Valida con `npm run validate-missions`.

Para añadir un **nuevo tipo de unidad** de despacho, amplía `DispatchType` en
[src/game/types.ts](src/game/types.ts) y `DISPATCH_OPTIONS` en
[src/content/calls/index.ts](src/content/calls/index.ts).

Guías detalladas: [docs/CONTENT_FRAMEWORK.md](docs/CONTENT_FRAMEWORK.md) y
[docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md).

---

## Documentación adicional

- [docs/COGNITIVE_DESIGN.md](docs/COGNITIVE_DESIGN.md) — principios de diseño cognitivo.
- [docs/CONTENT_FRAMEWORK.md](docs/CONTENT_FRAMEWORK.md) — spec del framework de contenido.
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) — guía de autoring de contenido.
- [AGENTS.md](AGENTS.md) — notas para agentes/colaboradores.
