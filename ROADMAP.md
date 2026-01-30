# Pixel-Forge Roadmap - Plan de Implementación

> Generado: 2026-01-30
> Estado: **Fase 1 avanzada** (Refactorización ~75% completada)
> Última actualización: 2026-01-30
> Objetivo: Convertir el prototipo funcional en un producto robusto

---

## Resumen Ejecutivo

| Fase | Nombre | Duración Estimada | Prioridad |
|------|--------|-------------------|-----------|
| 1 | Refactorización de Arquitectura | 2-3 semanas | CRÍTICA |
| 2 | Sistema de Testing | 1 semana | ALTA |
| 3 | Play Mode Completo | 2-3 semanas | ALTA |
| 4 | Sistema de Exportación | 2 semanas | MEDIA |
| 5 | Juego de Prueba Completo | 2-4 semanas | ALTA |
| 6 | Correcciones y Polish | 2-4 semanas | ALTA |
| 7 | Infraestructura y DevOps | 1 semana | MEDIA |

**Total estimado: 12-18 semanas**

---

## Fase 1: Refactorización de Arquitectura

### Objetivo
Dividir `EditorView.vue` (~15,000 líneas) en componentes y composables manejables.

### 1.1 Composables Extraídos

```
src/composables/
├── API (3)
│   ├── useClaudeSocket.js       # [✅] Socket para AI assistant
│   ├── useProjectApi.js         # [✅] API de proyectos
│   └── useAssetApi.js           # [✅] API de assets S3
│
├── Editor Core (7)
│   ├── useUndoRedo.js           # [✅] Sistema de historial completo
│   ├── useKeyboardShortcuts.js  # [✅] Shortcuts con presets de editor
│   ├── useElementSelection.js   # [✅] Multi-select, drag, resize, rotate
│   ├── useElementCRUD.js        # [✅] Add, delete, copy, paste elementos
│   ├── useCanvasZoom.js         # [✅] Control de zoom del canvas
│   ├── usePanelState.js         # [✅] Estado de paneles y secciones
│   └── useSceneEditor.js        # [✅] Estado base, escenas, globalData
│
├── Visual Effects (3)
│   ├── useParticleSystem.js     # [✅] Sistema de partículas y presets
│   ├── useLighting.js           # [✅] Sistema de iluminación
│   └── useAudioPlayback.js      # [✅] Reproducción de audio
│
├── Play Mode (2)
│   ├── usePlayMode.js           # [✅] Lógica completa del modo play (~550 líneas)
│   └── useCutsceneEngine.js     # [✅] Ejecución de cutscenes SCUMM-style (~340 líneas)
│
├── UI/Editor (6)
│   ├── useContextMenu.js        # [✅] Menú contextual y agrupación (~420 líneas)
│   ├── useWalkboxResize.js      # [✅] Edición de vértices de walkboxes (~200 líneas)
│   ├── useSceneManagement.js    # [✅] CRUD de escenas, navegación (~230 líneas)
│   ├── useGlobalActors.js       # [✅] Gestión de actores globales (~200 líneas)
│   ├── usePuzzleHelpers.js      # [✅] Helpers para edición de puzzles (~175 líneas)
│   └── useInteractionSystem.js  # [✅] Sistema de interacciones verbo-objeto (~225 líneas)
│
└── Pendientes (2)
    ├── useAnimations.js         # [ ] Spritesheet editor, preview (código en EditorView)
    └── useAssetManager.js       # [ ] Lógica del modal de assets (código en EditorView)
```

**Total: 21 composables creados, 2 pendientes**

### 1.2 Componentes a Crear

