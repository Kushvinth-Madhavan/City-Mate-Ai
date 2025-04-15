import { createClient } from '@supabase/supabase-js';
import { setMemoryOnlyMode } from './memory';

// Supabase configuration
// These values should be set in your .env file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a conditionally initialized client
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Function to ensure that tables exist and are accessible
export async function ensureVectorStoreExists() {
  if (!supabaseAdmin) {
    console.error("Supabase client not initialized");
    setMemoryOnlyMode(true);
    return false;
  }
  
  try {
    console.log("Verifying and creating necessary tables if missing...");
    
    // Check if tables exist, create if they don't
    const tablesStatus = await createMemoryTablesManually();
    
    if (!tablesStatus) {
      console.warn("Could not verify or create all necessary tables. Switching to memory-only mode.");
      setMemoryOnlyMode(true);
      return false;
    }
    
    console.log("Memory tables verification complete.");
    return true;
  } catch (error) {
    console.error("Error ensuring vector store exists:", error);
    setMemoryOnlyMode(true);
    return false;
  }
}

// Direct table creation approach without needing SQL privileges
async function createMemoryTablesManually() {
  try {
    // Create the user_profile table by inserting a system record
    const userProfileSuccess = await mockCreateTable("user_profile", {
      user_id: "system_init",
      profile_data: { system: true, timestamp: new Date().toISOString() },
    });
    
    // Create the conversation_history table by inserting a system record
    const conversationHistorySuccess = await mockCreateTable("conversation_history", {
      user_id: "system_init",
      messages: [{ role: "system", content: "Initialization message", timestamp: new Date().toISOString() }],
    });
    
    // Create the city_preferences table by inserting a system record
    const cityPreferencesSuccess = await mockCreateTable("city_preferences", {
      user_id: "system_init",
      city_data: { system: true, timestamp: new Date().toISOString() },
    });
    
    const allTablesCreated = userProfileSuccess && conversationHistorySuccess && cityPreferencesSuccess;
    
    if (!allTablesCreated) {
      console.warn("Not all tables could be created or verified");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error creating memory tables manually:", error);
    return false;
  }
}

// Helper function to "mock" table creation when we can't use SQL
async function mockCreateTable(tableName: string, initialData: any) {
  if (!supabaseAdmin) {
    console.error(`Cannot create table ${tableName}: Supabase client not initialized`);
    return false;
  }
  
  try {
    console.log(`Attempting to create/verify table: ${tableName}`);
    
    // Insert a dummy record to force table creation with Supabase's auto-provisioning
    const { error } = await supabaseAdmin.from(tableName).upsert(initialData);
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist error
        console.warn(`Table ${tableName} doesn't exist. This usually means you need to create it manually in Supabase.`);
        console.info(`Required structure for ${tableName}:
          - user_id: TEXT (primary key)
          - ${tableName === 'user_profile' ? 'profile_data' : tableName === 'conversation_history' ? 'messages' : 'city_data'}: JSONB
          - embedding: VECTOR(1536) (optional)
          - updated_at: TIMESTAMP WITH TIME ZONE`);
      } else if (error.code === '23505') { // Unique violation (already exists)
        console.log(`Table ${tableName} already has system_init record (table exists)`);
        return true;
      } else if (error.code === '42501') { // Permission denied
        console.error(`Permission denied on table ${tableName}. Check your Supabase RLS policies.`);
      } else {
        console.error(`Error creating ${tableName} table:`, error);
      }
      return false;
    } else {
      console.log(`Successfully created or verified table: ${tableName}`);
      return true;
    }
  } catch (error) {
    console.error(`Unexpected error in mockCreateTable for ${tableName}:`, error);
    return false;
  }
}

