// ─── Users ───────────────────────────────────────────────────────────────────
export interface User {
  id: string
  full_name: string
  email: string
  role: 'user' | 'service_provider' | 'both' | 'admin'
  profile_photo?: string
  bio?: string
  phone?: string
  city?: string
  country?: string
  website?: string
  loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  total_points: number
  created_at: string
}

// ─── Pets ────────────────────────────────────────────────────────────────────
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'reptile' | 'horse' | 'other'

export interface Pet {
  id: string
  name: string
  species: PetSpecies
  breed?: string
  age?: number
  weight?: number
  gender?: 'male' | 'female'
  color?: string
  microchip_number?: string
  vaccination_status?: 'up_to_date' | 'overdue' | 'unknown'
  medical_conditions?: string[]
  image_url?: string
  is_lost: boolean
  last_seen_location?: string
  owner_email: string
  created_at: string
}

// ─── Social ───────────────────────────────────────────────────────────────────
export interface Post {
  id: string
  author_email: string
  author_name: string
  author_photo?: string
  content: string
  image_url?: string
  likes_count: number
  comments_count: number
  tags: string[]
  pet_id?: string
  pet_name?: string
  is_liked?: boolean
  created_at: string
}

// ─── Products & E-Commerce ────────────────────────────────────────────────────
export type ProductCategory = 'food' | 'toys' | 'accessories' | 'health' | 'grooming' | 'training' | 'housing' | 'other'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: ProductCategory
  brand?: string
  image_url?: string
  images?: string[]
  stock: number
  rating: number
  reviews_count: number
  weight?: number
  dimensions?: string
  target_species?: PetSpecies[]
  ingredients?: string
  age_range?: string
  is_featured: boolean
  discount_percentage?: number
  sale_price?: number
  created_at: string
}

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  product_price: number
  product_image?: string
  quantity: number
}

export interface Order {
  id: string
  user_email: string
  user_name: string
  items: OrderItem[]
  total_amount: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  shipping_address: Address
  payment_method: string
  coupon_code?: string
  discount_amount?: number
  notes?: string
  tracking_number?: string
  created_at: string
}

export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  image_url?: string
}

export interface Address {
  full_name: string
  street: string
  city: string
  state?: string
  postal_code: string
  country: string
  phone?: string
}

// ─── Services & Bookings ─────────────────────────────────────────────────────
export type ServiceType =
  | 'veterinary' | 'grooming' | 'training' | 'pet_sitting'
  | 'walking' | 'boarding' | 'photography' | 'pharmacy'
  | 'adoption' | 'shelter' | 'pet_taxi' | 'other'

export interface Service {
  id: string
  provider_name: string
  provider_email: string
  service_type: ServiceType
  description: string
  price: number
  location: string
  city: string
  latitude?: number
  longitude?: number
  contact_phone?: string
  contact_email?: string
  available_days: number[]
  available_hours_start?: string
  available_hours_end?: string
  rating: number
  reviews_count: number
  image_url?: string
  is_verified: boolean
  home_visits: boolean
  emergency_available: boolean
  years_experience?: number
  specializations?: string[]
  certifications?: string[]
  pet_types?: PetSpecies[]
  languages?: string[]
}

export interface Booking {
  id: string
  service_id: string
  provider_email: string
  provider_name: string
  customer_email: string
  customer_name: string
  pet_id?: string
  pet_name?: string
  booking_date: string
  booking_time: string
  duration?: number
  total_price: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  rating?: number
  review?: string
  created_at: string
}

// ─── Telehealth ───────────────────────────────────────────────────────────────
export interface TelehealthConsultation {
  id: string
  provider_email: string
  provider_name: string
  client_email: string
  client_name: string
  pet_id?: string
  pet_name?: string
  scheduled_date: string
  scheduled_time: string
  duration: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  meeting_url?: string
  notes?: string
  diagnosis?: string
  prescription?: string
  follow_up_date?: string
  price: number
}

