import React from "react";
import { useSnippets } from "../SnippetContext";

export const Loading = () => {
    const { loadingScreenState } = useSnippets()

    if (!loadingScreenState.show) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50 z-50"
            style={{ backdropFilter: "blur(1px)" }}
        >
            <div className="flex items-center gap-2">
                <div className="loader animate-spin rounded-full border-4 border-t-4 border-gray-300 border-t-green-500 w-9 h-9"></div>
                <span className="text-white text-lg">{loadingScreenState.text || "Loading..."}</span>
            </div>
        </div>
    );
};
