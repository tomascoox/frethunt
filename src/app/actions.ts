'use server'

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function saveToolAction(prevState: any, formData: FormData) {
    // 1. AUTH & ADMIN CHECK
    const cookieStore = await cookies();

    // Create a temp client just to check auth
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                    } catch { }
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== 'tomas@joox.se') {
        return { message: 'Unauthorized Access. Admin only.', success: false };
    }

    // 2. PROCEED WITH SAVE
    const slug = formData.get('slug') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const gameSettingsJson = formData.get('gameSettings') as string;

    // Basic Validation
    if (!slug || !slug.match(/^[a-z0-9-]+$/)) {
        return { message: 'Invalid slug. Use lowercase letters, numbers, and hyphens only.', success: false };
    }

    try {
        const gameSettings = JSON.parse(gameSettingsJson);

        const { error } = await supabaseAdmin
            .from('tools')
            .upsert({
                slug,
                title,
                description,
                game_settings: gameSettings,
                // created_at is default now() usually, but upsert might need it if we want to update timestamp
            }, { onConflict: 'slug' });

        if (error) {
            console.error('Supabase Upsert Error:', error);
            return { message: 'Database Error: ' + error.message, success: false };
        }

        revalidatePath('/'); // Revalidate home (sitemap links etc)
        // revalidatePath('/sitemap.xml'); // Next.js handles sitemaps differently sometimes
        revalidatePath(`/${slug}`);

        return { message: `Saved! Accessible at: /${slug}`, success: true };
    } catch (e: any) {
        console.error('Action Error:', e);
        return { message: 'Server Error: ' + e.message, success: false };
    }
}

export async function sendLoginLink(prevState: any, formData: FormData) {
    const email = formData.get('email') as string;

    if (!email) {
        return { message: 'Email is required', success: false };
    }

    try {
        const { error } = await supabaseAdmin.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL || 'https://frethunt.vercel.app',
            }
        });

        if (error) {
            return { message: error.message, success: false };
        }

        return { message: 'Magic Link sent! Check your inbox.', success: true };
    } catch (e: any) {
        return { message: 'Error: ' + e.message, success: false };
    }
}
