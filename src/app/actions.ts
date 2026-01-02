'use server'

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function saveToolAction(prevState: any, formData: FormData) {
    // 1. AUTH CHECK (Token passed from client)
    const accessToken = formData.get('access_token') as string;

    // Validate the token to get the user
    // We use supabaseAdmin to verify, but getUser(token) validates against Supabase Auth API
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

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
                emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL || 'https://frethunt.com',
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


export async function bulkImportToolsAction(prevState: any, formData: FormData) {
    // 1. AUTH CHECK
    const accessToken = formData.get('access_token') as string;
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);

    if (!user || user.email !== 'tomas@joox.se') {
        return { message: 'Unauthorized. Admin only.', success: false };
    }

    // 2. PARSE FILE
    const file = formData.get('file') as File;
    if (!file) return { message: 'No file uploaded', success: false };

    try {
        const text = await file.text();
        const tools = JSON.parse(text);

        if (!Array.isArray(tools)) return { message: 'JSON root must be an Array []', success: false };

        // 3. MAP TO DB (FLAT JSON -> DB STRUCTURE)
        const toolsToInsert = tools.map((item: any) => ({
            slug: item.slug,
            title: item.title,
            description: item.description,
            game_settings: {
                initialNotes: item.initialNotes || ["C", "D", "E"], // Fallback safe
                initialStrings: item.initialStrings || [0, 1, 2, 3, 4, 5],
                initialPositions: item.initialPositions || [] // Support precise positions
            }
        }));

        // 4. UPSERT
        const { error } = await supabaseAdmin
            .from('tools')
            .upsert(toolsToInsert, { onConflict: 'slug' });

        if (error) return { message: 'DB Error: ' + error.message, success: false };

        revalidatePath('/');
        return { message: `Success! Imported ${toolsToInsert.length} tools.`, success: true };
    } catch (e: any) {
        return { message: 'Invalid JSON File: ' + e.message, success: false };
    }
}

export async function deleteAllToolsAction(prevState: any, formData: FormData) {
    const accessToken = formData.get('access_token') as string;
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);

    if (!user || user.email !== 'tomas@joox.se') {
        return { message: 'Unauthorized.', success: false };
    }

    const { error } = await supabaseAdmin
        .from('tools')
        .delete()
        .neq('slug', '_'); // Delete all rows

    if (error) return { message: 'DB Error: ' + error.message, success: false };

    revalidatePath('/');
    return { message: 'All tools deleted.', success: true };
}
