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
// chrome.runtime.onMessage.addListener((msg) => {
//     if (msg.type === 'SHOW_OVERLAY') {
//         showOverlay(msg.response)
//     }
// })

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_OVERLAY') {
        const target = findTargetByText(msg.signal?.elementText)
        showOverlay(msg.response, target ?? undefined)
    }
})

// function findTargetByText(text: string): Element | null {
//     if (!text) return null
//     const all = document.querySelectorAll('p, span, div, label, button, h1, h2, h3, h4, li')
//     for (const el of all) {
//         if (
//             el.children.length === 0 &&
//             el.textContent?.trim().slice(0, 100) === text.slice(0, 100)
//         ) {
//             return el
//         }
//     }
//     return null
// }


function findTargetByText(text: string): Element | null {
    if (!text) return null
    const needle = text.slice(0, 80).trim().toLowerCase()
    const all = document.querySelectorAll('p, span, div, label, button, h1, h2, h3, h4, li, strong')

    // First pass — exact text match
    for (const el of all) {
        if (el.closest('.clarity-highlight')) continue
        if (el.querySelector('.clarity-highlight')) continue
        const elText = el.textContent?.trim().toLowerCase() || ''
        if (
            el.children.length <= 3 &&
            elText.length > 3 &&
            elText.length < 300 &&
            elText.includes(needle.slice(0, 40))
        ) {
            return el
        }
    }

    // Second pass — partial word match (for scarcity text with icons)
    const words = needle.split(' ').filter(w => w.length > 4)
    for (const el of all) {
        if (el.closest('.clarity-highlight')) continue
        if (el.querySelector('.clarity-highlight')) continue
        const elText = el.textContent?.trim().toLowerCase() || ''
        if (
            el.children.length <= 3 &&
            elText.length > 3 &&
            elText.length < 300 &&
            words.filter(w => elText.includes(w)).length >= 2
        ) {
            return el
        }
    }

    // Third pass — find checked checkboxes and return their label
    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
    for (const cb of checkboxes) {
        if (cb.closest('.clarity-highlight')) continue
        const label = cb.closest('label') ||
            document.querySelector(`label[for="${cb.id}"]`) ||
            cb.closest('div')
        if (label) return label
    }

    return null
}
function findBestTarget(response: ClarityResponse): Element | null {
    const words = response.flag.split(' ').filter(w => w.length > 4)
    const all = document.querySelectorAll('p, span, div, label, button, h1, h2, h3, h4, li, strong')
    for (const el of all) {
        if (el.closest('.clarity-highlight')) continue
        if (el.querySelector('.clarity-highlight')) continue
        const text = el.textContent?.trim() || ''
        if (
            el.children.length <= 2 &&
            text.length > 3 &&
            text.length < 200 &&
            words.some(w => text.toLowerCase().includes(w.toLowerCase()))
        ) {
            return el
        }
    }
    return null
}
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

// // Create the sidebar once
// function getSidebar(): HTMLElement {
//     const existing = document.getElementById('clarity-sidebar')
//     if (existing) return existing

//     const sidebar = document.createElement('div')
//     sidebar.id = 'clarity-sidebar'
//     sidebar.style.cssText = `
//     position: fixed;
//     top: 24px;
//     right: 24px;
//     z-index: 999999;
//     width: 320px;
//     max-height: 80vh;
//     overflow-y: auto;
//     display: flex;
//     flex-direction: column;
//     gap: 10px;
//     font-family: -apple-system, sans-serif;
//     scrollbar-width: thin;
//     scrollbar-color: #ede9fe transparent;
//     padding-right: 2px;
//   `
//     document.body.appendChild(sidebar)
//     return sidebar
// }

// let cardCount = 0

// function showOverlay(response: ClarityResponse) {
//     const sidebar = getSidebar()
//     cardCount++
//     const id = `clarity-card-${cardCount}`

//     const card = document.createElement('div')
//     card.id = id
//     card.style.cssText = `
//     background: white;
//     border-radius: 12px;
//     box-shadow: 0 4px 16px rgba(0,0,0,0.12);
//     border: 1px solid #ede9fe;
//     padding: 14px;
//     animation: claritySlideIn 0.25s ease;
//   `

//     card.innerHTML = `
//     <style>
//       @keyframes claritySlideIn {
//         from { opacity: 0; transform: translateX(20px); }
//         to   { opacity: 1; transform: translateX(0); }
//       }
//     </style>
//     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
//       <span style="font-size:11px; font-weight:700; color:#7c3aed; letter-spacing:1px; text-transform:uppercase;">👁 Clarity</span>
//       <button data-close="${id}" style="background:none; border:none; font-size:18px; cursor:pointer; color:#aaa; line-height:1; padding:0;">×</button>
//     </div>
//     <p style="font-size:13px; color:#1a1a1a; line-height:1.5; margin:0 0 10px;">${response.flag}</p>
//     ${response.action ? `
//       <button data-action="${id}" style="width:100%; background:#7c3aed; color:white; border:none; border-radius:8px; padding:9px; font-size:13px; font-weight:600; cursor:pointer;">
//         ${response.suggestion}
//       </button>
//     ` : `<p style="font-size:12px; color:#888; margin:0;">${response.suggestion}</p>`}
//   `

