// Videos to start video shadowing with, before a learner has a link of their
// own. Only ids and titles: the captions come from the `captions` function
// like any pasted link's — fetched once, then kept, so after the first open a
// sample loads at once.
//
// Picked for clear English and official uploads (which tend to carry real
// captions, not speech recognition's). Each id was checked against YouTube's
// oEmbed — it exists and may be embedded. `level` is how hard it is to keep up:
// slow and clear, everyday pace, or fast (rap, patter, a strong accent).
// Kids' songs are from the children's channels' own uploads (Super Simple
// Songs, Pinkfong, CoComelon, The Singing Walrus, ChuChu TV): slow, repeated, and sung
// clearly enough for karaoke from a first lesson.

export type SampleLevel = 'easy' | 'medium' | 'hard';

export interface VideoSample {
  id: string;
  title: string;
  by: string;
  kind: 'kids' | 'song' | 'talk';
  level: SampleLevel;
}

export const VIDEO_SAMPLES: VideoSample[] = [
  { id: 'tVlcKp3bWH8', title: 'Hello!', by: 'Super Simple Songs', kind: 'kids', level: 'easy' },
  { id: 'yCjJyiqpAuU', title: 'Twinkle Twinkle Little Star', by: 'Super Simple Songs', kind: 'kids', level: 'easy' },
  { id: 'GzrjwOQpAl0', title: 'The Wheels On The Bus', by: 'Super Simple Songs', kind: 'kids', level: 'easy' },
  { id: 'ZanHgPprl-0', title: 'Head Shoulders Knees & Toes', by: 'Super Simple Songs', kind: 'kids', level: 'easy' },
  { id: 'l4WNrvVjiTw', title: 'If You’re Happy', by: 'Super Simple Songs', kind: 'kids', level: 'easy' },
  { id: 'pZw9veQ76fo', title: 'Five Little Ducks', by: 'Super Simple Songs', kind: 'kids', level: 'easy' },
  { id: 'XqZsoesa55w', title: 'Baby Shark Dance', by: 'Pinkfong', kind: 'kids', level: 'easy' },
  { id: 'WRVsOCh907o', title: 'Bath Song', by: 'CoComelon', kind: 'kids', level: 'easy' },
  { id: 'mXMofxtDPUQ', title: 'Days of the Week Song', by: 'The Singing Walrus', kind: 'kids', level: 'easy' },
  { id: 'frN3nvhIHUk', title: 'Do You Like Broccoli Ice Cream?', by: 'Super Simple Songs', kind: 'kids', level: 'medium' },
  { id: 'hq3yfQnllfQ', title: 'Phonics Song with Two Words', by: 'ChuChu TV', kind: 'kids', level: 'medium' },
  { id: 'WX8HmogNyCY', title: 'Head Shoulders Knees & Toes (Speeding Up)', by: 'Super Simple Songs', kind: 'kids', level: 'hard' },

  { id: '2Vv-BfVoq4g', title: 'Perfect', by: 'Ed Sheeran', kind: 'song', level: 'easy' },
  { id: 'YQHsXMglC9A', title: 'Hello', by: 'Adele', kind: 'song', level: 'easy' },
  { id: 'lp-EO5I60KA', title: 'Thinking Out Loud', by: 'Ed Sheeran', kind: 'song', level: 'easy' },
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', by: 'Rick Astley', kind: 'song', level: 'easy' },
  { id: 'CevxZvSJLk8', title: 'Roar', by: 'Katy Perry', kind: 'song', level: 'medium' },
  { id: 'hT_nvWreIhg', title: 'Counting Stars', by: 'OneRepublic', kind: 'song', level: 'medium' },
  { id: '09R8_2nJtjg', title: 'Sugar', by: 'Maroon 5', kind: 'song', level: 'medium' },
  { id: 'JGwWNGJdvx8', title: 'Shape of You', by: 'Ed Sheeran', kind: 'song', level: 'medium' },
  { id: 'nfWlot6h_JM', title: 'Shake It Off', by: 'Taylor Swift', kind: 'song', level: 'medium' },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', by: 'Queen', kind: 'song', level: 'hard' },
  { id: 'RgKAFK5djSk', title: 'See You Again', by: 'Wiz Khalifa ft. Charlie Puth', kind: 'song', level: 'hard' },
  { id: 'OPf0YbXqDm0', title: 'Uptown Funk', by: 'Mark Ronson ft. Bruno Mars', kind: 'song', level: 'hard' },

  { id: 'H14bBuluwB8', title: 'Grit: the power of passion and perseverance', by: 'Angela Lee Duckworth · TED', kind: 'talk', level: 'easy' },
  { id: 'UF8uR6Z6KLc', title: '2005 Stanford Commencement Address', by: 'Steve Jobs', kind: 'talk', level: 'medium' },
  { id: 'Ks-_Mh1QhMc', title: 'Your body language may shape who you are', by: 'Amy Cuddy · TED', kind: 'talk', level: 'medium' },
  { id: 'u4ZoJKF_VuA', title: 'Start with why', by: 'Simon Sinek · TEDx', kind: 'talk', level: 'medium' },
  { id: 'arj7oStGLkU', title: 'Inside the mind of a master procrastinator', by: 'Tim Urban · TED', kind: 'talk', level: 'medium' },
  { id: 'iG9CE55wbtY', title: 'Do schools kill creativity?', by: 'Sir Ken Robinson · TED', kind: 'talk', level: 'hard' },
];
