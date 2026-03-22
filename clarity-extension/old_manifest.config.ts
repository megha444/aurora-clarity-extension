import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
    manifest_version: 3,
    name: 'Clarity',
    version: '1.0.0',
    description: 'Makes dark patterns visible in real time',
    permissions: ['storage', 'scripting', 'tabs'],
    host_permissions: ['<all_urls>'],
    background: {
        service_worker: 'src/background/index.ts',
        type: 'module',
    },
    content_scripts: [
        {
            matches: ['<all_urls>'],
            js: ['src/content/index.ts'],
        },
    ],
    action: { default_popup: 'index.html' },
})