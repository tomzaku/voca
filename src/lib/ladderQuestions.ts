// The question bank for the Quốc Học ladder (lib/quocHocLadder): 100 general
// questions a child or an adult could answer — nothing about Huế or the school,
// nothing that needs a textbook. 20 of each type, every type with 7 easy, 7
// medium and 6 hard, so a ladder of one type (5 a level) still has a spare per
// level to swap in. "Hard" means less common knowledge, not specialist.
//
// A Text is either a string that reads the same in both languages (a number, a
// name) or an [English, Vietnamese] pair. The right answer is listed first;
// the ladder shuffles the options.

export type QLevel = 'easy' | 'medium' | 'hard' | 'expert';
export type QType = 'nature' | 'science' | 'math' | 'world' | 'life';
export type Text = string | readonly [en: string, vi: string];

export interface LadderQuestion {
  id: number;
  type: QType;
  level: QLevel;
  q: Text;
  /** Four options, the right one first. */
  options: readonly [Text, Text, Text, Text];
  /** Shown after answering: why, or a little more. */
  note?: Text;
}

type Row = [level: QLevel, q: Text, options: readonly [Text, Text, Text, Text], note?: Text];

const NATURE: Row[] = [
  ['easy', ['How many legs does a spider have?', 'Con nhện có mấy chân?'], ['8', '6', '10', '4'], ['Insects have 6 legs — spiders aren\'t insects.', 'Côn trùng có 6 chân — nhện không phải côn trùng.']],
  ['easy', ['What do bees make?', 'Ong làm ra gì?'], [['Honey', 'Mật'], ['Milk', 'Sữa'], ['Silk', 'Tơ'], ['Butter', 'Bơ']]],
  ['easy', ['Which animal is the largest on land?', 'Động vật nào lớn nhất trên cạn?'], [['The elephant', 'Con voi'], ['The giraffe', 'Con hươu cao cổ'], ['The hippo', 'Con hà mã'], ['The bear', 'Con gấu']]],
  ['easy', ['What does a caterpillar turn into?', 'Sâu bướm lớn lên thành gì?'], [['A butterfly', 'Con bướm'], ['A bee', 'Con ong'], ['A spider', 'Con nhện'], ['A frog', 'Con ếch']]],
  ['easy', ['Which animal is called the king of the jungle?', 'Con vật nào được gọi là "vua của rừng xanh" (king of the jungle)?'], [['The lion', 'Sư tử'], ['The monkey', 'Con khỉ'], ['The wolf', 'Chó sói'], ['The zebra', 'Ngựa vằn']]],
  ['easy', ['What does a fish breathe through?', 'Cá thở bằng gì?'], [['Its gills', 'Mang'], ['Its nose', 'Mũi'], ['Its fins', 'Vây'], ['Its tail', 'Đuôi']]],
  ['easy', ['What colour are most leaves in summer?', 'Mùa hè, phần lớn lá cây có màu gì?'], [['Green', 'Xanh lá'], ['Blue', 'Xanh dương'], ['Purple', 'Tím'], ['White', 'Trắng']]],

  ['medium', ['Which is the largest animal that has ever lived?', 'Động vật nào lớn nhất từng sống trên Trái Đất?'], [['The blue whale', 'Cá voi xanh'], ['The T. rex', 'Khủng long bạo chúa'], ['The elephant', 'Con voi'], ['The great white shark', 'Cá mập trắng']]],
  ['medium', ['A frog starts life as a…', 'Ếch lúc mới nở là…'], [['Tadpole', 'Nòng nọc'], ['Chick', 'Gà con'], ['Caterpillar', 'Sâu non'], ['Puppy', 'Cún con']]],
  ['medium', ['Which bird can fly backwards?', 'Loài chim nào bay lùi được?'], [['The hummingbird', 'Chim ruồi'], ['The eagle', 'Đại bàng'], ['The parrot', 'Con vẹt'], ['The pigeon', 'Bồ câu']]],
  ['medium', ['What is a baby kangaroo called?', 'Chuột túi con được gọi là gì?'], ['A joey', 'A cub', 'A kid', 'A calf']],
  ['medium', ['Which animal is the fastest on land?', 'Động vật nào chạy nhanh nhất trên cạn?'], [['The cheetah', 'Báo săn'], ['The horse', 'Con ngựa'], ['The lion', 'Sư tử'], ['The ostrich', 'Đà điểu']]],
  ['medium', ['Pandas eat mostly…', 'Gấu trúc chủ yếu ăn…'], [['Bamboo', 'Tre, trúc'], ['Fish', 'Cá'], ['Bananas', 'Chuối'], ['Grass', 'Cỏ']]],
  ['medium', ['Which of these is a mammal?', 'Con nào là động vật có vú?'], [['The dolphin', 'Cá heo'], ['The shark', 'Cá mập'], ['The salmon', 'Cá hồi'], ['The octopus', 'Bạch tuộc']], ['Dolphins breathe air and feed their babies milk.', 'Cá heo thở bằng phổi và nuôi con bằng sữa.']],

  ['hard', ['How many hearts does an octopus have?', 'Bạch tuộc có mấy quả tim?'], ['3', '1', '2', '8']],
  ['hard', ['Which tree gives us acorns?', 'Quả sồi (acorn) mọc trên cây nào?'], [['The oak', 'Cây sồi'], ['The pine', 'Cây thông'], ['The maple', 'Cây phong'], ['The palm', 'Cây cọ']]],
  ['hard', ['Which animal sleeps standing up?', 'Con vật nào ngủ đứng?'], [['The horse', 'Con ngựa'], ['The dog', 'Con chó'], ['The cat', 'Con mèo'], ['The pig', 'Con heo']]],
  ['hard', ['What is a group of lions called?', 'Một đàn sư tử trong tiếng Anh gọi là gì?'], ['A pride', 'A pack', 'A herd', 'A flock']],
  ['hard', ['Which bird is a symbol of peace?', 'Loài chim nào là biểu tượng của hòa bình?'], [['The dove', 'Chim bồ câu'], ['The crow', 'Con quạ'], ['The owl', 'Con cú'], ['The swan', 'Thiên nga']]],
  ['hard', ['How long is an elephant pregnant for, roughly?', 'Voi mang thai khoảng bao lâu?'], [['About 2 years', 'Khoảng 2 năm'], ['About 9 months', 'Khoảng 9 tháng'], ['About 6 months', 'Khoảng 6 tháng'], ['About 4 years', 'Khoảng 4 năm']], ['The longest of any land animal — about 22 months.', 'Lâu nhất trong các loài trên cạn — khoảng 22 tháng.']],

  ['expert', ['Which is the only mammal that can truly fly?', 'Động vật có vú duy nhất thật sự bay được là con gì?'], [['The bat', 'Con dơi'], ['The flying squirrel', 'Sóc bay'], ['The flying fish', 'Cá chuồn'], ['The colugo', 'Chồn bay']], ['Flying squirrels and colugos only glide.', 'Sóc bay và chồn bay chỉ lượn chứ không bay.']],
  ['expert', ['How many chambers does a cow\'s stomach have?', 'Dạ dày của bò có mấy ngăn?'], ['4', '1', '2', '3']],
  ['expert', ['A koala eats almost nothing but…', 'Gấu koala gần như chỉ ăn…'], [['Eucalyptus leaves', 'Lá bạch đàn'], ['Bamboo', 'Tre, trúc'], ['Grass', 'Cỏ'], ['Insects', 'Côn trùng']]],
  ['expert', ['Which is the largest living bird?', 'Loài chim lớn nhất hiện nay là loài nào?'], [['The ostrich', 'Đà điểu châu Phi'], ['The emu', 'Đà điểu emu'], ['The albatross', 'Chim hải âu lớn'], ['The condor', 'Kền kền condor']]],
  ['expert', ['Which of these usually lives the longest?', 'Con nào sau đây thường sống lâu nhất?'], [['The giant tortoise', 'Rùa khổng lồ'], ['The elephant', 'Con voi'], ['The parrot', 'Con vẹt'], ['The horse', 'Con ngựa']], ['Giant tortoises can pass 150 years.', 'Rùa khổng lồ có thể sống hơn 150 năm.']],
  ['expert', ['Which gas do plants take from the air to make their food?', 'Cây lấy khí nào từ không khí để tạo ra chất dinh dưỡng?'], [['Carbon dioxide', 'Khí cacbonic (CO₂)'], ['Oxygen', 'Ôxi'], ['Nitrogen', 'Nitơ'], ['Hydrogen', 'Hiđrô']]],
];

