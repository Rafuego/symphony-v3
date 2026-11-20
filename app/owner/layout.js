// Owner-only area. Keep it out of search engines; access is enforced by
// /api/owner/* (see lib/ownerAuth.js), not by this layout.
export const metadata = {
  title: 'Account Planning',
  robots: { index: false, follow: false },
}

export default function OwnerLayout({ children }) {
  return children
}