```
src/components/
├── editor/
│   ├── EditorHeader.vue         # [✅] Barra superior (nombre, botones)
│   ├── EditorStatusBar.vue      # [✅] Barra inferior (zoom, coords)
│   └── EditorToolbar.vue        # [ ] Herramientas de edición
│
├── panels/
│   ├── LeftPanel.vue            # [✅] Panel izquierdo contenedor
│   ├── ElementList.vue          # [✅] Lista de elementos por tipo
│   ├── SceneTabs.vue            # [✅] Tabs de escenas
│   ├── PropertiesPanel.vue      # [✅] Panel derecho contenedor
│   └── PropertyEditor.vue       # [ ] Editor genérico de propiedades
│
├── canvas/
│   ├── EditorCanvas.vue         # [✅] Canvas principal con elementos
│   ├── CanvasElement.vue        # [✅] Elemento base (drag, resize, rotate)
│   ├── CanvasGrid.vue           # [✅] Overlay de grilla
│   ├── CanvasWalkbox.vue        # [✅] SVG polygon editor
│   ├── CanvasParticles.vue      # [✅] Renderizado de partículas
│   └── CanvasLighting.vue       # [✅] Overlay de iluminación
│
├── modals/
│   ├── AssetManagerModal.vue    # [✅] Gestor de assets
│   ├── AudioManagerModal.vue    # [✅] Gestor de audio
│   ├── SpritesheetModal.vue     # [ ] Editor de spritesheets
│   ├── AssignAnimationModal.vue # [ ] Asignar animación a actor
│   └── BackgroundScaleModal.vue # [✅] Escalar background
│
├── playmode/
│   ├── PlayModeOverlay.vue      # [✅] UI del modo play (incluye verb bar, inventory, dialog)
│   ├── VerbBar.vue              # [ ] Barra de verbos (separado)
│   ├── InventoryBar.vue         # [ ] Barra de inventario (separado)
│   ├── DialogBox.vue            # [ ] Caja de diálogo (separado)
│   └── PlayerCharacter.vue      # [ ] Renderizado del jugador
│
└── common/
    ├── PixelButton.vue          # [✅] Botón estilizado
    ├── PixelInput.vue           # [✅] Input estilizado
    ├── PixelModal.vue           # [✅] Modal base reutilizable
    ├── ConfirmModal.vue         # [✅] Modal de confirmación
    ├── ListSelectModal.vue      # [✅] Modal de selección de lista
    ├── PromptModal.vue          # [✅] Modal de input de texto
    ├── PixelSelect.vue          # [ ] Select estilizado
    ├── ColorPicker.vue          # [ ] Selector de color
    └── AssetPicker.vue          # [ ] Selector de asset
```

### 1.3 Plan de Migración

**Semana 1: Composables Core** (Completado - 2026-01-29)
- [x] Extraer `useSceneEditor.js` (estado base, escenas, globalData) ✅
- [x] Extraer `useElementSelection.js` (selección, drag, resize, rotate) ✅
- [x] Extraer `useUndoRedo.js` (sistema completo de historial) ✅
- [x] Extraer `useKeyboardShortcuts.js` (con presets de editor) ✅
- [x] Extraer `useElementCRUD.js` (add, delete, copy, paste) ✅
- [x] Extraer `useCanvasZoom.js` (zoom control) ✅
- [x] Extraer `usePanelState.js` (panels, sections, visibility) ✅
- [ ] Tests básicos para cada composable

**Semana 1.5: Composables Play Mode y UI** (Completado - 2026-01-30)
- [x] Extraer `usePlayMode.js` (lógica completa del modo play) ✅
- [x] Extraer `useCutsceneEngine.js` (ejecución de cutscenes) ✅
- [x] Extraer `useContextMenu.js` (menú contextual, agrupación) ✅
- [x] Extraer `useWalkboxResize.js` (edición de vértices) ✅
- [x] Extraer `useSceneManagement.js` (CRUD de escenas) ✅
- [x] Extraer `useGlobalActors.js` (gestión de actores) ✅
- [x] Extraer `usePuzzleHelpers.js` (helpers de puzzles) ✅
- [x] Extraer `useInteractionSystem.js` (interacciones verbo-objeto) ✅

