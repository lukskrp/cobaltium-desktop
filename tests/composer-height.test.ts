import { describe, it, expect } from 'vitest'
import { clampDragHeight, computeBoxHeight } from '../src/renderer/src/features/chat/composer-height'

describe('computeBoxHeight', () => {
  it('auto-fits content up to the auto cap', () => {
    expect(computeBoxHeight(80, null, 200, 400)).toBe(80)
    expect(computeBoxHeight(500, null, 200, 400)).toBe(200)
  })

  it('never shrinks below a dragged height while content needs room', () => {
    expect(computeBoxHeight(300, 250, 200, 400)).toBe(250)
    expect(computeBoxHeight(100, 250, 200, 400)).toBe(250)
  })

  it('still grows with content past the drag height', () => {
    expect(computeBoxHeight(350, 250, 500, 400)).toBe(350)
  })

  it('never exceeds the manual ceiling', () => {
    expect(computeBoxHeight(900, 800, 200, 400)).toBe(400)
    expect(computeBoxHeight(100, 800, 200, 400)).toBe(400)
  })

  it('ignores non-positive dragged heights', () => {
    expect(computeBoxHeight(80, 0, 200, 400)).toBe(80)
    expect(computeBoxHeight(80, -10, 200, 400)).toBe(80)
  })
})

describe('clampDragHeight', () => {
  it('clamps drag-derived heights into range', () => {
    expect(clampDragHeight(120, 36, 400)).toBe(120)
    expect(clampDragHeight(10, 36, 400)).toBe(36)
    expect(clampDragHeight(900, 36, 400)).toBe(400)
  })
})
