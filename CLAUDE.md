# CLAUDE.md - Pixel-Forge Project Context

## Project Overview

**Pixel-Forge** is a Vue 3-based game creation platform for point-and-click adventure games with a retro pixel art/CRT aesthetic. The project is in early development (v0.0.0) with mock data throughout.

## Tech Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite 7.2.4
- **Routing**: Vue Router 4.6.4
- **State Management**: Pinia 3.0.4 (structure ready, not implemented)
- **Styling**: Tailwind CSS 4.1.18, custom CSS variables
- **Visual Editor**: @vue-flow/core (for scene map)
- **Font**: Press Start 2P (retro pixel aesthetic)

## Project Structure

```
src/
├── main.js                 # App entry point
├── App.vue                 # Root component
├── router/index.js         # Routes & auth guard
├── views/
│   ├── LoginView.vue       # Mock auth (any credentials work)
│   ├── DashboardView.vue   # Game type selection & quick tools
│   ├── EditorView.vue      # Main scene editor (~9300 lines) - CORE FEATURE
│   ├── ProjectsView.vue    # Project management
│   └── SceneMapView.vue    # Vue Flow scene flow editor
├── components/             # Empty directories (prepared for refactoring)
├── assets/styles/
│   ├── main.css            # Global styles, Tailwind imports
│   ├── variables.css       # CSS custom properties
│   └── pixel-theme.css     # Pixel art styling (borders, glows, animations)
├── stores/                 # Empty (Pinia not implemented yet)
├── services/               # Empty (no backend yet)
├── utils/                  # Empty
├── composables/            # Empty
└── models/                 # Empty
```

## Routes

| Path | View | Auth Required |
|------|------|---------------|
| `/login` | LoginView | No |
| `/dashboard` | DashboardView | Yes |
| `/projects` | ProjectsView | Yes |
| `/editor/:projectId?` | EditorView | Yes |
| `/scene-map/:projectId?` | SceneMapView | Yes |

## EditorView.vue - Main Scene Editor

### Project Data Structure
```javascript
project: {
  id, name, version,
  currentSceneId,           // ID of active scene

  // Global data (shared across all scenes)
  globalData: {
    assets: [{ id, name, data (base64), width, height, type }],  // Image library
    audioAssets: [{ id, name, data (base64), duration, format, type (sfx/music) }],  // Audio library
    actors: [{ id, name, costume, animations: {idle, walk-*, talk} }],
    items: [{ id, name, description, icon, iconAssetId, combinable, useWith: [], pickupDialog, examineDialog }],
    inventory: [itemId, ...],     // Player's current items (global)
    verbs: [{ id, name, icon, key }],
    variables: {}                 // Game state flags
  },

  // All scenes
  scenes: [{ ...sceneData }]
}
```

### Scene Data Structure
```javascript
scene: {
  id, name, width (1920), height (1200), background (assetId),
  // Spatial elements (shown on canvas)
  images: [{ id, name, x, y, w, h, rotation, interactive, pickable, src, assetId, parallax }],
  walkboxes: [{ id, points: [{x, y}], rotation, mask }],
  exits: [{ id, name, x, y, w, h, rotation, targetScene }],
  actorPlacements: [{ id, actorId, x, y, w, h, rotation, direction, currentState }],
  hotspots: [{ id, name, x, y, w, h, rotation }],
  zplanes: [{ id, name, x, y, w, h, rotation, maskImage, zIndex }],
  // Scene-specific data
  dialogs: [{ id, name, actor (actorId), lines: [{speaker, text}], choices }],
  puzzles: [{ id, name, type, conditions, result, hints, solved }],
  sfx: [{ id, name, audioAssetId, volume, loop, trigger }],
  music: [{ id, name, audioAssetId, volume, loop, fadeIn, fadeOut }],
  cutscenes: [{ id, name, trigger, triggerTarget, skippable, actions }],
  animations: [{ id, name, spritesheet, frames, frameRate, loop, pingPong }],
  // Lighting system
  lighting: {
    ambient: { color, intensity },
    lights: [{ id, name, type, x, y, color, intensity, radius, angle, direction, falloff, enabled, castShadows }]
  },
  // Particle emitters
  particles: [{ id, name, preset, x, y, width, height, enabled, emitRate, lifetime, speed, direction, gravity, size, color, shape, blendMode }],
  // Element groups
  groups: [{ id, name, members: [{ type, id }], locked }]
}
```

### Implemented Features
- Full undo/redo system (50-item history, 500ms debounce)
- Multi-select drag & drop with bounding constraints
- 8-directional resize handles (min 20px)
- Element rotation with handle (Shift for 15° snap)
- Zoom control
- Grid visibility toggle
- Per-element-type visibility toggle
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z/Y (redo), Delete/Backspace, Escape
- Export/Import JSON (full project)
- Multi-scene support with scene tabs
- Global data (actors, items, inventory, verbs)
- Asset management (image library)
- Audio management (SFX/music library with preview)
- LocalStorage persistence (auto-save, project list)
- Lighting system (ambient + point/spot/directional/area lights)
- Particle system (8 presets with full customization)
- Parallax system (depth layers, auto-scroll, tiling)
- Element grouping with context menu

## Asset Management

Global image library for the project with drag-and-drop upload support.

### Features
- **Asset Manager Modal**: Upload multiple images via drag & drop or file picker
- **Asset Library**: PNG, JPG, GIF images stored as base64 in project
- **Asset Assignment**:
  - Scene background (via Scene Settings when nothing selected)
  - Image elements (via Properties panel)
  - Item icons (can use emoji OR asset image)
- **Canvas Rendering**: Images with assets display actual images instead of placeholders
- **Thumbnail Preview**: Assets show preview in left panel and property selectors

### Usage Flow
1. Open Asset Manager from left panel (Assets section)
2. Drag & drop images or click to browse
3. Rename assets as needed
4. Assign assets to:
   - Scene background (select nothing, edit in Properties)
   - Image elements (select image, choose asset in Properties)
   - Item icons (select item, choose asset in Properties)

## Audio Management

Global audio library for SFX and music with playback preview.

### Features
- **Audio Manager Modal**: Upload multiple audio files via drag & drop or file picker
- **Audio Library**: MP3, WAV, OGG stored as base64 in project
- **Audio Types**: Mark each audio as SFX or Music for filtering
- **Playback Preview**: Play/stop audio from manager and property panel
- **Duration Display**: Shows formatted duration (mm:ss)
- **Asset Assignment**: Assign audio to SFX and Music elements

### Usage Flow
1. Open Audio Manager from left panel (Audio section)
2. Drag & drop audio files or click to browse
3. Rename audio and set type (SFX/Music)
4. Preview playback with play/stop button
5. Assign to SFX/Music elements in Properties panel

### Audio Types
| Type | Use Case |
|------|----------|
| SFX | Short sounds: footsteps, clicks, effects |
| Music | Background tracks, ambient loops |

## Lighting System

Real-time 2D lighting with ambient light and multiple light sources.

### Features
- **Ambient Light**: Global scene illumination with adjustable color and intensity
- **Light Types**:
  - Point Light (💡): Omnidirectional with radius
  - Spotlight (🔦): Directional cone with angle
  - Directional (☀️): Parallel rays like sunlight
  - Area Light (⬜): Rectangular soft light
- **Light Properties**: Color, intensity, radius, falloff, shadows
- **Live Preview**: See lights in editor canvas
- **Visibility Toggle**: Show/hide lights layer

### Light Data Structure
```javascript
light: {
  id, name,
  type: 'point' | 'spot' | 'directional' | 'area',
  x, y,
  color: '#ffcc00',
  intensity: 1.0,
  radius: 300,          // point/spot
  angle: 45,            // spot cone angle
  direction: 180,       // spot/directional direction in degrees
  falloff: 'smooth',    // none, linear, smooth
  enabled: true,
  castShadows: false,
  width: 200,           // area light
  height: 100           // area light
}
```

## Particle System

Real-time particle emitters with presets and full customization.

### Features
- **Presets**: Fire, Smoke, Rain, Snow, Dust, Magic, Bubbles, Sparks
- **Emission Control**: Rate, lifetime, area
- **Movement**: Speed, direction, gravity
- **Appearance**: Size, color (start/end), shape, blend mode
- **Live Preview**: Animated particles in editor
- **Visibility Toggle**: Show/hide particles layer

### Preset Summary
| Preset | Icon | Use Case |
|--------|------|----------|
| Fire | 🔥 | Torches, campfires |
| Smoke | 💨 | Chimneys, fog |
| Rain | 🌧️ | Weather effects |
| Snow | ❄️ | Winter scenes |
| Dust | ✨ | Indoor dust motes |
| Magic | ✨ | Spells, enchantments |
| Bubbles | 🫧 | Underwater, potions |
| Sparks | ⚡ | Electricity, welding |

### Particle Emitter Data Structure
```javascript
emitter: {
  id, name,
  preset: 'fire',
  x, y,
  width: 50,            // emission area
  height: 10,
  enabled: true,
  emitRate: 30,         // particles per second
  lifetime: { min: 0.5, max: 1.5 },
  speed: { min: 50, max: 150 },
  direction: { min: -30, max: 30 },  // degrees
  gravity: -50,
  size: { start: 20, end: 5 },
  color: { start: '#ff6600', end: '#ff000033' },
  shape: 'circle',      // circle, square, star, line
  blendMode: 'screen'   // normal, screen, multiply, overlay
}
```

## Parallax System

2.5D depth effect for images with multiple layers moving at different speeds.

### Features
- **Depth Layers**: Images move at different speeds based on depth value
- **Auto-Scroll**: Automatic horizontal/vertical scrolling (clouds, water, etc.)
- **Tiling**: Repeat images horizontally and/or vertically for seamless scrolling
- **Camera Follow**: In Play Mode, camera follows player and parallax reacts

### Depth Values

| Depth | Effect | Use Case |
|-------|--------|----------|
| 0.0 | Fixed (no movement) | UI elements, HUD |
| 0.1-0.3 | Very slow | Distant sky, stars, mountains |
| 0.4-0.6 | Slow | Mid-distance hills, clouds |
| 0.7-0.9 | Moderate | Trees, buildings |
| 1.0 | Normal | Ground level, walkbox plane |
| 1.2-1.5 | Fast | Foreground elements |
| 1.5-2.0 | Very fast | Close foreground, particles |

### Image Parallax Data Structure
```javascript
image: {
  // ...existing properties
  parallax: {
    enabled: false,
    depth: 1.0,          // 0=fixed, <1=background(slow), 1=normal, >1=foreground(fast)
    repeatX: false,      // Tile horizontally
    repeatY: false,      // Tile vertically
    autoScrollX: 0,      // Auto-scroll speed X (pixels/second)
    autoScrollY: 0       // Auto-scroll speed Y (pixels/second)
  }
}
```

### Usage Examples

**Scrolling clouds:**
```javascript
parallax: {
  enabled: true,
  depth: 0.2,
  repeatX: true,
  autoScrollX: -20  // Clouds drift left
}
```

**Distant mountains:**
```javascript
parallax: {
  enabled: true,
  depth: 0.3,
  repeatX: false,
  autoScrollX: 0
}
```

**Foreground foliage:**
```javascript
parallax: {
  enabled: true,
  depth: 1.4,
  repeatX: false,
  autoScrollX: 0
}
```

### Visual Indicators
- Images with parallax enabled have **dashed green border**
- Depth indicator badge shows current depth value (e.g., "↕ 0.3")
- Properties panel shows depth hints: 🏔 Far BG, 🌳 Mid BG, 🚶 Normal, 🌿 Foreground

## Element Grouping

Group related elements together for easier manipulation (e.g., a lamp with its light, a desk with objects on it).

### Access

**Right-click** (context menu) on canvas when elements are selected.

### Context Menu Options

| Option | Condition | Description |
|--------|-----------|-------------|
| Group Elements | 2+ elements selected, not in group | Creates a new group |
| Select Entire Group | Element in group selected | Selects all group members |
| Ungroup | Element in group selected | Dissolves the group |
| Duplicate | Any selection | Duplicates selected elements |
| Delete | Any selection | Deletes selected elements |

### Group Data Structure
```javascript
scene: {
  groups: [
    {
      id: 'group-123',
      name: 'Desk Lamp',
      members: [
        { type: 'image', id: 456 },
        { type: 'light', id: 789 }
      ],
      locked: false
    }
  ]
}
```

### Visual Indicators
- Elements in a group have **cyan dashed outline** (CSS class `in-group`)
- Group name badge appears above grouped elements: "🔗 Desk Lamp"
- Context menu shows group name when element is part of a group

