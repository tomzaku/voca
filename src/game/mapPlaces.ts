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
};
