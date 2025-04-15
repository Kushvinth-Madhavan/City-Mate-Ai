import { generateEmbedding } from './embeddings';
import {
  getUserProfile as fetchUserProfile,
  storeUserProfile as saveUserProfile,
  getConversationHistory as fetchConversationHistory,
  storeConversationHistory as saveConversationHistory,
  getCityPreferences as fetchCityPreferences,
  storeCityPreferences as saveCityPreferences,
  supabaseAdmin
} from './supabase';

// In-memory storage for when database is unavailable
const memoryStore: {
  userProfiles: Record<string, any>;
  conversationHistory: Record<string, any[]>;
  cityPreferences: Record<string, any[]>;
} = {
  userProfiles: {},
  conversationHistory: {},
  cityPreferences: {}
};

// Flag to indicate if we're in memory-only mode
let memoryOnlyMode = false;

// Function to set memory-only mode
export function setMemoryOnlyMode(value: boolean) {
  memoryOnlyMode = value;
  console.log(`Memory-only mode ${value ? 'enabled' : 'disabled'}`);
}

// Function to get memory-only mode status
export function isMemoryOnlyMode(): boolean {
  return memoryOnlyMode;
}

// Types for our memory system
export type UserProfile = {
  name?: string;
  occupation?: string;
  careerField?: string;
  familySize?: number;
  hasChildren?: boolean;
  schoolAgeChildren?: boolean;
  workMode?: 'remote' | 'hybrid' | 'in-office' | string;
  budget?: {
    housing?: number;
    min?: number;
    max?: number;
  };
  priorities?: string[];
  interests?: string[];
  importantFactors?: string[];
  [key: string]: any;
};

export type UserPreferences = {
  costOfLiving?: boolean;
  jobOpportunities?: boolean;
  schools?: boolean;
  safety?: boolean;
  outdoorActivities?: boolean;
  climate?: boolean;
  [key: string]: any;
};

export type CityData = {
  name: string;
  state?: string;
  country?: string;
  discussed: boolean;
  interested: boolean;
  notes?: string;
  neighborhoods?: {
    name: string;
    notes?: string;
  }[];
  [key: string]: any;
};

// Extract user profile information from conversation
export function extractUserProfile(messages: any[]): Partial<UserProfile> {
  const profile: Partial<UserProfile> = {};
  
  // Implement extraction logic here
  // This would involve analyzing messages for relevant information
  // For a real implementation, this would be much more sophisticated
  
  return profile;
}

// Extract city preferences from conversation
export function extractCityPreferencesFromMessages(messages: any[]): CityData[] {
  const cities: CityData[] = [];
  
  // Implement extraction logic here
  // This would involve analyzing messages for city mentions and preferences
  
  return cities;
}

// Memory management system
export class MemoryManager {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  // Store user profile with embedding
  async storeUserProfile(profile: UserProfile): Promise<void> {
    try {
      // Generate embedding for the profile
      const profileText = JSON.stringify(profile);
      const embedding = await generateEmbedding(profileText);
      
      if (memoryOnlyMode) {
        // Store in memory
        memoryStore.userProfiles[this.userId] = profile;
      } else {
        // Store in Supabase
        try {
          await supabaseAdmin
            .from('user_profile')
            .upsert({
              user_id: this.userId,
              profile_data: profile,
              embedding: embedding,
              updated_at: new Date().toISOString()
            });
        } catch (error) {
          console.error('Database error storing user profile, falling back to memory:', error);
          // Fallback to memory mode
          memoryStore.userProfiles[this.userId] = profile;
          setMemoryOnlyMode(true);
        }
      }
    } catch (error) {
      console.error('Error storing user profile in memory manager:', error);
    }
  }
  
  // Get user profile
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      if (memoryOnlyMode) {
        return memoryStore.userProfiles[this.userId] || null;
      }
      
