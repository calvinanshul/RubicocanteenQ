import { HomeRedirect } from '@/layouts/RequireRole';

/** "/" → role home or login. */
export default function HomePage() {
  return <HomeRedirect />;
}
