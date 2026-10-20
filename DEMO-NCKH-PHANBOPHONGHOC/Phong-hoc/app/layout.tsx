import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hệ thống Tra cứu & Phân bổ Phòng học HVHC&QTC',
  description:
    'Hệ thống tra cứu và phân bổ phòng học thông minh — theo dõi trạng thái phòng trống, lớp chính khóa và mượn phòng tạm thời theo thời gian thực.',
  generator: 'v0.app',
  icons: {
    icon: '/site-icon.jpg',
    shortcut: '/site-icon.jpg',
    apple: '/site-icon.jpg',
  },
  other: {
    google: 'notranslate',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" translate="no" className="notranslate bg-background">
      <body className={`${beVietnamPro.className} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