      try {
        const profile = await fetchUserProfile(this.userId) as UserProfile | null;
        return profile;
      } catch (error) {
        console.error('Database error retrieving user profile, falling back to memory:', error);
        // Fallback to memory mode
        setMemoryOnlyMode(true);
        return memoryStore.userProfiles[this.userId] || null;
      }
    } catch (error) {
      console.error('Error retrieving user profile:', error);
      return null;
    }
  }
  
  // Store conversation history with embedding
  async storeConversationHistory(messages: any[]): Promise<void> {
    try {
      // Generate embedding for the messages
      const messagesText = JSON.stringify(messages);
      const embedding = await generateEmbedding(messagesText);
      
      if (memoryOnlyMode) {
        // Store in memory
        memoryStore.conversationHistory[this.userId] = messages;
      } else {
        // Store in Supabase
        try {
          await supabaseAdmin
            .from('conversation_history')
            .upsert({
              user_id: this.userId,
              messages: messages,
              embedding: embedding,
              updated_at: new Date().toISOString()
            });
        } catch (error) {
          console.error('Database error storing conversation history, falling back to memory:', error);
          // Fallback to memory mode
          memoryStore.conversationHistory[this.userId] = messages;
          setMemoryOnlyMode(true);
        }
      }
    } catch (error) {
      console.error('Error storing conversation history:', error);
    }
  }
  
  // Get conversation history
  async getConversationHistory(): Promise<any[]> {
    try {
      if (memoryOnlyMode) {
        return memoryStore.conversationHistory[this.userId] || [];
      }
      
      try {
        return await fetchConversationHistory(this.userId);
      } catch (error) {
        console.error('Database error retrieving conversation history, falling back to memory:', error);
        // Fallback to memory mode
        setMemoryOnlyMode(true);
        return memoryStore.conversationHistory[this.userId] || [];
      }
    } catch (error) {
      console.error('Error retrieving conversation history:', error);
      return [];
    }
  }
  
  // Store city preferences with embedding
  async storeCityPreferences(cities: CityData[]): Promise<void> {
    try {
      // Generate embedding for the cities data
      const citiesText = JSON.stringify(cities);
      const embedding = await generateEmbedding(citiesText);
      
      if (memoryOnlyMode) {
        // Store in memory
        memoryStore.cityPreferences[this.userId] = cities;
      } else {
        // Store in Supabase
        try {
          await supabaseAdmin
            .from('city_preferences')
            .upsert({
              user_id: this.userId,
              city_data: cities,
              embedding: embedding,
              updated_at: new Date().toISOString()
            });
        } catch (error) {
          console.error('Database error storing city preferences, falling back to memory:', error);
          // Fallback to memory mode
          memoryStore.cityPreferences[this.userId] = cities;
          setMemoryOnlyMode(true);
        }
      }
    } catch (error) {
      console.error('Error storing city preferences:', error);
    }
  }
  
  // Get city preferences
  async getCityPreferences(): Promise<CityData[] | null> {
    try {
      if (memoryOnlyMode) {
        return memoryStore.cityPreferences[this.userId] || null;
      }
      
      try {
        const cityNames = await fetchCityPreferences(this.userId) as string[] | null;
        if (!cityNames) return null;
        
        // Convert string[] to CityData[]
        return cityNames.map(name => ({
          name,
          discussed: true,
          interested: true
        }));
      } catch (error) {
        console.error('Database error retrieving city preferences, falling back to memory:', error);
        // Fallback to memory mode
        setMemoryOnlyMode(true);
        return memoryStore.cityPreferences[this.userId] || null;
      }
    } catch (error) {
      console.error('Error retrieving city preferences:', error);
      return null;
    }
  }
  
  // Update memory from conversation
  async updateFromConversation(messages: any[]): Promise<void> {
    try {
      // Extract profile information
      const profileUpdates = extractUserProfile(messages);
      
      // Get existing profile
      let profile = await this.getUserProfile() || {};
      
      // Merge updates with existing profile
      profile = { ...profile, ...profileUpdates };
      
      // Store updated profile
      await this.storeUserProfile(profile as UserProfile);
      
      // Extract and store city preferences
      const cityPreferences = extractCityPreferencesFromMessages(messages);
      if (cityPreferences.length > 0) {
        await this.storeCityPreferences(cityPreferences);
      }
      
      // Store conversation history
      await this.storeConversationHistory(messages);
    } catch (error) {
      console.error('Error updating memory from conversation:', error);
    }
  }
  
  // Semantic search in user profile
  async searchUserProfile(query: string, threshold = 0.7, limit = 5): Promise<any[]> {
    try {
      const embedding = await generateEmbedding(query);
      
      const { data, error } = await supabaseAdmin.rpc(
        'match_user_profiles',
        {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: limit
        }
      );
      
      if (error) throw error;
      return data || [];
      
    } catch (error) {
      console.error('Error searching user profile:', error);
      return [];
    }
  }
  
  // Semantic search in conversation history
  async searchConversationHistory(query: string, threshold = 0.7, limit = 5): Promise<any[]> {
    try {
      const embedding = await generateEmbedding(query);
      
      const { data, error } = await supabaseAdmin.rpc(
        'match_conversation_history',
        {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: limit
        }
      );
      
      if (error) throw error;
      return data || [];
      
    } catch (error) {
      console.error('Error searching conversation history:', error);
      return [];
    }
  }
  
  // Semantic search in city preferences
  async searchCityPreferences(query: string, threshold = 0.7, limit = 5): Promise<any[]> {
    try {
      const embedding = await generateEmbedding(query);
      
      const { data, error } = await supabaseAdmin.rpc(
        'match_city_preferences',
        {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: limit
        }
      );
      
      if (error) throw error;
      return data || [];
      
    } catch (error) {
      console.error('Error searching city preferences:', error);
      return [];
    }
  }
}

