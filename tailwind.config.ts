import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        cyan: {
          DEFAULT: "hsl(var(--cyan))",
          foreground: "hsl(var(--cyan-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        "chart-cyan": "hsl(var(--chart-cyan))",
        "chart-purple": "hsl(var(--chart-purple))",
        "chart-orange": "hsl(var(--chart-orange))",
        "chart-blue": "hsl(var(--chart-blue))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "price-flash-up": {
          "0%": {
            backgroundColor: "hsl(var(--success) / 0.15)",
          },
          "100%": {
            backgroundColor: "transparent",
          },
        },
        "price-flash-down": {
          "0%": {
            backgroundColor: "hsl(var(--destructive) / 0.15)",
          },
          "100%": {
            backgroundColor: "transparent",
          },
        },
        "bounce-subtle-up": {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "25%": {
            transform: "translateY(-2px)",
          },
        },
        "bounce-subtle-down": {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "25%": {
            transform: "translateY(2px)",
          },
        },
        "digit-out-up": {
          "0%": {
            transform: "translateY(0)",
            opacity: "1",
          },
          "100%": {
            transform: "translateY(-110%)",
            opacity: "0",
          },
        },
        "digit-in-up": {
          "0%": {
            transform: "translateY(110%)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "digit-out-down": {
          "0%": {
            transform: "translateY(0)",
            opacity: "1",
          },
          "100%": {
            transform: "translateY(110%)",
            opacity: "0",
          },
        },
        "digit-in-down": {
          "0%": {
            transform: "translateY(-110%)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "spin-slow": {
          from: {
            transform: "rotate(0deg)",
          },
          to: {
            transform: "rotate(360deg)",
          },
        },
        "roll-up": {
          "0%": {
            transform: "translateY(50%)",
            opacity: "0.3",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "roll-down": {
          "0%": {
            transform: "translateY(-50%)",
            opacity: "0.3",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "live-glow-bullish": {
          "0%, 100%": {
            boxShadow: "0 0 0 1px hsl(var(--success) / 0.15), 0 0 8px 0 hsl(var(--success) / 0.1)",
          },
          "50%": {
            boxShadow: "0 0 0 1px hsl(var(--success) / 0.3), 0 0 16px 2px hsl(var(--success) / 0.2)",
          },
        },
        "live-glow-bearish": {
          "0%, 100%": {
            boxShadow: "0 0 0 1px hsl(var(--destructive) / 0.15), 0 0 8px 0 hsl(var(--destructive) / 0.1)",
          },
          "50%": {
            boxShadow: "0 0 0 1px hsl(var(--destructive) / 0.3), 0 0 16px 2px hsl(var(--destructive) / 0.2)",
          },
        },
        "cmc-glow-up": {
          "0%": {
            backgroundColor: "hsl(var(--success) / 0.25)",
            boxShadow: "inset 0 0 20px 4px hsl(var(--success) / 0.3), 0 0 12px 2px hsl(var(--success) / 0.2)",
          },
          "50%": {
            backgroundColor: "hsl(var(--success) / 0.15)",
            boxShadow: "inset 0 0 15px 2px hsl(var(--success) / 0.2), 0 0 8px 1px hsl(var(--success) / 0.15)",
          },
          "100%": {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        },
        "cmc-glow-down": {
          "0%": {
            backgroundColor: "hsl(var(--destructive) / 0.25)",
            boxShadow: "inset 0 0 20px 4px hsl(var(--destructive) / 0.3), 0 0 12px 2px hsl(var(--destructive) / 0.2)",
          },
          "50%": {
            backgroundColor: "hsl(var(--destructive) / 0.15)",
            boxShadow: "inset 0 0 15px 2px hsl(var(--destructive) / 0.2), 0 0 8px 1px hsl(var(--destructive) / 0.15)",
          },
          "100%": {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "price-flash-up": "price-flash-up 0.6s ease-out",
        "price-flash-down": "price-flash-down 0.6s ease-out",
        "bounce-subtle-up": "bounce-subtle-up 0.4s ease-out",
        "bounce-subtle-down": "bounce-subtle-down 0.4s ease-out",
        "digit-out-up": "digit-out-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "digit-in-up": "digit-in-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "digit-out-down": "digit-out-down 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "digit-in-down": "digit-in-down 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "spin-slow": "spin-slow 2.5s linear infinite",
        "roll-up": "roll-up 0.2s ease-out forwards",
        "roll-down": "roll-down 0.2s ease-out forwards",
        "live-glow-bullish": "live-glow-bullish 2s ease-in-out infinite",
        "live-glow-bearish": "live-glow-bearish 2s ease-in-out infinite",
        "cmc-glow-up": "cmc-glow-up 1.5s ease-out forwards",
        "cmc-glow-down": "cmc-glow-down 1.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
