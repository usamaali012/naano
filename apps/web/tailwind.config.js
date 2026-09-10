/** @type {import('tailwindcss').Config} */

// Every token here reads from a CSS custom property defined in src/index.css —
// the tokens live in one place. New components use these utilities
// (bg-surface, text-muted, rounded-card, shadow-overlay…) and never raw hex,
// a px radius, or an off-scale spacing value. See docs/DESIGN.md.
//
// The stock Tailwind palette is left in place for now so the pre-token screens
// keep rendering; each is migrated to tokens in its own Phase 2 slice.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        border: "var(--border)",
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          soft: "var(--primary-soft)",
        },
        success: "var(--success)",
        warn: "var(--warn)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        border: "var(--border)",
        primary: "var(--primary)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)",
      },
      boxShadow: {
        overlay: "var(--shadow-overlay)",
      },
      // Named steps off the 4/8/12/16/24/32/48 scale. Use these, not p-5/p-10.
      spacing: {
        "s1": "4px",
        "s2": "8px",
        "s3": "12px",
        "s4": "16px",
        "s6": "24px",
        "s8": "32px",
        "s12": "48px",
      },
      fontFamily: {
        sans: "var(--font-sans)",
      },
      fontSize: {
        label: ["12px", { lineHeight: "16px", fontWeight: "500" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "card-title": ["15px", { lineHeight: "20px", fontWeight: "600" }],
        "section-title": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        metric: ["20px", { lineHeight: "24px", fontWeight: "600" }],
        "page-title": ["30px", { lineHeight: "36px", fontWeight: "600", letterSpacing: "-0.02em" }],
      },
      ringColor: {
        primary: "var(--primary)",
      },
    },
  },
  plugins: [],
};
