/// <reference types="vite/client" />
import type { ClarityResponse } from '../types'

interface Props {
    response: ClarityResponse
    onDismiss: () => void
}

export function Overlay({ response, onDismiss }: Props) {
    function handleAction() {
        if (response.action === 'open_tab' && response.actionPayload) {
            window.open(response.actionPayload, '_blank')
        } else if (response.action === 'uncheck') {
            document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
                .forEach(el => { el.checked = false })
        }
        onDismiss()
    }

    return (
        <div className="fixed bottom-6 right-6 z-[999999] w-80 rounded-xl bg-white shadow-2xl border border-gray-100 p-4 font-sans">
            <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-purple-600 tracking-wide uppercase">Clarity</span>
                <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
            <p className="mt-2 text-sm text-gray-800 leading-snug">{response.flag}</p>
            {response.action && (
                <button
                    onClick={handleAction}
                    className="mt-3 w-full text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-2 transition-colors"
                >
                    {response.suggestion}
                </button>
            )}
            {!response.action && (
                <p className="mt-2 text-xs text-gray-500">{response.suggestion}</p>
            )}
        </div>
    )
}