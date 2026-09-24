import learnSign from '@renderer/assets/icons/learn_language_sign.png'
import helpSign from '@renderer/assets/icons/help_language_sign.png'

/** Android's custom "LEARN / HELP language" octagon signs. */
export function LanguageSign({
  kind,
  className
}: {
  kind: 'learn' | 'help'
  className?: string
}): React.JSX.Element {
  return (
    <img
      src={kind === 'learn' ? learnSign : helpSign}
      alt=""
      aria-hidden
      draggable={false}
      className={className ?? 'size-5 shrink-0'}
    />
  )
}