// ─── Health ───────────────────────────────────────────────────────────────────
export interface HealthRecord {
  id: string
  pet_id: string
  pet_name: string
  owner_email: string
  record_type: 'checkup' | 'vaccination' | 'surgery' | 'medication' | 'allergy' | 'injury' | 'other'
  title: string
  description: string
  date: string
  vet_name?: string
  clinic_name?: string
  cost?: number
  next_appointment?: string
  attachments?: string[]
}

export interface Vaccination {
  id: string
  pet_id: string
  pet_name: string
  owner_email: string
  vaccine_name: string
  vaccine_type: string
  date_administered: string
  next_due_date?: string
  vet_name?: string
  clinic_name?: string
  batch_number?: string
  notes?: string
  is_overdue: boolean
}

export interface WellnessPlan {
  id: string
  pet_id: string
  pet_name: string
  owner_email: string
  plan_name: string
  description: string
  goals: string[]
  dietary_recommendations: string[]
  exercise_plan: string[]
  health_checks: string[]
  created_by_ai: boolean
  ai_notes?: string
  start_date: string
  end_date?: string
  is_active: boolean
}

// ─── Breeds ───────────────────────────────────────────────────────────────────
export interface Breed {
  id: string
  name: string
  name_el?: string
  species: PetSpecies
  fci_number?: string
  fci_group?: string
  description: string
  origin?: string
  size: 'tiny' | 'small' | 'medium' | 'large' | 'giant'
  height_min?: number
  height_max?: number
  weight_min?: number
  weight_max?: number
  lifespan_min?: number
  lifespan_max?: number
  temperament: string[]
  health_issues: string[]
  pros: string[]
  cons: string[]
  grooming_needs: 1 | 2 | 3 | 4 | 5
  exercise_needs: 1 | 2 | 3 | 4 | 5
  trainability: 1 | 2 | 3 | 4 | 5
  good_with_children: boolean
  good_with_pets: boolean
  apartment_friendly: boolean
  price_min?: number
  price_max?: number
  image_url?: string
  popularity: number
}

// ─── Events ───────────────────────────────────────────────────────────────────
export interface Event {
  id: string
  title: string
  description: string
  event_type: 'competition' | 'adoption' | 'training_class' | 'meetup' | 'charity' | 'exhibition' | 'grooming_show' | 'pet_expo' | 'other'
  date: string
  end_date?: string
  time: string
  location: string
  city: string
  country: string
  latitude?: number
  longitude?: number
  image_url?: string
  capacity?: number
  registered_count: number
  price: number
  currency: string
  ticket_types: TicketType[]
  organizer: string
  organizer_email: string
  website?: string
  pet_types?: PetSpecies[]
  is_international: boolean
  is_featured: boolean
}

export interface TicketType {
  name: string
  price: number
  description?: string
  available: number
}

// ─── Tracker ─────────────────────────────────────────────────────────────────
export interface PetLocation {
  id: string
  pet_id: string
  pet_name: string
  owner_email: string
  latitude: number
  longitude: number
  accuracy?: number
  status: 'safe' | 'lost' | 'found'
  last_seen?: string
  notes?: string
  image_url?: string
  is_resolved: boolean
  created_at: string
}

export interface SafeZone {
  id: string
  pet_id: string
  owner_email: string
  zone_name: string
  latitude: number
  longitude: number
  radius: number
  is_active: boolean
  notifications_enabled: boolean
}

// ─── Loyalty ─────────────────────────────────────────────────────────────────
export interface LoyaltyPoints {
  user_email: string
  total_points: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  lifetime_points: number
}

export interface Achievement {
  id: string
  code: string
  name: string
  name_el: string
  description: string
  icon: string
  category: 'pets' | 'social' | 'shopping' | 'engagement' | 'health' | 'events'
  points: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  is_unlocked?: boolean
  unlocked_date?: string
}

// ─── Forum ────────────────────────────────────────────────────────────────────
export interface ForumTopic {
  id: string
  author_email: string
  author_name: string
  title: string
  content: string
  category: string
  tags: string[]
  views_count: number
  replies_count: number
  is_pinned: boolean
  is_solved: boolean
  last_reply_date?: string
  created_at: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── API ──────────────────────────────────────────────────────────────────────
export interface ApiError {
  message: string
  statusCode: number
  errors?: Record<string, string[]>
}
