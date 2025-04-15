import { RelocationOrchestrator } from './orchestrator';

/**
 * Test script for the RelocationOrchestrator
 * Run with: npx ts-node src/lib/test-orchestrator.ts
 */
async function testOrchestrator() {
  console.log('🧪 Testing RelocationOrchestrator...');
  
  try {
    // Test with basic parameters
    const result = await RelocationOrchestrator.analyzeRelocation(
      'San Francisco',
      'Austin',
      {
        budget: { max: 5000 },
        housingType: ['apartment'],
        jobIndustry: ['tech'],
        transportationNeeds: ['public transit'],
      }
    );
    
    console.log('✅ Test successful!');
    console.log('\nSummary:');
    console.log(result.summary);
    
    console.log('\nRecommendations:');
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log('\nAnalysis Data:');
    console.log('- Cost of Living:', result.analysis.costOfLiving ? 'Available' : 'Not available');
    console.log('- Quality of Life:', result.analysis.qualityOfLife ? 'Available' : 'Not available');
    console.log('- Job Market:', result.analysis.jobMarket ? 'Available' : 'Not available');
    console.log('- Housing Market:', result.analysis.housingMarket ? 'Available' : 'Not available');
    console.log('- Transportation:', result.analysis.transportation ? 'Available' : 'Not available');
    console.log('- Neighborhoods:', result.analysis.neighborhoods ? 'Available' : 'Not available');
    console.log('- Recent News:', result.analysis.recentNews.length > 0 ? 'Available' : 'Not available');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testOrchestrator()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
} 