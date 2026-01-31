# Exportación a Nintendo Switch (.nro)

> Fecha: 2026-01-30
> Estado: **Sprint 1 en progreso** - Scene Manager implementado

## Resumen

Para ejecutar juegos de Pixel-Forge en Nintendo Switch se necesitan dos componentes:

1. **Exportador PFG** (en Pixel-Forge) - Genera el paquete de datos del juego
2. **Runtime NRO** (en C/SDL2) - Ejecuta el juego en Switch

---

## Parte 1: Exportador PFG (Pixel-Forge → .pfg)

### Objetivo
Crear una función de exportación en el editor web que genere un archivo `.pfg` con todos los datos y assets del juego en un formato optimizado para el runtime nativo.

### Formato .pfg (ZIP con estructura)

```
game.pfg/
├── manifest.json              # Metadata del proyecto
├── scenes/
│   ├── scene-1/
│   │   ├── background.png     # Fondo (optimizado)
│   │   ├── data.json          # Walkboxes, exits, hotspots, actors
│   │   └── layers/            # Imágenes de la escena
│   │       └── *.png
│   └── scene-2/
│       └── ...
├── actors/
│   ├── actor-1/
│   │   ├── spritesheet.png    # Spritesheet combinado
│   │   └── animations.json    # Definición de frames
│   └── ...
├── audio/
│   ├── music/
│   │   └── *.mp3
│   └── sfx/
│       └── *.wav
├── dialogs.json               # Todos los diálogos
├── puzzles.json               # Definiciones de puzzles
├── cutscenes.json             # Secuencias scripted
├── items.json                 # Items de inventario
└── variables.json             # Variables iniciales del juego
```

### manifest.json
```json
{
  "name": "Mi Juego",
  "version": "1.0.0",
  "author": "Autor",
  "startScene": 1,
  "resolution": {
    "width": 1920,
    "height": 1200
  },
  "targetResolution": {
    "width": 1280,
    "height": 720
  },
  "scenes": [1, 2, 3, 4],
  "playerActorId": 1
}
```

### scenes/{id}/data.json
```json
{
  "id": 1,
  "name": "Escena Principal",
  "background": "background.png",
  "music": "ambient.mp3",
  "walkboxes": [
    {
      "id": 1,
      "points": [
        {"x": 100, "y": 400},
        {"x": 800, "y": 400},
        {"x": 900, "y": 600},
        {"x": 50, "y": 600}
      ]
    }
  ],
  "exits": [
    {
      "id": 1,
      "name": "Puerta",
      "x": 750, "y": 300,
      "w": 100, "h": 200,
      "targetScene": 2,
      "targetX": 100,
      "targetY": 500
    }
  ],
  "hotspots": [
    {
      "id": 1,
      "name": "Mesa",
      "x": 200, "y": 350,
      "w": 150, "h": 100,
      "interactions": [
        {"verb": "look", "dialog": "Una mesa de madera vieja."},
        {"verb": "use", "action": "triggerPuzzle", "puzzleId": 1}
      ]
    }
  ],
  "actorPlacements": [
    {
      "actorId": 1,
      "x": 400, "y": 500,
      "direction": "south"
    }
  ],
  "images": [
    {
      "id": 1,
      "name": "Lámpara",
      "asset": "lamp.png",
      "x": 300, "y": 200,
      "z": 5,
      "interactive": true
    }
  ]
}
```

### actors/{id}/animations.json
```json
{
  "id": 1,
  "name": "Protagonista",
  "spritesheet": "spritesheet.png",
  "frameWidth": 64,
  "frameHeight": 128,
  "states": {
    "idle-south": {"row": 0, "frames": 1, "fps": 1},
    "idle-north": {"row": 1, "frames": 1, "fps": 1},
    "idle-east": {"row": 2, "frames": 1, "fps": 1},
    "idle-west": {"row": 3, "frames": 1, "fps": 1},
    "walk-south": {"row": 4, "frames": 8, "fps": 12},
    "walk-north": {"row": 5, "frames": 8, "fps": 12},
    "walk-east": {"row": 6, "frames": 8, "fps": 12},
    "walk-west": {"row": 7, "frames": 8, "fps": 12}
  }
}
```

