import { useEffect, useState } from 'react'
import { Landing } from './Landing'
import { StudioApp } from './studio/StudioApp'

function routeFromHash(): 'landing' | 'studio' {
  const raw = window.location.hash.replace(/^#/, '')
  if (raw === '/studio' || raw.startsWith('/studio')) return 'studio'
  return 'landing'
}

export default function App() {
  const [route, setRoute] = useState<'landing' | 'studio'>(() =>
    typeof window === 'undefined' ? 'landing' : routeFromHash(),
  )

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route === 'studio') return <StudioApp />
  return <Landing />
}
