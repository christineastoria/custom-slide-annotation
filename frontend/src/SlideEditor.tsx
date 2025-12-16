import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Text, Transformer } from 'react-konva'
import Konva from 'konva'

// ============================================================================
// TYPES
// ============================================================================

export interface ShapeData {
  id: string
  name?: string
  x: number
  y: number
  width: number
  height: number
  type: 'text' | 'rect'
  text?: string
  fontSize?: number
  fill?: string
  fontStyle?: string
  align?: string
  draggable?: boolean
}

export interface SlideData {
  id: string
  index: number
  backgroundColor: string
  shapes: ShapeData[]
}

export interface PresentationData {
  width: number
  height: number
  slides: SlideData[]
  error?: string
}

interface SlideEditorProps {
  presentation: PresentationData
  onSave: (presentation: PresentationData) => void
  onPresentationChange?: (presentation: PresentationData) => void
}

// ============================================================================
// EDITABLE TEXT COMPONENT
// ============================================================================

interface EditableTextProps {
  shapeData: ShapeData
  isSelected: boolean
  onSelect: () => void
  onChange: (newAttrs: Partial<ShapeData>) => void
}

function EditableText({ shapeData, isSelected, onSelect, onChange }: EditableTextProps) {
  const shapeRef = useRef<Konva.Text>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const handleDblClick = () => {
    const textNode = shapeRef.current
    if (!textNode) return

    // Create textarea for editing
    const stage = textNode.getStage()
    if (!stage) return
    
    const stageBox = stage.container().getBoundingClientRect()
    const textPosition = textNode.absolutePosition()
    
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)

    textarea.value = shapeData.text || ''
    textarea.style.position = 'absolute'
    textarea.style.top = `${stageBox.top + textPosition.y}px`
    textarea.style.left = `${stageBox.left + textPosition.x}px`
    textarea.style.width = `${shapeData.width}px`
    textarea.style.height = `${shapeData.height}px`
    textarea.style.fontSize = `${shapeData.fontSize || 16}px`
    textarea.style.color = shapeData.fill || '#ffffff'
    textarea.style.background = 'rgba(0,0,0,0.8)'
    textarea.style.border = '2px solid #3b82f6'
    textarea.style.padding = '4px'
    textarea.style.margin = '0'
    textarea.style.overflow = 'hidden'
    textarea.style.outline = 'none'
    textarea.style.resize = 'none'
    textarea.style.fontFamily = 'Arial, sans-serif'
    textarea.style.zIndex = '1000'
    textarea.style.textAlign = shapeData.align || 'left'
    
    textarea.focus()

    const handleBlur = () => {
      onChange({ text: textarea.value })
      document.body.removeChild(textarea)
    }

    textarea.addEventListener('blur', handleBlur)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        textarea.blur()
      }
    })
  }

  return (
    <>
      <Text
        ref={shapeRef}
        id={shapeData.id}
        x={shapeData.x}
        y={shapeData.y}
        width={shapeData.width}
        height={shapeData.height}
        text={shapeData.text || ''}
        fontSize={shapeData.fontSize || 16}
        fill={shapeData.fill || '#ffffff'}
        fontStyle={shapeData.fontStyle || 'normal'}
        align={shapeData.align || 'left'}
        verticalAlign="middle"
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          })
        }}
        onTransformEnd={() => {
          const node = shapeRef.current
          if (!node) return
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          
          node.scaleX(1)
          node.scaleY(1)
          
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
          })
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox
            }
            return newBox
          }}
        />
      )}
    </>
  )
}

// ============================================================================
// EDITABLE RECT COMPONENT
// ============================================================================

interface EditableRectProps {
  shapeData: ShapeData
  isSelected: boolean
  onSelect: () => void
  onChange: (newAttrs: Partial<ShapeData>) => void
}

function EditableRect({ shapeData, isSelected, onSelect, onChange }: EditableRectProps) {
  const shapeRef = useRef<Konva.Rect>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  return (
    <>
      <Rect
        ref={shapeRef}
        id={shapeData.id}
        x={shapeData.x}
        y={shapeData.y}
        width={shapeData.width}
        height={shapeData.height}
        fill={shapeData.fill || '#1e293b'}
        cornerRadius={4}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          })
        }}
        onTransformEnd={() => {
          const node = shapeRef.current
          if (!node) return
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          
          node.scaleX(1)
          node.scaleY(1)
          
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
          })
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox
            }
            return newBox
          }}
        />
      )}
    </>
  )
}

