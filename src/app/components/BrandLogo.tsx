import React from "react";
import { useId } from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  mode?: "color" | "mono";
  subtitle?: string;
}

export function BrandLogo({
  size = "md",
  showText = true,
  mode = "color",
  subtitle = "Business Suite",
}: BrandLogoProps) {
  const gradientId = useId();
  const dimensions = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const textSize = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${dimensions[size]} rounded-xl overflow-hidden shadow-sm border border-white/40`}
      >
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#004aad" />
              <stop offset="100%" stopColor="#0b2f63" />
            </linearGradient>
          </defs>
          {mode === "color" ? (
            <>
              <rect
                width="64"
                height="64"
                rx="14"
                fill={`url(#${gradientId})`}
              />
              <rect
                x="11"
                y="13"
                width="42"
                height="12"
                rx="6"
                fill="#fcd116"
              />
              <rect
                x="11"
                y="27"
                width="42"
                height="10"
                rx="5"
                fill="#ffffff"
              />
              <rect
                x="11"
                y="39"
                width="42"
                height="12"
                rx="6"
                fill="#009e60"
              />
              <path
                d="M24 44V20l8 11 8-11v24"
                stroke="#0b2f63"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <>
              <rect
                width="64"
                height="64"
                rx="14"
                fill="currentColor"
                className="text-foreground"
              />
              <path
                d="M24 44V20l8 11 8-11v24"
                stroke="var(--color-background)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="11"
                y="13"
                width="42"
                height="2"
                rx="1"
                fill="var(--color-background)"
                opacity="0.7"
              />
              <rect
                x="11"
                y="49"
                width="42"
                height="2"
                rx="1"
                fill="var(--color-background)"
                opacity="0.7"
              />
            </>
          )}
        </svg>
      </div>

      {showText && (
        <div>
          <p
            className={`${textSize[size]} font-semibold leading-none tracking-tight text-foreground`}
          >
            M.G.N Manager
          </p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
