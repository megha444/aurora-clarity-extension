/// <reference types="vite/client" />
import type { PatternSignal } from '../types'

interface PatternRule {
    name: string
    selectors: string[]
    keywords: RegExp
    context: string
}

export const PATTERNS: PatternRule[] = [
    {
        name: 'countdown_timer',
        selectors: ['[class*="countdown"]', '[class*="timer"]', '[id*="timer"]'],
        keywords: /ends?\s+in|only\s+\d+\s+(hour|min|sec)|limited\s+time/i,
        context: 'urgency',
    },
    {
        name: 'low_stock',
        selectors: ['[class*="stock"]', '[class*="inventory"]', '[class*="scarcity"]'],
        keywords: /only\s+\d+\s+left|(\d+)\s+remaining|selling\s+fast|almost\s+gone/i,
        context: 'scarcity',
    },
    {
        name: 'social_proof_pressure',
        selectors: ['[class*="viewing"]', '[class*="watching"]', '[class*="social-proof"]'],
        keywords: /\d+\s+people\s+(are\s+)?(viewing|watching|looking)|(\d+)\s+bought/i,
        context: 'social_pressure',
    },
    {
        name: 'precheckd_upsell',
        selectors: ['input[type="checkbox"][checked]', 'input[type="checkbox"].selected'],
        keywords: /insurance|protection|warranty|donation|add-on/i,
        context: 'hidden_cost',
    },
    {
        name: 'confirm_shaming',
        selectors: ['[class*="decline"]', '[class*="no-thanks"]', 'a[class*="skip"]'],
        keywords: /no\s+thanks.*i\s+(hate|don.t want)|i\s+prefer\s+to\s+(pay more|miss out)/i,
        context: 'manipulation',
    },
    {
        name: 'infinite_scroll',
        selectors: ['[class*="infinite"]', '[class*="endless"]', '[data-infinite-scroll]'],
        keywords: /load\s+more|scroll\s+for\s+more/i,
        context: 'attention',
    },
]

export function detectPatterns(node: Element): PatternSignal | null {
    const text = node.textContent || ''
    const site = window.location.hostname

    for (const rule of PATTERNS) {
        const selectorMatch = rule.selectors.some(sel => {
            try { return node.matches(sel) || node.querySelector(sel) !== null }
            catch { return false }
        })
        const keywordMatch = rule.keywords.test(text)

        if (selectorMatch || keywordMatch) {
            return {
                pattern: rule.name,
                elementText: text.slice(0, 200).trim(),
                pageContext: rule.context,
                confidence: selectorMatch && keywordMatch ? 'high' : 'medium',
                site,
            }
        }
    }
    return null
}