import { describe, it, expect } from 'vitest'
import { buildReport, mailtoUrl, SUPPORT_EMAIL } from '../src/shared/domain/report'

describe('buildReport', () => {
  it('builds a header plus transcript lines', () => {
    const body = buildReport('Chat', ['You:\nhi', 'Assistant:\nhello'])
    expect(body).toContain('Cobaltium content report')
    expect(body).toContain('Subject: Chat')
    expect(body).toContain('Time: ')
    expect(body).toContain('-------------------')
    expect(body).toContain('You:\nhi')
  })
})

describe('mailtoUrl', () => {
  it('addresses the support inbox with encoded subject and body', () => {
    const url = mailtoUrl('Hi there', 'line 1\nline 2')
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true)
    expect(url).toContain('subject=Hi%20there')
    expect(url).toContain('body=line%201%0Aline%202')
  })

  it('caps subject and body lengths', () => {
    const url = mailtoUrl('x'.repeat(500), 'y'.repeat(20_000))
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1))
    expect(params.get('subject')?.length).toBeLessThanOrEqual(200)
    expect(params.get('body')?.length).toBeLessThanOrEqual(8000)
  })
})
