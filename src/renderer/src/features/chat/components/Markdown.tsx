import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { cn } from '@renderer/lib/utils'

marked.setOptions({ gfm: true, breaks: true })

/**
 * Force external links to open safely: the source is LLM output, so links
 * get `target="_blank" rel="noopener noreferrer"` instead of navigating the
 * app window. Idempotent, safe to register once per module load.
 */
let linkHookInstalled = false
function installLinkHook(): void {
  if (linkHookInstalled) return
  linkHookInstalled = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

/** Renders an LLM reply as sanitized Markdown. */
export function Markdown({
  source,
  className
}: {
  source: string
  className?: string
}): React.JSX.Element {
  const html = useMemo(() => {
    installLinkHook()
    const raw = marked.parse(source, { async: false }) as string
    return DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
      // Chat markdown needs text + tables + code only: drop active/risky
      // elements (external <img> exfiltration, svg vectors, forms) and inline
      // styles even though event handlers are already stripped.
      FORBID_TAGS: [
        'img',
        'svg',
        'math',
        'form',
        'input',
        'button',
        'select',
        'textarea',
        'style',
        'iframe',
        'object',
        'embed',
        'link',
        'meta',
        'base'
      ],
      FORBID_ATTR: ['style'],
      // http(s)/mailto + relative links only; blocks javascript:/data: URIs.
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
    })
  }, [source])

  return <div className={cn('markdown', className)} dangerouslySetInnerHTML={{ __html: html }} />
}
