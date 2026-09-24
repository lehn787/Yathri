import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Yathri - Your Journey Simply Explained',
  description: 'Multilingual Route and Fare Assistant for First-Time Passengers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