### Supported Element Types
All element types can be grouped:
- Images
- Lights
- Particles
- Hotspots
- Exits
- Z-planes
- Actor placements
- Walkboxes

### Behavior

#### Grouped Elements Move Together
When you drag any element that belongs to a group, **all members of the group move together**. The system:
1. Detects if the dragged element is part of a group
2. Automatically includes all group members in the drag operation
3. Maintains relative positions between elements

#### Right-Click Selection
Right-clicking on an element properly selects it before showing the context menu, ensuring the correct element is targeted for group operations.

### Key Functions

| Function | Description |
|----------|-------------|
| `getElementGroup(type, id)` | Returns the group containing an element, or undefined |
| `isElementInGroup(type, id)` | Returns true if element belongs to any group |
| `groupSelectedElements()` | Creates a new group from selected elements |
| `ungroupElement()` | Dissolves the group of the first selected element |
| `selectEntireGroup()` | Selects all members of a group |
| `cleanupSceneGroups()` | Removes invalid groups (called on project load) |
| `clearAllGroups()` | Removes all groups from current scene (UI button) |

### Implementation Notes

**Critical Bug Fix**: The `isElementInGroup` function must use `!!group` for proper boolean conversion:
```javascript
// WRONG - undefined !== null evaluates to TRUE
return group !== null

// CORRECT - properly converts to boolean
return !!group
```

This is because `Array.find()` returns `undefined` (not `null`) when no match is found.

### Notes
- Groups are per-scene (not global)
- Deleting an element removes it from its group automatically
- Empty groups are cleaned up automatically
- Groups persist in project save/export
- Invalid groups (with missing members) are cleaned up on project load

## LocalStorage Persistence

Automatic project saving with browser localStorage.

### Features
- **Auto-save**: Projects save automatically 2 seconds after any change
- **Save Status Indicator**: Shows "Saved", "Saving...", or "Unsaved" with colored dot
- **Last Saved Time**: Displays relative time (e.g., "Just now", "5m ago")
- **Project List**: Maintains list of all saved projects
- **Load on Mount**: Automatically loads project from localStorage on page load
- **Save on Exit**: Final save when leaving the editor

### Storage Keys
| Key | Content |
|-----|---------|
| `pixel-forge-projects` | List of all projects (id, name, updatedAt, scenesCount) |
| `pixel-forge-project-{id}` | Full project data as JSON |

### Save Status Indicators
| Status | Color | Description |
|--------|-------|-------------|
| Saved | Green | All changes saved |
| Saving | Yellow | Currently saving (animated) |
| Unsaved | Red | Pending changes |

### URL Routing
- `/editor/new` - Creates a new project with unique ID
- `/editor/{projectId}` - Loads existing project from localStorage

### Element Type Colors
| Type | Color | Hex |
|------|-------|-----|
| Images | Pink | #f472b6 |
| Walkboxes | Green | #00ff88 |
| Exits | Red | #ff6b6b |
| Actors | Purple | #a855f7 |
| Hotspots | Cyan | #00d4ff |
| Z-planes | Gray | #64748b |
| Cutscenes | Cyan | #06b6d4 |
| Assets | Green | #10b981 |
| Audio | Orange | #f59e0b |
| Lights | Yellow | #ffcc00 |
| Particles | Magenta | #ff88ff |

## Play Mode

Test the game directly in the editor with SCUMM-style point-and-click gameplay.

### Acceso

Header → Botón "▶️ PLAY" (verde)

### Características

| Feature | Estado | Descripción |
|---------|--------|-------------|
| Player Movement | ✅ | Click para caminar hacia un punto dentro de walkboxes |
| Walkbox Collision | ✅ | El jugador solo puede caminar dentro de áreas definidas |
| Verb Bar | ✅ | Barra inferior con verbos del juego (Look, Use, Talk, etc.) |
| Object Interaction | ✅ | Click en hotspots, exits, actores para interactuar |
| Dialog System | ✅ | Muestra diálogos línea por línea, click para avanzar |
| Inventory System | ✅ | Pick up items, usar items, "Use X with Y" |
| Exit Transitions | ✅ | Fade out/in al cambiar de escena |
| Puzzle Execution | ✅ | Verifica condiciones, ejecuta resultados |
| Cutscene System | ✅ | Ejecuta acciones secuenciales con delays |
| Audio Playback | ✅ | Reproduce SFX y música de escena |
| Game Variables | ✅ | Flags y contadores para estado del juego |
| Message Display | ✅ | Muestra mensajes temporales (ej: "I can't do that") |

### UI en Play Mode