const SCIENCE: Row[] = [
  ['easy', ['Which planet do we live on?', 'Chúng ta sống trên hành tinh nào?'], [['Earth', 'Trái Đất'], ['Mars', 'Sao Hỏa'], ['Venus', 'Sao Kim'], ['Jupiter', 'Sao Mộc']]],
  ['easy', ['Which organ pumps blood around your body?', 'Cơ quan nào bơm máu đi khắp cơ thể?'], [['The heart', 'Tim'], ['The lungs', 'Phổi'], ['The stomach', 'Dạ dày'], ['The brain', 'Não']]],
  ['easy', ['What does water turn into when it freezes?', 'Nước đóng băng thành gì?'], [['Ice', 'Đá (băng)'], ['Steam', 'Hơi nước'], ['Sand', 'Cát'], ['Salt', 'Muối']]],
  ['easy', ['What do we breathe in to stay alive?', 'Chúng ta hít khí gì để sống?'], [['Oxygen', 'Ôxi'], ['Smoke', 'Khói'], ['Helium', 'Heli'], ['Steam', 'Hơi nước']]],
  ['easy', ['How many senses do we usually say people have?', 'Người ta thường nói con người có mấy giác quan?'], ['5', '3', '7', '10'], ['Sight, hearing, smell, taste and touch.', 'Thị giác, thính giác, khứu giác, vị giác và xúc giác.']],
  ['easy', ['What shines in the sky during the day and gives us light?', 'Ban ngày, cái gì chiếu sáng trên bầu trời?'], [['The Sun', 'Mặt Trời'], ['The Moon', 'Mặt Trăng'], ['The stars', 'Các vì sao'], ['The clouds', 'Mây']]],
  ['easy', ['What pulls things down to the ground when you drop them?', 'Cái gì kéo đồ vật rơi xuống đất khi ta buông tay?'], [['Gravity', 'Trọng lực'], ['Wind', 'Gió'], ['Magnets', 'Nam châm'], ['Electricity', 'Điện']]],

  ['medium', ['Which planet is closest to the Sun?', 'Hành tinh nào gần Mặt Trời nhất?'], [['Mercury', 'Sao Thủy'], ['Venus', 'Sao Kim'], ['Mars', 'Sao Hỏa'], ['Earth', 'Trái Đất']]],
  ['medium', ['Which is the biggest planet in our Solar System?', 'Hành tinh lớn nhất Hệ Mặt Trời là gì?'], [['Jupiter', 'Sao Mộc'], ['Saturn', 'Sao Thổ'], ['Earth', 'Trái Đất'], ['Neptune', 'Sao Hải Vương']]],
  ['medium', ['At what temperature does water boil, at sea level?', 'Ở mực nước biển, nước sôi ở bao nhiêu độ?'], ['100 °C', '50 °C', '80 °C', '200 °C']],
  ['medium', ['Which planet is known as the Red Planet?', 'Hành tinh nào được gọi là Hành tinh Đỏ?'], [['Mars', 'Sao Hỏa'], ['Venus', 'Sao Kim'], ['Jupiter', 'Sao Mộc'], ['Mercury', 'Sao Thủy']]],
  ['medium', ['What do plants take in from the air to make their food?', 'Cây hấp thụ khí gì từ không khí để tự làm thức ăn?'], [['Carbon dioxide', 'Khí cacbonic'], ['Oxygen', 'Ôxi'], ['Smoke', 'Khói'], ['Helium', 'Heli']]],
  ['medium', ['What is the hardest natural material?', 'Vật liệu tự nhiên nào cứng nhất?'], [['Diamond', 'Kim cương'], ['Iron', 'Sắt'], ['Glass', 'Thủy tinh'], ['Gold', 'Vàng']]],
  ['medium', ['What is H₂O better known as?', 'H₂O là chất gì?'], [['Water', 'Nước'], ['Salt', 'Muối'], ['Sugar', 'Đường'], ['Air', 'Không khí']]],

  ['hard', ['Which is the largest organ of the human body?', 'Cơ quan lớn nhất của cơ thể người là gì?'], [['The skin', 'Da'], ['The liver', 'Gan'], ['The brain', 'Não'], ['The heart', 'Tim']]],
  ['hard', ['About how many bones does an adult have?', 'Người trưởng thành có khoảng bao nhiêu chiếc xương?'], ['206', '100', '350', '52']],
  ['hard', ['Which travels faster: light or sound?', 'Cái nào truyền nhanh hơn: ánh sáng hay âm thanh?'], [['Light', 'Ánh sáng'], ['Sound', 'Âm thanh'], ['The same speed', 'Nhanh như nhau'], ['It depends on the weather', 'Tùy thời tiết']], ['That\'s why you see lightning before you hear thunder.', 'Vì thế ta thấy chớp trước khi nghe sấm.']],
  ['hard', ['Which planet has the most famous rings?', 'Hành tinh nào có vành đai nổi tiếng nhất?'], [['Saturn', 'Sao Thổ'], ['Mars', 'Sao Hỏa'], ['Mercury', 'Sao Thủy'], ['Venus', 'Sao Kim']]],
  ['hard', ['Who was the first person to walk on the Moon?', 'Ai là người đầu tiên đặt chân lên Mặt Trăng?'], ['Neil Armstrong', 'Yuri Gagarin', 'Buzz Aldrin', 'Albert Einstein'], ['In 1969. Gagarin was the first person in space, in 1961.', 'Năm 1969. Gagarin là người đầu tiên bay vào vũ trụ, năm 1961.']],
  ['hard', ['What part of your eye gives it its colour?', 'Phần nào của mắt quyết định màu mắt?'], [['The iris', 'Mống mắt'], ['The pupil', 'Đồng tử'], ['The eyelid', 'Mí mắt'], ['The eyelash', 'Lông mi']]],

  ['expert', ['What is the chemical symbol for gold?', 'Ký hiệu hóa học của vàng là gì?'], ['Au', 'Ag', 'Go', 'Gd'], ['From the Latin "aurum". Ag is silver.', 'Từ tiếng Latinh "aurum". Ag là bạc.']],
  ['expert', ['Which gas makes up most of the air?', 'Khí nào chiếm phần lớn không khí?'], [['Nitrogen', 'Nitơ'], ['Oxygen', 'Ôxi'], ['Carbon dioxide', 'Khí cacbonic'], ['Argon', 'Agon']], ['About 78% — oxygen is about 21%.', 'Khoảng 78% — ôxi chỉ khoảng 21%.']],
  ['expert', ['Roughly how long does sunlight take to reach Earth?', 'Ánh sáng Mặt Trời mất khoảng bao lâu để tới Trái Đất?'], [['8 minutes', '8 phút'], ['8 seconds', '8 giây'], ['8 hours', '8 giờ'], ['1 day', '1 ngày']]],
  ['expert', ['Which blood type can be given to almost anyone?', 'Nhóm máu nào có thể truyền cho hầu hết mọi người?'], ['O−', 'AB+', 'A+', 'B−']],
  ['expert', ['Which part of a cell holds most of its DNA?', 'Phần nào của tế bào chứa phần lớn ADN?'], [['The nucleus', 'Nhân tế bào'], ['The membrane', 'Màng tế bào'], ['The mitochondria', 'Ti thể'], ['The vacuole', 'Không bào']]],
  ['expert', ['At which temperature do °C and °F show the same number?', 'Ở nhiệt độ nào thì độ C và độ F có cùng con số?'], ['−40°', '0°', '−32°', '100°']],
];

