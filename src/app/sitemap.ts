import { MetadataRoute } from 'next';
import { tools } from '@/lib/tools-config';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://frethunt.com'; // Replace with env var in production

    // 1. Static Routes
    const routes = [
        '',
        '/login',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }));

    // 2. Local Config Tools
    const localTools = Object.keys(tools).map((slug) => ({
        url: `${baseUrl}/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    // 3. Database Tools
    let dbTools: MetadataRoute.Sitemap = [];

    // Only fetch from DB if keys are present (prevents build failure)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const { data } = await supabaseAdmin
                .from('tools')
                .select('slug, created_at');

            if (data) {
                dbTools = data.map((tool: any) => ({
                    url: `${baseUrl}/${tool.slug}`,
                    lastModified: new Date(tool.created_at || new Date()),
                    changeFrequency: 'weekly' as const,
                    priority: 0.8,
                }));
            }
        } catch (e) {
            console.error('Sitemap DB Error:', e);
        }
    }

    return [...routes, ...localTools, ...dbTools];
}