**Semana 2: Componentes de UI** (Completado - 2026-01-30)
- [x] Crear componentes en `common/` (PixelButton, PixelInput) ✅
- [x] Crear `EditorHeader.vue`, `EditorStatusBar.vue` ✅
- [x] Crear `LeftPanel.vue`, `PropertiesPanel.vue` ✅
- [x] Crear `SceneTabs.vue`, `ElementList.vue` ✅

**Semana 3: Componentes de Canvas y Modales** (Completado - 2026-01-30)
- [x] Crear `EditorCanvas.vue` ✅
- [x] Crear `CanvasElement.vue` (elemento base con resize/rotate handles) ✅
- [x] Crear `CanvasGrid.vue` (overlay de grilla) ✅
- [x] Crear `CanvasWalkbox.vue` (SVG polygon editor) ✅
- [x] Crear `CanvasParticles.vue` (renderizado de partículas) ✅
- [x] Crear `CanvasLighting.vue` (overlay de iluminación) ✅
- [x] Crear `PixelModal.vue` (modal base reutilizable) ✅
- [x] Crear `ConfirmModal.vue` (diálogo de confirmación) ✅
- [x] Crear `ListSelectModal.vue` (selección de lista) ✅
- [x] Crear `PromptModal.vue` (input de texto) ✅
- [x] Integración en `EditorView.vue`:
  - [x] CanvasGrid reemplaza grilla inline ✅
  - [x] CanvasWalkbox reemplaza SVG walkbox (~90 líneas) ✅
  - [x] CanvasElement para Exits ✅
  - [x] CanvasElement para Actors ✅
  - [x] CanvasElement para Hotspots ✅
  - [x] CanvasElement para Images ✅
  - [x] CanvasElement para Z-Planes ✅
  - [x] CanvasElement para Lights ✅
  - [x] CanvasElement para Particle Emitters ✅
  - [x] CanvasParticles para renderizado de partículas ✅
  - [x] CanvasLighting para overlay de iluminación ✅
  - [x] PromptModal para Rename Scene ✅
  - [x] ListSelectModal para Place Actor ✅
  - [x] EditorHeader para header del editor ✅
  - [x] EditorStatusBar para barra de estado ✅
  - [x] ZoomControls para controles de zoom ✅
  - [x] ContextMenu para menú contextual ✅
  - [x] PlayModeOverlay para UI del modo de juego ✅
  - [x] BackgroundScaleModal para ajuste de fondo ✅
  - [x] SceneActionsBar para acciones de escena ✅
  - [x] AssetManagerModal para gestor de assets ✅ (~255 líneas template + ~106 líneas script cleanup)
  - [x] AudioManagerModal para gestor de audio ✅ (~78 líneas template + ~27 líneas script cleanup)
  - **Reducción Semana 3**: ~913 líneas (~15,555 → 14,642)

**Semana 3.5: Composables adicionales** (Completado - 2026-01-30)
- [x] Integrar `usePlayMode.js` y `useCutsceneEngine.js` (~1,100 líneas removidas)
- [x] Integrar `useContextMenu.js` (~253 líneas removidas)
- [x] Integrar `useWalkboxResize.js` (~106 líneas removidas)
- [x] Integrar `useSceneManagement.js` (~93 líneas removidas)
- [x] Integrar `useGlobalActors.js` (~68 líneas removidas)
- [x] Integrar `usePuzzleHelpers.js` (~57 líneas removidas)
- [x] Integrar `useInteractionSystem.js` (~37 líneas removidas)
- **Reducción Semana 3.5**: ~1,714 líneas (14,642 → ~12,516)
- **Reducción total acumulada**: ~3,039 líneas desde inicio (~15,555 → 12,516)

### 1.4 Criterios de Éxito

