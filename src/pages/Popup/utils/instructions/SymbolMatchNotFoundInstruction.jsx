import React, { useState } from "react";
import { useSnippets } from "../../SnippetContext";

export const SymbolMatchNotFoundInstruction = ({ symbol }) => {
    const { isDarkMode } = useSnippets();
    const [checkBox, setCheckBox] = useState(false)

    return (
        <>
            <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                We couldn't find the exact match for the symbol: <strong>{symbol}</strong>
                <br />
                <br />
                Select an existing chat matching it, OR create a new one.
            </div>
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <label
                    className={`flex items-center space-x-2 cursor-pointer ${isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                >
                    <input
                        type="checkbox"
                        className={`h-4 w-4 ${isDarkMode ? "bg-gray-700 border-gray-500" : "bg-white border-gray-300"
                            }`}
                        value={checkBox}
                        onChange={(e) => {
                            setCheckBox(e.target.value)
                        }}
                    />
                    <span>- Don't show this again!</span>
                </label>
                <button
                    className={`mt-2 sm:mt-0 font-semibold text-sm py-1 px-2 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${isDarkMode
                        ? "text-gray-800 bg-green-500 hover:bg-green-400 focus:ring-green-500"
                        : "text-white bg-green-500 hover:bg-green-400 focus:ring-green-500"
                        }`}
                    onClick={() => {
                        const UserInstructions = JSON.parse(localStorage.getItem("UserInstructions"));
                        localStorage.setItem("UserInstructions", JSON.stringify({
                            ...UserInstructions,
                            symbolMatchNotFound: !checkBox,
                        }));
                        const instructionModal = document.getElementById("symbolMatchNotFoundInstruction");
                        if (instructionModal) instructionModal.close();
                    }}
                >
                    Okay
                </button>
            </div>
        </>
    );
};