const MATH: Row[] = [
  ['easy', ['What is 15 + 27?', '15 + 27 bằng bao nhiêu?'], ['42', '32', '41', '52']],
  ['easy', ['What is 7 × 8?', '7 × 8 bằng bao nhiêu?'], ['56', '54', '48', '64']],
  ['easy', ['How many sides does a triangle have?', 'Hình tam giác có mấy cạnh?'], ['3', '4', '5', '6']],
  ['easy', ['How many minutes are in an hour?', 'Một giờ có bao nhiêu phút?'], ['60', '100', '30', '24']],
  ['easy', ['What is half of 50?', 'Một nửa của 50 là bao nhiêu?'], ['25', '20', '30', '15']],
  ['easy', ['How many days are in a week?', 'Một tuần có mấy ngày?'], ['7', '5', '10', '6']],
  ['easy', ['What is 100 − 35?', '100 − 35 bằng bao nhiêu?'], ['65', '75', '55', '45']],

  ['medium', ['How many sides does a hexagon have?', 'Hình lục giác có mấy cạnh?'], ['6', '5', '7', '8']],
  ['medium', ['What is 10% of 200?', '10% của 200 là bao nhiêu?'], ['20', '10', '2', '100']],
  ['medium', ['What is 12 × 12?', '12 × 12 bằng bao nhiêu?'], ['144', '124', '132', '154']],
  ['medium', ['How many days are in a leap year?', 'Năm nhuận có bao nhiêu ngày?'], ['366', '365', '364', '360']],
  ['medium', ['What is the square root of 81?', 'Căn bậc hai của 81 là bao nhiêu?'], ['9', '8', '7', '18']],
  ['medium', ['What do the three angles of a triangle add up to?', 'Tổng ba góc của một tam giác bằng bao nhiêu?'], ['180°', '90°', '270°', '360°']],
  ['medium', ['A rectangle is 5 cm by 8 cm. What is its area?', 'Hình chữ nhật dài 8 cm, rộng 5 cm. Diện tích là bao nhiêu?'], ['40 cm²', '26 cm²', '13 cm²', '45 cm²']],

  ['hard', ['What is 3/4 as a decimal?', '3/4 viết dưới dạng số thập phân là bao nhiêu?'], ['0.75', '0.34', '0.25', '1.33']],
  ['hard', ['Which of these is a prime number?', 'Số nào sau đây là số nguyên tố?'], ['13', '15', '21', '27'], ['A prime can only be divided by 1 and itself.', 'Số nguyên tố chỉ chia hết cho 1 và chính nó.']],
  ['hard', ['What is 2 to the power of 5 (2⁵)?', '2 mũ 5 (2⁵) bằng bao nhiêu?'], ['32', '10', '25', '64']],
  ['hard', ['How many seconds are in an hour?', 'Một giờ có bao nhiêu giây?'], ['3,600', '360', '600', '6,000']],
  ['hard', ['If 3x + 5 = 20, what is x?', 'Nếu 3x + 5 = 20 thì x bằng bao nhiêu?'], ['5', '4', '6', '15']],
  ['hard', ['Pi (π) is about…', 'Số pi (π) xấp xỉ bằng…'], ['3.14', '2.71', '1.62', '4.13']],

  ['expert', ['What is 17 × 23?', '17 × 23 bằng bao nhiêu?'], ['391', '381', '401', '371']],
  ['expert', ['What is 15% of 240?', '15% của 240 là bao nhiêu?'], ['36', '24', '32', '40']],
  ['expert', ['What do the inside angles of a hexagon add up to?', 'Tổng các góc trong của hình lục giác bằng bao nhiêu?'], ['720°', '540°', '900°', '360°'], ['(6 − 2) × 180° = 720°.', '(6 − 2) × 180° = 720°.']],
  ['expert', ['What is the next prime number after 89?', 'Số nguyên tố liền sau 89 là số nào?'], ['97', '91', '93', '95'], ['91 = 7 × 13, 93 = 3 × 31, 95 = 5 × 19.', '91 = 7 × 13, 93 = 3 × 31, 95 = 5 × 19.']],
  ['expert', ['$80, 25% off, then 10% off the new price. What do you pay?', 'Giá $80, giảm 25%, rồi giảm thêm 10% trên giá mới. Bạn trả bao nhiêu?'], ['$54', '$52', '$56', '$60'], ['$80 × 0.75 = $60, then $60 × 0.9 = $54 — not 35% off.', '$80 × 0,75 = $60, rồi $60 × 0,9 = $54 — không phải giảm 35%.']],
  ['expert', ['What is the smallest number that 4, 6 and 10 all divide into?', 'Số nhỏ nhất chia hết cho cả 4, 6 và 10 là số nào?'], ['60', '30', '120', '240']],
  ['expert', ['You drive 120 km in 1.5 hours. What is your average speed?', 'Bạn lái 120 km trong 1,5 giờ. Tốc độ trung bình là bao nhiêu?'], ['80 km/h', '60 km/h', '75 km/h', '90 km/h']],
];

