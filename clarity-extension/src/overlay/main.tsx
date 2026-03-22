/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client'
import { Overlay } from './Overlay'
import type { ClarityResponse } from '../types'
import './index.css'

function mountOverlay(response: ClarityResponse) {
    const existing = document.getElementById('clarity-root')
    if (existing) existing.remove()

    const container = document.createElement('div')
    container.id = 'clarity-root'
    document.body.appendChild(container)

    const root = createRoot(container)
    root.render(
        <Overlay
            response={response}
            onDismiss={() => {
                root.unmount()
                container.remove()
            }}
        />
    )
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_OVERLAY') {
        mountOverlay(msg.response)
    }
})