//     sidebar.appendChild(card)

//     // Auto-scroll sidebar to show latest card
//     sidebar.scrollTop = sidebar.scrollHeight

//     // Dismiss just this card
//     card.querySelector(`[data-close="${id}"]`)?.addEventListener('click', () => {
//         card.remove()
//         if (sidebar.children.length === 0) sidebar.remove()
//     })

//     // Action button
//     card.querySelector(`[data-action="${id}"]`)?.addEventListener('click', () => {
//         if (response.action === 'uncheck') {
//             document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
//                 .forEach(el => { el.checked = false })
//         } else if (response.action === 'open_tab' && response.actionPayload) {
//             window.open(response.actionPayload, '_blank')
//         }
//         card.remove()
//         if (sidebar.children.length === 0) sidebar.remove()
//     })
// }

// Inject global styles once
function injectStyles() {
    if (document.getElementById('clarity-styles')) return
    const style = document.createElement('style')
    style.id = 'clarity-styles'
    style.textContent = `
    .clarity-highlight {
      background: transparent;
      box-shadow: 0 0 0 2px #7c3aed, 0 0 8px 2px rgba(124, 58, 237, 0.35);
      border-radius: 3px;
      cursor: pointer;
      position: relative;
      display: inline;
    }

    .clarity-comment {
      display: inline-flex;
      align-items: flex-start;
      gap: 6px;
      background: white;
      border: 1px solid #ede9fe;
      border-left: 3px solid #7c3aed;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 12px;
      font-family: -apple-system, sans-serif;
      color: #1a1a1a;
      box-shadow: 0 2px 12px rgba(124,58,237,0.12);
      max-width: 260px;
      vertical-align: middle;
      margin-left: 8px;
      line-height: 1.4;
      position: relative;
      top: -1px;
    }

    .clarity-comment-label {
      font-size: 10px;
      font-weight: 700;
      color: #7c3aed;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      margin-bottom: 2px;
    }

    .clarity-comment-text {
      color: #1a1a1a;
      font-size: 12px;
      line-height: 1.4;
    }

    .clarity-comment-suggestion {
      font-size: 11px;
      color: #7c3aed;
      margin-top: 4px;
      font-style: italic;
    }

    .clarity-dismiss {
      background: none;
      border: none;
      color: #ccc;
      cursor: pointer;
      font-size: 14px;
      padding: 0;
      line-height: 1;
      margin-left: 4px;
      flex-shrink: 0;
      align-self: flex-start;
    }

    .clarity-dismiss:hover { color: #888; }
  `
    document.body.appendChild(style)
}

function showOverlay(response: ClarityResponse, targetElement?: Element) {
    injectStyles()

    const target = targetElement || findBestTarget(response)
    if (!target) return
    if (target.closest('.clarity-highlight')) return // already annotated
    if (target.querySelector('.clarity-highlight')) return // contains annotation
    if (target.closest('.clarity-comment')) return // is inside a comment

    // Wrap target text in a highlight span
    const original = target.cloneNode(true) as Element
    const wrapper = document.createElement('span')
    wrapper.className = 'clarity-highlight'
    wrapper.appendChild(original)

    // Build the comment bubble
    const comment = document.createElement('span')
    comment.className = 'clarity-comment'
    comment.innerHTML = `
    <div style="flex:1; min-width:0;">
      <div class="clarity-comment-label">👁 Clarity</div>
      <div class="clarity-comment-text">${response.flag}</div>
      <div class="clarity-comment-suggestion">${response.suggestion}</div>
    </div>
    <button class="clarity-dismiss" title="Dismiss">×</button>
  `

    // Replace the original element with highlight + comment
    target.replaceWith(wrapper, comment)

    // Dismiss just this annotation
    comment.querySelector('.clarity-dismiss')?.addEventListener('click', () => {
        wrapper.replaceWith(original)
        comment.remove()
    })
}

// function findBestTarget(response: ClarityResponse): Element | null {
//     // Try to find the element whose text matches the signal
//     const all = document.querySelectorAll('p, span, div, label, button, h1, h2, h3, h4, li')
//     for (const el of all) {
//         const text = el.textContent?.trim() || ''
//         if (
//             text.length > 5 &&
//             text.length < 300 &&
//             el.children.length === 0 && // leaf node only
//             response.flag.split(' ').slice(0, 4).some(word =>
//                 word.length > 3 && text.toLowerCase().includes(word.toLowerCase())
//             )
//         ) {
//             return el
//         }
//     }
//     return null
// }