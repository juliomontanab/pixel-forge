# Plan: Extracción de Template - Enfoque Híbrido

> **Estado: ✅ FASE 1 COMPLETADA** (2026-01-30)
> EditorView.vue: 2,933 → **2,181 líneas** (~26% reducción)

## Objetivo
Reducir EditorView.vue mediante extracción de componentes y limpieza de código no usado.

---

## Fase 1: Componentes Genéricos (Reutilizables)

### 1.1 ElementSection.vue (~40 líneas cada sección actual)
Componente para las secciones del panel izquierdo. Patrón repetido 15+ veces.

```vue
<ElementSection
  type="image"
  type-plural="images"
  icon="🖼"
  label="Images"
  :items="currentScene.images"
  :collapsed="collapsedSections.images"
  :visible="visibleTypes.images"
  :selected-elements="selectedElements"
  @toggle-collapse="toggleSection('images')"
  @toggle-visibility="toggleVisibility('images')"
  @add="handleAddElement('image')"
  @select="handleSelectElement"
  @select-all="selectAllOfType"
>
  <!-- Slot para badges personalizados -->
  <template #item-badges="{ item }">
    <span v-if="item.interactive" class="item-badge">⚡</span>
  </template>
</ElementSection>
```

**Ahorro estimado**: ~600 líneas (15 secciones × 40 líneas)

### 1.2 PropertyField.vue
Campo de propiedad individual reutilizable.

```vue
<PropertyField label="Position" type="position" v-model="element" />
<PropertyField label="Size" type="size" v-model="element" />
<PropertyField label="Rotation" type="rotation" v-model="element" />
<PropertyField label="Name" type="text" v-model="element.name" />
```

**Ahorro estimado**: ~200 líneas

### 1.3 PropertyGroup.vue
Grupo de propiedades con label.

```vue
<PropertyGroup label="Transform">
  <PropertyField type="position" v-model="element" />
  <PropertyField type="size" v-model="element" />
</PropertyGroup>
```

---

## Fase 2: Componentes Específicos (Lógica Compleja)

### 2.1 ImageProperties.vue (~200 líneas actuales)
- Asset picker
- Parallax settings
- Behavior checkboxes
- Interactions editor

### 2.2 ActorProperties.vue (~150 líneas actuales)
- Actor selector
- Direction picker
- Animation assignment
- State selector

### 2.3 CutsceneProperties.vue (~300 líneas actuales)
- Trigger configuration
- Actions list with drag-drop
- Action type selector
- Parameter editors por tipo

### 2.4 PuzzleProperties.vue (~250 líneas actuales)
- Puzzle type selector
- Conditions editor
- Results editor
- Hints editor

### 2.5 DialogProperties.vue (~180 líneas actuales)
- Actor/speaker selector
- Lines editor
- Choices editor

### 2.6 LightProperties.vue (~120 líneas actuales)
- Light type selector
- Color pickers
- Intensity/radius sliders

### 2.7 ParticleProperties.vue (~150 líneas actuales)
- Preset selector
- Emission settings
- Physics settings
- Visual settings

---

## Fase 3: Refactorizar PropertiesPanel

### Estructura Final
```vue
<!-- PropertiesPanel.vue -->
<template>
  <div class="properties-panel">
    <!-- No selection -->
    <NoSelectionView v-if="!hasSelection" />

    <!-- Multi selection -->
    <MultiSelectionView
      v-else-if="isMultiSelect"
      :elements="selectedElements"
      @delete="handleDelete"
    />

    <!-- Single selection - Dynamic component -->
    <component
      v-else
      :is="getPropertiesComponent(selectedType)"
      :element="selectedElement"
      :project="project"
      :scene="currentScene"
      @update="handleUpdate"
    />
  </div>
</template>

<script setup>
const componentMap = {
  image: ImageProperties,
  walkbox: WalkboxProperties,
  exit: ExitProperties,
  actor: ActorProperties,
  hotspot: HotspotProperties,
  zplane: ZplaneProperties,
  dialog: DialogProperties,
  puzzle: PuzzleProperties,
  cutscene: CutsceneProperties,
  light: LightProperties,
  particle: ParticleProperties,
  sfx: SfxProperties,
  music: MusicProperties,
  verb: VerbProperties,
  item: ItemProperties,
  animation: AnimationProperties
}
</script>
```

---

## Orden de Implementación

### Sprint 1: Componentes Genéricos
1. [x] Crear `ElementSection.vue` (✅ Completado 2026-01-30)
2. [x] Reemplazar secciones del panel izquierdo (✅ 15 de 15 completas)
3. [x] Crear `PropertyField.vue` y `PropertyGroup.vue` (✅ Completado 2026-01-30)
4. [x] Verificar build (✅ OK)

