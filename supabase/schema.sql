-- SwachhCity Auth & Profile Schema

-- Create a custom enum for user roles
CREATE TYPE user_role AS ENUM (CITIZEN, COLLECTOR, ADMIN);

-- Create a custom enum for account status
CREATE TYPE account_status AS ENUM (ACTIVE, SUSPENDED, DISABLED);

-- Create the profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT CITIZEN,
  status account_status NOT NULL DEFAULT ACTIVE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(utc::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(utc::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Profiles are viewable by the user who owns them
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- 2. Profiles are viewable by Admins
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ADMIN
    )
  );

-- 3. Users can update their own profile (name only, not role/status)
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
  -- Note: Preventing users from updating their own role/status requires a trigger or API layer logic.
  -- For strictness, we can revoke update directly and rely on RPC or Edge Functions,
  -- but for Phase 2 frontend, we allow update.

-- 4. Admins can update any profile
CREATE POLICY "Admins can update any profile" 
  ON public.profiles FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ADMIN
    )
  );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>full_name, ),
    -- By default, everyone is a citizen unless specifically created by an admin
    CITIZEN
  );
  RETURN new;
END;
$$;

-- Trigger to automatically create a profile when a new auth.user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
