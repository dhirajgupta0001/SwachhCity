-- Phase 10: Education & Awareness Schema

CREATE TABLE IF NOT EXISTS public.education_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  related_waste_type_id UUID REFERENCES public.waste_types(id),
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false NOT NULL,
  is_featured BOOLEAN DEFAULT false NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.education_content ENABLE ROW LEVEL SECURITY;

-- Policy: Public/Authenticated can read published content
CREATE POLICY "Anyone can view published education content"
  ON public.education_content
  FOR SELECT
  USING (is_published = true);

-- Policy: Admins have full access
CREATE POLICY "Admins have full access to education content"
  ON public.education_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_education_content_slug ON public.education_content(slug);
CREATE INDEX IF NOT EXISTS idx_education_content_category ON public.education_content(category);
CREATE INDEX IF NOT EXISTS idx_education_content_published ON public.education_content(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_education_content_featured ON public.education_content(is_featured) WHERE is_featured = true;

-- Seed Content
INSERT INTO public.education_content (slug, title, summary, content, category, is_published, is_featured, published_at)
VALUES
(
  'how-to-segregate-waste-at-home',
  'How to Segregate Waste at Home',
  'A simple guide to separating your daily household waste into wet, dry, and hazardous categories.',
  'Waste segregation is the first and most important step in recycling. By separating waste at the source, you ensure that recyclable materials do not get contaminated by wet organic waste.

### 1. Two-Bin System
The easiest way to start is the two-bin system:
* **Green Bin (Wet Waste):** Food scraps, vegetable peels, tea bags, fruit waste.
* **Blue Bin (Dry Waste):** Clean paper, plastic bottles, cardboard, metal cans, glass.

### 2. Hazardous and E-Waste
Never mix batteries, broken bulbs, old medicines, or electronics with your regular household bins. Keep a small separate box for these and request a specialized pickup or drop them at designated municipal centers.',
  'Waste Segregation',
  true,
  true,
  now()
),
(
  'wet-waste-vs-dry-waste',
  'Wet Waste vs Dry Waste',
  'Learn exactly what goes into your wet waste bin and what belongs in the dry waste bin.',
  'Understanding the difference between wet and dry waste prevents contamination and helps the municipality process waste effectively.

### Wet Waste (Organic)
Wet waste consists of biodegradable materials.
* Leftover food
* Fruit and vegetable peels
* Coffee grounds and tea leaves
* Garden waste (leaves, small twigs)
* Used paper towels (if food-soiled)

### Dry Waste (Recyclables)
Dry waste consists of materials that do not decay and can often be recycled.
* **Important:** Ensure dry waste is clean! Rinse food containers before discarding.
* Plastic bottles and containers
* Glass bottles
* Clean paper and cardboard
* Metal cans and foil',
  'Waste Segregation',
  true,
  false,
  now()
),
(
  'how-to-handle-e-waste',
  'How to Handle E-Waste',
  'Electronic waste contains harmful chemicals. Learn how to dispose of your old gadgets safely.',
  'Electronic Waste (E-Waste) is one of the fastest-growing waste streams. It contains toxic materials like lead, mercury, and cadmium which can severely pollute soil and water if dumped in regular landfills.

### What is E-Waste?
* Old mobile phones and chargers
* Laptops, computers, and accessories
* Batteries (AA, AAA, Lithium-ion)
* Broken household appliances (toasters, blenders)
* Tangled cables and earphones

### How to Dispose of E-Waste safely:
1. **Never** throw electronics in your regular trash bin.
2. Store small e-waste in a dry cardboard box.
3. Check for local electronic retail stores that accept old gadgets for recycling.
4. **Use our app!** You can submit a dedicated E-Waste pickup request, and our specialized collectors will safely handle it.',
  'E-Waste',
  true,
  true,
  now()
),
(
  'what-can-be-recycled',
  'What Can Be Recycled?',
  'Not all plastics and papers are recyclable. Find out what materials can actually be processed.',
  'Recycling transforms waste into new materials, conserving natural resources and reducing landfill pressure. But "wish-cycling" (throwing non-recyclables into the recycling bin hoping they get recycled) can ruin entire batches of good recyclables.

### Yes, Please Recycle:
* **Paper & Cardboard:** Newspapers, magazines, flattened boxes, mail.
* **Plastics:** Bottles, jugs, and clean tubs (usually PET #1 and HDPE #2).
* **Metal:** Aluminum soda cans, clean tin/steel food cans.
* **Glass:** Clear, brown, and green glass bottles and jars.

### No, Do Not Recycle:
* **Greasy Pizza Boxes:** The oil ruins the paper recycling process.
* **Plastic Bags & Film:** These tangle in sorting machines. Take them to grocery store drop-offs instead.
* **Styrofoam:** Extremely difficult to recycle locally.
* **Broken Glass/Mirrors:** Different melting points than container glass.',
  'Recycling',
  true,
  false,
  now()
),
(
  'simple-ways-to-reduce-household-waste',
  'Simple Ways to Reduce Household Waste',
  'Prevention is better than recycling. Explore easy lifestyle changes to minimize your daily waste.',
  'The best way to manage waste is to produce less of it in the first place. The "Reduce" in Reduce, Reuse, Recycle is the most important step!

### 1. Ditch Single-Use Items
Carry a reusable water bottle, a cloth shopping bag, and a travel coffee mug. These three simple items eliminate hundreds of pieces of trash per person every year.

### 2. Buy in Bulk
Purchase pantry staples like rice, beans, and oats in larger quantities to reduce packaging waste.

### 3. Plan Your Meals
Food waste is a massive environmental issue. Plan your meals for the week, buy only what you need, and creatively use leftovers to ensure food does not end up in the bin.

### 4. Switch to Digital
Opt for paperless billing and digital subscriptions where possible.',
  'Waste Reduction',
  true,
  true,
  now()
),
(
  'composting-basics',
  'Composting Basics',
  'Turn your kitchen scraps into nutrient-rich soil right in your backyard or balcony.',
  'Composting is a natural process of recycling organic matter, such as leaves and food scraps, into a valuable fertilizer that enriches soil and plants.

### What You Need:
* **Greens (Nitrogen-rich):** Vegetable/fruit scraps, coffee grounds, grass clippings.
* **Browns (Carbon-rich):** Dry leaves, twigs, shredded newspaper, cardboard.
* **Moisture & Air:** Water keeps the microbes active, and turning the pile provides necessary oxygen.

### How to Start:
1. Choose a compost bin or designate a spot in your yard.
2. Layer your greens and browns. Aim for roughly equal amounts, ending with a layer of browns on top to prevent odors.
3. Keep the pile moist, like a wrung-out sponge.
4. Turn the pile once a week. 
In a few months, you will have dark, crumbly, earthy-smelling compost ready for your plants!',
  'Composting',
  true,
  false,
  now()
)
ON CONFLICT (slug) DO NOTHING;