/**
 * Memory utility for user preferences and city extraction
 * 
 * This module provides functions to extract and manage user preferences
 * and city information from conversations.
 */

// Define the maximum number of city preferences to keep
const MAX_CITY_PREFERENCES = 5;

// Define the maximum age of city preferences (in milliseconds)
const CITY_PREFERENCES_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Store user profiles
const userProfiles: Record<string, {
  cityPreferences: Array<{
    city: string,
    timestamp: number,
    confidence: number
  }>,
  interests: string[],
  lastUpdated: number
}> = {};

/**
 * Extract city preferences from a text
 */
export function extractCityPreferences(text: string): string[] {
  console.log('🔍 Extracting city preferences from text');
  
  // This is a simple implementation - in a real app, you would use NLP or a more sophisticated approach
  const cityRegex = /(?:in|to|from|at|near|around|interested in|looking at|considering|thinking about)\s+([A-Za-z\s,]+)(?:\s+city|\s+town|\s+area)?/gi;
  
  // Use a more compatible approach for RegExp matching
  const matches: string[] = [];
  let match;
  while ((match = cityRegex.exec(text)) !== null) {
    if (match[1]) {
      matches.push(match[1].trim());
    }
  }
  
  if (matches.length === 0) {
    return [];
  }
  
  // Remove duplicates using a more compatible approach
  const uniqueCities: string[] = [];
  for (const city of matches) {
    if (!uniqueCities.includes(city)) {
      uniqueCities.push(city);
    }
  }
  
  return uniqueCities;
}

/**
 * Add city preferences to a user profile
 */