// Check if the table exists in Supabase
export async function tableExists(tableName: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error(`Cannot check if table ${tableName} exists: Supabase client not initialized`);
    return false;
  }
  
  try {
    // Try to query the table with a LIMIT 1 to see if it exists
    const { error } = await supabaseAdmin
      .from(tableName)
      .select('count')
      .limit(1);
      
    // If no error, the table exists
    return !error;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Get user profile
export async function getUserProfile(userId: string) {
  if (!supabaseAdmin) {
    console.error('Cannot get user profile: Supabase client not initialized');
    return null;
  }
  
  try {
    // Check if table exists
    const exists = await tableExists('user_profile');
    if (!exists) {
      console.warn('Table user_profile does not exist');
      return null;
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_profile')
      .select('profile_data')
      .eq('user_id', userId);
      
    // If we get PGRST116 error or no data, it means the user doesn't have a profile yet
    if (error && error.code === 'PGRST116') {
      // This is expected for new users, not a real error
      console.log(`No profile exists yet for user ${userId}, returning empty profile`);
      return null;
    } else if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    // Return the first item if data exists, otherwise null
    return data && data.length > 0 ? data[0].profile_data : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Store user profile
export async function storeUserProfile(userId: string, profileData: any) {
  if (!supabaseAdmin) {
    console.error('Cannot store user profile: Supabase client not initialized');
    return false;
  }
  
  try {
    // Check if table exists
    const exists = await tableExists('user_profile');
    if (!exists) {
      console.warn('Table user_profile does not exist');
      return null;
    }
    
    const { error } = await supabaseAdmin
      .from('user_profile')
      .upsert({
        user_id: userId,
        profile_data: profileData,
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error storing user profile:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error storing user profile:', error);
    return false;
  }
}

// Get conversation history
export async function getConversationHistory(userId: string) {
  if (!supabaseAdmin) {
    console.error('Cannot get conversation history: Supabase client not initialized');
    return [];
  }
  
  try {
    // Check if table exists
    const exists = await tableExists('conversation_history');
    if (!exists) {
      console.warn('Table conversation_history does not exist');
      return [];
    }
    
    const { data, error } = await supabaseAdmin
      .from('conversation_history')
      .select('messages')
      .eq('user_id', userId);
      
    // If we get PGRST116 error or no data, it means the user doesn't have conversation history yet
    if (error && error.code === 'PGRST116') {
      // This is expected for new users, not a real error
      console.log(`No conversation history exists yet for user ${userId}, returning empty history`);
      return [];
    } else if (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
    
    // Return the first item if data exists, otherwise empty array
    return data && data.length > 0 ? data[0].messages : [];
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
}

// Store conversation history
export async function storeConversationHistory(userId: string, messages: any[]) {
  if (!supabaseAdmin) {
    console.error('Cannot store conversation history: Supabase client not initialized');
    return false;
  }
  
  try {
    // Check if table exists
    const exists = await tableExists('conversation_history');
    if (!exists) {
      console.warn('Table conversation_history does not exist');
      return false;
    }
    
    const { error } = await supabaseAdmin
      .from('conversation_history')
      .upsert({
        user_id: userId,
        messages: messages,
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error storing conversation history:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error storing conversation history:', error);
    return false;
  }
}

// Get city preferences
export async function getCityPreferences(userId: string) {
  if (!supabaseAdmin) {
    console.error('Cannot get city preferences: Supabase client not initialized');
    return null;
  }
  
  try {
    // Check if table exists
    const exists = await tableExists('city_preferences');
    if (!exists) {
      console.warn('Table city_preferences does not exist');
      return null;
    }
    
    const { data, error } = await supabaseAdmin
      .from('city_preferences')
      .select('city_data')
      .eq('user_id', userId);
      
    // If we get PGRST116 error or no data, it means the user doesn't have preferences yet
    if (error && error.code === 'PGRST116') {
      // This is expected for new users, not a real error
      console.log(`No city preferences exist yet for user ${userId}, returning empty preferences`);
      return null;
    } else if (error) {
      console.error('Error fetching city preferences:', error);
      return null;
    }
    
    // Return the first item if data exists, otherwise null
    return data && data.length > 0 ? data[0].city_data : null;
  } catch (error) {
    console.error('Error fetching city preferences:', error);
    return null;
  }
}

// Store city preferences
export async function storeCityPreferences(userId: string, cityData: any[]) {
  if (!supabaseAdmin) {
    console.error('Cannot store city preferences: Supabase client not initialized');
    return false;
  }
  
  try {
    // Check if table exists
    const exists = await tableExists('city_preferences');
    if (!exists) {
      console.warn('Table city_preferences does not exist');
      return false;
    }
    
    const { error } = await supabaseAdmin
      .from('city_preferences')
      .upsert({
        user_id: userId,
        city_data: cityData,
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error storing city preferences:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error storing city preferences:', error);
    return false;
  }
} 