```
┌─────────────────────────────────────────────────────────┐
│ 🎬 CUTSCENE                        [✕ EXIT PLAY MODE] │
│ [Using: Key]  [Hovered Object Name]       [SKIP ▶▶]   │
│                                                         │
│          ┌─────── FADE OVERLAY ────────┐               │
│          │     [Game Canvas]           │               │
│          │        [Player]             │               │
│          └─────────────────────────────┘               │
│                                                         │
│           ┌─────────────────────────────┐              │
│           │     [Dialog Box]            │              │
│           │ Speaker: "Dialog text..."   │              │
│           │          Click to continue  │              │
│           └─────────────────────────────┘              │
│                                                         │
│ 🎵 Music Name                                          │
│ ┌──────────────────────────────────┐  ┌─────────────┐  │
│ │ [Look] [Use] [Talk] [Pick up]    │  │ INVENTORY   │  │
│ └──────────────────────────────────┘  │ [Item][Item]│  │
│                                        └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Player State

```javascript
playModeState: {
  // Player
  playerActorId,      // ID del actor que controla el jugador
  playerPosition,     // { x, y } posición actual
  playerDirection,    // 'north', 'south', 'east', 'west'
  playerState,        // 'idle', 'walk-north', 'walk-south', 'talk', etc.

  // Interaction
  selectedVerb,       // Verbo actualmente seleccionado
  hoveredObject,      // Objeto bajo el cursor
  selectedItem,       // Item seleccionado para "Use X with Y"

  // Dialog
  currentDialog,      // Diálogo activo
  dialogLineIndex,    // Línea actual del diálogo

  // Cutscene
  currentCutscene,    // Cutscene activo
  cutsceneActionIndex,// Acción actual
  isCutscenePlaying,  // true durante cutscenes

  // Transitions
  fadeOverlay,        // 0-1 para fade in/out

  // Audio
  currentMusic,       // Música reproduciéndose
  musicAudio,         // Elemento HTML Audio

  // Game State (runtime)
  inventory,          // Items del jugador
  variables           // Variables del juego
}
```

### Sistemas Implementados

#### Inventory System
- `playAddToInventory(itemId)` - Agrega item
- `playRemoveFromInventory(itemId)` - Quita item
- `hasItem(itemId)` - Verifica si tiene item
- `selectInventoryItem(itemId)` - Selecciona para "Use X with Y"
- `useItemWith(item, target)` - Usa item con objeto

#### Puzzle System
- `checkPuzzleConditions(puzzle)` - Verifica condiciones
- `attemptPuzzle(puzzle)` - Intenta resolver puzzle
- `solvePuzzle(puzzleId)` - Marca como resuelto

Condiciones soportadas:
- `has-item`: Requiere item en inventario
- `variable`: Requiere variable con valor específico
- `puzzle-solved`: Requiere otro puzzle resuelto

#### Cutscene System
- `startCutscene(cutscene)` - Inicia cutscene
- `executeCutsceneAction()` - Ejecuta acción actual
- `advanceCutscene()` - Avanza a siguiente acción
- `skipCutscene()` - Salta cutscene (si skippable)

Acciones soportadas:
| Acción | Descripción |
|--------|-------------|
| dialog | Muestra mensaje |
| move-actor | Mueve actor a posición |
| actor-direction | Cambia dirección del actor |
| play-sfx | Reproduce sonido |
| play-music | Cambia música |
| stop-music | Detiene música (con fade) |
| wait | Pausa por duración |
| fade-in | Fade desde negro |
| fade-out | Fade a negro |
| change-scene | Cambia de escena |
| set-variable | Establece variable |
| add-item | Agrega item a inventario |
| remove-item | Quita item de inventario |

#### Audio System
- `playMusic(musicEntry)` - Reproduce música
- `stopMusic(fadeOut)` - Detiene música
- `playSFX(sfxEntry)` - Reproduce efecto de sonido
- `playSceneMusic()` - Reproduce música de escena

#### Transitions
- `fadeOut(duration)` - Fade a negro
- `fadeIn(duration)` - Fade desde negro
- `changeSceneWithTransition(sceneId)` - Cambia escena con fade

### Controles

| Acción | Control |
|--------|---------|
| Caminar | Click en área walkable |
| Interactuar | Click en objeto (usa verbo seleccionado) |
| Usar item | Click en item, luego click en objeto |
| Cambiar verbo | Click en verb bar |
| Avanzar diálogo | Click en dialog box |
| Saltar cutscene | Click "SKIP ▶▶" (si skippable) |
| Salir | Click "EXIT PLAY MODE" |

### Notas

- El primer actor placement de la escena es el jugador por defecto
- Si no hay actor placements, usa el primer actor global
- Los walkboxes definen áreas transitables (colisión)
- El estado del juego es temporal (no se guarda al salir de play mode)
- Las cutscenes con `trigger: 'scene-enter'` se ejecutan automáticamente
- La música de escena se reproduce automáticamente al entrar

## Scene Map

Visualizador de flujo de escenas usando Vue Flow, integrado con el proyecto.

### Acceso

Header del Editor → Botón "🗺️ MAP" (cyan)

### Características

| Feature | Descripción |
|---------|-------------|
| Nodos de escena | Cada escena del proyecto es un nodo visual |
| Thumbnails | Muestra el background de la escena como miniatura |
| Conexiones | Las líneas representan exits entre escenas |
| Capítulos | Organiza escenas por capítulo (colores) |
| Estados | Draft, In Progress, Complete (iconos visuales) |
| Estadísticas | Muestra conteo de actores, exits, hotspots |

### Sincronización con Proyecto

```
SceneMapView.vue ←→ localStorage ←→ EditorView.vue
```

- **Nodos**: Generados desde `project.scenes`
- **Posiciones**: Guardadas en `scene.mapPosition`
- **Conexiones**: Creadas desde `scene.exits[].targetScene`
- **Crear conexión**: Arrastra entre handles → crea exit en escena origen
- **Eliminar conexión**: Elimina el exit correspondiente

### Tipos de Conexión

| Tipo | Icono | Descripción |
|------|-------|-------------|
| Normal | → | Exit simple |
| Bidirectional | ↔ | Conexión en ambas direcciones |
| Requires Item | 🔑 | Necesita item (animado) |
| Requires Puzzle | 🧩 | Necesita puzzle resuelto (animado) |
| Triggers Cutscene | 🎬 | Dispara cutscene (animado) |

### Capítulos (Colores)

| Chapter | Color |
|---------|-------|
| Chapter 1 | Dorado (#FFD700) |
| Chapter 2 | Cyan (#00CED1) |
| Chapter 3 | Rojo (#FF6B6B) |
| Chapter 4 | Verde (#98D8AA) |
| Chapter 5 | Púrpura (#DDA0DD) |

### Interacciones

| Acción | Cómo hacerlo |
|--------|--------------|
| Seleccionar escena | Click en el nodo |
| Editar escena | Doble-click en el nodo |
| Mover escena | Arrastra el nodo |
| Crear conexión | Arrastra entre handles de dos nodos |
| Seleccionar conexión | Click en la línea |
| Agregar escena | Botón "+ ADD SCENE" |
| Eliminar | Botón DELETE en panel de propiedades |

### Panel de Propiedades

**Para Escenas:**
- Nombre
- Capítulo
- Estado (Draft/In Progress/Complete)
- Estadísticas de contenido
- Botones: Edit Scene, Delete Scene

**Para Conexiones:**
- Nombre del exit
- Tipo de conexión
- Botón: Delete Connection

### Notas

- Los cambios se guardan automáticamente en localStorage
- Las escenas nuevas se crean en posición (250, 250)
- No se puede eliminar la última escena
- Al editar una escena, se establece como `currentSceneId` antes de navegar

## Walkbox Polygon Editor

Editor visual para crear y editar walkboxes como polígonos de forma libre.

### Interacciones

| Acción | Cómo hacerlo |
|--------|--------------|
| Seleccionar walkbox | Click en el polígono |
| Mover vértice | Arrastra cualquier círculo verde |
| Agregar vértice | Click en un borde (línea entre vértices) |
| Eliminar vértice | Doble-click en un vértice (mínimo 3) |
| Mover walkbox completo | Arrastra el polígono (no un vértice) |
| Rotar walkbox | Arrastra el círculo cyan sobre el centro |

### Indicadores Visuales

- **Polígono**: Relleno verde semi-transparente con borde punteado
- **Vértices**: Círculos verdes que se agrandan al hover
- **Bordes**: Se iluminan al hover para indicar dónde puedes agregar puntos
- **Vértices eliminables**: Se ponen rojos al hover (solo si hay más de 3)
- **Handle de rotación**: Círculo cyan con línea, aparece sobre el centro del polígono

### Formas Soportadas

- Pasillos con perspectiva (trapecios)
- Áreas en forma de L
- Triángulos, pentágonos, hexágonos
- Cualquier polígono irregular

## Element Rotation

Sistema de rotación para todos los elementos del canvas.

### Elementos Soportados

| Tipo | Centro de rotación |
|------|-------------------|
| Images | Centro del rectángulo (x + w/2, y + h/2) |
| Exits | Centro del rectángulo |
| Actors | Centro del rectángulo |
| Hotspots | Centro del rectángulo |
| Z-planes | Centro del rectángulo |
| Walkboxes | Centro geométrico del polígono (promedio de vértices) |

### Interacciones

| Acción | Cómo hacerlo |
|--------|--------------|
| Rotar libremente | Arrastra el círculo cyan encima del elemento |
| Rotar con snap 15° | Mantén Shift mientras arrastras |
| Editar manualmente | Input "Rotation" en panel de propiedades (0-360°) |

### Indicadores Visuales

- **Handle de rotación**: Círculo cyan conectado con línea vertical al elemento
- **Elementos rectangulares**: Handle aparece 30px arriba del borde superior
- **Walkboxes**: Handle aparece 60px arriba del centro del polígono
- **Hover**: El handle cambia a dorado y se agranda

### Comportamiento Técnico

**Elementos rectangulares (CSS transform):**
- Usan `transform: rotate(Xdeg)` en el estilo del div
- `transform-origin: center center` para rotar desde el centro
- Los handles de resize rotan junto con el elemento

**Walkboxes (SVG transform):**
- Usan `transform="rotate(X, cx, cy)"` en el grupo SVG
- El centro (cx, cy) se calcula como promedio de todos los vértices
- Los vértices mantienen sus coordenadas originales (rotación visual)
- Al editar vértices, estos se mueven en el espacio rotado

### Notas

- La rotación se guarda en grados (0-360)
- Compatible con undo/redo (automático via deep watcher)
- La rotación persiste al exportar JSON

## Spritesheet Editor

Editor visual para crear animaciones a partir de spritesheets PNG.

### Acceso

Panel izquierdo → Sección "Animations" → Botón "+"

### Flujo de Uso

1. **Cargar spritesheet**: Drag & drop PNG o click para seleccionar archivo
2. **Configurar grid**: Ajustar columnas, filas y tamaño de frame (auto-detectado)
3. **Seleccionar frames**: Click, Ctrl+click (toggle), Shift+click (rango)
4. **Crear animación**: Click "Create Animation" con frames seleccionados
5. **Configurar**: Nombre, FPS, Loop, Ping-pong
6. **Guardar**: Click "Save Animation"
7. **Preview**: Botón ▶ para reproducir

### Interacciones

| Acción | Cómo |
|--------|------|
| Cargar spritesheet | Drag & drop PNG o click en zona |
| Seleccionar frame | Click en celda del grid |
| Selección múltiple | Ctrl/Cmd + click |
| Selección rango | Shift + click |
| Crear animación | Seleccionar frames → "Create Animation" |
| Preview | Botón ▶ en footer |
| Guardar | "Save Animation" |
| Cerrar | Click en ✕ o fuera del modal |

### Estructura de Datos

```javascript
{
  id: number,
  name: string,
  spritesheet: {
    data: string,      // Base64 del PNG
    width: number,
    height: number
  },
  frames: [
    { x: 0, y: 0, w: 64, h: 64 },
    // ...más frames
  ],
  frameRate: 12,       // FPS
  loop: boolean,
  pingPong: boolean    // Ida y vuelta
}
```

### Auto-detección de Grid

El editor detecta automáticamente el tamaño de frame basado en divisores comunes (16, 32, 48, 64, 96, 128 px).

## Actor-Animation Association

Sistema para asociar animaciones a actores por estado y mostrar preview animado en el canvas.

### Estados de Animación

| Estado | Descripción |
|--------|-------------|
| `idle` | Actor en reposo |
| `walk-north` | Caminando hacia arriba |
| `walk-south` | Caminando hacia abajo |
| `walk-east` | Caminando hacia derecha |
| `walk-west` | Caminando hacia izquierda |
| `talk` | Actor hablando |

### Estructura de Datos del Actor

```javascript
{
  id: number,
  name: string,
  x, y, w, h: number,
  rotation: number,
  costume: string | null,
  direction: 'north' | 'south' | 'east' | 'west',
  animations: {
    idle: number | null,           // ID de animación
    'walk-north': number | null,
    'walk-south': number | null,
    'walk-east': number | null,
    'walk-west': number | null,
    'talk': number | null
  },
  currentState: string             // Estado actual para preview
}
```

### Uso

1. **Crear animaciones**: Usar el Spritesheet Editor para crear animaciones
2. **Seleccionar actor**: Click en un actor en el canvas
3. **Asignar animaciones**: En el panel de propiedades, sección "Animations"
   - Seleccionar estado de preview (dropdown "Preview")
   - Asignar animación a cada estado (dropdowns por estado)
4. **Ver preview**: El actor muestra la animación asignada al estado actual

### Preview Animado en Canvas

- Los actores con animación asignada muestran el sprite animado en lugar del nombre
- La animación se reproduce a 12 FPS por defecto
- El estado de preview se puede cambiar en el panel de propiedades
- El sistema usa `setInterval` con limpieza automática en `onUnmounted`

### Panel de Propiedades del Actor

El panel muestra:
- **Preview**: Selector del estado actual para visualización
- **Estados**: Lista de todos los estados con selector de animación para cada uno
- Las animaciones disponibles vienen del array `animations` de la escena actual

## Dialog-Actor Association

Sistema para asociar diálogos a actores de la escena.

### Estructura de Datos del Diálogo

```javascript
{
  id: number,
  name: string,
  actor: number | null,           // ID del actor (null = Narrator)
  lines: [
    { id: number, speaker: string, text: string }
  ],
  choices: [
    { id: number, text: string, targetDialog: number | null }
  ]
}
```

### Panel de Propiedades del Diálogo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Actor | Select | Dropdown con actores de la escena + opción "Narrator" |
| Actor Preview | Visual | Muestra animación del actor si tiene una asignada |
| Lines | Lista | Cada línea con speaker (dropdown) y texto |
| Choices | Lista | Opciones de respuesta con texto y diálogo destino |

### Funcionalidades

1. **Selección de Actor**: Dropdown con todos los actores de la escena
2. **Preview del Actor**: Si el actor tiene animación, muestra el sprite animado
3. **Speaker por Línea**: Dropdown para seleccionar quién habla en cada línea
4. **Choices con Destino**: Opciones de diálogo que pueden apuntar a otros diálogos
5. **Gestión de Líneas**: Agregar/eliminar líneas individuales
6. **Gestión de Choices**: Agregar/eliminar opciones de respuesta

### Uso

1. Crear un diálogo (+ en sección Dialogs)
2. Seleccionar el actor principal del diálogo
3. Agregar líneas con diferentes speakers
4. Opcionalmente agregar choices para diálogos interactivos
5. Los choices pueden apuntar a otros diálogos de la escena

## Puzzle System

Sistema completo de puzzles para adventure games con inventario, items y múltiples tipos de puzzles.

### Tipos de Puzzles

| Tipo | Descripción | Condiciones |
|------|-------------|-------------|
| `item-combination` | Combinar 2+ items del inventario | Lista de items a combinar |
| `use-on-object` | Usar item en objeto de la escena | Item + Hotspot/Image/Exit |
| `use-on-actor` | Usar/dar item a un actor | Item + Actor |
| `sequence` | Realizar acciones en orden | Lista de pasos ordenados |
| `dialog-choice` | Elegir opciones correctas en diálogo | Dialog + Choices correctos |
| `environmental` | Interactuar con objeto de escena | Objeto + Verbo opcional |

### Estructura de Datos del Puzzle

```javascript
{
  id: number,
  name: string,
  description: string,           // Descripción para diseñadores
  type: string,                  // Tipo de puzzle

  // Condiciones (varían según tipo)
  conditions: {
    items: [itemId, ...],        // item-combination
    useItem: itemId,             // use-on-object, use-on-actor
    targetObject: { type, id },  // use-on-object, environmental
    targetActor: actorId,        // use-on-actor
    sequence: ['step1', ...],    // sequence
    dialogId: number,            // dialog-choice
    correctChoices: [choiceId],  // dialog-choice
    requiredVerb: verbId         // environmental
  },

  // Resultado al resolver
  result: {
    type: 'none' | 'give-item' | 'remove-item' | 'unlock-exit' |
          'play-cutscene' | 'change-state' | 'show-dialog',
    giveItem: itemId,
    removeItems: [itemId, ...],
    unlockExit: exitId,
    playCutscene: cutsceneId,
    changeState: { type, id, newState },
    showDialog: dialogId
  },

  solved: boolean,
  hints: [{ afterAttempts: number, text: string }]
}
```

### Sistema de Items

```javascript
{
  id: number,
  name: string,
  description: string,
  icon: string,              // Emoji para UI
  image: string | null,      // Imagen opcional
  combinable: boolean,       // Puede combinarse con otros items
  useWith: ['hotspot', 'actor', 'exit', 'image'],  // Tipos de objetos donde se puede usar
  pickupDialog: dialogId,    // Diálogo al recoger
  examineDialog: dialogId    // Diálogo al examinar
}
```

### Sistema de Inventario

- `inventory`: Array de IDs de items que el jugador tiene
- Se gestiona desde el panel izquierdo (sección Inventory)
- Los items se definen en la sección "Items"
- Se pueden agregar/quitar items del inventario para testing

### Panel de Propiedades del Puzzle

El panel está dividido en secciones:

1. **Información básica**: Nombre, descripción, tipo
2. **Condiciones**: UI dinámica según el tipo de puzzle
3. **Resultado**: Tipo de resultado + configuración específica
4. **Hints**: Pistas progresivas según intentos fallidos
5. **Estado**: Checkbox "Solved" para testing

### Flujo de Uso

1. **Definir Items**: Crear items que el jugador podrá recoger
2. **Crear Puzzle**: Seleccionar tipo y configurar condiciones
3. **Configurar Resultado**: Qué pasa al resolver (dar item, desbloquear exit, etc.)
4. **Agregar Hints**: Pistas opcionales tras X intentos fallidos
5. **Testing**: Agregar items al inventario y probar lógica

### Ejemplo: Puzzle "Abrir Puerta"

```javascript
{
  name: "Abrir la puerta del sótano",
  type: "use-on-object",
  conditions: {
    useItem: 5,                    // ID de "Llave oxidada"
    targetObject: { type: 'exit', id: 3 }
  },
  result: {
    type: "unlock-exit",
    unlockExit: 3,
    removeItems: [5]               // Consumir la llave
  },
  hints: [
    { afterAttempts: 3, text: "Esta puerta parece necesitar una llave..." }
  ]
}
```

## Multi-Scene & Global Data

Sistema de múltiples escenas con datos globales compartidos.

### Estructura del Proyecto

El proyecto ahora contiene:
- **scenes[]**: Array de todas las escenas
- **globalData**: Datos compartidos entre escenas
- **currentSceneId**: Escena activa en el editor

### Datos Globales

| Tipo | Descripción | Uso |
|------|-------------|-----|
| **actors** | Definiciones de personajes | Se colocan en escenas via `actorPlacements` |
| **items** | Definiciones de items | El jugador los lleva entre escenas |
| **inventory** | Items del jugador | Persiste al cambiar de escena |
| **verbs** | Verbos de interacción | Mismos verbos en todo el juego |
| **variables** | Flags de estado | Estado del juego (puzzles resueltos, etc.) |

### Actor Placements

Los actores globales se "colocan" en escenas específicas:

```javascript
actorPlacement: {
  id: number,           // ID único del placement
  actorId: number,      // Referencia al actor global
  x, y, w, h: number,   // Posición en la escena
  rotation: number,
  direction: string,    // north, south, east, west
  currentState: string  // idle, walk-*, talk (para preview)
}
```

### UI de Escenas

- **Scene Tabs**: Pestañas en el header para cambiar entre escenas
- **+ Button**: Crear nueva escena
- **Scene Actions Bar**: Renombrar, duplicar, eliminar escena
- **Exit targetScene**: Selector de escena destino

### Gestión de Escenas

| Acción | Cómo |
|--------|------|
| Cambiar escena | Click en pestaña |
| Nueva escena | Click en + |
| Renombrar | Doble-click en pestaña o ✏️ |
| Duplicar | Click en 📋 |
| Eliminar | Click en 🗑️ (no si es la última) |

### Panel Izquierdo Reorganizado

El panel ahora tiene dos secciones:
1. **Elementos de Escena**: images, walkboxes, exits, actorPlacements, hotspots, etc.
2. **Datos Globales** (marcados con borde dorado): Characters, Items, Inventory, Verbs

### Import/Export

- **Export**: Exporta todo el proyecto (todas las escenas + datos globales)
- **Import**: Importa un proyecto completo desde JSON

## Design System

### Color Palette (CSS Variables)
```css
--bg-dark: #0f0f23
--bg-medium: #1a1a2e
--bg-light: #16213e
--bg-card: #1e1e3f
--primary: #c9a227 (gold)
--accent: #00d4ff (cyan)
--success: #00ff88
--warning: #ffaa00
--error: #ff4757
```

### Visual Effects
- Pixel borders (4px)
- Drop shadows (4px offset)
- CRT glow effects
- Scanlines effect
- Animations: blink, pulse, shake, float

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview built version
```

