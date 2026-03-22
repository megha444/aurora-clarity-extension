console.log('✅ Clarity content script loaded')

/// <reference types="vite/client" />
import type { ClarityResponse } from '../types'
import { detectPatterns } from '../patterns'
import type { PatternSignal } from '../types'

console.log('✅ Clarity content script loaded')

const seen = new Set<string>()

function dedupe(signal: PatternSignal): boolean {
    const key = `${signal.pattern}:${signal.elementText.slice(0, 50)}`
    if (seen.has(key)) return false
    seen.add(key)
    setTimeout(() => seen.delete(key), 30_000)
    return true
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue
            const signal = detectPatterns(node as Element)
            if (signal && dedupe(signal)) {
                console.log('🔍 Clarity detected:', signal)
                chrome.runtime.sendMessage({ type: 'PATTERN_FOUND', signal })
            }
        }
    }
})

observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
})

window.addEventListener('load', () => {
    document.querySelectorAll('*').forEach(el => {
        const signal = detectPatterns(el)
        if (signal && dedupe(signal)) {
            console.log('🔍 Clarity detected:', signal)
            chrome.runtime.sendMessage({ type: 'PATTERN_FOUND', signal })
        }
    })
})

// Listen for overlay messages from background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_OVERLAY') {
        showOverlay(msg.response)
    }
})

// let overlayCount = 0

// function showOverlay(response: ClarityResponse) {
//     overlayCount++
//     const id = `clarity-root-${overlayCount}`
//     const bottomOffset = 24 + (overlayCount - 1) * 160 // stack upward

//     const div = document.createElement('div')
//     div.id = id
//     div.style.cssText = `
//     position: fixed;
//     bottom: ${bottomOffset}px;
//     right: 24px;
//     z-index: 999999;
//     width: 300px;
//     background: white;
//     border-radius: 12px;
//     box-shadow: 0 8px 32px rgba(0,0,0,0.18);
//     border: 1px solid #ede9fe;
//     padding: 16px;
//     font-family: -apple-system, sans-serif;
//     transition: all 0.3s ease;
//   `

//     div.innerHTML = `
//     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
//       <span style="font-size:11px; font-weight:700; color:#7c3aed; letter-spacing:1px; text-transform:uppercase;">👁 Clarity</span>
//       <button id="${id}-close" style="background:none; border:none; font-size:18px; cursor:pointer; color:#aaa; line-height:1;">×</button>
//     </div>
//     <p style="font-size:14px; color:#1a1a1a; line-height:1.5; margin:0 0 12px;">${response.flag}</p>
//     ${response.action ? `
//       <button id="${id}-action" style="width:100%; background:#7c3aed; color:white; border:none; border-radius:8px; padding:10px; font-size:13px; font-weight:600; cursor:pointer;">
//         ${response.suggestion}
//       </button>
//     ` : `<p style="font-size:12px; color:#888;">${response.suggestion}</p>`}
//   `

//     document.body.appendChild(div)

//     // When closed, remove and restack remaining overlays
//     document.getElementById(`${id}-close`)?.addEventListener('click', () => {
//         div.remove()
//         overlayCount--
//         restackOverlays()
//     })

//     document.getElementById(`${id}-action`)?.addEventListener('click', () => {
//         if (response.action === 'uncheck') {
//             document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
//                 .forEach(el => { el.checked = false })
//         } else if (response.action === 'open_tab' && response.actionPayload) {
//             window.open(response.actionPayload, '_blank')
//         }
//         div.remove()
//         overlayCount--
//         restackOverlays()
//     })
// }

// function restackOverlays() {
//     const overlays = document.querySelectorAll<HTMLElement>('[id^="clarity-root-"]')
//     overlays.forEach((el, i) => {
//         el.style.bottom = `${24 + i * 160}px`
//     })
// }

// Create the sidebar once
function getSidebar(): HTMLElement {
    const existing = document.getElementById('clarity-sidebar')
    if (existing) return existing

    const sidebar = document.createElement('div')
    sidebar.id = 'clarity-sidebar'
    sidebar.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 999999;
    width: 320px;
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: -apple-system, sans-serif;
    scrollbar-width: thin;
    scrollbar-color: #ede9fe transparent;
    padding-right: 2px;
  `
    document.body.appendChild(sidebar)
    return sidebar
}

let cardCount = 0

function showOverlay(response: ClarityResponse) {
    const sidebar = getSidebar()
    cardCount++
    const id = `clarity-card-${cardCount}`

    const card = document.createElement('div')
    card.id = id
    card.style.cssText = `
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    border: 1px solid #ede9fe;
    padding: 14px;
    animation: claritySlideIn 0.25s ease;
  `

    card.innerHTML = `
    <style>
      @keyframes claritySlideIn {
        from { opacity: 0; transform: translateX(20px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    </style>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <span style="font-size:11px; font-weight:700; color:#7c3aed; letter-spacing:1px; text-transform:uppercase;">👁 Clarity</span>
      <button data-close="${id}" style="background:none; border:none; font-size:18px; cursor:pointer; color:#aaa; line-height:1; padding:0;">×</button>
    </div>
    <p style="font-size:13px; color:#1a1a1a; line-height:1.5; margin:0 0 10px;">${response.flag}</p>
    ${response.action ? `
      <button data-action="${id}" style="width:100%; background:#7c3aed; color:white; border:none; border-radius:8px; padding:9px; font-size:13px; font-weight:600; cursor:pointer;">
        ${response.suggestion}
      </button>
    ` : `<p style="font-size:12px; color:#888; margin:0;">${response.suggestion}</p>`}
  `

    sidebar.appendChild(card)

    // Auto-scroll sidebar to show latest card
    sidebar.scrollTop = sidebar.scrollHeight

    // Dismiss just this card
    card.querySelector(`[data-close="${id}"]`)?.addEventListener('click', () => {
        card.remove()
        if (sidebar.children.length === 0) sidebar.remove()
    })

    // Action button
    card.querySelector(`[data-action="${id}"]`)?.addEventListener('click', () => {
        if (response.action === 'uncheck') {
            document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
                .forEach(el => { el.checked = false })
        } else if (response.action === 'open_tab' && response.actionPayload) {
            window.open(response.actionPayload, '_blank')
        }
        card.remove()
        if (sidebar.children.length === 0) sidebar.remove()
    })
}