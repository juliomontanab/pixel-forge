# Plan: Extracción de Template - Enfoque Híbrido

## Objetivo
Reducir EditorView.vue de ~12,500 líneas a <2,000 líneas extrayendo el template a componentes.

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

## Estimación de Reducción

| Área | Líneas Actuales | Líneas Después | Ahorro |
|------|-----------------|----------------|--------|
| Element Sections (left) | ~700 | ~100 | 600 |
| Properties Panel | ~1,800 | ~200 | 1,600 |
| Canvas Elements | ~400 | ~400 | 0* |
| Modals | ~500 | ~100 | 400 |
| **Total Template** | **~3,400** | **~800** | **~2,600** |

*Canvas ya usa componentes, poco que extraer.

### Progreso Actual (2026-01-30)
- **Inicio**: 12,516 líneas
- **Después de 11 ElementSection**: 12,333 líneas
- **Después de 4 secciones especializadas**: 12,236 líneas
- **Ahorro total template**: 280 líneas

**Composables creados:**
- useAnimations.js (~350 líneas)
- useAssetManager.js (~380 líneas)

**Componentes creados:**
- PropertyField.vue (campo genérico)
- PropertyGroup.vue (grupo colapsable)

### Resultado Esperado
- **EditorView.vue**: ~12,500 → ~9,900 líneas (solo template)
- Con estilos movidos a componentes: ~9,900 → ~7,000 líneas
- **Objetivo realista**: ~7,000-8,000 líneas

---

## Notas

1. **Slots para Personalización**: Usar slots en componentes genéricos para badges, acciones extra, etc.

2. **Props vs Inject**: Evaluar usar `provide/inject` para datos globales como `project`, `currentScene`.

3. **Eventos vs v-model**: Preferir v-model para binding bidireccional en properties.

4. **Estilos**: Mover estilos relevantes a cada componente (scoped).
