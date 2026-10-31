// The famous places' memorials (the place card's expanded view): real
// photos of each, from Wikimedia Commons, saved beside the app in
// public/places/ at 800px — each credited as its licence asks, with a link to
// its page there — and where to read more. A place without an entry here
// still opens its memorial, with its story alone.

export interface PlacePhoto {
  /** Under the app's base URL. */
  src: string;
  w: number;
  h: number;
  author: string;
  license: string;
  /** Its page on Wikimedia Commons: the photo, its licence and its author. */
  page: string;
}

export interface PlaceDetail {
  photos: PlacePhoto[];
  /** Wikipedia, in English and Vietnamese (some places have only the one). */
  wiki: { en?: string; vi: string };
}

export const PLACE_DETAILS: Record<string, PlaceDetail> = {
  ngoMon: {
    photos: [
      { src: 'places/ngoMon-1.webp', w: 800, h: 450, author: 'Supanut Arunoprayote', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Meridian_Gate,_Hue_(I).jpg' },
      { src: 'places/ngoMon-2.webp', w: 800, h: 600, author: 'Chainwit', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Hu%E1%BA%BF_(2024)_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_(Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF)_-_img_06.jpg' },
    ],
    wiki: { en: 'https://en.wikipedia.org/wiki/Meridian_Gate_(Huế)', vi: 'https://vi.wikipedia.org/wiki/Ngọ_Môn' },
  },
  thaiHoa: {
    photos: [
      { src: 'places/thaiHoa-1.webp', w: 800, h: 533, author: 'Suicasmo', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Thai_Hoa_Palace_20190917.jpg' },
      { src: 'places/thaiHoa-2.webp', w: 800, h: 623, author: 'Uncredited photographer', license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:Imperial_orchestra_performing_in_front_of_the_Th%C3%A1i_H%C3%B2a_palace_-_Ch01_sub01_04_vn.jpg' },
    ],
    wiki: { vi: 'https://vi.wikipedia.org/wiki/Điện_Thái_Hòa' },
  },
  kyDai: {
    photos: [
      { src: 'places/kyDai-1.webp', w: 800, h: 600, author: 'Chainwit', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Hu%E1%BA%BF_(2024)_-_flag_tower_K%E1%BB%B3_%C4%90%C3%A0i.jpg' },
      { src: 'places/kyDai-2.webp', w: 800, h: 600, author: 'Bùi Thụy Đào Nguyên', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:K%E1%BB%B3_%C4%91%C3%A0i_%E1%BB%9F_Hu%E1%BA%BF.jpg' },
    ],
    wiki: { vi: 'https://vi.wikipedia.org/wiki/Kỳ_đài_(Huế)' },
  },
  thienMu: {
    photos: [
      { src: 'places/thienMu-1.webp', w: 800, h: 1067, author: 'Chainwit', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Ch%C3%B9a_Thi%C3%AAn_M%E1%BB%A5_-_Hu%E1%BA%BF_(2024)_-_img_39.jpg' },
      { src: 'places/thienMu-2.webp', w: 800, h: 533, author: 'CEphoto, Uwe Aranas', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-01.jpg' },
    ],
    wiki: { en: 'https://en.wikipedia.org/wiki/Thiên_Mụ_Temple', vi: 'https://vi.wikipedia.org/wiki/Chùa_Thiên_Mụ' },
  },
  truongTien: {
    photos: [
      { src: 'places/truongTien-1.webp', w: 800, h: 600, author: 'Chainwit', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:2024-07_C%E1%BA%A7u_Tr%C6%B0%E1%BB%9Dng_Ti%E1%BB%81n_-_Truong_Tien_Bridge_-_Hu%E1%BA%BF_-_img_05.jpg' },
      { src: 'places/truongTien-2.webp', w: 800, h: 301, author: 'Supanut Arunoprayote', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Truong_Tien_bridge_(I).jpg' },
    ],
    wiki: { en: 'https://en.wikipedia.org/wiki/Truong_Tien_Bridge', vi: 'https://vi.wikipedia.org/wiki/Cầu_Trường_Tiền' },
  },
  dongBa: {
    photos: [
      { src: 'places/dongBa-1.webp', w: 800, h: 600, author: 'Chainwit', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Dong_Ba_Market_(Hue)_-_Ch%E1%BB%A3_%C4%90%C3%B4ng_Ba_Hu%E1%BA%BF_(July_2024)_-_img_02.jpg' },
      { src: 'places/dongBa-2.webp', w: 800, h: 600, author: 'Chainwit', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Dong_Ba_Market_(Hue)_-_Ch%E1%BB%A3_%C4%90%C3%B4ng_Ba_Hu%E1%BA%BF_(July_2024)_-_img_07.jpg' },
    ],
    wiki: { en: 'https://en.wikipedia.org/wiki/Đông_Ba_Market', vi: 'https://vi.wikipedia.org/wiki/Chợ_Đông_Ba' },
  },
  khaiDinh: {
    photos: [
      { src: 'places/khaiDinh-1.webp', w: 800, h: 600, author: 'Andrew from Vancouver, Canada', license: 'CC BY-SA 2.0', page: 'https://commons.wikimedia.org/wiki/File:Kh%E1%BA%A3i_%C4%90%E1%BB%8Bnh_tomb.jpg' },
      { src: 'places/khaiDinh-2.webp', w: 800, h: 600, author: 'Chainwit', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Hu%E1%BA%BF_(2024)_-_Mausoleum_of_Emperor_Kh%E1%BA%A3i_%C4%90%E1%BB%8Bnh_-_exterior_-_img_01.jpg' },
    ],
    wiki: { en: 'https://en.wikipedia.org/wiki/Tomb_of_Khải_Định', vi: 'https://vi.wikipedia.org/wiki/Lăng_Khải_Định' },
  },
  tuDuc: {
    photos: [
      { src: 'places/tuDuc-1.webp', w: 800, h: 600, author: 'Janet', license: 'CC BY 2.0', page: 'https://commons.wikimedia.org/wiki/File:Tomb_of_Tu_Duc_3.jpg' },
      { src: 'places/tuDuc-2.webp', w: 800, h: 600, author: 'LÊ TẤN LỘC', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Xung_Khi%C3%AAm_T%E1%BA%A1_(L%C4%83ng_T%E1%BB%B1_%C4%90%E1%BB%A9c)_2.JPG' },
    ],
    wiki: { en: 'https://en.wikipedia.org/wiki/Tomb_of_Tự_Đức', vi: 'https://vi.wikipedia.org/wiki/Lăng_Tự_Đức' },
  },
  minhMang: {
    photos: [
      { src: 'places/minhMang-1.webp', w: 800, h: 533, author: 'CEphoto, Uwe Aranas', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Hue_Vietnam_Tomb-of-Emperor-Minh-Mang-01.jpg' },
      { src: 'places/minhMang-2.webp', w: 800, h: 533, author: 'CEphoto, Uwe Aranas', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Hue_Vietnam_Tomb-of-Emperor-Minh-Mang-04.jpg' },
    ],
    wiki: { vi: 'https://vi.wikipedia.org/wiki/Lăng_Minh_Mạng' },
  },
};
