export interface PatternSignal {
    pattern: string
    elementText: string
    pageContext: string
    confidence: 'high' | 'medium'
    site: string
}

export interface ClarityResponse {
    flag: string
    suggestion: string
    action: 'open_tab' | 'uncheck' | 'dismiss' | null
    actionPayload?: string // e.g. a search URL
}