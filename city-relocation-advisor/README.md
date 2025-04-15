# 🏙️ CityMate - AI City Relocation Advisor

<div align="center">

![CityMate Demo](https://raw.githubusercontent.com/yourusername/city-relocation-advisor/main/public/demo.gif)

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-AI-orange?style=for-the-badge)](https://groq.com/)

</div>

## ✨ Features

<div align="center">
<img src="https://raw.githubusercontent.com/yourusername/city-relocation-advisor/main/public/features.gif" width="600px" />
</div>

- 🤖 **AI-Powered Analysis** - Advanced city comparison using Groq AI
- 🌐 **Real-Time Data** - Live information from multiple reliable sources
- 📊 **Comprehensive Insights** - Detailed analysis of:
  - Cost of living comparisons
  - Housing market trends
  - Job opportunities
  - Quality of life metrics
  - Neighborhood recommendations
- 🎯 **Personalized Recommendations** - Tailored advice based on your preferences
- 🔄 **Parallel API Processing** - Fast, concurrent data gathering
- 📱 **Modern UI/UX** - Beautiful, responsive design with smooth animations

## 🚀 Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/city-relocation-advisor.git

# Install dependencies
cd city-relocation-advisor
npm install

# Set up environment variables
cp .env.example .env.local

# Start the development server
npm run dev
\`\`\`

## 🔑 Environment Variables

Create a \`.env.local\` file with the following:

\`\`\`env
GROQ_API_KEY=your_groq_api_key
SERPER_API_KEY=your_serper_api_key
NEWS_API_KEY=your_news_api_key
JINA_API_KEY=your_jina_api_key
RADAR_API_KEY=your_radar_api_key
\`\`\`

## 🛠️ Tech Stack

<div align="center">

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### Backend & AI
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-FF6B6B?style=for-the-badge)

### APIs
- 🗺️ Radar Location API
- 🔍 Serper (Google Search)
- 📰 News API
- 📚 Jina AI Reader

</div>

## 🎯 Key Features Demo

### 1. Smart City Analysis
<div align="center">
<img src="https://raw.githubusercontent.com/yourusername/city-relocation-advisor/main/public/analysis.gif" width="600px" />
</div>

### 2. Real-Time Data Integration
<div align="center">
<img src="https://raw.githubusercontent.com/yourusername/city-relocation-advisor/main/public/realtime.gif" width="600px" />
</div>

### 3. Beautiful Loading Animations
<div align="center">
<img src="https://raw.githubusercontent.com/yourusername/city-relocation-advisor/main/public/loading.gif" width="600px" />
</div>

## 📊 API Usage Report

Our system intelligently combines data from multiple sources:

```typescript
const apiCalls = [
  getLocationData(),        // Radar API
  getWebSearchResults(),    // Serper API
  getCityNews(),           // News API
  getContentSummaries()    // Jina AI
];
```

Each response includes a detailed API usage report:

<div align="center">
<img src="https://raw.githubusercontent.com/yourusername/city-relocation-advisor/main/public/api-report.png" width="400px" />
</div>

## 🌟 Unique Features

1. **Parallel API Processing**
   - Concurrent data gathering from multiple sources
   - Optimized response times
   - Fallback mechanisms for reliability

2. **Smart Data Sources**
   - 13+ reliable city information sources
   - Real-time data updates
   - Comprehensive coverage of all aspects

3. **Beautiful UI/UX**
   - Smooth loading animations
   - Responsive design
   - Intuitive interface

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- [Groq AI](https://groq.com/) for their amazing LLM
- [Vercel](https://vercel.com/) for hosting
- All the API providers that make this possible

---

<div align="center">
Made with ❤️ by [Your Name]
</div>
