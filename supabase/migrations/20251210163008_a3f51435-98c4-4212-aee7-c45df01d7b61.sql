-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('general', 'ngo');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'general',
  username TEXT UNIQUE,
  organization_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  bio TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create NGO activities table (social feed for NGOs)
CREATE TABLE public.ngo_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create category enum
CREATE TYPE public.listing_category AS ENUM ('clothes', 'food', 'electronics', 'furniture', 'books', 'toys', 'medical', 'other');

-- Create listing status enum
CREATE TYPE public.listing_status AS ENUM ('active', 'pending_pickup', 'collected');

-- Create donation listings table (Items offered by General Users)
CREATE TABLE public.donation_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category listing_category DEFAULT 'other',
  status listing_status DEFAULT 'active',
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  preferred_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create NGO requests table (Items needed by NGOs)
CREATE TABLE public.ngo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  quantity_pledged INTEGER DEFAULT 0,
  is_urgent BOOLEAN DEFAULT false,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  category listing_category DEFAULT 'other',
  status listing_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pledges table (User contributions to NGO requests)
CREATE TABLE public.pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.ngo_requests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create messages table (In-app Chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID,
  request_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngo_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- NGO Activities policies
CREATE POLICY "NGO activities are viewable by everyone" ON public.ngo_activities
  FOR SELECT USING (true);

CREATE POLICY "NGOs can insert own activities" ON public.ngo_activities
  FOR INSERT WITH CHECK (auth.uid() = ngo_id);

CREATE POLICY "NGOs can update own activities" ON public.ngo_activities
  FOR UPDATE USING (auth.uid() = ngo_id);

CREATE POLICY "NGOs can delete own activities" ON public.ngo_activities
  FOR DELETE USING (auth.uid() = ngo_id);

-- Donation listings policies
CREATE POLICY "Donation listings are viewable by everyone" ON public.donation_listings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own listings" ON public.donation_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings" ON public.donation_listings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings" ON public.donation_listings
  FOR DELETE USING (auth.uid() = user_id);

-- NGO requests policies
CREATE POLICY "NGO requests are viewable by everyone" ON public.ngo_requests
  FOR SELECT USING (true);

CREATE POLICY "NGOs can insert own requests" ON public.ngo_requests
  FOR INSERT WITH CHECK (auth.uid() = ngo_id);

CREATE POLICY "NGOs can update own requests" ON public.ngo_requests
  FOR UPDATE USING (auth.uid() = ngo_id);

CREATE POLICY "NGOs can delete own requests" ON public.ngo_requests
  FOR DELETE USING (auth.uid() = ngo_id);

-- Pledges policies
CREATE POLICY "Pledges are viewable by involved parties" ON public.pledges
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT ngo_id FROM public.ngo_requests WHERE id = request_id)
  );

CREATE POLICY "Users can insert own pledges" ON public.pledges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for messages, pledges, and ngo_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pledges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ngo_requests;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, username, organization_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'general'),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'organization_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update quantity_pledged when a pledge is made
CREATE OR REPLACE FUNCTION public.update_pledged_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.ngo_requests
  SET quantity_pledged = quantity_pledged + NEW.amount
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;

-- Trigger for pledge updates
CREATE TRIGGER on_pledge_created
  AFTER INSERT ON public.pledges
  FOR EACH ROW EXECUTE FUNCTION public.update_pledged_quantity();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add timestamp triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_donation_listings_updated_at
  BEFORE UPDATE ON public.donation_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ngo_requests_updated_at
  BEFORE UPDATE ON public.ngo_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();