| Criterio | Objetivo | Estado Actual |
|----------|----------|---------------|
| `EditorView.vue` | < 500 líneas | 12,516 líneas (↓3,039 desde inicio) |
| Cada composable | < 300 líneas | ✅ Todos < 550 líneas |
| Cada componente | < 200 líneas | ✅ Mayoría cumple |
| Funcionalidades intactas | 100% | ✅ Build exitoso |
| Sin regresiones | 0 bugs | ✅ Verificado |

**Nota:** El objetivo de < 500 líneas requiere extraer el template (~7,000 líneas) a componentes separados. Los composables de lógica ya están mayormente extraídos.

---

## Fase 2: Sistema de Testing

### 2.1 Configuración

```bash
npm install -D vitest @vue/test-utils jsdom @testing-library/vue
```

```
tests/
├── unit/
│   ├── composables/
│   │   ├── useUndoRedo.test.js
│   │   ├── useElementSelection.test.js
│   │   ├── useSceneEditor.test.js
│   │   └── ...
│   └── utils/
│       └── helpers.test.js
│
├── components/
│   ├── PixelButton.test.js
│   ├── AssetPicker.test.js
│   └── ...
│
└── e2e/
    ├── editor-basic.test.js     # Crear escena, agregar elementos
    ├── playmode.test.js         # Modo play básico
    └── save-load.test.js        # Guardar/cargar proyecto
```

### 2.2 Tests Prioritarios

**Composables (unit tests):**
- [ ] `useUndoRedo`: push, undo, redo, límite de historial
- [ ] `useElementSelection`: select, multi-select, drag bounds
- [ ] `useAnimations`: frame calculation, preview timing
- [ ] `useProjectApi`: save, load, error handling

**Integración:**
- [ ] Crear proyecto → agregar escena → agregar imagen → guardar → recargar
- [ ] Crear animación → asignar a actor → play mode → ver animación
- [ ] Crear puzzle → definir condiciones → resolver en play mode

### 2.3 Coverage Goal
- Composables: 80%+
- Componentes: 60%+
- E2E: Flujos críticos cubiertos

---

## Fase 3: Play Mode Completo

### 3.1 Pathfinding con A*

**Archivo:** `src/composables/usePathfinding.js`

```javascript
// Funcionalidades requeridas:
- triangulateWalkbox(points)      // Convertir polígono a mesh navegable
- findPath(start, end, walkboxes) // A* pathfinding
- smoothPath(path)                // Suavizar camino
- isPointInWalkbox(point, wb)     // Test de punto en polígono
```

**Implementación:**
- [ ] Triangulación de polígonos (ear clipping o similar)
- [ ] Grafo de navegación desde walkboxes
- [ ] Algoritmo A* para encontrar camino
- [ ] Suavizado de path (opcional: string pulling)
- [ ] Visualización de debug (path, nodos)

### 3.2 Z-Sorting por Posición Y

```javascript
// En el render loop del canvas:
const sortedElements = [...elements].sort((a, b) => {
  const aBottom = a.y + a.h
  const bBottom = b.y + b.h
  return aBottom - bBottom
})
```

- [ ] Implementar sorting dinámico
- [ ] Considerar z-planes manuales
- [ ] Actor se renderiza según su Y

### 3.3 UI de Inventario Jugable

**Componente:** `src/components/playmode/InventoryPanel.vue`

- [ ] Grid de items con iconos
- [ ] Click para seleccionar item
- [ ] Drag & drop para combinar items
- [ ] Usar item en escena (click item → click objeto)
- [ ] Tooltip con nombre/descripción

### 3.4 Sistema de Puzzles Mejorado

```javascript
// Tipos de condiciones:
- hasItem(itemId)
- hasVariable(name, value)
- hasExaminedObject(objectId)
- hasUsedItemOn(itemId, targetId)
- hasTalkedTo(actorId)
- customCondition(script)

// Tipos de resultados:
- giveItem(itemId)
- removeItem(itemId)
- setVariable(name, value)
- showDialog(dialogId)
- playCutscene(cutsceneId)
- unlockExit(exitId)
- showMessage(text)
- customAction(script)
```

