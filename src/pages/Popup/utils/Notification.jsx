import { AlertCircle, CircleCheck, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSnippets } from "../SnippetContext";

export function Notification() {
    const { notificationState, setNotificationState } = useSnippets();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (notificationState.show) {
            setIsVisible(false);

            const delay = setTimeout(() => setIsVisible(true), 50);

            if (notificationState.duration) {
                const timer = setTimeout(() => closeNotification(), notificationState.duration);
                return () => {
                    clearTimeout(timer);
                    clearTimeout(delay);
                };
            }

            return () => clearTimeout(delay);
        }
    }, [notificationState.show, notificationState.duration]);

    const closeNotification = () => {
        setIsVisible(false);
        setTimeout(() => setNotificationState({ show: false }), 300);
    };

    if (!notificationState.show && !isVisible) return null;

    return (
        <div
            className={`fixed top-5 left-1/2 transform -translate-x-1/2 w-64 bg-gray-200 text-gray-800 text-sm rounded-lg shadow-lg px-4 py-3 flex flex-col items-center transition-all duration-300 ease-in-out 
            ${isVisible ? "opacity-100 translate-y-2" : "opacity-0 -translate-y-5"}`}
        >
            {/* Close Button */}
            <button
                onClick={closeNotification}
                className="absolute right-2 top-2 p-1 rounded-full text-gray-600 hover:bg-gray-300 transition"
            >
                <X size={13} />
            </button>

            {/* Icon and Text */}
            <div className="flex items-center w-full mb-2">
                {notificationState.type === "warning" && <AlertCircle size={18} className="mr-2 text-gray-700" />}
                {notificationState.type === "success" && <CircleCheck size={18} className="mr-2 text-green-700" />}
                {notificationState.type === "failure" && <AlertCircle size={18} className="mr-2 text-red-700" />}
                <span className="flex-1 text-left text-xs font-semibold">{notificationState.text}</span>
            </div>

            {/* Action Button - Properly aligned below text */}
            {notificationState.action && (
                <button
                    onClick={() => {
                        notificationState.doAction();
                        closeNotification();
                    }}
                    className="w-30 text-center px-3 py-1 rounded-md text-xs font-medium transition duration-200 bg-blue-500 hover:bg-blue-700 text-white"
                >
                    {notificationState.action}
                </button>
            )}
        </div>
    );
}