### Implementación en Pixel-Forge

```javascript
// src/composables/useExportPFG.js

export function useExportPFG() {
  const exportToPFG = async (project) => {
    const zip = new JSZip()

    // 1. Generar manifest
    zip.file('manifest.json', JSON.stringify(generateManifest(project)))

    // 2. Exportar escenas
    for (const scene of project.scenes) {
      await exportScene(zip, scene, project)
    }

    // 3. Exportar actores
    for (const actor of project.globalData.actors) {
      await exportActor(zip, actor, project)
    }

    // 4. Exportar audio
    await exportAudio(zip, project)

    // 5. Exportar datos globales
    zip.file('dialogs.json', JSON.stringify(getAllDialogs(project)))
    zip.file('puzzles.json', JSON.stringify(getAllPuzzles(project)))
    zip.file('cutscenes.json', JSON.stringify(getAllCutscenes(project)))
    zip.file('items.json', JSON.stringify(project.globalData.items))

    // 6. Generar archivo
    const blob = await zip.generateAsync({type: 'blob'})
    downloadBlob(blob, `${project.name}.pfg`)
  }

  return { exportToPFG }
}
```

### Tareas de implementación

- [ ] Crear `useExportPFG.js` composable
- [ ] Función para escalar imágenes a resolución target (1280x720)
- [ ] Función para combinar spritesheets de actores
- [ ] Función para convertir walkboxes a formato binario (opcional)
- [ ] UI de exportación con opciones (resolución, compresión)
- [ ] Botón "Exportar a Switch" en el header

---

## Parte 2: Runtime NRO (C/SDL2 para Switch)

### Objetivo
Extender el POC existente (`../switch-poc/`) para que pueda cargar y ejecutar juegos exportados desde Pixel-Forge.

### Arquitectura del Runtime

```
┌─────────────────────────────────────────────────────────────┐
│                     RUNTIME NRO                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Loader    │  │   Scene     │  │   Player    │         │
│  │  (JSON/PNG) │  │  Manager    │  │  Controller │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                 │
│  ┌──────┴────────────────┴────────────────┴──────┐         │
│  │              Game State                        │         │
│  │  - currentScene                                │         │
│  │  - playerPosition                              │         │
│  │  - inventory[]                                 │         │
│  │  - variables{}                                 │         │
│  │  - dialogState                                 │         │
│  └────────────────────────────────────────────────┘         │
│         │                │                │                 │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐         │
│  │  Renderer   │  │   Input     │  │   Audio     │         │
│  │  (SDL2)     │  │  Handler    │  │  (SDL_mixer)│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de archivos del runtime

```
switch-runtime/
├── source/
│   ├── main.c              # Entry point, game loop
│   ├── loader.c/h          # Carga de JSON y assets
│   ├── scene.c/h           # Scene manager, rendering
│   ├── player.c/h          # Player movement, animation
│   ├── walkbox.c/h         # Polygon collision
│   ├── exit.c/h            # Exit detection, transitions
│   ├── hotspot.c/h         # Hotspot interaction
│   ├── dialog.c/h          # Dialog system
│   ├── inventory.c/h       # Inventory UI and logic
│   ├── puzzle.c/h          # Puzzle conditions
│   ├── cutscene.c/h        # Cutscene sequencer
│   ├── input.c/h           # Touch, joystick, buttons
│   ├── audio.c/h           # Music, SFX
│   └── render.c/h          # SDL2 rendering helpers
├── include/
│   ├── common.h            # Types, constants
│   ├── json.h              # JSON parser (cJSON)
│   └── game_types.h        # Game data structures
├── lib/
│   └── cJSON/              # JSON parser library
├── romfs/
│   └── game.pfg            # El juego exportado (descomprimido)
└── Makefile
```

### Estructuras de datos en C

```c
// game_types.h