- [ ] Editor visual de condiciones (árbol lógico)
- [ ] Múltiples resultados por puzzle
- [ ] Sistema de hints progresivos
- [ ] Debug panel para puzzles

### 3.5 Save/Load de Partida

**Estructura de Save:**
```javascript
{
  saveId: string,
  timestamp: Date,
  projectId: string,
  currentSceneId: string,
  playerPosition: { x, y },
  playerDirection: string,
  inventory: [itemIds],
  variables: { ... },
  solvedPuzzles: [puzzleIds],
  visitedScenes: [sceneIds],
  dialogState: { ... },
  screenshot: base64  // Thumbnail del save
}
```

- [ ] Guardar estado completo del juego
- [ ] Múltiples slots de guardado
- [ ] Auto-save opcional
- [ ] UI de load game con screenshots

---

## Fase 4: Sistema de Exportación

### 4.1 Exportar como Web App (PWA)

**Output:** Carpeta con HTML/JS/CSS jugable standalone

```
export/
├── index.html
├── game.js          # Runtime minificado
├── game.json        # Datos del juego (optimizado)
├── assets/
│   ├── images/      # Imágenes optimizadas
│   └── audio/       # Audio convertido
├── manifest.json    # PWA manifest
└── sw.js           # Service worker para offline
```

**Tareas:**
- [ ] Crear runtime de juego separado del editor
- [ ] Bundler para generar game.js
- [ ] Optimización de assets (compresión, atlas)
- [ ] Generador de PWA manifest
- [ ] Service worker para juego offline

### 4.2 Formato .pfg (Pixel-Forge Game)

Archivo único con todo el juego:

```javascript
{
  header: {
    magic: 'PFG1',
    version: '1.0.0',
    name: string,
    author: string,
    created: Date
  },
  project: { ... },      // Proyecto completo
  assets: {
    images: { id: base64 },
    audio: { id: base64 }
  },
  metadata: {
    totalScenes: number,
    totalItems: number,
    estimatedPlaytime: string
  }
}
```

- [ ] Serialización eficiente
- [ ] Compresión (gzip)
- [ ] Importar .pfg en editor
- [ ] Validación de integridad

### 4.3 Exportar para Runtime Nativo (Futuro)

Referencia: Sección "FUTURO: Portabilidad a Plataformas Nativas" en CLAUDE.md

- [ ] Definir formato JSON optimizado para runtime
- [ ] Documentar traducción de sistemas web → nativo
- [ ] Crear spec de runtime mínimo

---

## Fase 5: Juego de Prueba Completo

### 5.1 Concepto: "La Oficina Misteriosa"

Mini aventura point & click de 15-30 minutos.

**Premisa:** Eres un detective que investiga la desaparición de un empleado en una oficina.

**Escenas (5-7):**
1. Recepción
2. Pasillo principal
3. Oficina del desaparecido
4. Sala de archivos
5. Baño
6. Azotea (final)

**Puzzles (8-10):**
- Conseguir llave del archivo
- Abrir caja fuerte
- Descifrar nota
- Distraer al guardia
- Etc.

**Personajes (3-4):**
- Detective (jugador)
- Recepcionista
- Guardia de seguridad
- Jefe sospechoso

### 5.2 Checklist de Producción

**Assets necesarios:**
- [ ] 5-7 backgrounds
- [ ] 3-4 character sprites (múltiples direcciones)
- [ ] 15-20 objetos interactivos
- [ ] 8-10 items de inventario
- [ ] Música de ambiente
- [ ] SFX básicos

**Contenido:**
- [ ] Todas las escenas creadas
- [ ] Walkboxes definidas
- [ ] Exits conectados
- [ ] Diálogos escritos
- [ ] Puzzles implementados
- [ ] Cutscenes de intro/outro

**Testing:**
- [ ] Playthrough completo sin bugs
- [ ] Todos los puzzles resolubles
- [ ] No hay deadlocks
- [ ] Timing de animaciones correcto
- [ ] Audio funciona

