
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
                content: dbTool.content, // Fetch content
                gameSettings: dbTool.game_settings
            };
        }
    } catch (e) {
        console.error("DB Fetch Error:", e);
    }

    return null;
}

// ... (Metadata gen same as before)

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

    const tool: any = await getToolData(slug); // Type loose for content prop

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
            >
                {tool.content && (
                    <div className="w-full bg-slate-950 border-t border-slate-800/50 relative z-10">
                        <article className="w-full max-w-3xl mx-auto py-16 px-6 sm:px-8">
                            <h1 className="text-3xl font-bold text-white mb-8">
                                {tool.title}
                            </h1>

                            {/* Content Container with Deep Selectors */}
                            <div
                                className="text-slate-300 leading-relaxed
                                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-12 [&_h2]:mb-4
                                [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-8 [&_h3]:mb-3
                                [&_p]:mb-6 [&_p]:text-lg
                                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-6
                                [&_li]:mb-2
                                [&_strong]:text-white [&_strong]:font-bold"
                                dangerouslySetInnerHTML={{ __html: tool.content }}
                            />
                        </article>
                    </div>
                )}
            </GameWrapper>
        </main>
    );
}