## Current State & TODOs

### Completed
- Scene editor with full CRUD for all element types
- Undo/redo system
- Multi-select drag & drop
- Visual scene flow editor (Vue Flow)
- Mock authentication
- Pixel art themed UI
- Export to JSON
- Walkbox polygon editor (vertex editing, add/remove points)
- Element rotation (handle + Shift snap + properties panel)
- Spritesheet editor for animations (drag-drop PNG, grid selection, preview)
- Actor-animation association (animations by state, animated canvas preview)
- Dialog-actor association (select actor from scene, speaker dropdowns, choices with targets)
- Complete puzzle system (6 puzzle types, conditions, results, hints, inventory)
- Multi-scene & global data (scene tabs, global actors/items/inventory/verbs, import/export)
- Asset management (image library, drag-drop upload, scene backgrounds, image elements, item icons)
- Audio management (SFX/music library, drag-drop upload, preview playback, assign to SFX/Music elements)
- LocalStorage persistence (auto-save 2s debounce, save status indicator, project list, load on mount)
- Play Mode completo (movimiento, inventario, puzzles, cutscenes, audio, variables, transiciones)
- Scene Map integration (Vue Flow visual graph, synced with scenes/exits, create connections, chapter organization)

### Not Implemented (Empty directories ready)
- Backend/API integration
- Pinia state management
- Real authentication
- Component library refactoring
- Tests

## Known Issues / Areas to Watch

### Fixed Issues
1. **Freeze on quick navigation** (2025-01-27): Fixed `saveTimeout` not being cleared in `onUnmounted()`. Added `isMounted` flag to prevent operations on destroyed component.

### Potential Performance Issues in EditorView.vue
1. **Deep watcher on currentScene** (line 124-133): Uses `{ deep: true }` with `JSON.parse(JSON.stringify())` for history - can be expensive with large scenes
2. **History system**: `deepClone` using JSON serialization on every change (debounced 500ms)
3. **Event listeners**: Global mousemove/mouseup listeners during drag/resize operations

### Large File Alert
`EditorView.vue` is ~9300 lines - candidate for refactoring into:
- Composables: useSceneEditor, useDragDrop, useResize, useUndo, useActorAnimations, useDialogs, useAssets, useAudio, useStorage
- Components: CanvasElement, ElementPanel, PropertiesPanel, SpritesheetEditor, DialogEditor, AssetManager, AudioManager

## Cutscenes System (SCUMM-Style)

Cutscenes are scripted sequences with timeline-based actions.

### Cutscene Data Structure
```javascript
{
  id: number,
  name: string,
  trigger: 'manual' | 'scene-enter' | 'object-interact' | 'puzzle-solved',
  triggerTarget: number | null,  // ID of object/puzzle that triggers
  skippable: boolean,
  actions: [
    {
      id: number,
      type: string,       // Action type (see below)
      delay: number,      // ms before executing
      duration: number,   // ms duration
      params: { ... }     // Type-specific parameters
    }
  ]
}
```

### Action Types
| Type | Description | Params |
|------|-------------|--------|
| `dialog` | Show dialog | `{ actorId, text, emotion? }` |
| `move-actor` | Move actor | `{ actorId, x, y, walk: bool }` |
| `actor-direction` | Change direction | `{ actorId, direction }` |
| `actor-costume` | Change costume | `{ actorId, costume }` |
| `play-sfx` | Play sound | `{ sfxId }` |
| `play-music` | Change music | `{ musicId, fadeIn? }` |
| `stop-music` | Stop music | `{ fadeOut? }` |
| `wait` | Wait/pause | `{ duration }` |
| `fade-in` | Fade in | `{ duration, color? }` |
| `fade-out` | Fade out | `{ duration, color? }` |
| `camera-pan` | Pan camera | `{ x, y, duration }` |
| `camera-shake` | Shake camera | `{ intensity, duration }` |
| `change-scene` | Change scene | `{ sceneId, transition? }` |

## SCUMM Reference

This editor is inspired by SCUMM (Script Creation Utility for Maniac Mansion) engine concepts:
- Walkboxes for character movement areas
- Z-planes for depth sorting
- Verbs for interaction system
- Actors with costumes/directions
- Scene-based navigation with exits
- **Cutscenes** for scripted sequences

---

## FUTURO: Portabilidad a Plataformas Nativas

### Contexto

Pixel-Forge es un **editor web** (Vue.js). Para ejecutar juegos en plataformas nativas (Nintendo Switch, Steam, consolas), se necesita un **runtime nativo separado** que interprete los proyectos exportados.

### POC de Nintendo Switch

Existe un proof-of-concept funcional en:
```
../switch-poc/
```

**Estado**: ✅ Compilado y funcionando (genera `.nro` de 7.7 MB)

**Tecnología**:
- Lenguaje: C
- SDK: devkitPro / libnx
- Gráficos: SDL2 + SDL2_image
- Audio: SDL2_mixer
- Compilador: devkitA64 (GCC 15.2.0)

**Funcionalidades implementadas en el POC**:
| Feature | Estado |
|---------|--------|
| Rendering de backgrounds | ✅ |
| Sprites animados (4 direcciones) | ✅ |
| Walkbox collision (rectangular) | ✅ |
| Input (touch, joystick, botones) | ✅ |
| Audio (música en loop) | ✅ |
| Game loop con delta time | ✅ |
| Intro con animación | ✅ |
| Debug mode | ✅ |

**Archivos principales del POC**:
```
switch-poc/
├── source/
│   ├── main.c        # Entry point, game loop, estados
│   ├── player.c/h    # Movimiento, animación, sprites
│   ├── room.c/h      # Backgrounds, walkbox
│   └── input.c/h     # Touch, joystick, botones
├── include/
│   └── common.h      # Constantes, macros
├── romfs/            # Assets embebidos
│   ├── background.png
│   ├── spritesheet.png
│   ├── walkbox.dat
│   └── music.mp3
└── switch-poc.nro    # Homebrew ejecutable
```

### Arquitectura Propuesta: Editor + Runtime

```
┌─────────────────────────────────────────────────────────┐
│                    PIXEL-FORGE                          │
│                  (Editor - Web/Vue)                     │
│                                                         │
│  Crear escenas, actores, puzzles, cutscenes, etc.      │
│                                                         │
│              ┌────────────────────────┐                │
│              │   EXPORT: game.pfg     │                │
│              │   (JSON + Assets Pack) │                │
│              └────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ PF-Runtime   │ │ PF-Runtime   │ │ PF-Runtime   │
    │   (Switch)   │ │   (Steam)    │ │    (Web)     │
    │              │ │              │ │              │
    │ C/SDL2       │ │ C/SDL2       │ │ Canvas/WebGL │
    │ + devkitPro  │ │ + Steamworks │ │              │
    └──────────────┘ └──────────────┘ └──────────────┘
```

### Gap Analysis: Editor vs Runtime

| Feature en Pixel-Forge | POC Switch | Trabajo para Runtime |
|------------------------|------------|---------------------|
| Backgrounds | ✅ | Exportar PNG |
| Actor movement | ✅ | Exportar posición |
| Walkboxes (rectángulos) | ✅ | Exportar .dat |
| **Walkboxes (polígonos)** | ❌ | Implementar point-in-polygon en C |
| Sprites/Animations | ✅ Básico | Exportar spritesheet + metadata |
| **Múltiples escenas** | ❌ | Scene manager + loader |
| **Exits (cambio escena)** | ❌ | Transiciones + triggers |
| **Hotspots** | ❌ | Click detection + callbacks |
| **Diálogos** | ❌ | Sistema de texto SCUMM-style |
| **Inventory/Items** | ❌ | UI + lógica de items |
| **Puzzles** | ❌ | Sistema de condiciones |
| **Cutscenes** | ❌ | Secuenciador de acciones |
| SFX | ⚠️ Solo música | SDL_mixer chunks |
| **Iluminación** | ❌ | Shaders GLSL o blend overlay |
| **Partículas** | ❌ | Particle system en SDL |

### Formato de Exportación Propuesto: `.pfg`

```
game.pfg/                      # ZIP con estructura
├── manifest.json              # Metadata del proyecto
│   {
│     "name": "My Game",
│     "version": "1.0",
│     "startScene": "scene-1",
│     "resolution": [1920, 1200]
│   }
│
├── scenes/
│   ├── scene-1/
│   │   ├── background.png     # Fondo renderizado
│   │   ├── walkbox.dat        # Binario: polígonos
│   │   ├── exits.json         # Zonas de salida
│   │   ├── hotspots.json      # Zonas interactivas
│   │   ├── actors.json        # Placements de actores
│   │   └── metadata.json      # Nombre, música, triggers
│   └── scene-2/
│       └── ...
│
├── actors/
│   ├── actor-1/
│   │   ├── spritesheet.png
│   │   └── animations.json    # Frames por estado
│   └── ...
│
├── audio/
│   ├── music/
│   │   └── *.mp3
│   └── sfx/
│       └── *.wav
│
├── dialogs.json               # Todos los diálogos
├── puzzles.json               # Definiciones de puzzles
├── cutscenes.json             # Secuencias scripted
├── items.json                 # Definiciones de items
└── variables.json             # Variables iniciales
```

### Traducción de Sistemas Web → Nativo

#### Tabla de Equivalencias CSS → SDL2

| Efecto CSS (Editor Web) | Runtime Nativo (SDL2) | Estado | Notas |
|------------------------|----------------------|--------|-------|
| `mix-blend-mode: screen` | `SDL_BLENDMODE_ADD` | ✅ Directo | Equivalente exacto |
| `mix-blend-mode: multiply` | `SDL_BLENDMODE_MOD` | ✅ Directo | Equivalente exacto |
| `mix-blend-mode: overlay` | Shader GLSL personalizado | ⚠️ Requiere shader | No hay equivalente SDL directo |
| `opacity` | `SDL_SetTextureAlphaMod()` | ✅ Directo | Valor 0-255 |
| `transform: rotate()` | `SDL_RenderCopyEx()` con ángulo | ✅ Directo | Grados, centro de rotación |
| `transform: scale()` | `SDL_RenderCopyEx()` con destRect | ✅ Directo | Escalar destRect |
| `radial-gradient` (luces) | Shader GLSL o sprite pre-renderizado | ⚠️ Complejo | Ver sección Iluminación |
| `box-shadow` / glow | Sprite con alpha o shader blur | ⚠️ Complejo | Pre-renderizar en PNG |
| `filter: blur()` | Shader Gaussian blur | ⚠️ Requiere shader | Costoso en performance |
| DOM `<div>` partículas | Point sprites o textured quads | ⚠️ Reimplementar | Sistema propio en C |
| CSS `@keyframes` animations | Interpolación manual (lerp) | ⚠️ Reimplementar | deltaTime-based |
| CSS `transition` | Tweening manual | ⚠️ Reimplementar | Easing functions en C |
| `requestAnimationFrame` | SDL game loop fijo | ✅ Directo | 60 FPS target |
| Canvas 2D | `SDL_Renderer` | ✅ Directo | API similar |
| HTML5 `<audio>` | `SDL_mixer` | ✅ Directo | Más control de canales |
| `localStorage` | Archivo en SD/almacenamiento local | ✅ Directo | JSON o binario |
| WebSocket | No aplica | ❌ N/A | Runtime es offline |

