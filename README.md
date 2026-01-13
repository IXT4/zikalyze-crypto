# 🚀 Zikalyze AI

<div align="center">

![Zikalyze AI](src/assets/zikalyze-logo.png)

**Decentralized Crypto Trading Intelligence Platform**

[![Security Checks](https://github.com/tikewn/Zikalyze/actions/workflows/security-checks.yml/badge.svg)](https://github.com/tikewn/Zikalyze/actions/workflows/security-checks.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)

[Live Demo](https://zikalyze.lovable.app) • [Documentation](#documentation) • [Contributing](#contributing) • [Discussions](https://github.com/tikewn/Zikalyze/discussions)

</div>

---

## 📖 Overview

Zikalyze AI is a fully decentralized, offline-first crypto trading analysis platform powered by client-side AI. It provides real-time market intelligence without relying on centralized APIs, ensuring privacy, censorship resistance, and continuous operation even without internet connectivity.

### Why Zikalyze?

- **🔐 Fully Decentralized**: No centralized WebSocket dependencies—all market data sourced from decentralized oracles (Pyth, DIA, API3, Redstone)
- **📴 Offline-First**: Complete functionality without internet using IndexedDB persistence and background Service Workers
- **🧠 Client-Side AI**: All analysis runs locally in your browser—your data never leaves your device
- **🌐 IPFS-Ready**: Designed for decentralized hosting with HashRouter and relative paths

---

## ✨ Features

### 📊 Real-Time Market Analysis
- **Live Price Tracking**: Multi-oracle price feeds with cross-validation
- **Candlestick Charts**: WebGPU/WebGL2 accelerated charting with Canvas2D fallback
- **Volume Analysis**: Real-time volume tracking and anomaly detection
- **Top 100 Crypto List**: Comprehensive market overview with live updates

### 🧠 AI-Powered Intelligence
- **Zikalyze Brain v11.0**: Offline-first AI engine with IndexedDB persistence
- **Technical Analysis**: RSI, MACD, Bollinger Bands, VWAP, and custom indicators
- **Smart Money Concepts**: Institutional flow detection and whale activity tracking
- **Predictive Analytics**: Machine learning-based price predictions with confidence scoring
- **Sentiment Analysis**: Market sentiment aggregation from on-chain signals

### 🔗 Decentralized Data Sources
- **Pyth Network**: High-fidelity oracle price feeds
- **DIA Protocol**: Community-driven price oracles
- **API3**: First-party oracle solutions
- **Redstone**: Modular oracle infrastructure
- **Direct RPC**: Permissionless blockchain data access

### 🛡️ Security & Privacy
- **Zero-Knowledge Encryption**: Client-side ZK encryption for sensitive data
- **Two-Factor Authentication**: TOTP-based 2FA with backup codes
- **Session Management**: Multi-device session tracking and control
- **Rate Limiting**: Protection against brute-force attacks

### 📱 Progressive Web App
- **Installable**: Add to home screen on any device
- **Offline Mode**: Full functionality without internet
- **Background Sync**: Automatic data synchronization when online
- **Push Notifications**: Real-time price alerts (when online)

### 🌍 Internationalization
- **10+ Languages**: English, Spanish, French, German, Arabic, Hindi, Japanese, Russian, Chinese, Nigerian Pidgin
- **RTL Support**: Full right-to-left language support

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui, Framer Motion |
| **State** | TanStack Query, React Context |
| **Charts** | Recharts, WebGPU/WebGL2, Three.js |
| **Storage** | IndexedDB, Service Workers |
| **Backend** | Supabase (Auth, Edge Functions) |
| **Oracles** | Pyth, DIA, API3, Redstone |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zikalyze-ai.git
   cd zikalyze-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file with:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   bun dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### IPFS Deployment

For decentralized hosting on IPFS:

1. **Set up Pinata credentials**
   ```bash
   export PINATA_API_KEY=your_api_key
   export PINATA_SECRET_KEY=your_secret_key
   ```

2. **Run the IPFS deploy script**
   ```bash
   node scripts/deploy-ipfs.js
   ```

3. **Access via IPFS gateway**
   ```
   ipfs://YOUR_CID
   ```

---

## 📁 Project Structure

```
zikalyze-ai/
├── public/                 # Static assets & PWA files
│   ├── sw.js              # Service Worker
│   └── background-learning-worker.js
├── src/
│   ├── assets/            # Images and static resources
│   ├── components/        # React components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   ├── settings/      # Settings components
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Internationalization
│   │   └── locales/       # Translation files
│   ├── lib/               # Utility libraries
│   │   ├── gpu/           # WebGPU/WebGL renderers
│   │   └── zikalyze-brain/ # AI analysis engine
│   ├── pages/             # Route pages
│   └── integrations/      # External integrations
├── supabase/
│   └── functions/         # Edge functions
├── scripts/               # Build & deploy scripts
└── ...config files
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

- 🐛 **Bug Reports**: Found a bug? Open an issue with details
- 💡 **Feature Requests**: Have an idea? We'd love to hear it
- 📝 **Documentation**: Help improve our docs
- 🔧 **Code**: Submit pull requests for fixes or features
- 🌍 **Translations**: Help translate to more languages

### Development Workflow

1. **Fork the repository**
   
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Write meaningful commit messages
   - Add tests if applicable

4. **Run linting**
   ```bash
   npm run lint
   ```

5. **Submit a pull request**
   - Describe your changes clearly
   - Reference any related issues

### Code Style Guidelines

- Use TypeScript for all new code
- Follow the existing component patterns
- Use Tailwind CSS semantic tokens (avoid hardcoded colors)
- Keep components small and focused
- Add JSDoc comments for complex functions

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(charts): add WebGPU fallback renderer

Implements automatic fallback to WebGL2/Canvas2D
when WebGPU is not available.

Closes #123
```

---

## 📄 Documentation

### API Reference

The Zikalyze Brain API provides the following main functions:

```typescript
import { analyzeMarket } from '@/lib/zikalyze-brain';

const analysis = await analyzeMarket({
  symbol: 'BTC',
  price: 45000,
  volume24h: 1000000000,
  change24h: 2.5,
  ohlcData: [...],
  onChainData: {...}
});
```

### Hooks

| Hook | Description |
|------|-------------|
| `useCryptoPrices` | Fetch real-time crypto prices |
| `useOraclePrices` | Multi-oracle price aggregation |
| `usePriceAlerts` | Manage price alerts |
| `useAILearning` | AI learning data management |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes |
| `PINATA_API_KEY` | Pinata API key (for IPFS) | No |
| `PINATA_SECRET_KEY` | Pinata secret (for IPFS) | No |

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] More oracle integrations
- [ ] Advanced backtesting engine
- [ ] Social trading features
- [ ] Hardware wallet integration
- [ ] DEX integration for trading

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Pyth Network](https://pyth.network/) - Oracle infrastructure
- [DIA Protocol](https://diadata.org/) - Decentralized oracles
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Supabase](https://supabase.com/) - Backend infrastructure
- All our amazing contributors!

---

<div align="center">

**Built with ❤️ by the Zikalyze Team**

[⬆ Back to Top](#-zikalyze-ai)

</div>
