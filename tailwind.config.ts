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
            backgroundColor: "hsl(var(--success) / 0.4)",
            boxShadow: "0 0 12px hsl(var(--success) / 0.6)",
            transform: "scale(1.02)",
          },
          "50%": {
            backgroundColor: "hsl(var(--success) / 0.2)",
            boxShadow: "0 0 6px hsl(var(--success) / 0.3)",
            transform: "scale(1.01)",
          },
          "100%": {
            backgroundColor: "transparent",
            boxShadow: "none",
            transform: "scale(1)",
          },
        },
        "price-flash-down": {
          "0%": {
            backgroundColor: "hsl(var(--destructive) / 0.4)",
            boxShadow: "0 0 12px hsl(var(--destructive) / 0.6)",
            transform: "scale(1.02)",
          },
          "50%": {
            backgroundColor: "hsl(var(--destructive) / 0.2)",
            boxShadow: "0 0 6px hsl(var(--destructive) / 0.3)",
            transform: "scale(1.01)",
          },
          "100%": {
            backgroundColor: "transparent",
            boxShadow: "none",
            transform: "scale(1)",
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
            transform: "translateY(100%)",
            opacity: "0",
          },
          "50%": {
            transform: "translateY(-10%)",
            opacity: "1",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "roll-down": {
          "0%": {
            transform: "translateY(-100%)",
            opacity: "0",
          },
          "50%": {
            transform: "translateY(10%)",
            opacity: "1",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
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
        "roll-up": "roll-up 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "roll-down": "roll-down 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