#### Lo que se exporta SIN problemas

| Feature | Formato de exportación | Carga en Runtime |
|---------|----------------------|------------------|
| Posiciones (x, y) | JSON numérico | Directo |
| Tamaños (w, h) | JSON numérico | Directo |
| Rotaciones | JSON (grados) | `SDL_RenderCopyEx` |
| Colores | JSON hex o RGBA | `SDL_Color` |
| Opacidad | JSON (0.0-1.0) | `SDL_SetTextureAlphaMod` (0-255) |
| Walkboxes (polígonos) | JSON array de puntos | Collision detection manual |
| Imágenes/sprites | PNG en bundle | `IMG_LoadTexture` |
| Audio | MP3/OGG/WAV en bundle | `Mix_LoadMUS` / `Mix_LoadWAV` |
| Blend modes básicos | JSON string | Mapeo a `SDL_BlendMode` |

#### Lo que requiere TRABAJO ADICIONAL

##### 1. Sistema de Iluminación
```
Editor (CSS):                    Runtime (SDL2):
─────────────────────────────────────────────────────
radial-gradient + opacity   →    Opción A: Sprites de luz pre-renderizados
                                 Opción B: Shader GLSL con radial falloff
                                 Opción C: Render target con blend additivo

Luz ambiental (color overlay) →  SDL_SetTextureColorMod en todos los sprites
                                 O render target con color multiply
```

**Datos a exportar para luces:**
```json
{
  "type": "point|spot|directional|area",
  "x": 500, "y": 300,
  "color": "#ffaa00",
  "intensity": 0.8,
  "radius": 200,
  "angle": 45,
  "falloff": "linear|quadratic"
}
```

##### 2. Sistema de Partículas
```
Editor (DOM divs + CSS):         Runtime (SDL2):
─────────────────────────────────────────────────────
div elements con transform  →    Array de structs Particle
CSS opacity/scale animation →    Update loop con deltaTime
requestAnimationFrame       →    Integrado en game loop
```

**Datos a exportar para partículas:**
```json
{
  "preset": "fire|smoke|rain|snow|dust|magic",
  "emitRate": 10,
  "lifetime": { "min": 1.0, "max": 2.0 },
  "velocity": { "x": 0, "y": -50 },
  "gravity": { "x": 0, "y": 100 },
  "startSize": 10, "endSize": 2,
  "startColor": "#ff6600", "endColor": "#ff000000",
  "blendMode": "additive"
}
```

##### 3. Animaciones y Transiciones
```
Editor (CSS):                    Runtime (SDL2):
─────────────────────────────────────────────────────
@keyframes + animation      →    Función de interpolación:
                                 lerp(start, end, t)
                                 easeInOut(t), easeOutBounce(t), etc.

transition: all 0.3s ease   →    Tween struct con:
                                 - valor inicial/final
                                 - duración
                                 - función de easing
                                 - tiempo transcurrido
```

### Plan de Implementación Detallado

#### Fase 1: Fundamentos (Semanas 1-2)
| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| 1.1 | Definir especificación `.pfg` completa | Documento de spec |
| 1.2 | Crear exportador básico en Editor | Botón "Export .pfg" |
| 1.3 | Implementar loader en POC Switch | Carga de JSON + assets |
| 1.4 | Scene Manager básico | Cambio entre escenas |

#### Fase 2: Interacción (Semanas 3-4)
| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| 2.1 | Sistema de Hotspots | Click detection + callbacks |
| 2.2 | Sistema de Verbos | UI de verbos SCUMM-style |
| 2.3 | Cursor contextual | Cambio de cursor según hotspot |
| 2.4 | Sistema de Exits | Transiciones entre escenas |

#### Fase 3: Narrativa (Semanas 5-6)
| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| 3.1 | Sistema de Diálogos | Texto estilo SCUMM |
| 3.2 | Árboles de diálogo | Opciones de respuesta |
| 3.3 | Sistema de Cutscenes | Secuenciador de acciones |
| 3.4 | Transiciones de cámara | Pan, fade, shake |

#### Fase 4: Inventario y Puzzles (Semanas 7-8)
| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| 4.1 | UI de Inventario | Barra de items visual |
| 4.2 | Sistema de Items | Recoger, usar, combinar |
| 4.3 | Motor de Puzzles | Condiciones y triggers |
| 4.4 | Variables de juego | Estado persistente |

#### Fase 5: Efectos Visuales (Semanas 9-10)
| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| 5.1 | Sistema de Iluminación | Luz ambiental + point lights |
| 5.2 | Shaders básicos | Radial gradient, color overlay |
| 5.3 | Sistema de Partículas | Emisor configurable |
| 5.4 | Efectos de blend | Screen, multiply, overlay |

#### Fase 6: Polish y Optimización (Semanas 11-12)
| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| 6.1 | Sistema de guardado | Save/Load en SD |
| 6.2 | Optimización de memoria | Atlas de texturas |
| 6.3 | Testing en hardware | Pruebas en Switch real |
| 6.4 | Documentación | Guía de uso del runtime |

### Notas Importantes

1. **El editor web está bien** - No necesita cambios para portabilidad
2. **El runtime es separado** - Código nativo que lee proyectos exportados
3. **Iluminación/Partículas en editor** - Son preview, el runtime las implementa diferente
4. **El POC Switch es la base** - Extender con los sistemas faltantes
5. **Mismo runtime para Steam** - SDL2 es cross-platform
6. **Estrategia de exportación** - Exportar DATOS (propiedades), no estilos CSS
7. **Preview ≠ Final** - Lo que se ve en el editor es aproximación; el runtime puede variar

### Decisiones de Diseño Pendientes

| Decisión | Opciones | Impacto |
|----------|----------|---------|
| Iluminación | Sprites pre-render vs Shaders GLSL | Performance vs Flexibilidad |
| Partículas | CPU-based vs GPU shaders | Compatibilidad vs Cantidad |
| Formato assets | PNG individual vs Atlas | Memoria vs Velocidad de carga |
| Audio | Streaming vs Preload | Memoria vs Latencia |
| Resolución | 1920x1080 fijo vs Escalable | Simplicidad vs Compatibilidad |

### Referencias

- POC Switch: `../switch-poc/CLAUDE.md` (documentación completa)
- devkitPro: https://devkitpro.org/
- SDL2: https://www.libsdl.org/
- SDL2_image: https://wiki.libsdl.org/SDL2_image
- SDL2_mixer: https://wiki.libsdl.org/SDL2_mixer
- libnx: https://switchbrew.org/wiki/Setting_up_Development_Environment
- GLSL en SDL2: Requiere SDL2 + OpenGL context

---

## FUTURO: Generación de Juegos con IA (Claude Integration)

### Concepto

Integrar Claude CLI en un servidor (EC2 o similar) para permitir que los usuarios generen juegos completos a partir de un script narrativo. El usuario solo necesita:

1. **Escribir el script** del juego (historia, personajes, puzzles)
2. **Proporcionar assets** (imágenes, audio)

Claude se encarga de generar toda la estructura de datos del proyecto.

### Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                  │
│                                                                  │
│   1. Escribe script          3. Sube assets                     │
│      (narrativa, puzzles)       (sprites, backgrounds, audio)   │
└──────────────┬───────────────────────────┬──────────────────────┘
               │                           │
               ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PIXEL-FORGE (Vue App)                       │
│                                                                  │
│   ┌─────────────────┐    ┌─────────────────┐                    │
│   │  Script Editor  │    │  Asset Manager  │                    │
│   │  (Textarea/MD)  │    │  (Drag & Drop)  │                    │
│   └────────┬────────┘    └────────┬────────┘                    │
│            │                      │                              │
│            ▼                      ▼                              │
│   ┌─────────────────────────────────────────┐                   │
│   │         WebSocket / REST API            │                   │
│   └─────────────────────────────────────────┘                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVIDOR (EC2 / Cloud)                        │
│                                                                  │
│   ┌─────────────────────────────────────────┐                   │
│   │              Claude CLI                  │                   │
│   │                                          │                   │
│   │  System Prompt: CLAUDE.md (este archivo) │                   │
│   │  Input: Script del usuario               │                   │
│   │  Output: JSON estructurado válido        │                   │
│   └─────────────────────────────────────────┘                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PIXEL-FORGE (Vue App)                         │
│                                                                  │
│   Recibe JSON → Carga en proyecto → Usuario asigna assets       │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  JUEGO COMPLETO                          │   │
│   │  - Escenas conectadas                                    │   │
│   │  - Diálogos con branches                                 │   │
│   │  - Puzzles con lógica                                    │   │
│   │  - Cutscenes secuenciadas                                │   │
│   │  - Items e inventario                                    │   │
│   │  - Variables de estado                                   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Formato de Script (Propuesta v1)

Script legible en Markdown que Claude parsea y convierte a JSON del proyecto:

```markdown
# TÍTULO DEL JUEGO
Género: [Adventure/Mystery/Horror/Comedy]
Tono: [Descripción del tono narrativo]
Resolución: 1920x1200

---

## PERSONAJES

### NOMBRE_PERSONAJE
- Rol: [Protagonista/NPC/Antagonista]
- Descripción: [Apariencia y personalidad]
- Ubicación inicial: [Nombre de escena o "ninguna"]

### DETECTIVE
- Rol: Protagonista
- Descripción: Hombre de 40 años, cínico, gabardina gris, ex-policía
- Ubicación inicial: Lobby del Hotel

### MARTHA
- Rol: NPC
- Descripción: Mujer de 60 años, dueña del hotel, nerviosa, esconde algo
- Ubicación inicial: Lobby del Hotel

---

## ITEMS

### LLAVE_OXIDADA
- Descripción: Una llave vieja y oxidada con un número grabado
- Icono: 🔑
- Combinable: No
- Usar en: [exit, hotspot]

### PERIÓDICO
- Descripción: El diario de ayer, con una noticia sobre el crimen
- Icono: 📰
- Combinable: No
- Examinar: "La fecha es 15 de octubre de 1947..."

---

## ESCENAS

### Lobby del Hotel
Descripción: Lobby decadente de hotel años 40, lluvia visible por ventanas
Música: jazz_melancolico
Iluminación: Tenue, cálida, lámpara en recepción

#### Elementos:
- Recepción (hotspot) → Hablar con Martha
- Escaleras (exit) → Pasillo Habitaciones
- Puerta principal (exit) → Calle [bloqueada hasta resolver: Conseguir Permiso]
- Periódico en mesa (item: PERIÓDICO)
- Lámpara (decorativo) + luz point amarilla

#### Al entrar:
- Primera vez: Cutscene "Llegada al Hotel"
- Si variable "martha_confesó" = true: Martha no está en recepción

---

### Pasillo Habitaciones
Descripción: Pasillo largo y oscuro, puertas numeradas, alfombra raída
Música: ambient_suspense
Iluminación: Muy tenue, luz parpadea

#### Elementos:
- Habitación 101 (exit) → Habitación Víctima [requiere: LLAVE_OXIDADA]
- Habitación 102 (exit) → Habitación Martha [bloqueada]
- Escaleras (exit) → Lobby del Hotel
- Cuadro torcido (hotspot) → Esconde caja fuerte

---

## DIÁLOGOS

### Interrogar a Martha
Actor: MARTHA
Trigger: Interactuar con "Recepción"

[DETECTIVE] "Buenas noches. Soy el detective Marlowe."
[MARTHA] (nerviosa) "Oh... sí, la policía llamó. Qué tragedia..."
[DETECTIVE] "¿Dónde estaba usted anoche entre las 10 y las 12?"

Opciones:
  → "Presionar sobre su coartada"
    [MARTHA] "¡Estaba en mi habitación! Pueden preguntarle al conserje..."
    [DETECTIVE] "El conserje es sordo como una tapia."
    [MARTHA] (pausa) "..."

  → "Preguntar por la víctima"
    [MARTHA] "El señor Blackwood... llevaba tres semanas hospedado."
    [MARTHA] "Pagaba en efectivo. Nunca daba problemas."

  → [SI TIENE: CARTA_AMENAZA] "Mostrar la carta"
    [DETECTIVE] "¿Puede explicar esto?"
    [MARTHA] (palidece) "¿Dónde... dónde encontró eso?"
    → Continúa en: "Martha Confiesa"
    → Setear variable: "martha_confrontada" = true

  → "Terminar conversación"
    [DETECTIVE] "Volveremos a hablar."

---

### Martha Confiesa
Actor: MARTHA
Trigger: Manual (desde diálogo anterior)

[MARTHA] (llorando) "Está bien... está bien. Se lo diré todo."
[MARTHA] "Blackwood me estaba chantajeando..."

→ Setear variable: "martha_confesó" = true
→ Dar item: LLAVE_SOTANO
→ Desbloquear exit: "Puerta Sótano" en "Lobby del Hotel"

---

## PUZZLES

### Abrir Caja Fuerte
Tipo: use-on-object
Ubicación: Pasillo Habitaciones → "Cuadro torcido"
Requiere: Haber examinado PERIÓDICO (conocer la fecha)
Acción: Usar "mirar" en cuadro, luego ingresar código

Solución: Usar la fecha del periódico (1947)
Resultado: Obtener CARTA_AMENAZA

Pistas:
- 3 intentos: "Los números parecen importantes..."
- 5 intentos: "Quizás la fecha de algo relevante..."
- 7 intentos: "El periódico tenía una fecha muy visible..."

---

### Conseguir Permiso para Salir
Tipo: dialog-choice
Requiere: Completar diálogo "Martha Confiesa"
Resultado: Desbloquear salida "Puerta principal"

---

## CUTSCENES

### Llegada al Hotel
Trigger: scene-enter (Lobby del Hotel, primera vez)
Skippable: true

1. fade-in (1000ms, negro)
2. camera-pan (hacia puerta, 500ms)
3. wait (500ms)
4. dialog: DETECTIVE "Otro hotel de mala muerte..."
5. dialog: DETECTIVE "Pero aquí es donde murió Blackwood."
6. actor-direction: DETECTIVE → sur (mirando a cámara)
7. dialog: DETECTIVE "Hora de hacer preguntas."
8. fade-out (500ms)
9. fade-in (500ms)

---

## VARIABLES INICIALES

- caso_resuelto: false
- martha_confrontada: false
- martha_confesó: false
- habitacion_101_visitada: false
```

