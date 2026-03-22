/// <reference types="vite/client" />
import type { PatternSignal, ClarityResponse } from '../types'

// const SYSTEM_PROMPT = `You are Clarity, a sharp and slightly sarcastic AI that catches manipulation in real time as users browse. When given a dark pattern signal, respond with JSON only — no preamble, no markdown:{
//   "flag": "one punchy sentence naming the manipulation (max 20 words, be human and a little funny)",
//   "suggestion": "one concrete action the user can take right now",
//   "action": "open_tab | uncheck | dismiss | null",
//   "actionPayload": "optional URL if action is open_tab"
// }
// Never be preachy. Never use the word 'manipulate'. Be the user's clever friend, not a warning label.`

const SYSTEM_PROMPT = `You are Clarity, a browser assistant that detects dark patterns. Respond with valid JSON only, no extra text:
{"flag":"max 15 words, witty observation about the manipulation","suggestion":"one short action","action":"open_tab|uncheck|dismiss|null","actionPayload":"URL only if open_tab"}
Be funny, be brief, never preachy.`

// async function callClaude(signal: PatternSignal): Promise<ClarityResponse | null> {
//     try {
//         const res = await fetch('https://api.anthropic.com/v1/messages', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
//                 'anthropic-version': '2023-06-01',
//             },
//             body: JSON.stringify({
//                 model: 'claude-sonnet-4-20250514',
//                 max_tokens: 300,
//                 system: SYSTEM_PROMPT,
//                 messages: [{ role: 'user', content: JSON.stringify(signal) }],
//             }),
//         })
//         const data = await res.json()
//         const text = data.content?.[0]?.text || ''
//         return JSON.parse(text) as ClarityResponse
//     } catch (e) {
//         console.error('Clarity API error', e)
//         return null
//     }
// }

async function callClaude(signal: PatternSignal): Promise<ClarityResponse | null> {
    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',  // ADD THIS
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 300,
                system: SYSTEM_PROMPT,
                messages: [{ role: 'user', content: JSON.stringify(signal) }],
            }),
        })

        const data = await res.json()
        console.log('📦 Raw API response:', JSON.stringify(data))  // ADD THIS

        const text = data.content?.[0]?.text || ''
        console.log('📝 Raw text:', text)  // ADD THIS

        return JSON.parse(text) as ClarityResponse
    } catch (e) {
        console.error('Clarity API error', e)
        return null
    }
}

// chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
//     if (msg.type === 'PATTERN_FOUND') {
//         callClaude(msg.signal).then(response => {
//             if (response) {
//                 chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
//                     if (tab?.id) {
//                         chrome.tabs.sendMessage(tab.id, { type: 'SHOW_OVERLAY', response })
//                     }
//                 })
//             }
//         })
//         return true
//     }
// })

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'PATTERN_FOUND') {
        console.log('📨 Background received signal:', msg.signal)  // ADD THIS
        callClaude(msg.signal).then(response => {
            console.log('🤖 Claude responded:', response)  // ADD THIS
            if (response) {
                chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
                    if (tab?.id) {
                        chrome.tabs.sendMessage(tab.id, { type: 'SHOW_OVERLAY', response })
                    }
                })
            }
        })
        return true
    }
})