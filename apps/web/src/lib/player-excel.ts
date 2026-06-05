export type PlayerImportRow = {
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  phone?: string;
  note?: string;
};

export type PlayerExportSource = {
  fullName?: string | null;
  gender?: string | null;
  phone?: string | null;
  note?: string | null;
};

type ColumnKey = 'index' | 'fullName' | 'gender' | 'phone' | 'note';

const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  index: ['stt', 'so thu tu', 'no', 'index'],
  fullName: ['ho va ten', 'ho ten', 'ten', 'full name', 'fullname', 'name'],
  gender: ['gioi tinh', 'gender', 'sex'],
  phone: ['so dien thoai', 'dien thoai', 'sdt', 'phone', 'phone number'],
  note: ['ghi chu', 'note', 'notes'],
};

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cellToString(value: unknown) {
  return String(value ?? '').trim();
}

function findHeaderIndex(header: unknown[], key: ColumnKey) {
  const aliases = HEADER_ALIASES[key];

  return header.findIndex((value) => aliases.includes(normalizeHeader(value)));
}

function inferGender(rawValue: string): 'MALE' | 'FEMALE' {
  const rawGender = normalizeHeader(rawValue).toUpperCase();

  return rawGender.includes('FEMALE') ||
    rawGender.includes('NU') ||
    rawGender.includes('F')
    ? 'FEMALE'
    : 'MALE';
}

function getColumnIndexes(header: unknown[]) {
  const index = findHeaderIndex(header, 'index');
  const fullName = findHeaderIndex(header, 'fullName');
  const gender = findHeaderIndex(header, 'gender');
  const phone = findHeaderIndex(header, 'phone');
  const note = findHeaderIndex(header, 'note');
  const recognizedCount = [fullName, gender, phone, note].filter((i) => i >= 0).length;
  const hasHeader = recognizedCount >= 2;

  if (hasHeader) {
    return {
      startRow: 1,
      fullName: fullName >= 0 ? fullName : index >= 0 ? index + 1 : 0,
      gender: gender >= 0 ? gender : index >= 0 ? index + 2 : 1,
      phone: phone >= 0 ? phone : index >= 0 ? index + 3 : 2,
      note: note >= 0 ? note : index >= 0 ? index + 4 : 3,
    };
  }

  return {
    startRow: 0,
    fullName: 0,
    gender: 1,
    phone: 2,
    note: 3,
  };
}

export function parsePlayerImportRows(rawRows: unknown[][]): PlayerImportRow[] {
  if (rawRows.length === 0) return [];

  const columns = getColumnIndexes(rawRows[0] ?? []);
  const rows = rawRows.slice(columns.startRow);

  return rows.reduce<PlayerImportRow[]>((players, row) => {
    const fullName = cellToString(row[columns.fullName]);
    const gender = cellToString(row[columns.gender]);
    const phone = cellToString(row[columns.phone]);
    const note = cellToString(row[columns.note]);

    if (!fullName) return players;

    players.push({
      fullName,
      gender: inferGender(gender),
      phone: phone || undefined,
      note: note || undefined,
    });

    return players;
  }, []);
}

export function buildPlayerTemplateRows() {
  return [
    {
      'Họ và tên': 'Nguyễn Văn An',
      'Giới tính': 'Nam',
      'Số điện thoại': '0901234567',
      'Ghi chú': 'Đội trưởng tiềm năng',
    },
    {
      'Họ và tên': 'Trần Thị Diệu',
      'Giới tính': 'Nữ',
      'Số điện thoại': '0907654321',
      'Ghi chú': 'Vận động viên chính thức',
    },
  ];
}

export function buildPlayerExportRows(players: PlayerExportSource[]) {
  return players.map((player, idx) => ({
    STT: idx + 1,
    'Họ và tên': player.fullName ?? '',
    'Giới tính': player.gender === 'FEMALE' ? 'Nữ' : 'Nam',
    'Số điện thoại': player.phone ?? '',
    'Ghi chú': player.note ?? '',
  }));
}
