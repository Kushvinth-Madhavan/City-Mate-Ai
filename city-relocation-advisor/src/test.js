// Test script for city-relocation-advisor AI

async function testChatbotAPI() {
  const testQuestion = "I'm a software engineer with a family of four, including two elementary school children. We're considering relocating from San Francisco to either Austin, Denver, or Raleigh. We value good public schools, a reasonable commute, affordable housing (under $600K for a 3BR home), and outdoor activities. I work remotely but need access to a good tech community. My spouse is in healthcare. Can you compare these three cities and recommend which neighborhoods would be best for us based on our priorities? Please consider cost of living adjustments from San Francisco, school quality, healthcare job opportunities, and the strength of the local tech scene.";
  
  try {
    console.log("Sending test question to chatbot API...");
    console.log("Question:", testQuestion);
    console.log("---");
    
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testQuestion,
        messages: []
      })
    });
    
    const data = await response.json();
    
    console.log("Response from AI:");
    console.log(data.response.content);
  } catch (error) {
    console.error("Error during test:", error.message);
  }
}

testChatbotAPI(); 