// The places' memorials (the place card's expanded view): real
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
  /** Wikipedia, in English and Vietnamese (some places have only the one,
   *  some neither). */
  wiki?: { en?: string; vi: string };
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
  quocHoc: {
    photos: [
      { src: 'places/quocHoc-1.webp', w: 800, h: 589, author: 'Francisco Anzola', license: 'CC BY 2.0', page: 'https://commons.wikimedia.org/wiki/File:Quoc_Hoc_main_building_(side)_(7165969089).jpg' },
      { src: 'places/quocHoc-2.webp', w: 800, h: 533, author: 'Lưu Ly', license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:Qu%E1%BB%91c_H%E1%BB%8Dc_Hu%E1%BA%BF.jpg' },
    ],
    wiki: { en: 'https://en.wikipedia.org/wiki/Quốc_Học_–_Huế_High_School_for_the_Gifted', vi: 'https://vi.wikipedia.org/wiki/Trường_Trung_học_phổ_thông_chuyên_Quốc_Học_–_Huế' },
  },
  kimLong: {
    photos: [
      { src: 'places/kimLong-1.webp', w: 800, h: 600, author: 'Christophe95', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:%C4%90%C3%ACnh_l%C3%A0ng_Kim_Long.jpg' },
    ],
  },
  tinhTam: {
    photos: [
      { src: 'places/tinhTam-1.webp', w: 800, h: 600, author: 'Christophe95', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Tinh_Tam_Lake_1.jpg' },
      { src: 'places/tinhTam-2.webp', w: 800, h: 600, author: 'Christophe95', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Tinh_Tam_Lake_5.jpg' },
    ],
  },
  duyetThiDuong: {
    photos: [
      { src: 'places/duyetThiDuong-1.webp', w: 800, h: 600, author: 'Liftold', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Duy%E1%BB%87t_Th%E1%BB%8B_%C4%90%C6%B0%E1%BB%9Dng.JPG' },
      { src: 'places/duyetThiDuong-2.webp', w: 800, h: 638, author: 'Francisco Anzola', license: 'CC BY 2.0', page: 'https://commons.wikimedia.org/wiki/File:Duy%E1%BB%87t_Th%E1%BB%8B_%C4%90%C6%B0%E1%BB%9Dng_(ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF).jpg' },
    ],
  },
  tangThuLau: {
    photos: [
      { src: 'places/tangThuLau-1.webp', w: 800, h: 534, author: 'Lưu Ly', license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:T%C3%A0ng_th%C6%B0_L%C3%A2u_2.jpg' },
      { src: 'places/tangThuLau-2.webp', w: 800, h: 590, author: 'Uncredited photographer', license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:T%C3%A0ng_Th%C6%B0_l%C3%A2u_%E2%80%93_N%C6%A1i_l%C6%B0u_gi%E1%BB%AF_c%C3%A1c_lo%E1%BA%A1i_v%C4%83n_th%C6%B0_quan_tr%E1%BB%8Dng_c%E1%BB%A7a_tri%E1%BB%81u_Nguy%E1%BB%85n._%E1%BA%A2nh_ch%E1%BB%A5p_n%C4%83m_1942.jpg' },
    ],
  },
  vanMieu: {
    photos: [
      { src: 'places/vanMieu-1.webp', w: 800, h: 533, author: 'ntt', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Hue,_le_Temple_de_la_litt%C3%A9rature.jpg' },
      { src: 'places/vanMieu-2.webp', w: 800, h: 533, author: 'Lưu Ly', license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:Temple_Main_gate.jpg' },
    ],
  },
  conHen: {
    photos: [
      { src: 'places/conHen-1.webp', w: 800, h: 534, author: 'Lưu Ly', license: 'CC BY 3.0', page: 'https://commons.wikimedia.org/wiki/File:C%E1%BB%93n_H%E1%BA%BFn_1.JPG' },
      { src: 'places/conHen-2.webp', w: 800, h: 283, author: 'Lưu Ly', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:S%C3%B4ng_H%C6%B0%C6%A1ng_-_C%E1%BA%A7u_Tr%C6%B0%E1%BB%9Dng_Ti%E1%BB%81n_-_C%E1%BB%93n_H%E1%BA%BFn_-_panoramio.jpg' },
    ],
  },
  dragonBoat: {
    photos: [
      { src: 'places/dragonBoat-1.webp', w: 800, h: 449, author: 'David McKelvey from Brisbane, Australia', license: 'CC BY 2.0', page: 'https://commons.wikimedia.org/wiki/File:Dragon_boat,_Perfume_River,_Hue,_Vietnam_(6927374462).jpg' },
      { src: 'places/dragonBoat-2.webp', w: 800, h: 532, author: 'P. Hughes', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Hu%E1%BA%BF_-_Vietnamese_dragon_boat_operating_as_a_tourist_vessel_on_the_Perfume_River.jpg' },
    ],
  },
  songHuong: {
    photos: [
      { src: 'places/songHuong-1.webp', w: 800, h: 533, author: 'CEphoto, Uwe Aranas', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Hue_Vietnam_Perfume-River-01.jpg' },
      { src: 'places/songHuong-2.webp', w: 800, h: 533, author: 'CEphoto, Uwe Aranas', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Hue_Vietnam_Perfume-River-03.jpg' },
    ],
  },
  vyDa: {
    photos: [
      { src: 'places/vyDa-1.webp', w: 800, h: 534, author: 'Lưu Ly', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Toan_canh_thon_Vy.jpg' },
      { src: 'places/vyDa-2.webp', w: 800, h: 534, author: 'Lưu Ly', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Dinh_lang_Vi_Da.jpg' },
    ],
  },
  gaHue: {
    photos: [
      { src: 'places/gaHue-1.webp', w: 800, h: 533, author: 'CEphoto, Uwe Aranas', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Hue_Vietnam_Hue-Railway-Station-01.jpg' },
      { src: 'places/gaHue-2.webp', w: 800, h: 571, author: 'Clay Gilliland', license: 'CC BY-SA 2.0', page: 'https://commons.wikimedia.org/wiki/File:Hue_Railway_Station_(12173532004).jpg' },
    ],
  },
  anDinh: {
    photos: [
      { src: 'places/anDinh-1.webp', w: 800, h: 600, author: 'Chainwit', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:An_Dinh_Palace_-_Cung_An_%C4%90%E1%BB%8Bnh_(2024)_-_front_facade_-_img_04.jpg' },
      { src: 'places/anDinh-2.webp', w: 800, h: 600, author: 'Chainwit', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:An_Dinh_Palace_-_Cung_An_%C4%90%E1%BB%8Bnh_(2024)_-_front_facade_-_img_05.jpg' },
    ],
  },
  nguBinh: {
    photos: [
      { src: 'places/nguBinh-1.webp', w: 800, h: 534, author: 'Lưu Ly', license: 'CC BY 3.0', page: 'https://commons.wikimedia.org/wiki/File:Nui_Ngu_Binh.jpg' },
    ],
  },
  phuXuan: {
    photos: [
      { src: 'places/phuXuan-1.webp', w: 800, h: 531, author: 'Nguyen1310', license: 'CC BY 3.0', page: 'https://commons.wikimedia.org/wiki/File:Phu_Xuan_Bridge_at_Night_over_the_Huong_(Perfume)_River,_Hue,_Vietnam_01.jpg' },
    ],
  },
  daVien: {
    photos: [
      { src: 'places/daVien-1.webp', w: 800, h: 600, author: 'Christophe95', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:D%C3%A3_Vi%C3%AAn_railway_and_road_bridges.jpg' },
      { src: 'places/daVien-2.webp', w: 800, h: 600, author: 'Bùi Thụy Đào Nguyên', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Tr%C3%AAn_c%E1%BA%A7u_D%C3%A3_Vi%C3%AAn.jpg' },
    ],
  },
  nguyenHoang: {
    photos: [
      { src: 'places/nguyenHoang-1.webp', w: 800, h: 343, author: 'Khoitran1957', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:C%E1%BA%A7u_Nguy%E1%BB%85n_Ho%C3%A0ng_2025-04-27.jpg' },
    ],
  },
  phuVanLau: {
    photos: [
      { src: 'places/phuVanLau-1.webp', w: 800, h: 529, author: 'Xiquinho Silva', license: 'CC BY 2.0', page: 'https://commons.wikimedia.org/wiki/File:Phu_V%C4%83n_L%C3%A2u_(03-10-17)_I.jpg' },
      { src: 'places/phuVanLau-2.webp', w: 800, h: 533, author: 'Bùi Thụy Đào Nguyên', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Phu_V%C4%83n_l%C3%A2u.jpg' },
    ],
  },
  nghenhLuong: {
    photos: [
      { src: 'places/nghenhLuong-1.webp', w: 800, h: 312, author: 'Lưu Ly', license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:Ngh%C3%AAnh_L%C6%B0%C6%A1ng_%C4%90%C3%ACnh.jpg' },
    ],
  },
  theMieu: {
    photos: [
      { src: 'places/theMieu-1.webp', w: 800, h: 533, author: 'Lưu Ly', license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:Th%E1%BA%BF_Mi%E1%BA%BFu_(Hu%E1%BA%BF).jpg' },
      { src: 'places/theMieu-2.webp', w: 800, h: 1067, author: 'Phương Huy', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Th%E1%BA%BF_mi%E1%BA%BFu_%E1%BB%9F_%C4%90%E1%BA%A1i_n%E1%BB%99i_Hu%E1%BA%BF,_th%C3%A1ng_3_n%C4%83m_2021_(5).jpg' },
    ],
  },
  hienLam: {
    photos: [
      { src: 'places/hienLam-1.webp', w: 800, h: 533, author: 'Supanut Arunoprayote', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Pavilion_of_Splendour.jpg' },
      { src: 'places/hienLam-2.webp', w: 800, h: 604, author: 'Unknown', license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:Hi%E1%BB%83n_L%C3%A2m_c%C3%A1c_%26_C%E1%BB%ADu_%C4%90%E1%BB%89nh,_1920s.jpg' },
    ],
  },
  thuongTu: {
    photos: [
      { src: 'places/thuongTu-1.webp', w: 800, h: 533, author: 'Andrea Schaffer from Sydney, Australia', license: 'CC BY 2.0', page: 'https://commons.wikimedia.org/wiki/File:Thuong_Tu_gate,_Hu%E1%BA%BF_citadel_(5679815452).jpg' },
      { src: 'places/thuongTu-2.webp', w: 800, h: 600, author: 'Christophe95', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:C%E1%BB%ADa_Th%C6%B0%E1%BB%A3ng_T%E1%BB%A9_2.jpg' },
    ],
  },
  cuaHuu: {
    photos: [
      { src: 'places/cuaHuu-1.webp', w: 800, h: 600, author: 'Christophe95', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:C%E1%BB%ADa_H%E1%BB%AFu.jpg' },
    ],
  },
  tuCamThanh: {
    photos: [
      { src: 'places/tuCamThanh-1.webp', w: 800, h: 224, author: 'Christophe95', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Purple_Forbidden_City.jpg' },
      { src: 'places/tuCamThanh-2.webp', w: 800, h: 600, author: 'Christophe95', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Purple_Forbidden_City_9.jpg' },
    ],
  },
  dienTho: {
    photos: [
      { src: 'places/dienTho-1.webp', w: 800, h: 601, author: 'Vano111ru', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Di%C3%AAn_Th%E1%BB%8D_palace.jpg' },
      { src: 'places/dienTho-2.webp', w: 800, h: 450, author: 'Andre Hospers', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Di%C3%AAn_Th%E1%BB%8D_palace_Hue_Imperial_City.jpg' },
    ],
  },
};