// ============================================================================
// SLIDE EDITOR COMPONENT
// ============================================================================

export function SlideEditor({ presentation, onSave, onPresentationChange }: SlideEditorProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [localPresentation, setLocalPresentation] = useState<PresentationData>(presentation)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const stageRef = useRef<Konva.Stage>(null)

  // Update local state when presentation prop changes
  useEffect(() => {
    setLocalPresentation(presentation)
    setHasChanges(false)
  }, [presentation])

  const currentSlide = localPresentation.slides[currentSlideIndex]

  // Scale to fit container
  const containerWidth = 900
  const scale = containerWidth / localPresentation.width
  const displayHeight = localPresentation.height * scale

  const handleShapeChange = (shapeId: string, newAttrs: Partial<ShapeData>) => {
    const newPresentation = { ...localPresentation }
    const slideIndex = currentSlideIndex
    const shapeIndex = newPresentation.slides[slideIndex].shapes.findIndex(s => s.id === shapeId)
    
    if (shapeIndex >= 0) {
      newPresentation.slides[slideIndex].shapes[shapeIndex] = {
        ...newPresentation.slides[slideIndex].shapes[shapeIndex],
        ...newAttrs
      }
      setLocalPresentation(newPresentation)
      setHasChanges(true)
      onPresentationChange?.(newPresentation)
    }
  }

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Deselect when clicking on empty area
    if (e.target === e.target.getStage()) {
      setSelectedShapeId(null)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(localPresentation)
      setHasChanges(false)
    } finally {
      setSaving(false)
    }
  }

  if (!currentSlide) {
    return <div className="slide-editor-empty">No slides to display</div>
  }

  return (
    <div className="slide-editor">
      {/* Toolbar */}
      <div className="slide-editor-toolbar">
        <div className="slide-navigation">
          <button 
            disabled={currentSlideIndex === 0}
            onClick={() => setCurrentSlideIndex(i => i - 1)}
          >
            ← Prev
          </button>
          <span className="slide-indicator">
            Slide {currentSlideIndex + 1} of {localPresentation.slides.length}
          </span>
          <button 
            disabled={currentSlideIndex === localPresentation.slides.length - 1}
            onClick={() => setCurrentSlideIndex(i => i + 1)}
          >
            Next →
          </button>
        </div>
        
        <div className="slide-actions">
          {hasChanges && (
            <span className="unsaved-indicator">● Unsaved changes</span>
          )}
          <button 
            className="save-btn"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Saving...' : 'Save & Download PPTX'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="slide-canvas-container">
        <Stage
          ref={stageRef}
          width={containerWidth}
          height={displayHeight}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          style={{ 
            background: currentSlide.backgroundColor,
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
        >
          <Layer>
            {/* Background */}
            <Rect
              x={0}
              y={0}
              width={localPresentation.width}
              height={localPresentation.height}
              fill={currentSlide.backgroundColor}
              listening={false}
            />
            
            {/* Shapes */}
            {currentSlide.shapes.map((shape) => {
              if (shape.type === 'text') {
                return (
                  <EditableText
                    key={shape.id}
                    shapeData={shape}
                    isSelected={selectedShapeId === shape.id}
                    onSelect={() => setSelectedShapeId(shape.id)}
                    onChange={(newAttrs) => handleShapeChange(shape.id, newAttrs)}
                  />
                )
              } else if (shape.type === 'rect') {
                return (
                  <EditableRect
                    key={shape.id}
                    shapeData={shape}
                    isSelected={selectedShapeId === shape.id}
                    onSelect={() => setSelectedShapeId(shape.id)}
                    onChange={(newAttrs) => handleShapeChange(shape.id, newAttrs)}
                  />
                )
              }
              return null
            })}
          </Layer>
        </Stage>
      </div>

      {/* Slide thumbnails */}
      <div className="slide-thumbnails">
        {localPresentation.slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`slide-thumbnail ${index === currentSlideIndex ? 'active' : ''}`}
            onClick={() => {
              setCurrentSlideIndex(index)
              setSelectedShapeId(null)
            }}
            style={{ backgroundColor: slide.backgroundColor }}
          >
            <span className="thumbnail-number">{index + 1}</span>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="slide-editor-help">
        <p>
          <strong>Click</strong> to select • <strong>Drag</strong> to move • 
          <strong>Double-click text</strong> to edit • <strong>Resize</strong> using handles
        </p>
      </div>
    </div>
  )
}

export default SlideEditor

