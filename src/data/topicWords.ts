// Topic collections — themed word sets offered alongside the CEFR levels on
// the Collections page. Words only: each word's difficulty comes from its CEFR
// level when it has one (see `getCollections` in src/lib/collections.ts), and
// definitions are generated on demand like any other word.
//
// The ids are stored as a user's active collection, so renaming one strands
// anyone studying it (they fall back to the default collection).

export interface TopicCollection {
  id: string;
  name: string;
  description: string;
  /** Iconify name, shown on the Collections page. Cover colours live in
   *  src/lib/topicTheme.ts, keyed by id. */
  icon: string;
  words: string[];
}

export const TOPIC_COLLECTIONS: TopicCollection[] = [
  {
    id: 'topic-food',
    name: 'Food & Drink',
    description: 'Meals, tastes, and eating out',
    icon: 'lucide:utensils',
    words: [
      'breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'meal', 'menu', 'waiter', 'bill', 'tip',
      'bread', 'rice', 'noodle', 'soup', 'salad', 'sandwich', 'cheese', 'butter', 'egg', 'meat',
      'chicken', 'beef', 'pork', 'seafood', 'vegetable', 'fruit', 'juice', 'coffee', 'tea', 'milk',
      'sugar', 'salt', 'pepper', 'spicy', 'sweet', 'sour', 'bitter', 'salty', 'delicious', 'tasty',
      'hungry', 'thirsty', 'appetite', 'portion', 'flavor', 'vegetarian', 'organic', 'nutritious', 'beverage', 'cuisine',
    ],
  },
  {
    id: 'topic-cooking',
    name: 'Cooking & Kitchen',
    description: 'Recipes, tools, and ways to cook',
    icon: 'lucide:chef-hat',
    words: [
      'cook', 'bake', 'boil', 'fry', 'grill', 'roast', 'steam', 'stir', 'chop', 'slice',
      'peel', 'mix', 'pour', 'taste', 'recipe', 'ingredient', 'kitchen', 'oven', 'stove', 'pan',
      'pot', 'knife', 'spoon', 'fork', 'plate', 'bowl', 'cup', 'fridge', 'freezer', 'microwave',
      'cupboard', 'sink', 'tray', 'lid', 'flour', 'oil', 'garlic', 'onion', 'herb', 'spice',
      'raw', 'fresh', 'frozen', 'leftover', 'burnt', 'crispy', 'tender', 'sauce', 'dough', 'season',
    ],
  },
  {
    id: 'topic-home',
    name: 'Home & Furniture',
    description: 'Rooms, furniture, and housework',
    icon: 'lucide:house',
    words: [
      'house', 'apartment', 'flat', 'room', 'bedroom', 'bathroom', 'hallway', 'garden', 'garage', 'balcony',
      'stairs', 'roof', 'wall', 'floor', 'ceiling', 'window', 'door', 'key', 'table', 'chair',
      'sofa', 'bed', 'desk', 'shelf', 'wardrobe', 'drawer', 'mirror', 'lamp', 'curtain', 'carpet',
      'pillow', 'blanket', 'towel', 'clean', 'tidy', 'messy', 'sweep', 'vacuum', 'laundry', 'iron',
      'rent', 'landlord', 'neighbor', 'cozy', 'spacious', 'furnished', 'repair', 'decorate', 'household', 'chore',
    ],
  },
  {
    id: 'topic-family',
    name: 'Family & Relationships',
    description: 'Relatives, friends, and life events',
    icon: 'lucide:heart',
    words: [
      'family', 'parent', 'mother', 'father', 'brother', 'sister', 'son', 'daughter', 'grandmother', 'grandfather',
      'aunt', 'uncle', 'cousin', 'nephew', 'niece', 'husband', 'wife', 'partner', 'child', 'baby',
      'twin', 'relative', 'sibling', 'friend', 'neighbor', 'stranger', 'couple', 'marry', 'wedding', 'divorce',
      'engaged', 'single', 'date', 'relationship', 'friendship', 'love', 'trust', 'support', 'argue', 'apologize',
      'forgive', 'raise', 'adopt', 'generation', 'ancestor', 'household', 'upbringing', 'bond', 'loyal', 'respect',
    ],
  },
  {
    id: 'topic-health',
    name: 'Body & Health',
    description: 'The body, illness, and staying well',
    icon: 'lucide:heart-pulse',
    words: [
      'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'tooth', 'neck', 'shoulder', 'arm',
      'hand', 'finger', 'back', 'stomach', 'leg', 'knee', 'foot', 'heart', 'brain', 'skin',
      'healthy', 'ill', 'sick', 'pain', 'headache', 'fever', 'cough', 'cold', 'flu', 'injury',
      'doctor', 'nurse', 'hospital', 'medicine', 'pharmacy', 'appointment', 'prescription', 'symptom', 'treatment', 'recover',
      'exercise', 'diet', 'sleep', 'tired', 'stress', 'allergy', 'bruise', 'sprain', 'wellbeing', 'immune',
    ],
  },
  {
    id: 'topic-clothes',
    name: 'Clothes & Fashion',
    description: 'What we wear and how it looks',
    icon: 'lucide:shirt',
    words: [
      'clothes', 'shirt', 'trousers', 'jeans', 'dress', 'skirt', 'jacket', 'coat', 'sweater', 'hoodie',
      'shorts', 'suit', 'tie', 'uniform', 'pajamas', 'sock', 'shoe', 'boot', 'sandal', 'trainer',
      'hat', 'cap', 'scarf', 'glove', 'belt', 'bag', 'wallet', 'watch', 'jewelry', 'ring',
      'necklace', 'earring', 'glasses', 'pocket', 'button', 'zip', 'collar', 'sleeve', 'size', 'fit',
      'loose', 'tight', 'casual', 'formal', 'smart', 'fashionable', 'trendy', 'outfit', 'cotton', 'wool',
    ],
  },
  {
    id: 'topic-travel',
    name: 'Travel & Holidays',
    description: 'Trips, hotels, and sightseeing',
    icon: 'lucide:plane',
    words: [
      'travel', 'trip', 'journey', 'holiday', 'vacation', 'tourist', 'passport', 'visa', 'ticket', 'luggage',
      'suitcase', 'backpack', 'airport', 'flight', 'departure', 'arrival', 'delay', 'hotel', 'hostel', 'reception',
      'reservation', 'booking', 'guide', 'map', 'souvenir', 'sightseeing', 'beach', 'island', 'mountain', 'resort',
      'abroad', 'foreign', 'currency', 'exchange', 'customs', 'border', 'destination', 'itinerary', 'explore', 'adventure',
      'pack', 'unpack', 'boarding', 'terminal', 'campsite', 'accommodation', 'scenery', 'landmark', 'excursion', 'backpacker',
    ],
  },
  {
    id: 'topic-transport',
    name: 'Transport & Directions',
    description: 'Getting around and finding the way',
    icon: 'lucide:bus',
    words: [
      'car', 'bus', 'train', 'taxi', 'bike', 'bicycle', 'motorbike', 'plane', 'boat', 'ship',
      'ferry', 'subway', 'tram', 'truck', 'van', 'station', 'stop', 'platform', 'timetable', 'fare',
      'passenger', 'driver', 'pilot', 'road', 'street', 'highway', 'bridge', 'tunnel', 'traffic', 'crossing',
      'corner', 'turn', 'left', 'right', 'straight', 'opposite', 'between', 'behind', 'near', 'far',
      'park', 'parking', 'petrol', 'commute', 'route', 'lane', 'congestion', 'pedestrian', 'roundabout', 'junction',
    ],
  },
  {
    id: 'topic-nature',
    name: 'Nature & Environment',
    description: 'Landscapes, plants, and the planet',
    icon: 'lucide:leaf',
    words: [
      'nature', 'tree', 'flower', 'plant', 'grass', 'leaf', 'forest', 'jungle', 'river', 'lake',
      'sea', 'ocean', 'wave', 'coast', 'hill', 'valley', 'desert', 'field', 'rock', 'sand',
      'soil', 'earth', 'sky', 'star', 'moon', 'planet', 'environment', 'pollution', 'plastic', 'waste',
      'recycle', 'reuse', 'energy', 'solar', 'climate', 'wildlife', 'species', 'protect', 'conservation', 'habitat',
      'endangered', 'extinct', 'drought', 'flood', 'earthquake', 'volcano', 'sustainable', 'emission', 'deforestation', 'ecosystem',
    ],
  },
  {
    id: 'topic-weather',
    name: 'Weather & Seasons',
    description: 'Forecasts, temperature, and the year',
    icon: 'lucide:cloud-sun',
    words: [
      'weather', 'sun', 'sunny', 'rain', 'rainy', 'cloud', 'cloudy', 'wind', 'windy', 'snow',
      'snowy', 'fog', 'foggy', 'storm', 'thunder', 'lightning', 'hail', 'ice', 'frost', 'rainbow',
      'hot', 'warm', 'cool', 'cold', 'freezing', 'humid', 'dry', 'wet', 'mild', 'temperature',
      'degree', 'forecast', 'season', 'spring', 'summer', 'autumn', 'winter', 'heatwave', 'shower', 'breeze',
      'drizzle', 'pour', 'chilly', 'scorching', 'gloomy', 'umbrella', 'raincoat', 'climate', 'tropical', 'monsoon',
    ],
  },
  {
    id: 'topic-animals',
    name: 'Animals',
    description: 'Pets, farm animals, and wildlife',
    icon: 'lucide:paw-print',
    words: [
      'animal', 'pet', 'dog', 'cat', 'puppy', 'kitten', 'rabbit', 'hamster', 'fish', 'bird',
      'parrot', 'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken', 'duck', 'mouse', 'rat',
      'lion', 'tiger', 'elephant', 'monkey', 'bear', 'wolf', 'fox', 'deer', 'giraffe', 'zebra',
      'snake', 'frog', 'turtle', 'crocodile', 'whale', 'dolphin', 'shark', 'insect', 'bee', 'butterfly',
      'spider', 'ant', 'mosquito', 'feather', 'fur', 'tail', 'wing', 'claw', 'nest', 'zoo',
    ],
  },
  {
    id: 'topic-sports',
    name: 'Sports & Fitness',
    description: 'Games, training, and competition',
    icon: 'lucide:trophy',
    words: [
      'sport', 'football', 'basketball', 'tennis', 'badminton', 'volleyball', 'swimming', 'running', 'cycling', 'yoga',
      'gym', 'team', 'player', 'coach', 'referee', 'fan', 'match', 'game', 'score', 'goal',
      'win', 'lose', 'draw', 'champion', 'competition', 'tournament', 'race', 'medal', 'trophy', 'stadium',
      'court', 'pitch', 'ball', 'racket', 'net', 'train', 'practice', 'league', 'stretch', 'muscle',
      'fit', 'strength', 'stamina', 'athlete', 'opponent', 'defeat', 'victory', 'workout', 'marathon', 'sweat',
    ],
  },
  {
    id: 'topic-shopping',
    name: 'Shopping & Money',
    description: 'Buying, paying, and saving',
    icon: 'lucide:shopping-bag',
    words: [
      'shop', 'store', 'market', 'supermarket', 'mall', 'customer', 'cashier', 'price', 'cost', 'cheap',
      'expensive', 'sale', 'discount', 'bargain', 'receipt', 'refund', 'return', 'exchange', 'queue', 'basket',
      'trolley', 'money', 'cash', 'card', 'coin', 'change', 'pay', 'buy', 'sell', 'spend',
      'save', 'afford', 'budget', 'bank', 'account', 'loan', 'debt', 'income', 'tax', 'wallet',
      'purchase', 'deliver', 'delivery', 'order', 'brand', 'quality', 'worth', 'overpriced', 'splurge', 'consumer',
    ],
  },
  {
    id: 'topic-feelings',
    name: 'Feelings & Emotions',
    description: 'Moods and how we feel',
    icon: 'lucide:smile-plus',
    words: [
      'happy', 'sad', 'angry', 'afraid', 'scared', 'excited', 'bored', 'tired', 'worried', 'nervous',
      'calm', 'relaxed', 'proud', 'ashamed', 'embarrassed', 'jealous', 'lonely', 'grateful', 'hopeful', 'confused',
      'surprised', 'shocked', 'disappointed', 'frustrated', 'annoyed', 'upset', 'cheerful', 'delighted', 'miserable', 'anxious',
      'curious', 'confident', 'shy', 'guilty', 'relieved', 'satisfied', 'stressed', 'thrilled', 'homesick', 'nostalgic',
      'emotion', 'feeling', 'mood', 'tears', 'smile', 'laugh', 'cry', 'sigh', 'overwhelmed', 'content',
    ],
  },
  {
    id: 'topic-personality',
    name: 'Personality & Character',
    description: 'Describing people and what they are like',
    icon: 'lucide:user-round',
    words: [
      'kind', 'friendly', 'polite', 'rude', 'funny', 'serious', 'honest', 'generous', 'selfish', 'patient',
      'lazy', 'hardworking', 'clever', 'smart', 'brave', 'shy', 'outgoing', 'quiet', 'talkative', 'calm',
      'confident', 'modest', 'arrogant', 'reliable', 'responsible', 'creative', 'curious', 'stubborn', 'sensitive', 'cheerful',
      'optimistic', 'pessimistic', 'ambitious', 'easygoing', 'thoughtful', 'considerate', 'mature', 'immature', 'sociable', 'introverted',
      'extroverted', 'loyal', 'humble', 'cautious', 'impulsive', 'charming', 'witty', 'determined', 'independent', 'trustworthy',
    ],
  },
  {
    id: 'topic-school',
    name: 'School & Learning',
    description: 'Classes, study, and exams',
    icon: 'lucide:graduation-cap',
    words: [
      'school', 'class', 'classroom', 'lesson', 'teacher', 'student', 'pupil', 'subject', 'math', 'science',
      'history', 'geography', 'art', 'music', 'language', 'homework', 'exam', 'test', 'quiz', 'grade',
      'mark', 'pass', 'fail', 'study', 'learn', 'revise', 'memorize', 'practice', 'notebook', 'textbook',
      'dictionary', 'library', 'timetable', 'term', 'semester', 'university', 'college', 'degree', 'graduate', 'course',
      'lecture', 'essay', 'assignment', 'deadline', 'scholarship', 'tutor', 'knowledge', 'skill', 'curriculum', 'qualification',
    ],
  },
  {
    id: 'topic-city',
    name: 'City & Places',
    description: 'Buildings and places around town',
    icon: 'lucide:building-2',
    words: [
      'city', 'town', 'village', 'capital', 'center', 'suburb', 'neighborhood', 'street', 'square', 'park',
      'museum', 'gallery', 'library', 'cinema', 'theater', 'restaurant', 'cafe', 'bakery', 'pharmacy', 'bank',
      'bookshop', 'hospital', 'school', 'church', 'temple', 'market', 'hotel', 'station', 'airport', 'stadium',
      'factory', 'tower', 'castle', 'palace', 'monument', 'statue', 'fountain', 'building', 'skyscraper', 'block',
      'crowded', 'busy', 'noisy', 'quiet', 'modern', 'historic', 'urban', 'rural', 'resident', 'population',
    ],
  },
  {
    id: 'topic-entertainment',
    name: 'Movies, Music & Books',
    description: 'Stories, songs, and shows',
    icon: 'lucide:clapperboard',
    words: [
      'movie', 'film', 'cinema', 'actor', 'actress', 'director', 'scene', 'plot', 'character', 'hero',
      'villain', 'comedy', 'drama', 'horror', 'thriller', 'romance', 'documentary', 'cartoon', 'series', 'episode',
      'music', 'song', 'singer', 'band', 'concert', 'album', 'lyrics', 'melody', 'rhythm', 'guitar',
      'piano', 'drum', 'violin', 'book', 'novel', 'author', 'poem', 'poetry', 'chapter', 'story',
      'fiction', 'biography', 'audience', 'review', 'subtitle', 'sequel', 'ending', 'genre', 'masterpiece', 'bestseller',
    ],
  },
  {
    id: 'topic-routine',
    name: 'Daily Routine & Time',
    description: 'Everyday habits and telling time',
    icon: 'lucide:clock',
    words: [
      'morning', 'afternoon', 'evening', 'night', 'midnight', 'noon', 'today', 'tomorrow', 'yesterday', 'weekend',
      'weekday', 'hour', 'minute', 'second', 'clock', 'alarm', 'early', 'late', 'wake', 'shower',
      'brush', 'dress', 'commute', 'nap', 'rest', 'relax', 'routine', 'habit', 'schedule', 'calendar',
      'always', 'usually', 'often', 'sometimes', 'rarely', 'never', 'daily', 'weekly', 'monthly', 'annual',
      'busy', 'free', 'spare', 'appointment', 'deadline', 'punctual', 'oversleep', 'errand', 'chore', 'leisure',
    ],
  },
  {
    id: 'topic-celebrations',
    name: 'Celebrations & Events',
    description: 'Parties, holidays, and special days',
    icon: 'lucide:party-popper',
    words: [
      'party', 'birthday', 'wedding', 'anniversary', 'festival', 'holiday', 'celebrate', 'celebration', 'ceremony', 'tradition',
      'custom', 'gift', 'present', 'card', 'cake', 'candle', 'balloon', 'decoration', 'fireworks', 'parade',
      'invite', 'invitation', 'guest', 'host', 'toast', 'cheers', 'congratulations', 'wish', 'feast', 'dance',
      'costume', 'mask', 'lantern', 'reunion', 'graduation', 'farewell', 'surprise', 'occasion', 'event', 'gathering',
      'annual', 'cultural', 'religious', 'national', 'memorable', 'festive', 'banquet', 'honor', 'commemorate', 'jubilant',
    ],
  },
];
