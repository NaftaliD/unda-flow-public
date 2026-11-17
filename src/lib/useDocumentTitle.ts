import { useEffect } from 'react'

const APP = 'Unda Flow'

/** The browser tab / screen-reader page title: "<page> · Unda Flow". */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : APP
  }, [title])
}