### Capacidades de Generación

| Elemento | Claude Genera | Usuario Proporciona |
|----------|---------------|---------------------|
| Escenas (estructura) | ✅ JSON completo | Asset de background |
| Personajes | ✅ Definición completa | Spritesheet |
| Diálogos | ✅ Líneas, branches, choices | - |
| Puzzles | ✅ Lógica, condiciones, hints | - |
| Cutscenes | ✅ Secuencia de acciones | - |
| Items | ✅ Definición, lógica | Icono (opcional) |
| Conexiones | ✅ Exits entre escenas | - |
| Iluminación | ✅ Configuración por escena | - |
| Música/SFX | ✅ Referencias por nombre | Archivos de audio |
| Walkboxes | ⚠️ Básicos (rectángulos) | Ajuste manual |
| Posiciones exactas | ⚠️ Estimadas | Ajuste manual |

### Modos de Generación

#### Modo Completo
- Input: Script completo del juego
- Output: Proyecto JSON listo para cargar
- Uso: Prototipado rápido, juegos pequeños

#### Modo Incremental
- Input: Una escena o sección del script
- Output: JSON parcial que se mergea al proyecto
- Uso: Desarrollo iterativo, juegos grandes

#### Modo Validación
- Input: Proyecto existente
- Output: Análisis de problemas (puzzles imposibles, items faltantes, escenas inalcanzables)
- Uso: QA, debugging de lógica

### API Endpoints (Propuesta)

```
POST /api/generate
  Body: { script: "...", mode: "complete" | "incremental" }
  Response: { project: {...}, warnings: [...] }

POST /api/validate
  Body: { project: {...} }
  Response: { valid: bool, issues: [...], suggestions: [...] }

POST /api/enhance
  Body: { project: {...}, request: "add hints to puzzles" }
  Response: { project: {...}, changes: [...] }
```

### UI en Pixel-Forge (Propuesta)

```
┌─────────────────────────────────────────────────────────────┐
│  PIXEL-FORGE                              [🤖 AI ASSISTANT] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── AI Panel (colapsable) ───────────────────────────┐   │
│  │                                                      │   │
│  │  [📝 Script] [✓ Validate] [✨ Enhance]              │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ # MI JUEGO                                     │ │   │
│  │  │ ## PERSONAJES                                  │ │   │
│  │  │ ### DETECTIVE                                  │ │   │
│  │  │ - Rol: Protagonista                            │ │   │
│  │  │ ...                                            │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                      │   │
│  │  [🚀 GENERATE PROJECT]                              │   │
│  │                                                      │   │
│  │  Status: Ready                                       │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  💬 "Genera una escena de biblioteca con un         │   │
│  │      puzzle de libro secreto"                       │   │
│  │                                                [Send]│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  [... resto del editor ...]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Plan de Implementación

| Fase | Tarea | Descripción |
|------|-------|-------------|
| 1 | Definir Script Spec | Finalizar formato Markdown del script |
| 2 | Servidor Claude | Setup EC2 + Claude CLI + API REST |
| 3 | Endpoint /generate | Parsear script → generar JSON |
| 4 | UI básica | Panel con textarea + botón generate |
| 5 | Import response | Cargar JSON generado en proyecto |
| 6 | Endpoint /validate | Análisis de proyecto existente |
| 7 | Modo incremental | Generar escenas individuales |
| 8 | Chat contextual | Modificaciones via lenguaje natural |
| 9 | Endpoint /enhance | Mejoras automáticas (hints, diálogos) |

### Consideraciones Técnicas

1. **Contexto**: Cada request incluye CLAUDE.md como system prompt
2. **Tamaño**: Scripts muy largos pueden necesitar chunking
3. **Validación**: Claude debe validar JSON antes de responder
4. **Errores**: Manejar casos donde el script es ambiguo
5. **Costo**: Cada generación consume tokens de API

### Beneficios para el Usuario

- **No necesita saber programar** - Solo escribe la historia
- **Prototipado en minutos** - De script a juego jugable
- **Iteración rápida** - Modificar script y regenerar
- **Consistencia** - Claude asegura que la lógica sea coherente
- **Foco en creatividad** - El usuario se enfoca en narrativa y arte

---

## Infraestructura Implementada (Claude Worker)

### Arquitectura de Producción

```
┌─────────────────────────────────────────────────────────────────┐
│                      INFRAESTRUCTURA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PIXEL-FORGE (Vue App)                                          │
│       │                                                          │
│       │ useClaudeSocket composable                              │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API Gateway WebSocket (Serverless)                      │    │
│  │  wss://kbcabn4wt6.execute-api.us-east-1.amazonaws.com/dev│    │
│  │                                                          │    │
│  │  Routes:                                                 │    │
│  │  ├── $connect → connectData (guarda connectionId)       │    │
│  │  ├── $disconnect → disconnectData                        │    │
│  │  ├── registerSession → registra userId/sessionId        │    │
│  │  ├── sendMessage → broadcast a todos                    │    │
│  │  └── sendToConnection → mensaje dirigido                │    │
│  └─────────────────────────────────────────────────────────┘    │
│       ▲                                                          │
│       │                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  EC2 Claude Worker                                       │    │
│  │  IP: 3.208.16.48                                         │    │
│  │  Instance: t3.small                                      │    │
│  │                                                          │    │
│  │  ├── Claude CLI (autenticado con Max subscription)      │    │
│  │  ├── Node.js worker (PM2 managed)                        │    │
│  │  └── Conectado al WebSocket como cliente                │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MongoDB Atlas                                           │    │
│  │  Database: pixelForge                                    │    │
│  │                                                          │    │
│  │  Collections:                                            │    │
│  │  ├── users → Usuarios del sistema                       │    │
│  │  ├── projects → Proyectos generados                     │    │
│  │  ├── generations → Logs de generación IA                │    │
│  │  └── dashboardConnections → Conexiones WebSocket activas│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  S3 Bucket                                               │    │
│  │  pixel-forge-assets-dev                                  │    │
│  │                                                          │    │
│  │  Para almacenar:                                         │    │
│  │  ├── Imágenes (backgrounds, sprites)                    │    │
│  │  └── Audio (música, SFX)                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Sistema de Identificación de Sesiones

Cada conexión WebSocket se identifica con:

| Campo | Descripción |
|-------|-------------|
| `connectionId` | ID único asignado por API Gateway |
| `userId` | ID del usuario autenticado |
| `sessionId` | ID único de la sesión del navegador |

#### Flujo de Conexión

```
1. Cliente conecta al WebSocket
   → API Gateway genera connectionId
   → connectData guarda { connectionId, active: 1 }

2. Cliente envía registerSession
   → { action: "registerSession", userId: "...", sessionId: "..." }
   → registerSessionData actualiza conexión con userId/sessionId

3. Cliente envía mensaje de generación
   → { action: "sendMessage", message: { type: "generate_project", ... } }
   → Worker recibe, procesa con Claude CLI

4. Worker responde con sendToConnection
   → { action: "sendToConnection", target: { sessionId }, message: {...} }
   → Solo el cliente original recibe la respuesta
```

#### Estructura de Conexión en MongoDB

```javascript
// Collection: dashboardConnections
{
  "_id": ObjectId,
  "connectionId": "abc123xyz",       // ID de API Gateway
  "userId": "user-456",              // ID del usuario
  "sessionId": "session-789",        // ID de la sesión
  "active": 1,                       // 1 = activo, 0 = inactivo
  "created": ISODate,
  "registeredAt": ISODate
}
```

### Handlers WebSocket (pf-sockets)

| Handler | Route | Descripción |
|---------|-------|-------------|
| `connectData` | `$connect` | Guarda nueva conexión |
| `disconnectData` | `$disconnect` | Elimina conexión |
| `registerSessionData` | `registerSession` | Registra userId/sessionId |
| `sendMessageData` | `sendMessage` | Broadcast a todas las conexiones |
| `sendToConnectionData` | `sendToConnection` | Mensaje dirigido a sesión/usuario |

### Composable useClaudeSocket

Ubicación: `src/composables/useClaudeSocket.js`

```javascript
import { useClaudeSocket } from '@/composables/useClaudeSocket'

const {
  connect,
  disconnect,
  generateProject,
  isConnected,
  isRegistered,
  isGenerating,
  lastError
} = useClaudeSocket()

// Conectar con identificadores
await connect('user-123')  // sessionId se genera automáticamente

// Generar proyecto desde script
try {
  const project = await generateProject(scriptMarkdown, {
    onStarted: () => console.log('Generando...')
  })
  // project contiene el JSON del juego generado
} catch (error) {
  console.error('Error:', error.message)
}

// Desconectar
disconnect()
```

#### Métodos Disponibles

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `connect` | `userId, sessionId?` | `Promise<void>` | Conecta y registra sesión |
| `disconnect` | - | `void` | Cierra conexión |
| `generateProject` | `script, options?` | `Promise<Object>` | Genera proyecto con Claude |
| `sendMessage` | `type, data` | `boolean` | Envía mensaje genérico |

#### Estado Reactivo

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isConnected` | `Ref<boolean>` | WebSocket conectado |
| `isRegistered` | `Ref<boolean>` | Sesión registrada |
| `isGenerating` | `Ref<boolean>` | Generación en progreso |
| `lastError` | `Ref<string>` | Último error ocurrido |
| `connectionId` | `Ref<string>` | ID de conexión actual |

### Mensajes del Sistema

#### Request: generate_project
```javascript
{
  "type": "generate_project",
  "script": "# MI JUEGO\n## PERSONAJES\n...",
  "userId": "user-123",
  "sessionId": "session-abc",
  "projectId": null,        // o ID existente para actualizar
  "requestId": "req-12345"
}
```

#### Response: generation_started
```javascript
{
  "type": "generation_started",
  "requestId": "req-12345",
  "workerId": "worker-67890",
  "timestamp": 1704067200000
}
```

#### Response: generation_complete
```javascript
{
  "type": "generation_complete",
  "requestId": "req-12345",
  "projectId": "507f1f77bcf86cd799439011",
  "project": { /* JSON completo del proyecto */ },
  "workerId": "worker-67890",
  "timestamp": 1704067260000
}
```

#### Response: generation_error
```javascript
{
  "type": "generation_error",
  "requestId": "req-12345",
  "error": "Mensaje de error",
  "workerId": "worker-67890",
  "timestamp": 1704067260000
}
```

### EC2 Worker - Comandos Útiles

```bash
# SSH al servidor
ssh -i ~/.ssh/pixel-forge-claude-key.pem ubuntu@3.208.16.48