const WORLD: Row[] = [
  ['easy', ['Which is the largest ocean?', 'Đại dương nào lớn nhất?'], [['The Pacific', 'Thái Bình Dương'], ['The Atlantic', 'Đại Tây Dương'], ['The Indian Ocean', 'Ấn Độ Dương'], ['The Arctic', 'Bắc Băng Dương']]],
  ['easy', ['What is the capital of Vietnam?', 'Thủ đô của Việt Nam là gì?'], ['Hà Nội', 'Đà Nẵng', ['Hồ Chí Minh City', 'TP. Hồ Chí Minh'], 'Hải Phòng']],
  ['easy', ['In which country are the pyramids of Giza?', 'Kim tự tháp Giza ở nước nào?'], [['Egypt', 'Ai Cập'], ['Mexico', 'Mexico'], ['India', 'Ấn Độ'], ['Greece', 'Hy Lạp']]],
  ['easy', ['Which country is shaped like a boot?', 'Nước nào có hình chiếc ủng?'], [['Italy', 'Ý'], ['Spain', 'Tây Ban Nha'], ['France', 'Pháp'], ['Japan', 'Nhật Bản']]],
  ['easy', ['What is the capital of Japan?', 'Thủ đô của Nhật Bản là gì?'], ['Tokyo', 'Seoul', ['Beijing', 'Bắc Kinh'], ['Bangkok', 'Băng Cốc']]],
  ['easy', ['In which city is the Eiffel Tower?', 'Tháp Eiffel ở thành phố nào?'], ['Paris', ['London', 'Luân Đôn'], ['Rome', 'Roma'], ['Berlin', 'Béc-lin']]],
  ['easy', ['Which is the coldest continent?', 'Châu lục nào lạnh nhất?'], [['Antarctica', 'Châu Nam Cực'], ['Europe', 'Châu Âu'], ['Asia', 'Châu Á'], ['Africa', 'Châu Phi']]],

  ['medium', ['Which is the tallest mountain in the world?', 'Ngọn núi cao nhất thế giới là núi nào?'], ['Everest', 'Fansipan', ['Kilimanjaro', 'Kilimanjaro'], ['Mont Blanc', 'Mont Blanc']]],
  ['medium', ['How many continents are there?', 'Có bao nhiêu châu lục?'], ['7', '5', '6', '9'], ['The usual count: Asia, Africa, North and South America, Antarctica, Europe and Oceania.', 'Cách đếm phổ biến: châu Á, châu Phi, Bắc Mỹ, Nam Mỹ, Nam Cực, châu Âu và châu Đại Dương.']],
  ['medium', ['Which is the largest country by area?', 'Nước nào có diện tích lớn nhất?'], [['Russia', 'Nga'], ['China', 'Trung Quốc'], ['Canada', 'Canada'], ['The USA', 'Hoa Kỳ']]],
  ['medium', ['Which is the largest hot desert in the world?', 'Sa mạc nóng lớn nhất thế giới là gì?'], ['Sahara', 'Gobi', 'Kalahari', 'Atacama']],
  ['medium', ['Kangaroos live in the wild in which country?', 'Chuột túi sống hoang dã ở nước nào?'], [['Australia', 'Úc'], ['Brazil', 'Brazil'], ['South Africa', 'Nam Phi'], ['India', 'Ấn Độ']]],
  ['medium', ['What is the highest mountain in Vietnam?', 'Núi cao nhất Việt Nam là núi nào?'], ['Fansipan', 'Bà Đen', 'Ngọc Linh', 'Bạch Mã']],
  ['medium', ['Which country has the Great Wall?', 'Vạn Lý Trường Thành ở nước nào?'], [['China', 'Trung Quốc'], ['Mongolia', 'Mông Cổ'], ['Korea', 'Hàn Quốc'], ['Japan', 'Nhật Bản']]],

  ['hard', ['What is the capital of Australia?', 'Thủ đô của Úc là gì?'], ['Canberra', 'Sydney', 'Melbourne', 'Perth']],
  ['hard', ['What is the capital of Canada?', 'Thủ đô của Canada là gì?'], ['Ottawa', 'Toronto', 'Vancouver', 'Montreal']],
  ['hard', ['Which is the smallest country in the world?', 'Nước nhỏ nhất thế giới là nước nào?'], [['Vatican City', 'Vatican'], ['Monaco', 'Monaco'], ['Singapore', 'Singapore'], ['Malta', 'Malta']]],
  ['hard', ['Which river flows through Cairo?', 'Sông nào chảy qua Cairo?'], [['The Nile', 'Sông Nin'], ['The Amazon', 'Sông Amazon'], ['The Danube', 'Sông Đa-nuýp'], ['The Ganges', 'Sông Hằng']]],
  ['hard', ['Machu Picchu, the old Inca city, is in which country?', 'Machu Picchu, thành cổ của người Inca, ở nước nào?'], ['Peru', 'Mexico', 'Chile', ['Egypt', 'Ai Cập']]],
  ['hard', ['Which is the deepest lake in the world?', 'Hồ sâu nhất thế giới là hồ nào?'], ['Baikal', ['Lake Victoria', 'Hồ Victoria'], ['Lake Superior', 'Hồ Superior'], ['Lake Titicaca', 'Hồ Titicaca']]],

  ['expert', ['Which country has the most people?', 'Nước nào đông dân nhất thế giới?'], [['India', 'Ấn Độ'], ['China', 'Trung Quốc'], ['The USA', 'Hoa Kỳ'], ['Indonesia', 'Indonesia']], ['India passed China in 2023.', 'Ấn Độ vượt Trung Quốc vào năm 2023.']],
  ['expert', ['Which is the longest river in Asia?', 'Sông nào dài nhất châu Á?'], [['The Yangtze', 'Trường Giang (Dương Tử)'], ['The Mekong', 'Mê Kông'], ['The Ganges', 'Sông Hằng'], ['The Yellow River', 'Hoàng Hà']]],
  ['expert', ['Mount Kilimanjaro is in which country?', 'Núi Kilimanjaro nằm ở nước nào?'], ['Tanzania', 'Kenya', 'Uganda', ['Ethiopia', 'Ethiopia (Ê-ti-ô-pi-a)']]],
  ['expert', ['Which city used to be called Constantinople?', 'Thành phố nào từng có tên Constantinople?'], ['Istanbul', ['Athens', 'Athens (A-ten)'], ['Rome', 'Roma'], ['Cairo', 'Cairo (Cai-rô)']]],
  ['expert', ['Which country has the longest coastline?', 'Nước nào có đường bờ biển dài nhất?'], ['Canada', ['Russia', 'Nga'], ['Australia', 'Úc'], 'Indonesia']],
  ['expert', ['Machu Picchu is in which country?', 'Machu Picchu nằm ở nước nào?'], ['Peru', 'Mexico', 'Chile', 'Bolivia']],
];