**Secciones reemplazadas con ElementSection:**
- [x] Images (con slot para badge interactivo)
- [x] Walkboxes (con getItemName personalizado)
- [x] Exits
- [x] Hotspots
- [x] Z-Planes
- [x] Dialogs (sin visibility)
- [x] Puzzles (sin visibility)
- [x] SFX (sin visibility)
- [x] Music (sin visibility)
- [x] Cutscenes (con slot para actions count)
- [x] Particles (con getItemIcon y slot para preset badge)

**Secciones especializadas creadas:**
- [x] ActorPlacementsSection.vue (modal add, remove button por item) ✅
- [x] AnimationsSection.vue (estructura multi-fila compleja) ✅
- [x] LightsSection.vue (tiene ambient settings inline) ✅
- [x] AssetsSection.vue (tiene thumbnails, estructura custom) ✅

### Sprint 2: Properties Simples
1. [ ] Crear `CommonProperties.vue` (ID, Name, Position, Size, Rotation)
2. [ ] Crear `WalkboxProperties.vue`
3. [ ] Crear `ExitProperties.vue`
4. [ ] Crear `HotspotProperties.vue`
5. [ ] Crear `ZplaneProperties.vue`

### Sprint 3: Properties Complejas
1. [ ] Crear `ImageProperties.vue` (parallax, asset, interactions)
2. [ ] Crear `ActorProperties.vue` (animations, states)
3. [ ] Crear `LightProperties.vue`
4. [ ] Crear `ParticleProperties.vue`

### Sprint 4: Properties Muy Complejas
1. [ ] Crear `DialogProperties.vue`
2. [ ] Crear `PuzzleProperties.vue`
3. [ ] Crear `CutsceneProperties.vue`

### Sprint 5: Global Data Sections
1. [ ] Crear `GlobalActorsSection.vue`
2. [ ] Crear `GlobalItemsSection.vue`
3. [ ] Crear `GlobalVerbsSection.vue`
4. [ ] Crear `GlobalAnimationsSection.vue`

---

## Resumen de Reducción Lograda

| Métrica | Antes | Después | Reducción |
|---------|-------|---------|-----------|
| EditorView.vue | 2,933 | 2,181 | **-752 líneas** |
| Imports no usados | 5 | 0 | -5 imports |
| Funciones no usadas | 4 | 0 | -4 funciones |
| Comentarios duplicados | 1 | 0 | Limpio |

**Oportunidades futuras (bajo impacto):**
- Properties Panel dinámico (~50 líneas potenciales, complejidad alta)
- Left Panel component (~30 líneas, requiere cambio de arquitectura)
- Section configs a archivo separado (~20 líneas)

### Progreso Actual (2026-01-30) ✅ COMPLETADO

| Etapa | Líneas | Cambio |
|-------|--------|--------|
| Inicio (original) | 2,933 | - |
| Después de composables | 2,236 | -697 |
| Después de limpieza final | **2,181** | -55 |
| **Total reducción** | | **-752 (~26%)** |

**Cambios realizados en esta sesión:**
- ✅ Eliminadas importaciones no usadas: CanvasLighting, CanvasParticles, EditorHeader, ZoomControls, parseColor
- ✅ Eliminadas funciones no usadas: isAllSelectedOfType, isSomeSelectedOfType, elementCounts, getAllSceneObjects
- ✅ Extraído CanvasBackground component
- ✅ Limpieza de comentarios duplicados
- ✅ Fix: deepClone function restaurada

**Estadísticas del proyecto:**
- **Composables**: 34 archivos
- **Componentes**: 63 archivos
- **Build**: ✅ Exitoso

### Objetivo Alcanzado
- **EditorView.vue**: 2,933 → **2,181 líneas** ✅
- Código modular y mantenible
- Sin funciones o imports muertos

---

## Notas

1. **Slots para Personalización**: ✅ Implementado en ElementSection con slots para badges.

2. **Props vs Inject**: Se usaron props explícitos para mejor trazabilidad.

3. **Eventos vs v-model**: Implementado donde apropiado.

4. **Estilos**: Componentes tienen estilos scoped.

---

## Conclusión

La Fase 1 de refactorización está **completada**. El archivo EditorView.vue se redujo un 26% (752 líneas) mediante:
- Extracción de componentes reutilizables
- Eliminación de código muerto (imports y funciones no usadas)
- Limpieza general

Las siguientes fases de refactorización (Properties dinámicas, Left Panel) tienen bajo ROI comparado con avanzar a otras features del roadmap.