# Ver logs del worker
pm2 logs pixel-forge-worker

# Reiniciar worker
pm2 restart pixel-forge-worker

# Ver status
pm2 status

# Monitorear en tiempo real
pm2 monit
```

### Archivos del Worker

```
/home/ubuntu/pixel-forge-worker/
├── package.json
├── worker.js          # Cliente WebSocket + procesador Claude
└── node_modules/
```

### Variables de Entorno

| Variable | Valor | Ubicación |
|----------|-------|-----------|
| `WS_URL` | `wss://kbcabn4wt6...` | worker.js |
| `MONGO_URI` | `mongodb+srv://...` | worker.js, pf-sockets |
| `DB_NAME` | `pixelForge` | worker.js, pf-sockets |

### Costos Estimados (Desarrollo)

| Servicio | Costo/mes |
|----------|-----------|
| EC2 t3.small | ~$15 |
| EBS 20GB gp3 | ~$1.60 |
| S3 (bajo uso) | ~$0.50 |
| API Gateway WebSocket | ~$1-5 |
| MongoDB Atlas (M0 free) | $0 |
| **Total** | **~$18-22/mes** |

---

## Sistema CRUD de Proyectos via WebSocket

### Arquitectura

El sistema de persistencia de proyectos usa WebSocket en lugar de API REST para mantener una única conexión y reutilizar la infraestructura existente.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUJO CRUD                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pixel-Forge (Vue)                                              │
│       │                                                          │
│       │ useProjectApi composable                                │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API Gateway WebSocket                                   │    │
│  │  Route: projectCrud                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  projectCrudData.js (pf-sockets)                        │    │
│  │                                                          │    │
│  │  Recibe crudAction y invoca Lambda correspondiente      │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  pf-project Lambdas                                      │    │
│  │                                                          │    │
│  │  ├── pixel-forge-project-dev-get    (listar)            │    │
│  │  ├── pixel-forge-project-dev-getById (obtener uno)      │    │
│  │  ├── pixel-forge-project-dev-post   (crear)             │    │
│  │  ├── pixel-forge-project-dev-patch  (actualizar)        │    │
│  │  └── pixel-forge-project-dev-delete (eliminar)          │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MongoDB Atlas                                           │    │
│  │  Collection: projects                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Handler: projectCrudData.js

Ubicación: `pf-sockets/controllers/projectCrudData.js`

#### Acciones Soportadas

| Acción | Descripción | Parámetros |
|--------|-------------|------------|
| `project_list` | Listar proyectos del usuario | `userId`, `filter?`, `project?`, `sort?` |
| `project_get` | Obtener proyecto por ID | `projectId` |
| `project_create` | Crear nuevo proyecto | `project`, `userId` |
| `project_update` | Actualizar proyecto | `projectId`, `updates`, `userEmail?` |
| `project_delete` | Eliminar (soft delete) | `projectId`, `userEmail?` |
| `project_save` | Crear o actualizar | `project`, `userId`, `userEmail?` |

#### Formato de Mensaje (Request)

```javascript
{
  "action": "projectCrud",        // Route del WebSocket
  "crudAction": "project_list",   // Acción CRUD específica
  "requestId": "req-12345",       // ID único para correlacionar respuesta
  "userId": "user-abc",           // ID del usuario
  // ... parámetros específicos de la acción
}
```

#### Formato de Mensaje (Response)

```javascript
{
  "type": "project_list_response",  // {crudAction}_response
  "requestId": "req-12345",
  "success": true,
  "data": [...],                    // Resultado de la operación
  "error": null,                    // Mensaje de error si success=false
  "timestamp": 1704067200000
}
```

### Composable: useProjectApi

Ubicación: `src/composables/useProjectApi.js`

#### Uso Básico

```javascript
import { useProjectApi } from '@/composables/useProjectApi'

const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  saveProject,
  isLoading,
  error
} = useProjectApi()

// Listar proyectos del usuario
const projects = await getProjects(userId, {
  filter: { genre: 'mystery' },
  sort: { createdAt: -1 }
})

// Obtener proyecto específico
const project = await getProjectById(projectId)

// Crear proyecto
const newProjectId = await createProject({
  name: 'Mi Juego',
  description: 'Una aventura...',
  genre: 'mystery'
}, userId)

// Actualizar proyecto
const success = await updateProject(projectId, {
  name: 'Nuevo Nombre'
}, userEmail)

// Eliminar proyecto (soft delete)
const deleted = await deleteProject(projectId, userEmail)

// Guardar (crear si no existe, actualizar si existe)
const savedId = await saveProject(projectData, userId, userEmail)
```

#### Métodos Disponibles

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `getProjects` | `userId, options?` | `Promise<Array>` | Lista proyectos del usuario |
| `getProjectById` | `projectId` | `Promise<Object\|null>` | Obtiene proyecto por ID |
| `createProject` | `projectData, userId` | `Promise<string\|null>` | Crea proyecto, retorna ID |
| `updateProject` | `projectId, updates, userEmail?` | `Promise<boolean>` | Actualiza proyecto |
| `deleteProject` | `projectId, userEmail?` | `Promise<boolean>` | Elimina proyecto |
| `saveProject` | `project, userId, userEmail?` | `Promise<string\|null>` | Upsert de proyecto |
| `generateUUID` | - | `string` | Genera UUID v4 |
| `disconnect` | - | `void` | Cierra conexión WebSocket |

#### Estado Reactivo

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isLoading` | `Ref<boolean>` | Operación en progreso |
| `error` | `Ref<string\|null>` | Último error ocurrido |

#### Manejo de Conexión

El composable maneja automáticamente:
- Conexión lazy al WebSocket (solo cuando se necesita)
- Reconexión automática si la conexión se pierde
- Timeout de 30 segundos por operación
- Limpieza de requests pendientes

### Estructura de Proyecto en MongoDB

```javascript
{
  "_id": ObjectId,
  "projectId": "uuid-v4",           // ID único del proyecto
  "userId": "user-123",             // Dueño del proyecto
  "name": "Mi Aventura",
  "description": "Una historia de misterio...",
  "genre": "mystery",
  "tone": "noir",

  // Datos del juego
  "characters": [
    { "name": "Detective", "role": "protagonist", "description": "..." }
  ],
  "scenes": [
    { "name": "Lobby", "description": "..." }
  ],
  "project": { /* Proyecto completo de Pixel-Forge */ },

  // Metadata
  "active": 1,                      // 1=activo, 0=eliminado (soft delete)
  "createdAt": ISODate,
  "updatedAt": ISODate,
  "userEmail": "user@example.com"
}
```

### Cambios en pf-project Lambda

#### mongodb.js - Cambios Realizados (2026-01-28)

1. **Renombrado de clase**: `user` → `ProjectModel`
2. **Campo de validación de duplicados**: `rut` → `projectId`
3. **Campo de identificación en delete/patch**: `id` → `projectId`
4. **Timestamps**: `created/updated` → `createdAt/updatedAt`

```javascript
// Antes
async insertOne(conn, data) {
  const existente = await conn.findOne({ rut: data.rut })
  // ...
  data.created = new Date().toISOString()
  data.updated = new Date().toISOString()
}

// Después
async insertOne(conn, data) {
  const existente = await conn.findOne({ projectId: data.projectId })
  // ...
  data.createdAt = new Date()
  data.updatedAt = new Date()
}
```

---

## Modal de Creación de Proyecto (Point & Click)

### Ubicación

`DashboardView.vue` - Se activa al seleccionar "Point & Click" en el menú principal.

### Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD                                                       │
│                                                                  │
│  [Point & Click]  [Visual Novel]  [Plataformas]                │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────── MODAL WIZARD ───────────────────────────┐     │
│  │                                                         │     │
│  │  PASO 1: INFORMACIÓN DEL PROYECTO                      │     │
│  │  ┌───────────────────────────────────────────────────┐ │     │
│  │  │ Nombre: [________________]                        │ │     │
│  │  │ Descripción: [____________________________]      │ │     │
│  │  │ Género: [Misterio ▼]                             │ │     │
│  │  │ Tono: [Noir ▼]                                   │ │     │
│  │  └───────────────────────────────────────────────────┘ │     │
│  │                                                         │     │
│  │                              [SIGUIENTE →]              │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│                            ▼                                     │
│                                                                  │
│  ┌─────────────── MODAL WIZARD ───────────────────────────┐     │
│  │                                                         │     │
│  │  PASO 2: PERSONAJES                                    │     │
│  │  ┌───────────────────────────────────────────────────┐ │     │
│  │  │ ┌─ Personaje 1 ─────────────────────────────────┐ │ │     │
│  │  │ │ Nombre: [Detective]                           │ │ │     │
│  │  │ │ Rol: [Protagonista ▼]                         │ │ │     │
│  │  │ │ Descripción: [Investigador privado...]        │ │ │     │
│  │  │ └───────────────────────────────────────────────┘ │ │     │
│  │  │                                                   │ │     │
│  │  │ [+ Agregar Personaje]                            │ │     │
│  │  └───────────────────────────────────────────────────┘ │     │
│  │                                                         │     │
│  │                    [← ATRÁS]  [SIGUIENTE →]            │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│                            ▼                                     │
│                                                                  │
│  ┌─────────────── MODAL WIZARD ───────────────────────────┐     │
│  │                                                         │     │
│  │  PASO 3: ESCENAS                                       │     │
│  │  ┌───────────────────────────────────────────────────┐ │     │
│  │  │ ┌─ Escena 1 ────────────────────────────────────┐ │ │     │
│  │  │ │ Nombre: [Lobby del Hotel]                     │ │ │     │
│  │  │ │ Descripción: [Lobby decadente años 40...]     │ │ │     │
│  │  │ └───────────────────────────────────────────────┘ │ │     │
│  │  │                                                   │ │     │
│  │  │ [+ Agregar Escena]                               │ │     │
│  │  └───────────────────────────────────────────────────┘ │     │
│  │                                                         │     │
│  │                    [← ATRÁS]  [CREAR PROYECTO]          │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Estructura de Datos del Modal

```javascript
newProject: {
  // Paso 1: Información
  name: '',
  description: '',
  genre: 'mystery',        // mystery, horror, comedy, drama, scifi, fantasy
  tone: 'serious',         // serious, lighthearted, dark, noir, whimsical

  // Paso 2: Personajes
  characters: [
    {
      id: 1,
      name: '',
      role: 'protagonist',  // protagonist, antagonist, npc, supporting
      description: ''
    }
  ],

  // Paso 3: Escenas
  scenes: [
    {
      id: 1,
      name: '',
      description: ''
    }
  ]
}
```

### Opciones de Género

| Género | Descripción |
|--------|-------------|
| `mystery` | Misterio |
| `horror` | Horror |
| `comedy` | Comedia |
| `drama` | Drama |
| `scifi` | Ciencia Ficción |
| `fantasy` | Fantasía |

### Opciones de Tono

| Tono | Descripción |
|------|-------------|
| `serious` | Serio |
| `lighthearted` | Ligero |
| `dark` | Oscuro |
| `noir` | Noir |
| `whimsical` | Fantasioso |

### Roles de Personaje

| Rol | Descripción |
|-----|-------------|
| `protagonist` | Protagonista |
| `antagonist` | Antagonista |
| `npc` | NPC |
| `supporting` | Secundario |

### Validación

- **Paso 1**: Nombre del proyecto requerido
- **Paso 2**: Al menos un personaje con nombre
- **Paso 3**: Al menos una escena con nombre

### Integración con useProjectApi

```javascript
async function createNewProject() {
  const { saveProject } = useProjectApi()

  const projectData = {
    projectId: crypto.randomUUID(),
    name: newProject.value.name,
    description: newProject.value.description,
    genre: newProject.value.genre,
    tone: newProject.value.tone,
    characters: newProject.value.characters.filter(c => c.name.trim()),
    scenes: newProject.value.scenes.filter(s => s.name.trim())
  }

  const savedId = await saveProject(projectData, userId, userEmail)

  if (savedId) {
    // Navegar al editor con el proyecto creado
    router.push(`/editor/${savedId}`)
  }
}
```

---

## Fixes Recientes (2026-01-28)

### 1. Fix: Unwrapping de Mensajes en useClaudeSocket

**Problema**: Los mensajes de `sendMessageData` llegaban envueltos en `{ message: {...}, sender, timestamp }`, pero el composable leía `type` directamente del wrapper.

**Solución**: Unwrap del mensaje antes de procesarlo.

```javascript
// useClaudeSocket.js
function handleMessage(rawMessage, connectResolve = null) {
  // Unwrap message if it came from sendMessageData
  const message = rawMessage.message || rawMessage
  console.log('[ClaudeSocket] Mensaje recibido:', message.type)
  // ... resto del manejo
}
```

### 2. Fix: Claude CLI Invocation en EC2 Worker

**Problema**: El worker llamaba a Claude CLI con `-p` flag que causaba timeout/hang.

**Solución**: Usar `--print` flag y enviar prompt via stdin.

```javascript
// worker.js
const claudeProcess = spawn('claude', ['--print'], {
  cwd: '/home/ubuntu/pixel-forge-worker'
})

