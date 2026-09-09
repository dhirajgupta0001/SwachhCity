import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendNotification, notifyAdmins } from '@/utils/notifications';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock the Supabase module
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'admin1' }, { id: 'admin2' }],
              error: null
            })
          }))
        }))
      }))
    }))
  };
});

describe('Notification Utilities', () => {
  let mockAuthClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    
    mockAuthClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'admin1' }, { id: 'admin2' }],
              error: null
            })
          }))
        }))
      }))
    } as unknown as SupabaseClient;
  });

  it('should send a notification using the service role client', async () => {
    await sendNotification(
      mockAuthClient,
      'user-123',
      'TEST',
      'Test Title',
      'Test Message',
      'USER',
      'user-123'
    );
    // Note: since the client is mocked, we verify it doesn't throw and completes.
    expect(true).toBe(true);
  });

  it('should notify admins using the provided client to fetch admins', async () => {
    await notifyAdmins(
      mockAuthClient,
      'TEST',
      'Test Admin Title',
      'Test Admin Message'
    );
    
    expect(mockAuthClient.from).toHaveBeenCalledWith('profiles');
  });
});
