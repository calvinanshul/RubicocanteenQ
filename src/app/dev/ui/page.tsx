import { notFound } from 'next/navigation';
import { DevGallery } from '@/screens/DevGallery';

/** /dev/ui: component gallery (development builds only). */
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DevGallery />;
}