export function addCityPreferences(userId: string, cities: string[], confidence: number = 0.5): void {
  console.log(`➕ Adding city preferences for user ${userId}:`, cities);
  
  // Initialize user profile if it doesn't exist
  if (!userProfiles[userId]) {
    userProfiles[userId] = {
      cityPreferences: [],
      interests: [],
      lastUpdated: Date.now()
    };
  }
  
  // Add each city to the preferences
  cities.forEach(city => {
    // Check if the city is already in the preferences
    const existingIndex = userProfiles[userId].cityPreferences.findIndex(
      pref => pref.city.toLowerCase() === city.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update the existing preference
      userProfiles[userId].cityPreferences[existingIndex].timestamp = Date.now();
      userProfiles[userId].cityPreferences[existingIndex].confidence = Math.max(
        userProfiles[userId].cityPreferences[existingIndex].confidence,
        confidence
      );
    } else {
      // Add a new preference
      userProfiles[userId].cityPreferences.push({
        city,
        timestamp: Date.now(),
        confidence
      });
    }
  });
  
  // Sort preferences by confidence and timestamp
  userProfiles[userId].cityPreferences.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }
    return b.timestamp - a.timestamp;
  });
  
  // Trim to the maximum number of preferences
  if (userProfiles[userId].cityPreferences.length > MAX_CITY_PREFERENCES) {
    userProfiles[userId].cityPreferences = userProfiles[userId].cityPreferences.slice(0, MAX_CITY_PREFERENCES);
  }
  
  // Update the last updated timestamp
  userProfiles[userId].lastUpdated = Date.now();
}

/**
 * Get city preferences for a user
 */
export function getCityPreferences(userId: string): string[] {
  // Initialize user profile if it doesn't exist
  if (!userProfiles[userId]) {
    return [];
  }
  
  // Clean up old preferences
  const now = Date.now();
  userProfiles[userId].cityPreferences = userProfiles[userId].cityPreferences.filter(
    pref => now - pref.timestamp < CITY_PREFERENCES_MAX_AGE
  );
  
  // Return the city names
  return userProfiles[userId].cityPreferences.map(pref => pref.city);
}

/**
 * Add interests to a user profile
 */
export function addInterests(userId: string, interests: string[]): void {
  console.log(`➕ Adding interests for user ${userId}:`, interests);
  
  // Initialize user profile if it doesn't exist
  if (!userProfiles[userId]) {
    userProfiles[userId] = {
      cityPreferences: [],
      interests: [],
      lastUpdated: Date.now()
    };
  }
  
  // Add each interest to the profile
  interests.forEach(interest => {
    if (!userProfiles[userId].interests.includes(interest)) {
      userProfiles[userId].interests.push(interest);
    }
  });
  
  // Update the last updated timestamp
  userProfiles[userId].lastUpdated = Date.now();
}

/**
 * Get interests for a user
 */
export function getInterests(userId: string): string[] {
  return userProfiles[userId]?.interests || [];
}

/**
 * Get a user profile
 */
export function getUserProfile(userId: string) {
  return userProfiles[userId] || {
    cityPreferences: [],
    interests: [],
    lastUpdated: 0
  };
}

/**
 * Update a user profile
 */
export function updateUserProfile(userId: string, profile: {
  cityPreferences?: Array<{
    city: string,
    timestamp: number,
    confidence: number
  }>,
  interests?: string[],
  lastUpdated?: number
}): void {
  // Initialize user profile if it doesn't exist
  if (!userProfiles[userId]) {
    userProfiles[userId] = {
      cityPreferences: [],
      interests: [],
      lastUpdated: Date.now()
    };
  }
  
  // Update the profile
  if (profile.cityPreferences) {
    userProfiles[userId].cityPreferences = profile.cityPreferences;
  }
  
  if (profile.interests) {
    userProfiles[userId].interests = profile.interests;
  }
  
  if (profile.lastUpdated) {
    userProfiles[userId].lastUpdated = profile.lastUpdated;
  } else {
    userProfiles[userId].lastUpdated = Date.now();
  }
}

/**
 * Delete a user profile
 */
export function deleteUserProfile(userId: string): void {
  delete userProfiles[userId];
}

/**
 * Get all user profiles
 */
export function getAllUserProfiles() {
  return Object.keys(userProfiles).map(userId => ({
    userId,
    cityPreferences: userProfiles[userId].cityPreferences.map(pref => pref.city),
    interests: userProfiles[userId].interests,
    lastUpdated: userProfiles[userId].lastUpdated
  }));
}

/**
 * Clean up old user profiles
 */
export function cleanupOldProfiles(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  Object.keys(userProfiles).forEach(userId => {
    if (now - userProfiles[userId].lastUpdated > maxAge) {
      delete userProfiles[userId];
    }
  });
} 