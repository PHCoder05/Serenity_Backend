import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseClient: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'Supabase URL or Key is missing from environment variables.',
      );
    } else {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
      this.logger.log('Supabase client initialized.');
    }
  }

  getClient(): SupabaseClient {
    if (!this.supabaseClient) {
      throw new Error(
        'Supabase client is not initialized due to missing environment variables.',
      );
    }
    return this.supabaseClient;
  }
}