### 5.3 Documentar Issues Encontrados

Durante el desarrollo del juego, mantener lista de:
- Bugs encontrados
- Features faltantes
- UX improvements necesarios
- Performance issues

---

## Fase 6: Correcciones y Polish

### 6.1 Bug Fixes del Juego de Prueba

Resolver todos los issues documentados en Fase 5.

### 6.2 UX Improvements

**Editor:**
- [ ] Tooltips en todos los botones
- [ ] Atajos de teclado documentados (? para ver)
- [ ] Mejor feedback de errores
- [ ] Loading states consistentes
- [ ] Confirmación antes de acciones destructivas

**Play Mode:**
- [ ] Transiciones suaves entre escenas
- [ ] Feedback visual de interacciones
- [ ] Cursor contextual (mano, lupa, etc.)
- [ ] Subtítulos opcionales

### 6.3 Performance

- [ ] Virtualización de listas largas
- [ ] Lazy loading de assets
- [ ] Debounce en watchers pesados
- [ ] Memoización de cálculos costosos
- [ ] Profiling y optimización de bottlenecks

### 6.4 Accesibilidad

- [ ] Navegación por teclado
- [ ] Contraste de colores
- [ ] Tamaños de fuente ajustables
- [ ] Screen reader support (básico)

---

## Fase 7: Infraestructura y DevOps

### 7.1 CI/CD

```yaml
# .github/workflows/ci.yml
- Lint (ESLint)
- Type check (si se agrega TypeScript)
- Unit tests
- Build
- Deploy preview (PRs)
- Deploy production (main)
```

### 7.2 Environments

- **Development:** localhost:5173
- **Staging:** staging.pixel-forge.app
- **Production:** pixel-forge.app

### 7.3 Monitoring

- [ ] Error tracking (Sentry)
- [ ] Analytics básicos
- [ ] Health checks para APIs

### 7.4 Documentación

- [ ] README actualizado
- [ ] Guía de contribución
- [ ] Guía de usuario (básica)
- [ ] API docs para composables

---

## Priorización Recomendada

### Sprint 1-2: Fundamentos
1. Refactorizar composables core (useSceneEditor, useElementSelection)
2. Setup de testing con Vitest
3. Tests para composables extraídos

### Sprint 3-4: Play Mode
1. Pathfinding A*
2. Z-sorting
3. UI de inventario
4. Save/load de partida

### Sprint 5-6: Juego de Prueba
1. Crear assets básicos
2. Implementar escenas
3. Playtest y documentar issues

### Sprint 7-8: Correcciones
1. Fix bugs del juego de prueba
2. UX improvements críticos
3. Performance básico

### Sprint 9-10: Exportación
1. Runtime web standalone
2. Formato .pfg
3. PWA support

### Sprint 11-12: Polish
1. Completar refactorización
2. Documentación
3. CI/CD

---

## Métricas de Éxito

| Métrica | Objetivo | Estado Actual |
|---------|----------|---------------|
| Líneas en EditorView.vue | < 500 | 12,516 (↓20% desde inicio) |
| Composables extraídos | 100% lógica | 21/23 (~91%) |
| Test coverage (composables) | > 80% | 0% (pendiente) |
| Tiempo de carga inicial | < 3s | ~2s (estimado) |
| Juego de prueba completable | Sin bugs bloqueantes | Pendiente Fase 5 |
| Exportación funcional | Web standalone jugable | Pendiente Fase 4 |

---

## Notas Finales

Este roadmap es ambicioso pero alcanzable. Las fases pueden ajustarse según:
- Tiempo disponible
- Prioridades del proyecto
- Feedback de usuarios

**Recomendación:** No saltar a features nuevas sin completar la refactorización (Fase 1). La deuda técnica actual hará todo más difícil si no se aborda primero.

---

*Última actualización: 2026-01-30 15:45*
