
export interface ToolConfig {
    slug: string;
    title: string;
    description: string;
    gameSettings: {
        initialNotes?: string[];
        initialStrings?: number[];
    };
}


export interface ToolConfig {
    slug: string;
    title: string;
    description: string;
    gameSettings: {
        initialNotes?: string[];
        initialStrings?: number[];
    };
}

export const tools: Record<string, ToolConfig> = {};

export const getAllToolSlugs = () => Object.keys(tools);

