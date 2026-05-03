
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Digital Portal',
    short_name: 'Portal',
    description: 'Access your personal digital terminal.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: 'https://picsum.photos/seed/portal/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/portal/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
