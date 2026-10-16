import { SVGAttributes } from 'react';

export default function AppLogoIcon({
    className,
}: {
    className?: SVGAttributes['className'];
    animated?: boolean;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="5"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M7 16V13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M11 16V10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M15 16V7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M7 11.5L11 8.5L16 6"
                stroke="#10B981"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="16" cy="6" r="1.2" fill="#10B981" />
        </svg>
    );
}
