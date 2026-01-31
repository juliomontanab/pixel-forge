/**
 * useExportPFG - Export project to PFG format for Nintendo Switch runtime
 *
 * Generates a .pfg file (ZIP with structure) containing:
 * - manifest.json: Project metadata
 * - scenes/scene-N/: Scene data and backgrounds
 * - actors/: Actor spritesheets and animations
 * - audio/: Music and SFX files
 */

import { ref } from 'vue'
import JSZip from 'jszip'

export function useExportPFG() {
  const isExporting = ref(false)
  const exportProgress = ref(0)
  const exportStatus = ref('')

  /**
   * Generate manifest.json content
   */
  const generateManifest = (project) => {
    return {
      name: project.name || 'Untitled Game',
      version: project.version || '1.0.0',
      author: project.author || 'Pixel-Forge',
      startScene: project.scenes[0]?.id || 1,
      resolution: {
        width: project.settings?.resolution?.width || 1920,
        height: project.settings?.resolution?.height || 1200
      },
      targetResolution: {
        width: 1280,
        height: 720
      },
      scenes: project.scenes.map(s => s.id),
      playerActorId: project.globalData?.playerActorId || 1
    }
  }

  /**
   * Generate scene data.json content
   */
  const generateSceneData = (scene) => {
    return {
      id: scene.id,
      name: scene.name || `Scene ${scene.id}`,
      background: 'background.png',
      music: scene.music?.[0]?.file || '',
      walkboxes: (scene.walkboxes || []).map(wb => ({
        id: wb.id,
        points: wb.points || []
      })),
      exits: (scene.exits || []).map(exit => ({
        id: exit.id,
        name: exit.name || 'Exit',
        x: exit.x || 0,
        y: exit.y || 0,
        w: exit.w || 100,
        h: exit.h || 100,
        targetScene: exit.targetScene || 0,
        targetX: exit.targetX || 0,
        targetY: exit.targetY || 0
      })),
      hotspots: (scene.hotspots || []).map(hs => ({
        id: hs.id,
        name: hs.name || 'Hotspot',
        x: hs.x || 0,
        y: hs.y || 0,
        w: hs.w || 50,
        h: hs.h || 50,
        interactions: hs.interactions || []
      })),
      actorPlacements: (scene.actors || []).map(actor => ({
        actorId: actor.actorId || actor.id,
        x: actor.x || 0,
        y: actor.y || 0,
        direction: actor.direction || 'south'
      })),
      images: (scene.images || []).map(img => ({
        id: img.id,
        name: img.name || 'Image',
        asset: img.src ? img.src.split('/').pop() : '',
        x: img.x || 0,
        y: img.y || 0,
        z: img.zIndex || 0,
        interactive: img.interactive || false
      }))
    }
  }

  /**
   * Fetch and convert image to blob
   */
  const fetchImageAsBlob = async (url) => {
    try {
      if (!url) return null

      // Handle data URLs
      if (url.startsWith('data:')) {
        const response = await fetch(url)
        return await response.blob()
      }

      // Handle regular URLs
      const response = await fetch(url, { mode: 'cors' })
      if (!response.ok) return null
      return await response.blob()
    } catch (error) {
      console.warn('Failed to fetch image:', url, error)
      return null
    }
  }

  /**
   * Generate actor animations.json content
   */
  const generateActorData = (actor) => {
    return {
      id: actor.id,
      name: actor.name || `Actor ${actor.id}`,
      spritesheet: 'spritesheet.png',
      frameWidth: actor.frameWidth || 64,
      frameHeight: actor.frameHeight || 128,
      states: actor.states || {
        'idle-south': { row: 0, frames: 1, fps: 1 },
        'idle-north': { row: 1, frames: 1, fps: 1 },
        'idle-east': { row: 2, frames: 1, fps: 1 },
        'idle-west': { row: 3, frames: 1, fps: 1 },
        'walk-south': { row: 4, frames: 8, fps: 12 },
        'walk-north': { row: 5, frames: 8, fps: 12 },
        'walk-east': { row: 6, frames: 8, fps: 12 },
        'walk-west': { row: 7, frames: 8, fps: 12 }
      }
    }
  }

  /**
   * Export scene background
   */
  const exportSceneBackground = async (zip, scene, sceneFolder) => {
    // Try to get background from scene
    let backgroundUrl = scene.background

    // If no background, try to find it in images
    if (!backgroundUrl && scene.images?.length > 0) {
      const bgImage = scene.images.find(img => img.isBackground || img.name?.toLowerCase().includes('background'))
      if (bgImage) {
        backgroundUrl = bgImage.src
      }
    }

    if (backgroundUrl) {
      const blob = await fetchImageAsBlob(backgroundUrl)
      if (blob) {
        zip.file(`${sceneFolder}/background.png`, blob)
        return true
      }
    }

    // Create placeholder if no background
    console.warn(`No background found for scene ${scene.id}`)
    return false
  }

  /**
   * Export a single scene
   */
  const exportScene = async (zip, scene, project) => {
    const sceneFolder = `scenes/scene-${scene.id}`

    // Create scene data.json
    const sceneData = generateSceneData(scene)
    zip.file(`${sceneFolder}/data.json`, JSON.stringify(sceneData, null, 2))

    // Export background
    await exportSceneBackground(zip, scene, sceneFolder)

    // Export scene images (layers)
    if (scene.images?.length > 0) {
      const layersFolder = `${sceneFolder}/layers`
      for (const img of scene.images) {
        if (img.src && !img.isBackground) {
          const blob = await fetchImageAsBlob(img.src)
          if (blob) {
            const filename = `image-${img.id}.png`
            zip.file(`${layersFolder}/${filename}`, blob)
          }
        }
      }
    }
  }

  /**
   * Export actor with spritesheet
   */
  const exportActor = async (zip, actor, project) => {
    const actorFolder = `actors/actor-${actor.id}`

    // Create animations.json
    const actorData = generateActorData(actor)
    zip.file(`${actorFolder}/animations.json`, JSON.stringify(actorData, null, 2))

    // Export spritesheet if available
    if (actor.spritesheet) {
      const blob = await fetchImageAsBlob(actor.spritesheet)
      if (blob) {
        zip.file(`${actorFolder}/spritesheet.png`, blob)
      }
    }
  }

  /**
   * Export audio files
   */
  const exportAudio = async (zip, project) => {
    // Collect all music files from scenes
    const musicFiles = new Set()
    const sfxFiles = new Set()

    for (const scene of project.scenes) {
      if (scene.music) {
        for (const m of scene.music) {
          if (m.file) musicFiles.add(m.file)
        }
      }
      if (scene.sfx) {
        for (const s of scene.sfx) {
          if (s.file) sfxFiles.add(s.file)
        }
      }
    }

    // Export music files
    for (const file of musicFiles) {
      const blob = await fetchImageAsBlob(file)
      if (blob) {
        const filename = file.split('/').pop()
        zip.file(`audio/music/${filename}`, blob)
      }
    }

    // Export SFX files
    for (const file of sfxFiles) {
      const blob = await fetchImageAsBlob(file)
      if (blob) {
        const filename = file.split('/').pop()
        zip.file(`audio/sfx/${filename}`, blob)
      }
    }
  }

  /**
   * Collect all dialogs from scenes
   */
  const getAllDialogs = (project) => {
    const dialogs = []
    for (const scene of project.scenes) {
      if (scene.dialogs) {
        for (const dialog of scene.dialogs) {
          dialogs.push({
            ...dialog,
            sceneId: scene.id
          })
        }
      }
    }
    return dialogs
  }

  /**
   * Collect all puzzles from scenes
   */
  const getAllPuzzles = (project) => {
    const puzzles = []
    for (const scene of project.scenes) {
      if (scene.puzzles) {
        for (const puzzle of scene.puzzles) {
          puzzles.push({
            ...puzzle,
            sceneId: scene.id
          })
        }
      }
    }
    return puzzles
  }

  /**
   * Collect all cutscenes from scenes
   */
  const getAllCutscenes = (project) => {
    const cutscenes = []
    for (const scene of project.scenes) {
      if (scene.cutscenes) {
        for (const cutscene of scene.cutscenes) {
          cutscenes.push({
            ...cutscene,
            sceneId: scene.id
          })
        }
      }
    }
    return cutscenes
  }

  /**
   * Download blob as file
   */
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Main export function
   */
  const exportToPFG = async (project, options = {}) => {
    if (!project || !project.scenes?.length) {
      throw new Error('No project or scenes to export')
    }

    isExporting.value = true
    exportProgress.value = 0
    exportStatus.value = 'Initializing...'

    try {
      const zip = new JSZip()
      const totalSteps = project.scenes.length + 3 // scenes + manifest + actors + audio
      let currentStep = 0

      // 1. Generate manifest
      exportStatus.value = 'Generating manifest...'
      const manifest = generateManifest(project)
      zip.file('manifest.json', JSON.stringify(manifest, null, 2))
      currentStep++
      exportProgress.value = (currentStep / totalSteps) * 100

      // 2. Export scenes
      for (const scene of project.scenes) {
        exportStatus.value = `Exporting scene: ${scene.name || scene.id}...`
        await exportScene(zip, scene, project)
        currentStep++
        exportProgress.value = (currentStep / totalSteps) * 100
      }

      // 3. Export actors
      exportStatus.value = 'Exporting actors...'
      if (project.globalData?.actors) {
        for (const actor of project.globalData.actors) {
          await exportActor(zip, actor, project)
        }
      }
      currentStep++
      exportProgress.value = (currentStep / totalSteps) * 100

      // 4. Export audio
      exportStatus.value = 'Exporting audio...'
      await exportAudio(zip, project)
      currentStep++
      exportProgress.value = (currentStep / totalSteps) * 100

      // 5. Export global data
      exportStatus.value = 'Exporting game data...'
      zip.file('dialogs.json', JSON.stringify(getAllDialogs(project), null, 2))
      zip.file('puzzles.json', JSON.stringify(getAllPuzzles(project), null, 2))
      zip.file('cutscenes.json', JSON.stringify(getAllCutscenes(project), null, 2))
      zip.file('items.json', JSON.stringify(project.globalData?.items || [], null, 2))
      zip.file('variables.json', JSON.stringify(project.globalData?.variables || {}, null, 2))

      // 6. Generate ZIP file
      exportStatus.value = 'Generating PFG file...'
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        exportProgress.value = 90 + (metadata.percent / 10)
      })

      // 7. Download
      const filename = `${project.name || 'game'}.pfg`
      downloadBlob(blob, filename)

      exportStatus.value = 'Export complete!'
      exportProgress.value = 100

      return { success: true, filename }
    } catch (error) {
      console.error('Export failed:', error)
      exportStatus.value = `Export failed: ${error.message}`
      throw error
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Export for Switch (generates folder structure for romfs)
   * Returns a ZIP that can be extracted to romfs/game/
   */
  const exportForSwitch = async (project, options = {}) => {
    return exportToPFG(project, {
      ...options,
      targetPlatform: 'switch'
    })
  }

  return {
    exportToPFG,
    exportForSwitch,
    isExporting,
    exportProgress,
    exportStatus
  }
}
