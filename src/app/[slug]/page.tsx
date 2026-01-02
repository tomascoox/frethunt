
import { notFound } from 'next/navigation';
import GameWrapper from '@/components/GameWrapper';
import { tools } from '@/lib/tools-config';
import { supabase } from '@/lib/supabase';
import { Metadata } from 'next';

// Force dynamic rendering since we are fetching from DB now
export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ slug: string }>;
}

async function getToolData(slug: string) {
    // 1. Check Config (Fastest & Static)
    if (tools[slug]) {
        return tools[slug];
    }

    // 2. Check Database (Dynamic)
    try {
        const { data: dbTool, error } = await supabase
            .from('tools')
            .select('*')
            .eq('slug', slug)
            .single();

        if (dbTool) {
            return {
                slug: dbTool.slug,
                title: dbTool.title,
                description: dbTool.description,
                gameSettings: dbTool.game_settings // Snake_case from DB mapped to CamelCase
            };
        }
    } catch (e) {
        console.error("DB Fetch Error:", e);
    }

    return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const tool = await getToolData(slug);

    if (!tool) return {};

    return {
        title: `${tool.title} | FretHunt`,
        description: tool.description,
        openGraph: {
            title: `${tool.title} | FretHunt`,
            description: tool.description,
            type: 'website',
        },
    };
}

export default async function ToolPage({
    params,
    searchParams
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { slug } = await params;
    const { edit } = await searchParams;
    const isEditMode = edit === 'true';

    const tool = await getToolData(slug);

    if (!tool) {
        return notFound();
    }

    const toolMetadata = {
        slug: tool.slug,
        title: tool.title,
        description: tool.description
    };

    return (
        <main className="w-full min-h-screen bg-slate-950 flex flex-col">
            <GameWrapper
                initialNotes={tool.gameSettings.initialNotes}
                initialStrings={tool.gameSettings.initialStrings}
                initialPositions={tool.gameSettings.initialPositions}
                disablePersistence={true}
                toolMetadata={toolMetadata}
                startInEditMode={isEditMode}
            />
        </main>
    );
}