const LIFE: Row[] = [
  ['easy', ['How many players does a football (soccer) team have on the pitch?', 'Một đội bóng đá có bao nhiêu cầu thủ trên sân?'], ['11', '9', '7', '15']],
  ['easy', ['What colour do you get by mixing blue and yellow?', 'Pha màu xanh dương với vàng ra màu gì?'], [['Green', 'Xanh lá'], ['Purple', 'Tím'], ['Orange', 'Cam'], ['Pink', 'Hồng']]],
  ['easy', ['How many colours are in a rainbow?', 'Cầu vồng có mấy màu?'], ['7', '5', '6', '9']],
  ['easy', ['Which fruit is yellow and curved?', 'Loại quả nào màu vàng và cong?'], [['The banana', 'Chuối'], ['The apple', 'Táo'], ['The grape', 'Nho'], ['The cherry', 'Anh đào']]],
  ['easy', ['How many months are in a year?', 'Một năm có mấy tháng?'], ['12', '10', '11', '13']],
  ['easy', ['Which instrument has black and white keys?', 'Nhạc cụ nào có phím đen và trắng?'], [['The piano', 'Đàn piano'], ['The guitar', 'Đàn guitar'], ['The drum', 'Trống'], ['The violin', 'Đàn violin']]],
  ['easy', ['What do you call a person who treats sick animals?', 'Người chữa bệnh cho động vật gọi là gì?'], [['A vet', 'Bác sĩ thú y'], ['A dentist', 'Nha sĩ'], ['A pilot', 'Phi công'], ['A chef', 'Đầu bếp']]],

  ['medium', ['Who painted the Mona Lisa?', 'Ai vẽ bức Mona Lisa?'], ['Leonardo da Vinci', 'Vincent van Gogh', 'Pablo Picasso', 'Claude Monet']],
  ['medium', ['Who wrote "Romeo and Juliet"?', 'Ai viết "Romeo và Juliet"?'], ['William Shakespeare', 'Charles Dickens', 'Mark Twain', 'Victor Hugo']],
  ['medium', ['How often are the Summer Olympic Games held?', 'Thế vận hội Mùa hè được tổ chức bao lâu một lần?'], [['Every 4 years', '4 năm một lần'], ['Every year', 'Mỗi năm'], ['Every 2 years', '2 năm một lần'], ['Every 10 years', '10 năm một lần']]],
  ['medium', ['How many strings does a standard guitar have?', 'Đàn guitar thông thường có mấy dây?'], ['6', '4', '5', '8']],
  ['medium', ['Sushi comes from which country?', 'Sushi là món ăn của nước nào?'], [['Japan', 'Nhật Bản'], ['China', 'Trung Quốc'], ['Thailand', 'Thái Lan'], ['Korea', 'Hàn Quốc']]],
  ['medium', ['In which sport do you hit a shuttlecock?', 'Môn thể thao nào đánh quả cầu lông?'], [['Badminton', 'Cầu lông'], ['Tennis', 'Quần vợt'], ['Golf', 'Gôn'], ['Volleyball', 'Bóng chuyền']]],
  ['medium', ['Which of these is NOT a primary colour in painting?', 'Màu nào KHÔNG phải màu cơ bản trong hội họa?'], [['Green', 'Xanh lá'], ['Red', 'Đỏ'], ['Blue', 'Xanh dương'], ['Yellow', 'Vàng']], ['The painter\'s primaries are red, yellow and blue.', 'Ba màu cơ bản của họa sĩ là đỏ, vàng và xanh dương.']],

  ['hard', ['How many squares are on a chessboard?', 'Bàn cờ vua có bao nhiêu ô?'], ['64', '81', '100', '48']],
  ['hard', ['Who composed "Für Elise"?', 'Ai sáng tác bản "Für Elise"?'], ['Beethoven', 'Mozart', 'Bach', 'Chopin']],
  ['hard', ['How many players are on a basketball team on the court?', 'Một đội bóng rổ có bao nhiêu người trên sân?'], ['5', '6', '7', '11']],
  ['hard', ['Which country gave the world the Olympic Games, in ancient times?', 'Thế vận hội bắt nguồn từ nước nào thời cổ đại?'], [['Greece', 'Hy Lạp'], ['Italy', 'Ý'], ['Egypt', 'Ai Cập'], ['China', 'Trung Quốc']]],
  ['hard', ['Who invented the light bulb that became widely used?', 'Ai phát minh ra bóng đèn điện được dùng rộng rãi?'], ['Thomas Edison', 'Isaac Newton', 'Alexander Graham Bell', 'Albert Einstein'], ['Bell is famous for the telephone.', 'Bell nổi tiếng với điện thoại.']],
  ['hard', ['How many cards are in a standard deck, without jokers?', 'Bộ bài tây tiêu chuẩn (không tính phăng teo) có bao nhiêu lá?'], ['52', '54', '48', '60']],

  ['expert', ['About how long is a marathon?', 'Một cuộc chạy marathon dài khoảng bao nhiêu?'], ['42 km', '21 km', '10 km', '50 km']],
  ['expert', ['How many keys does a standard piano have?', 'Đàn piano tiêu chuẩn có bao nhiêu phím?'], ['88', '76', '64', '100']],
  ['expert', ['Who painted "The Starry Night"?', 'Ai vẽ bức "Đêm đầy sao"?'], ['Vincent van Gogh', 'Claude Monet', 'Pablo Picasso', 'Leonardo da Vinci']],
  ['expert', ['A golden wedding anniversary is how many years?', 'Đám cưới vàng là kỷ niệm bao nhiêu năm?'], ['50', '25', '40', '60'], ['25 years is silver.', '25 năm là đám cưới bạc.']],
  ['expert', ['In tennis, what is a score of zero called?', 'Trong quần vợt, điểm 0 được gọi là gì?'], ['Love', 'Nil', 'Duck', 'Blank']],
  ['expert', ['How many notes, black and white, are in one octave on a piano?', 'Một quãng tám trên đàn piano có bao nhiêu nốt, tính cả phím đen và trắng?'], ['12', '7', '8', '10']],
];

const BY_TYPE: Record<QType, Row[]> = { nature: NATURE, science: SCIENCE, math: MATH, world: WORLD, life: LIFE };

export const QUESTION_TYPES = Object.keys(BY_TYPE) as QType[];

export const QUESTIONS: LadderQuestion[] = QUESTION_TYPES.flatMap((type, t) =>
  BY_TYPE[type].map(([level, q, options, note], i) => ({ id: t * 100 + i + 1, type, level, q, options, note })),
);
