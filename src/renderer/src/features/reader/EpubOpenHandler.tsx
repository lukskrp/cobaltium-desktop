import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApi } from '@renderer/lib/ipc'
import { useReaderStore } from './reader-store'

/**
 * Handles EPUBs opened from the OS (file association / "open with") and files
 * dropped onto the window. Always mounted so it works from any route.
 */
export function EpubOpenHandler(): null {
  const navigate = useNavigate()

  useEffect(() => {
    const api = getApi()
    if (!api) return
    return api.reader.onOpened((result) => {
      if (!result) return
      useReaderStore.setState({ book: result.book, state: result.state })
      void useReaderStore.getState().load()
      navigate('/reader')
    })
  }, [navigate])

  useEffect(() => {
    const api = getApi()
    if (!api) return
    const { reader, files } = api

    function onDragOver(event: DragEvent): void {
      if (event.dataTransfer?.types?.includes('Files')) event.preventDefault()
    }

    function onDrop(event: DragEvent): void {
      const dropped = event.dataTransfer?.files
      if (!dropped || dropped.length === 0) return
      const file = [...dropped].find((entry) => entry.name.toLowerCase().endsWith('.epub'))
      if (!file) return
      event.preventDefault()
      const path = files.getPathForFile(file)
      if (!path) return
      void reader.openPath(path).then((result) => {
        if (!result) return
        useReaderStore.setState({ book: result.book, state: result.state })
        void useReaderStore.getState().load()
        navigate('/reader')
      })
    }

    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [navigate])

  return null
}
