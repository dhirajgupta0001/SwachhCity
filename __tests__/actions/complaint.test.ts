import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitComplaint } from '@/app/actions/complaint';

// Mock Next.js cache and modules
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

vi.mock('@/utils/notifications', () => ({
  sendNotification: vi.fn(),
  notifyAdmins: vi.fn()
}));

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: { id: 'complaint-1', citizen_id: 'user-1' },
      error: null
    })
  })
});

vi.mock('@/utils/supabase/server', () => {
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } }
        })
      },
      from: vi.fn((table) => {
        if (table === 'complaints') {
          return { insert: mockInsert };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        };
      })
    }))
  };
});

describe('Complaint Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submitComplaint should create a complaint and force NEW status', async () => {
    const formData = new FormData();
    formData.append('categoryId', 'cat-1');
    formData.append('description', 'Test desc');
    formData.append('address', '123 Main St');

    await submitComplaint(formData);

    // Verify insert was called with the enforced fields
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      citizen_id: 'user-1',
      category_id: 'cat-1',
      description: 'Test desc',
      address: '123 Main St',
      priority: 'MEDIUM',
      status: 'NEW' // Enforced
    }));
  });

  it('submitComplaint should throw if required fields are missing', async () => {
    const formData = new FormData();
    formData.append('categoryId', 'cat-1');
    // Missing description and address

    await expect(submitComplaint(formData)).rejects.toThrow('Missing required fields');
  });
});
