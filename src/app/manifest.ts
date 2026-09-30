import type { MetadataRoute } from 'next';

/**
 * PWA web manifest. Next.js will serve this at /manifest.webmanifest
 * and emit the matching <link rel="manifest"> tag automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Smth For Love',
        short_name: 'Love',
        description: 'Internal management application',
        lang: 'vi',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ea4c00',
        categories: ['lifestyle', 'social'],
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/maskable-icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