claudeProcess.stdin.write(prompt)
claudeProcess.stdin.end()
```

### 3. Fix: ObjectId Validation en saveProject

**Problema**: El worker intentaba usar projectId como ObjectId de MongoDB, fallando con "input must be a 24 character hex string".

**Solución**: Usar UUID para projectId en lugar de ObjectId.

```javascript
// worker.js
const projectId = data.projectId || crypto.randomUUID()

// No usar new ObjectId(projectId)
await collection.updateOne(
  { projectId: projectId },
  { $set: projectData },
  { upsert: true }
)
```

### 4. Fix: Duplicate `action` Key en sendAction

**Problema**: El mensaje enviado tenía `{ action: 'projectCrud', action: action }`, sobrescribiendo la ruta.

**Solución**: Renombrar a `crudAction`.

```javascript
// useProjectApi.js
ws.send(JSON.stringify({
  action: 'projectCrud',    // Route del WebSocket
  crudAction: action,       // Acción CRUD específica
  requestId,
  ...params
}))
```

---

## Archivos Modificados/Creados (2026-01-28)

### Nuevos Archivos

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `projectCrudData.js` | `pf-sockets/controllers/` | Handler WebSocket para CRUD de proyectos |
| `useProjectApi.js` | `pixel-forge/src/composables/` | Composable Vue para CRUD via WebSocket |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `pf-sockets/serverless.yml` | Agregada ruta `projectCrud` |
| `pf-project/model/mongodb.js` | Clase renombrada, campos actualizados |
| `pixel-forge/src/composables/index.js` | Export de useProjectApi |
| `pixel-forge/src/composables/useClaudeSocket.js` | Fix unwrapping de mensajes |
| `pixel-forge/src/views/DashboardView.vue` | Modal wizard para nuevo proyecto |

### serverless.yml - Nueva Ruta

```yaml
# pf-sockets/serverless.yml
functions:
  # ... otras funciones ...

  projectCrudData:
    handler: controllers/projectCrudData.handler
    layers:
      - ${self:provider.mongoLayer}
    events:
      - websocket:
          route: projectCrud
```

### index.js - Exports de Composables

```javascript
// pixel-forge/src/composables/index.js
export { useClaudeSocket } from './useClaudeSocket'
export { useProjectApi } from './useProjectApi'
```

## Sistema de Assets en S3 (2026-01-29)

### Arquitectura

Los assets (imágenes, audio) ahora se almacenan en Amazon S3 en lugar de base64 embebido en el proyecto.

**Bucket**: `pixel-forge-assets-dev`
**Región**: `us-east-1`

### Composable: useAssetApi

```javascript
import { useAssetApi } from '@/composables/useAssetApi'

const {
  uploadAsset,      // Subir archivo a S3
  getAssetUrl,      // Obtener URL firmada (con cache)
  getAssetUrls,     // Obtener múltiples URLs
  deleteAsset,      // Eliminar de S3
  listAssets,       // Listar assets de un proyecto
  isUploading,      // Estado de carga
  uploadProgress,   // Progreso (0-100)
  ASSET_CATEGORIES  // Categorías disponibles
} = useAssetApi()
```

### Estructura de Asset

```javascript
{
  id: number,
  name: string,
  s3Key: string,           // Path en S3: userId/projectId/type/category/filename
  category: string,        // 'background' | 'object' | 'sprite' | 'ui' | 'other'
  folderPath: string,      // Carpeta en el Asset Manager: '/' | '/Personajes' | etc.
  width: number,
  height: number,
  type: 'image' | 'audio',
  contentType: string      // MIME type
}
```

### Categorías por Tipo

```javascript
ASSET_CATEGORIES = {
  image: ['background', 'object', 'sprite', 'ui', 'other'],
  audio: ['music', 'sfx', 'ambient', 'voice', 'other']
}
```

### Límites de Tamaño

| Tipo | Límite |
|------|--------|
| Imágenes | 10 MB |
| Audio | 50 MB |
| Otros | 5 MB |

### Handler Backend: assetUploadData.js

Acciones WebSocket soportadas:
- `get_upload_url`: Genera URL firmada para upload (5 min expiry)
- `get_download_url`: Genera URL firmada para download (1 hora expiry)
- `get_download_urls`: Múltiples URLs en batch
- `delete_asset`: Elimina archivo de S3
- `list_assets`: Lista assets de un proyecto

### CORS en S3

Configuración necesaria para permitir fetch desde el frontend:

```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedOrigins": [
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:4173"
            ],
            "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
            "MaxAgeSeconds": 3600
        }
    ]
}
```

Aplicar con CLI:
```bash
aws s3api put-bucket-cors --bucket pixel-forge-assets-dev --cors-configuration file://cors.json
```

## Sistema de Carpetas para Assets (2026-01-29)

### Estructura

Los assets se organizan en carpetas virtuales usando `folderPath`:

```javascript
globalData: {
  assets: [
    { id: 1, name: 'Guybrush.png', folderPath: '/Personajes', ... },
    { id: 2, name: 'fondo.png', folderPath: '/Fondos/Interiores', ... }
  ],
  assetFolders: [
    { id: 1, path: '/Personajes', name: 'Personajes', parentPath: '/', icon: '👤' },
    { id: 2, path: '/Fondos', name: 'Fondos', parentPath: '/', icon: '🏞️' },
    { id: 3, path: '/Fondos/Interiores', name: 'Interiores', parentPath: '/Fondos', icon: '🏠' }
  ]
}
```

### UI en Asset Manager

- Árbol de carpetas en sidebar
- CRUD de carpetas (crear, renombrar, eliminar)
- Drag-drop de assets entre carpetas
- Filtrado por carpeta actual

## Animaciones Globales (2026-01-29)

### Cambio de Arquitectura

Las animaciones ahora son **globales** (en `globalData.animations`) en lugar de por escena.

```javascript
globalData: {
  animations: [
    {
      id: number,
      name: string,
      spritesheetAssetId: number,    // Referencia al asset en S3
      spritesheetWidth: number,       // Dimensiones del spritesheet
      spritesheetHeight: number,
      frames: [{ x, y, w, h }, ...],  // Posiciones de frames
      frameRate: number,              // FPS (default: 12)
      loop: boolean,
      pingPong: boolean,              // Ida y vuelta
      gridConfig: { cols, rows, frameW, frameH, offsetX, offsetY, spacingX, spacingY }
    }
  ]
}
```

### Spritesheet Editor - Mejoras

#### Auto-detección de Grid Mejorada

Ahora detecta grids no-cuadrados (ej: 6x6 con frames de 232x414):

```javascript
// Grids comunes probados
const commonGrids = [
  [4, 4], [6, 6], [8, 8], [4, 8], [8, 4],
  [3, 4], [4, 3], [5, 5], [6, 4], [4, 6], ...
]
```

#### Indicador de Tamaño Correcto

Si el tamaño de frame configurado no coincide con el sugerido:
- Muestra warning: "⚠️ ¡Tamaño incorrecto!"
- Botón "⚡ Aplicar Tamaño Correcto" para corregir automáticamente

#### Preview con Canvas

El preview de animación usa `<canvas>` en lugar de CSS `background-image` para evitar problemas de renderizado y CORS:

```javascript
ctx.drawImage(
  imgEl,
  frameX, frameY,    // Source position
  frameW, frameH,    // Source size
  0, 0,              // Dest position
  frameW, frameH     // Dest size
)
```

## Modo Espejo en Animaciones (2026-01-29)

### Concepto

Permite reutilizar una animación aplicando flip horizontal. Útil para:
- `walk-west` → reutilizar como `walk-east` con espejo
- Reducir cantidad de sprites necesarios

### Estructura de Asignación

```javascript
// Formato anterior (solo ID)
actor.animations = { 'walk-west': 5 }

// Formato nuevo (objeto con mirror)
actor.animations = {
  'walk-west': { id: 5, mirror: false },
  'walk-east': { id: 5, mirror: true }   // Misma anim, espejada
}
```

### Helpers de Compatibilidad

```javascript
// Obtener ID (maneja ambos formatos)
const getAnimationIdFromAssignment = (assignment) => {
  if (!assignment) return null
  if (typeof assignment === 'number') return assignment
  if (typeof assignment === 'object' && assignment.id) return assignment.id
  return null
}

// Verificar si tiene espejo
const isAnimationMirrored = (assignment) => {
  if (!assignment) return false
  if (typeof assignment === 'object' && assignment.mirror) return true
  return false
}
```

### UI en Modal "Asignar a Actor"

- Checkbox "🪞 Modo Espejo (flip horizontal)"
- Indicador visual 🪞 en estados con espejo
- Botones de estado muestran borde cyan si tienen mirror

### Renderizado

El espejo se aplica con CSS transform:

```javascript
if (anim._mirror) {
  style.transform = 'scaleX(-1)'
}
```

## Escalado de Background al Canvas (2026-01-29)

### Funcionalidad

Cuando un background no coincide con las dimensiones del canvas, ofrece escalarlo automáticamente.

### UI

En propiedades de escena (sin elemento seleccionado):
```
Background: [Select ▼]
⚠️ 1920×1080 ≠ 1920×1200
[📐 Ajustar al Canvas]
```

### Modal de Escalado

Opciones disponibles:
- **🖼️ Cubrir (Cover)**: Llena todo el canvas, puede recortar bordes
- **📦 Contener (Contain)**: Muestra toda la imagen, puede tener barras negras
- **↔️ Estirar (Stretch)**: Estira para llenar, puede distorsionar

### Proceso

1. Descarga imagen como blob (via `fetch()`)
2. Crea canvas con dimensiones del escena
3. Dibuja imagen escalada según modo seleccionado
4. Convierte a PNG
5. Sube como nuevo asset a S3
6. Asigna como background de la escena

**Nota**: Requiere CORS configurado en S3 para funcionar.

## Play Mode - Mejoras (2026-01-29)

### Elementos Ocultos en Play Mode

Durante play mode se ocultan las guías visuales:
- Walkboxes
- Exits
- Hotspots
- Z-planes

Solo permanecen visibles: imágenes, actores, y el jugador.

### Mensaje sobre el Actor

El mensaje de acciones (mirar, hablar, etc.) aparece posicionado sobre el actor:

```html
<div class="play-message" :style="{
  left: playerPosition.x * zoom + 'px',
  top: (playerPosition.y - playerSize.h - 20) * zoom + 'px'
}">
  {{ messageText }}
</div>
```

### Tracking de Actor Controlado

```javascript
playModeState: {
  playerActorId: number,       // ID del actor global
  playerPlacementId: number,   // ID del placement en escena (para ocultar)
  playerPosition: { x, y },
  playerSize: { w, h },
  playerDirection: string,
  playerState: string          // 'idle' | 'walk-north' | 'walk-south' | etc.
}
```

## Fixes Importantes (2026-01-29/30)

### 1. Spritesheet Grid Display

**Problema**: El grid del spritesheet se mostraba escalado pero las coordenadas usaban tamaño real.

**Fix**: Cambiar `background-size: contain` a tamaño explícito:
```css
.spritesheet-grid {
  background-size: 100% 100%;  /* Era: contain */
}
```
Y en inline style:
```javascript
backgroundSize: spritesheetImage.width + 'px ' + spritesheetImage.height + 'px'
```

### 2. Preview de Animación con Canvas

**Problema**: El preview mostraba múltiples sprites en lugar de un frame.

**Fix**: Usar `<canvas>` con `drawImage()` en lugar de CSS background-image para control preciso de recorte.

### 3. Auto-detect Grid para Frames No-Cuadrados

**Problema**: `autoDetectGrid` asumía frames cuadrados.

**Fix**: Probar combinaciones de cols×rows comunes y calcular frameW/frameH independientemente.
