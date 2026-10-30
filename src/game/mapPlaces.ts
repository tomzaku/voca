// Which of the map's name labels are real places with a story to tell (the
// `places` catalog): walk up to one and its label lights up and its story
// shows. Keyed by the label's text, as the map template writes it.
//
// Kept dependency-free like the rest of src/game/'s data.

export const LABEL_PLACES: Record<string, string> = {
  'Sông Hương': 'songHuong',
  'Cầu Trường Tiền': 'truongTien',
  'Cầu Phú Xuân': 'phuXuan',
  'Cầu Dã Viên': 'daVien',
  'Cầu Nguyễn Hoàng': 'nguyenHoang',
  'Kim Long': 'kimLong',
  'Gia Hội': 'giaHoi',
  'Vỹ Dạ': 'vyDa',
  'Ngự Bình': 'nguBinh',
  'Chùa Thiên Mụ': 'thienMu',
  'Ngọ Môn': 'ngoMon',
  'Kỳ Đài': 'kyDai',
  'Tàng Thư Lâu': 'tangThuLau',
  'Duyệt Thị Đường': 'duyetThiDuong',
  'Hồ Tịnh Tâm': 'tinhTam',
  'Ga Huế': 'gaHue',
  'Trường Quốc Học': 'quocHoc',
  'Phố đi bộ': 'walkingStreet',
  'Cung An Định': 'anDinh',
  'Lăng Khải Định': 'khaiDinh',
  'Phu Văn Lâu': 'phuVanLau',
  'Nghênh Lương Đình': 'nghenhLuong',
  'Thế Miếu': 'theMieu',
  'Hiển Lâm Các': 'hienLam',
};

/** Where each keeper stands — walking up to one tells that place's story.
 *  The skills' keepers stand at their rooms' places (ROOMS[…].place); this
 *  names the rest. */
export const KEEPER_PLACES: Record<string, string> = {
  collections: 'thaiHoa',
};
