# 🌆 CityMate — Your AI-Powered City Relocation Advisor

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=for-the-badge&logo=tailwind-css" /></a>
  <a href="https://groq.com/"><img src="https://img.shields.io/badge/Groq-AI-orange?style=for-the-badge" /></a>
</p>

---

## ✨ What is CityMate?

**CityMate** helps you discover the *best place to live* — personalized to your preferences and powered by **AI**. Whether you're a digital nomad, student, remote worker, or just craving change, CityMate compares cities with real-time insights.

---

## 🔍 Key Features

- 🧠 **AI-Driven City Comparison** — Powered by Groq AI for tailored insights  
- 🌐 **Live Data** — Real-time cost of living, housing, jobs, and more  
- 📈 **Data-rich Dashboards** — Metrics on:
  - Living expenses
  - Housing trends
  - Employment opportunities
  - Safety, healthcare, transport
  - Neighborhood lifestyle
- 🎯 **Smart Recommendations** — Based on your preferences  
- ⚡ **Parallel API Fetching** — Super-fast results  
- 💅 **Stunning UI** — Modern, mobile-friendly, and smooth  

---

## 🚀 Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/Kushvinth-Madhavan/Submission-Crayo.git

# 2. Install dependencies
cd city-relocation-advisor
npm install

# 3. Configure your environment
cp .env.example .env.local

# 4. Start the app
npm run dev
```

---

## 🔐 Environment Variables

Create a `.env.local` file with your API keys:

```env
GROQ_API_KEY=your_groq_api_key
SERPER_API_KEY=your_serper_api_key
NEWS_API_KEY=your_news_api_key
JINA_API_KEY=your_jina_api_key
RADAR_API_KEY=your_radar_api_key
GEMINI_API_KEY=your_gemini_api_key
```

---

## 🛠 Tech Stack

### 🎨 Frontend
![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### 🧠 Backend + AI
![Groq](https://img.shields.io/badge/Groq-FF6B6B?style=for-the-badge)
<a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js" /></a>

### 📡 APIs
🗺️ **Radar** — Location intelligence  
🔍 **Serper** — Google search results  
📰 **NewsAPI** — Local & global news  
📚 **Jina AI** — Content summarizat
ion  

---

## 📊 Behind the Scenes — API Logic

CityMate integrates and processes real-time data like this:

```ts
const apiCalls = [
  getLocationData(),        // 📍 Radar API
  getWebSearchResults(),    // 🔍 Serper
  getCityNews(),            // 🗞️ News API
  getContentSummaries()     // 📚 Jina AI
  getVectorEmbeddings()     // 🧠 Gemini Embeddings
];
```

Result: Fast, accurate, and insightful recommendations.

---

## 🧬 Unique Innovations

### 🚀 Parallel API Processing
- Faster than sequential calls  
- Intelligent error handling and fallbacks  

### 🧠 Smart Data Blending
- 13+ data sources for max coverage  
- City health, job market, education, and more  

### 🎨 Beautiful UX
- Smooth transitions & animations  
- Fully responsive for all devices  

---

## 📝 License

Licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

## 🙌 Acknowledgments

- ❤️ [Groq AI](https://groq.com/)  
- 🚀 [Vercel](https://vercel.com/)  
- 🧠 All our API partners  

---

<p align="center">
  <strong>Made with ❤️ by Kushvinth</strong>
</p>