typedef struct {
    int id;
    char name[64];
    float x, y;
    int w, h;
    int targetScene;
    float targetX, targetY;
} Exit;

typedef struct {
    int id;
    int numPoints;
    float points[32][2];  // Max 32 puntos por walkbox
} Walkbox;

typedef struct {
    int id;
    char name[64];
    SDL_Texture* background;
    SDL_Texture* layers[16];
    int numLayers;
    Walkbox walkboxes[8];
    int numWalkboxes;
    Exit exits[8];
    int numExits;
    // ... hotspots, actors, etc.
} Scene;

typedef struct {
    int numScenes;
    Scene scenes[32];
    int currentSceneId;
    int startSceneId;
    // Player
    float playerX, playerY;
    int playerDirection;
    int playerActorId;
    // State
    int inventory[32];
    int numInventoryItems;
    // ...
} GameState;
```

### Fases de implementación

#### Fase 2.1: Scene Manager + Loader (PRIORITARIO) ✅
- [x] Implementar carga de manifest.json
- [x] Implementar carga de scene data.json
- [x] Cargar múltiples backgrounds/scenes
- [x] Sistema de cambio de escena

#### Fase 2.2: Exits y Transiciones ✅
- [x] Detección de colisión con exits (proximity-based)
- [x] Fade out/in entre escenas
- [x] Posicionar player en targetX/targetY

#### Fase 2.3: Walkbox Polígonos ✅
- [x] Algoritmo point-in-polygon
- [x] Cargar walkboxes desde JSON
- [x] Reemplazar walkbox rectangular

#### Fase 2.4: Hotspots e Interacciones
- [ ] Detección de click en hotspots
- [ ] Sistema de verbos básico
- [ ] Mostrar mensajes

#### Fase 2.5: Diálogos
- [ ] Renderizar texto con SDL_ttf
- [ ] Sistema de líneas de diálogo
- [ ] Avanzar con botón A

#### Fase 2.6: Inventario
- [ ] UI de inventario (barra inferior)
- [ ] Agregar/quitar items
- [ ] Usar item con objeto

#### Fase 2.7: Puzzles y Cutscenes
- [ ] Sistema de condiciones
- [ ] Secuenciador de cutscenes
- [ ] Variables del juego

### Dependencias necesarias

```bash
# Ya instaladas en el POC
switch-sdl2
switch-sdl2_image
switch-sdl2_mixer

# Agregar para texto
switch-sdl2_ttf

# JSON parser (incluir en source)
cJSON (header-only, ~1500 líneas)
```

---

## Plan de trabajo

### Sprint 1: Mínimo viable (Opción B)
**Objetivo**: Navegar las 10 escenas de la demo

1. [x] Documentar formato y arquitectura (este documento)
2. [x] Agregar cJSON al proyecto (v1.7.18)
3. [x] Implementar loader básico (manifest + scenes)
4. [x] Implementar scene manager (cambio de escena)
5. [x] Implementar exits con transición (fade out/in)
6. [ ] Crear exportador básico en Pixel-Forge
7. [ ] Testing con la demo de 10 escenas

### Sprint 2: Interactividad
1. [x] Walkbox polígonos (point-in-polygon algorithm)
2. [ ] Hotspots
3. [ ] Diálogos básicos

### Sprint 3: Gameplay completo
1. [ ] Inventario
2. [ ] Puzzles
3. [ ] Cutscenes

---

## Referencias

- POC actual: `../switch-poc/`
- devkitPro: https://devkitpro.org/
- libnx: https://switchbrew.github.io/libnx/
- cJSON: https://github.com/DaveGamble/cJSON
- SDL2 Switch: https://github.com/devkitPro/SDL
