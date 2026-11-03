// Xin xăm at Thiên Mụ: shake the cup until one numbered stick falls, and read
// its fortune — a line of luck in both languages, and an English word to
// carry for the day, with its meaning and a sentence. One stick a day: the
// draw is kept on this device, so shaking again shows the same one until
// tomorrow, as asking twice is no way to treat a fortune.

export type Luck = 'great' | 'good' | 'fair';

export interface Fortune {
  /** The stick's number, as painted on it. */
  n: number;
  luck: Luck;
  en: string;
  vi: string;
  word: string;
  /** The word's meaning, in English and Vietnamese. */
  meaning: { en: string; vi: string };
  example: string;
}

export const FORTUNES: Fortune[] = [
  { n: 1, luck: 'great', en: 'A door you thought was shut will open this week.', vi: 'Cánh cửa bạn tưởng đã đóng sẽ mở ra trong tuần này.', word: 'opportunity', meaning: { en: 'a chance to do something good', vi: 'cơ hội' }, example: 'Every new word is an opportunity to say more.' },
  { n: 2, luck: 'good', en: 'Small steps, taken daily, cross mountains.', vi: 'Bước nhỏ mỗi ngày sẽ vượt qua núi cao.', word: 'perseverance', meaning: { en: 'continuing even when it is hard', vi: 'sự kiên trì' }, example: 'Her perseverance turned a hard language into an easy one.' },
  { n: 3, luck: 'great', en: 'Good news is already on its way to you.', vi: 'Tin vui đang trên đường đến với bạn.', word: 'fortunate', meaning: { en: 'lucky', vi: 'may mắn' }, example: 'We were fortunate to find a table by the river.' },
  { n: 4, luck: 'fair', en: 'Patience now saves sorrow later.', vi: 'Kiên nhẫn hôm nay, đỡ buồn phiền mai sau.', word: 'patience', meaning: { en: 'waiting calmly without getting upset', vi: 'sự kiên nhẫn' }, example: 'Learning to speak takes patience.' },
  { n: 5, luck: 'good', en: 'A friend will need your help — and repay it twice.', vi: 'Một người bạn sẽ cần bạn giúp — và đền đáp gấp đôi.', word: 'generous', meaning: { en: 'happy to give time or help', vi: 'hào phóng, rộng lượng' }, example: 'She was generous with her notes before the exam.' },
  { n: 6, luck: 'great', en: 'Your hard work is about to bear fruit.', vi: 'Công sức của bạn sắp đơm hoa kết trái.', word: 'flourish', meaning: { en: 'to grow well and succeed', vi: 'phát triển mạnh, thịnh vượng' }, example: 'The garden will flourish in spring.' },
  { n: 7, luck: 'fair', en: 'Listen more than you speak today.', vi: 'Hôm nay hãy nghe nhiều hơn nói.', word: 'attentive', meaning: { en: 'listening and watching carefully', vi: 'chăm chú, chu đáo' }, example: 'An attentive listener hears what is not said.' },
  { n: 8, luck: 'good', en: 'A journey, near or far, will teach you something new.', vi: 'Một chuyến đi, gần hay xa, sẽ dạy bạn điều mới.', word: 'adventure', meaning: { en: 'an exciting new experience', vi: 'cuộc phiêu lưu' }, example: 'Ordering lunch in English was a small adventure.' },
  { n: 9, luck: 'great', en: 'The new year brings health and peace to your home.', vi: 'Năm mới mang sức khỏe và bình an đến nhà bạn.', word: 'prosperity', meaning: { en: 'success and having enough money', vi: 'sự thịnh vượng' }, example: 'They wished each other prosperity for the new year.' },
  { n: 10, luck: 'good', en: 'What you learn today, you will use tomorrow.', vi: 'Điều bạn học hôm nay, ngày mai sẽ dùng đến.', word: 'valuable', meaning: { en: 'very useful or important', vi: 'quý giá' }, example: 'A good dictionary is a valuable friend.' },
  { n: 11, luck: 'fair', en: 'Calm water hides a strong current — move with care.', vi: 'Nước lặng chảy sâu — hãy thận trọng.', word: 'cautious', meaning: { en: 'careful to avoid problems', vi: 'thận trọng' }, example: 'Be cautious when crossing the busy street.' },
  { n: 12, luck: 'great', en: 'Someone admires you more than you know.', vi: 'Có người ngưỡng mộ bạn hơn bạn nghĩ.', word: 'admire', meaning: { en: 'to respect and like someone', vi: 'ngưỡng mộ' }, example: 'I admire how calmly you speak in front of people.' },
  { n: 13, luck: 'good', en: 'Laughter will find you before the week is out.', vi: 'Tiếng cười sẽ tìm đến bạn trước cuối tuần.', word: 'cheerful', meaning: { en: 'happy and bright', vi: 'vui vẻ' }, example: 'The market was cheerful with red lanterns.' },
  { n: 14, luck: 'fair', en: 'An old mistake can still become a lesson.', vi: 'Lỗi cũ vẫn có thể thành bài học.', word: 'reflect', meaning: { en: 'to think carefully about something', vi: 'suy ngẫm' }, example: 'Take a moment to reflect on what went well.' },
  { n: 15, luck: 'great', en: 'Luck sits beside you like a quiet friend.', vi: 'Vận may ngồi cạnh bạn như một người bạn lặng lẽ.', word: 'serendipity', meaning: { en: 'finding something good by chance', vi: 'sự tình cờ may mắn' }, example: 'Meeting her at the bookshop was pure serendipity.' },
  { n: 16, luck: 'good', en: 'Speak up — your idea is better than you think.', vi: 'Hãy nói ra — ý tưởng của bạn hay hơn bạn nghĩ.', word: 'confident', meaning: { en: 'sure of yourself', vi: 'tự tin' }, example: 'He felt confident after practising every day.' },
  { n: 17, luck: 'fair', en: 'Rest is part of the road, not a stop on it.', vi: 'Nghỉ ngơi là một phần của con đường, không phải dừng lại.', word: 'balance', meaning: { en: 'the right amount of different things', vi: 'sự cân bằng' }, example: 'Find a balance between work and rest.' },
  { n: 18, luck: 'great', en: 'A wish made this season will come true.', vi: 'Điều ước mùa này sẽ thành hiện thực.', word: 'aspiration', meaning: { en: 'a strong hope to achieve something', vi: 'khát vọng' }, example: 'Her aspiration is to study abroad.' },
  { n: 19, luck: 'good', en: 'Kind words return to the one who speaks them.', vi: 'Lời tử tế sẽ quay về với người nói ra.', word: 'gratitude', meaning: { en: 'the feeling of being thankful', vi: 'lòng biết ơn' }, example: 'She wrote a card to show her gratitude.' },
  { n: 20, luck: 'fair', en: 'Not every road is straight — the bends have views.', vi: 'Không con đường nào thẳng mãi — khúc quanh có cảnh đẹp.', word: 'resilient', meaning: { en: 'able to recover quickly from problems', vi: 'kiên cường, mau hồi phục' }, example: 'Children are often more resilient than we think.' },
  { n: 21, luck: 'great', en: 'Your family will gather in joy this year.', vi: 'Gia đình bạn sẽ sum vầy trong niềm vui năm nay.', word: 'reunion', meaning: { en: 'a meeting of people after time apart', vi: 'sự đoàn tụ' }, example: 'Tết is a time for family reunion.' },
  { n: 22, luck: 'good', en: 'A teacher appears when the student is ready.', vi: 'Người thầy xuất hiện khi học trò sẵn sàng.', word: 'curious', meaning: { en: 'wanting to know or learn', vi: 'tò mò, ham học hỏi' }, example: 'Stay curious and ask questions.' },
  { n: 23, luck: 'fair', en: 'Tidy one corner, and the whole room feels lighter.', vi: 'Dọn một góc nhỏ, cả căn phòng nhẹ nhõm hơn.', word: 'organise', meaning: { en: 'to plan or arrange things in order', vi: 'sắp xếp' }, example: 'Organise your notes by topic.' },
  { n: 24, luck: 'great', en: 'Bright days are ahead — walk towards them.', vi: 'Những ngày tươi sáng ở phía trước — hãy bước tới.', word: 'optimistic', meaning: { en: 'hopeful about the future', vi: 'lạc quan' }, example: 'Stay optimistic — you are improving every day.' },
  { n: 25, luck: 'good', en: 'An unexpected message will brighten your evening.', vi: 'Một tin nhắn bất ngờ sẽ làm sáng buổi tối của bạn.', word: 'delighted', meaning: { en: 'very pleased', vi: 'rất vui mừng' }, example: 'I was delighted to hear from my old teacher.' },
  { n: 26, luck: 'fair', en: 'Measure twice before you cut once.', vi: 'Đo hai lần rồi hãy cắt một lần.', word: 'thorough', meaning: { en: 'careful to do every part well', vi: 'kỹ lưỡng' }, example: 'She did a thorough check of her essay.' },
  { n: 27, luck: 'great', en: 'The seed you planted long ago is ready to bloom.', vi: 'Hạt giống bạn gieo từ lâu đã sẵn sàng nở hoa.', word: 'blossom', meaning: { en: 'to develop and become beautiful or successful', vi: 'nở hoa, phát triển' }, example: 'Their friendship began to blossom over the summer.' },
  { n: 28, luck: 'good', en: 'A shared meal will lead to a lasting friendship.', vi: 'Một bữa ăn chung sẽ dẫn đến tình bạn bền lâu.', word: 'companion', meaning: { en: 'a person you spend time with', vi: 'người bạn đồng hành' }, example: 'My dog is my best walking companion.' },
  { n: 29, luck: 'fair', en: 'The answer you seek is in a question not yet asked.', vi: 'Câu trả lời bạn tìm nằm trong câu hỏi chưa được hỏi.', word: 'wonder', meaning: { en: 'to think about something with curiosity', vi: 'tự hỏi, thắc mắc' }, example: 'I wonder why the river looks green today.' },
  { n: 30, luck: 'great', en: 'A long-held dream moves one step closer.', vi: 'Giấc mơ ấp ủ lâu nay tiến gần thêm một bước.', word: 'achieve', meaning: { en: 'to succeed in doing something', vi: 'đạt được' }, example: 'You can achieve more than you imagine.' },
  { n: 31, luck: 'good', en: 'Help offered freely will be remembered warmly.', vi: 'Sự giúp đỡ chân thành sẽ được nhớ mãi.', word: 'kindness', meaning: { en: 'being friendly and caring', vi: 'lòng tốt' }, example: 'A small kindness can change someone\'s day.' },
  { n: 32, luck: 'fair', en: 'Do not rush the tea — let it steep.', vi: 'Đừng vội uống trà — hãy để trà ngấm.', word: 'gradually', meaning: { en: 'slowly, over time', vi: 'dần dần' }, example: 'Your accent will improve gradually.' },
  { n: 33, luck: 'great', en: 'The stars are lined up in your favour.', vi: 'Các vì sao đang xếp hàng ủng hộ bạn.', word: 'auspicious', meaning: { en: 'showing signs of future success', vi: 'tốt lành, cát tường' }, example: 'The first day of Tết is an auspicious time to start.' },
  { n: 34, luck: 'good', en: 'A new skill will open a new door.', vi: 'Một kỹ năng mới sẽ mở ra cánh cửa mới.', word: 'skilful', meaning: { en: 'good at doing something', vi: 'khéo léo, thành thạo' }, example: 'He is a skilful cook.' },
  { n: 35, luck: 'fair', en: 'Words spoken in anger travel far — choose them well.', vi: 'Lời nói lúc giận đi rất xa — hãy chọn lời cẩn thận.', word: 'gentle', meaning: { en: 'kind and calm, not rough', vi: 'nhẹ nhàng, dịu dàng' }, example: 'Use a gentle voice with small children.' },
  { n: 36, luck: 'great', en: 'Your courage will inspire someone close to you.', vi: 'Lòng dũng cảm của bạn sẽ truyền cảm hứng cho người thân.', word: 'courage', meaning: { en: 'the ability to do something frightening', vi: 'lòng dũng cảm' }, example: 'It takes courage to speak a new language.' },
  { n: 37, luck: 'good', en: 'A walk by the river will clear your mind.', vi: 'Dạo bước bên sông sẽ làm đầu óc bạn thư thái.', word: 'peaceful', meaning: { en: 'quiet and calm', vi: 'yên bình' }, example: 'The pagoda is peaceful in the early morning.' },
  { n: 38, luck: 'fair', en: 'A promise is a debt — keep it light by keeping it.', vi: 'Lời hứa là món nợ — giữ lời thì nhẹ lòng.', word: 'reliable', meaning: { en: 'able to be trusted', vi: 'đáng tin cậy' }, example: 'She is reliable — she always arrives on time.' },
  { n: 39, luck: 'great', en: 'Fortune favours the one who keeps going.', vi: 'Vận may mỉm cười với người không bỏ cuộc.', word: 'determined', meaning: { en: 'having decided firmly to do something', vi: 'quyết tâm' }, example: 'He was determined to pass the IELTS test.' },
  { n: 40, luck: 'good', en: 'A neighbour\'s smile will be your lucky sign.', vi: 'Nụ cười của hàng xóm sẽ là điềm may của bạn.', word: 'friendly', meaning: { en: 'kind and pleasant to others', vi: 'thân thiện' }, example: 'The people at the market are very friendly.' },
  { n: 41, luck: 'fair', en: 'Before you climb, check your shoes.', vi: 'Trước khi leo, hãy kiểm tra đôi giày.', word: 'prepare', meaning: { en: 'to get ready for something', vi: 'chuẩn bị' }, example: 'Prepare your questions before the interview.' },
  { n: 42, luck: 'great', en: 'An honour or reward is coming your way.', vi: 'Một vinh dự hay phần thưởng đang đến với bạn.', word: 'recognition', meaning: { en: 'praise for something you have done', vi: 'sự công nhận' }, example: 'She received recognition for her hard work.' },
  { n: 43, luck: 'good', en: 'An old book holds a new idea for you.', vi: 'Một cuốn sách cũ chứa ý tưởng mới cho bạn.', word: 'inspiration', meaning: { en: 'something that gives you new ideas', vi: 'nguồn cảm hứng' }, example: 'The old capital is an inspiration for artists.' },
  { n: 44, luck: 'fair', en: 'Clouds pass; the mountain stays.', vi: 'Mây trôi qua, núi vẫn ở lại.', word: 'steady', meaning: { en: 'firm and not changing', vi: 'vững vàng, đều đặn' }, example: 'Make steady progress, a little each day.' },
  { n: 45, luck: 'great', en: 'Happiness will fill your house like spring light.', vi: 'Hạnh phúc sẽ tràn ngập nhà bạn như nắng xuân.', word: 'joyful', meaning: { en: 'full of happiness', vi: 'tràn đầy niềm vui' }, example: 'The streets were joyful on New Year\'s Eve.' },
  { n: 46, luck: 'good', en: 'Ask for directions — the journey will be shorter.', vi: 'Hãy hỏi đường — chuyến đi sẽ ngắn hơn.', word: 'guidance', meaning: { en: 'help and advice', vi: 'sự hướng dẫn' }, example: 'Thank you for your guidance on my essay.' },
  { n: 47, luck: 'fair', en: 'A full cup cannot hold more — empty it to learn.', vi: 'Chén đầy không chứa thêm được — hãy vơi đi để học.', word: 'humble', meaning: { en: 'not thinking you are better than others', vi: 'khiêm tốn' }, example: 'Even great teachers stay humble.' },
  { n: 48, luck: 'great', en: 'Money and good health flow towards you.', vi: 'Tiền tài và sức khỏe đang đến với bạn.', word: 'abundant', meaning: { en: 'more than enough', vi: 'dồi dào, phong phú' }, example: 'Fruit is abundant at the market in summer.' },
  { n: 49, luck: 'good', en: 'Today is a good day to begin something new.', vi: 'Hôm nay là ngày tốt để bắt đầu điều mới.', word: 'fresh', meaning: { en: 'new and different', vi: 'mới mẻ, tươi mới' }, example: 'Let\'s make a fresh start this year.' },
  { n: 50, luck: 'fair', en: 'Hold your plans loosely, like water in your hands.', vi: 'Hãy nhẹ nhàng với kế hoạch, như nước trong lòng bàn tay.', word: 'flexible', meaning: { en: 'able to change easily', vi: 'linh hoạt' }, example: 'Be flexible if the bus is late.' },
  { n: 51, luck: 'great', en: 'You will find what you lost — and something better.', vi: 'Bạn sẽ tìm lại điều đã mất — và cả điều tốt hơn.', word: 'discover', meaning: { en: 'to find something for the first time', vi: 'khám phá' }, example: 'We discovered a tiny café behind the citadel.' },
  { n: 52, luck: 'good', en: 'A song you hear today will stay with you.', vi: 'Một bài hát bạn nghe hôm nay sẽ ở mãi trong lòng.', word: 'memorable', meaning: { en: 'easy to remember, special', vi: 'đáng nhớ' }, example: 'Our boat trip on the Perfume River was memorable.' },
  { n: 53, luck: 'fair', en: 'Answer the small task before the large one.', vi: 'Làm xong việc nhỏ trước việc lớn.', word: 'priority', meaning: { en: 'the thing that is most important', vi: 'ưu tiên' }, example: 'Sleep should be a priority before an exam.' },
  { n: 54, luck: 'great', en: 'Love grows stronger in your home this year.', vi: 'Tình yêu thương trong nhà bạn sẽ thêm bền chặt năm nay.', word: 'harmony', meaning: { en: 'living or working together peacefully', vi: 'sự hòa thuận' }, example: 'The family lives in harmony.' },
  { n: 55, luck: 'good', en: 'Your hands will make something to be proud of.', vi: 'Đôi tay bạn sẽ làm ra điều đáng tự hào.', word: 'create', meaning: { en: 'to make something new', vi: 'tạo ra, sáng tạo' }, example: 'Children love to create things from paper.' },
  { n: 56, luck: 'fair', en: 'The lamp you carry lights only the next step — enough.', vi: 'Chiếc đèn bạn cầm chỉ soi bước kế tiếp — vậy là đủ.', word: 'trust', meaning: { en: 'to believe something is good or true', vi: 'tin tưởng' }, example: 'Trust yourself — you know more than you think.' },
  { n: 57, luck: 'great', en: 'A door to faraway places is about to open.', vi: 'Cánh cửa đến những miền xa sắp mở ra.', word: 'abroad', meaning: { en: 'in or to another country', vi: 'ở nước ngoài' }, example: 'She hopes to work abroad one day.' },
  { n: 58, luck: 'good', en: 'Someone will remember your kindness at the right time.', vi: 'Ai đó sẽ nhớ lòng tốt của bạn đúng lúc.', word: 'appreciate', meaning: { en: 'to be thankful for something', vi: 'trân trọng, cảm kích' }, example: 'I really appreciate your help.' },
  { n: 59, luck: 'fair', en: 'Too many plans make a crowded day — choose one.', vi: 'Quá nhiều dự định khiến ngày chật chội — hãy chọn một.', word: 'focus', meaning: { en: 'to give all your attention to one thing', vi: 'tập trung' }, example: 'Turn off your phone so you can focus.' },
  { n: 60, luck: 'great', en: 'The rain ends, and a rainbow follows you home.', vi: 'Mưa tạnh, cầu vồng theo bạn về nhà.', word: 'radiant', meaning: { en: 'bright and full of happiness', vi: 'rạng rỡ' }, example: 'She gave a radiant smile.' },
  { n: 61, luck: 'good', en: 'A good question will win you a good friend.', vi: 'Một câu hỏi hay sẽ mang lại một người bạn tốt.', word: 'conversation', meaning: { en: 'a talk between people', vi: 'cuộc trò chuyện' }, example: 'We had a long conversation over coffee.' },
  { n: 62, luck: 'fair', en: 'Leave a little early; the road has surprises.', vi: 'Hãy đi sớm một chút; đường xá có nhiều bất ngờ.', word: 'punctual', meaning: { en: 'arriving at the right time', vi: 'đúng giờ' }, example: 'Be punctual for your first class.' },
  { n: 63, luck: 'great', en: 'What you begin this month will last for years.', vi: 'Điều bạn bắt đầu tháng này sẽ bền lâu nhiều năm.', word: 'lasting', meaning: { en: 'continuing for a long time', vi: 'lâu dài, bền vững' }, example: 'Good habits have a lasting effect.' },
  { n: 64, luck: 'good', en: 'An honest word will be welcomed today.', vi: 'Một lời thật lòng sẽ được đón nhận hôm nay.', word: 'sincere', meaning: { en: 'honest and meaning what you say', vi: 'chân thành' }, example: 'Please accept my sincere thanks.' },
  { n: 65, luck: 'fair', en: 'The heaviest bag is the worry you carry.', vi: 'Hành lý nặng nhất là nỗi lo bạn mang theo.', word: 'relieved', meaning: { en: 'happy because a worry has gone', vi: 'nhẹ nhõm' }, example: 'I was relieved when the test was over.' },
  { n: 66, luck: 'great', en: 'A clever idea will solve an old problem.', vi: 'Một ý tưởng thông minh sẽ giải quyết vấn đề cũ.', word: 'ingenious', meaning: { en: 'very clever and new', vi: 'tài tình, khéo léo' }, example: 'What an ingenious way to store books!' },
  { n: 67, luck: 'good', en: 'Your steps will lead you somewhere beautiful.', vi: 'Bước chân sẽ đưa bạn đến nơi tươi đẹp.', word: 'scenery', meaning: { en: 'the natural features of a place', vi: 'phong cảnh' }, example: 'The scenery from the hill is amazing.' },
  { n: 68, luck: 'fair', en: 'A small coin saved today is a feast tomorrow.', vi: 'Đồng xu nhỏ để dành hôm nay là bữa tiệc ngày mai.', word: 'thrifty', meaning: { en: 'careful with money', vi: 'tiết kiệm, căn cơ' }, example: 'My grandmother is very thrifty.' },
  { n: 69, luck: 'great', en: 'The new year runs fast — and you run with it.', vi: 'Năm mới chạy nhanh — và bạn cùng chạy với nó.', word: 'energetic', meaning: { en: 'full of energy', vi: 'tràn đầy năng lượng' }, example: 'The lion dancers were energetic all night.' },
  { n: 70, luck: 'good', en: 'A teacher\'s advice will make sense at last.', vi: 'Lời khuyên của thầy cô cuối cùng sẽ trở nên dễ hiểu.', word: 'wisdom', meaning: { en: 'good judgement from experience', vi: 'sự khôn ngoan, trí tuệ' }, example: 'Old sayings often hold great wisdom.' },
  { n: 71, luck: 'fair', en: 'Sweep your own doorstep first.', vi: 'Hãy quét sạch trước cửa nhà mình trước.', word: 'responsible', meaning: { en: 'having a duty to take care of something', vi: 'có trách nhiệm' }, example: 'You are responsible for your own learning.' },
  { n: 72, luck: 'great', en: 'Your name will be spoken with pride.', vi: 'Tên bạn sẽ được nhắc đến với niềm tự hào.', word: 'proud', meaning: { en: 'pleased about something you or others did', vi: 'tự hào' }, example: 'Her parents were proud of her results.' },
  { n: 73, luck: 'good', en: 'A cup of tea with a stranger will teach you a word.', vi: 'Chén trà với người lạ sẽ dạy bạn một từ mới.', word: 'hospitable', meaning: { en: 'friendly and welcoming to guests', vi: 'hiếu khách' }, example: 'People in Huế are very hospitable.' },
  { n: 74, luck: 'fair', en: 'Even the river rests in the lake before the sea.', vi: 'Ngay cả dòng sông cũng nghỉ ở hồ trước khi ra biển.', word: 'pause', meaning: { en: 'to stop for a short time', vi: 'tạm dừng' }, example: 'Pause for a moment before you answer.' },
];

const KEY = 'voca-fortune';

/** Today's date as YYYY-MM-DD, in local time. */
export function todayKey(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** The stick already drawn today on this device, if any. */
export function todaysFortune(now: Date): Fortune | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { day: string; n: number } | null;
    if (saved?.day !== todayKey(now)) return null;
    return FORTUNES.find((f) => f.n === saved.n) ?? null;
  } catch {
    return null;
  }
}

/** Draws today's stick — or returns the one already drawn — and keeps it. */
export function drawFortune(now: Date, rand: () => number = Math.random): Fortune {
  const kept = todaysFortune(now);
  if (kept) return kept;
  const f = FORTUNES[Math.floor(rand() * FORTUNES.length)];
  try { localStorage.setItem(KEY, JSON.stringify({ day: todayKey(now), n: f.n })); } catch { /* private mode: it just won't stick */ }
  return f;
}
