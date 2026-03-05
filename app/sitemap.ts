import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3001').replace(/\/$/, '');

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
  ];

  // Trips — minimal payload (slug + updatedAt only). Hard cap at 5,000.
  const trips = await prisma.trip.findMany({
    where: { isPublic: true, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5000,
    select: { slug: true, updatedAt: true },
  });

  const tripRoutes: MetadataRoute.Sitemap = trips.map(
    (t): MetadataRoute.Sitemap[number] => ({
      url: `${baseUrl}/trip/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })
  );

  // Locations — low cardinality, no cap needed
  const locations = await prisma.location.findMany({
    select: { slug: true, updatedAt: true },
  });

  const locationRoutes: MetadataRoute.Sitemap = locations.map(
    (l): MetadataRoute.Sitemap[number] => ({
      url: `${baseUrl}/locations/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })
  );

  return [...staticRoutes, ...tripRoutes, ...locationRoutes];
}
