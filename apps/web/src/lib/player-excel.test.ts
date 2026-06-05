import { describe, expect, it } from 'vitest';
import { buildPlayerExportRows, parsePlayerImportRows } from './player-excel';

function rowsFromObjects(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? {});

  return [
    headers,
    ...rows.map((row) => headers.map((header) => row[header])),
  ];
}

describe('player excel import/export helpers', () => {
  it('imports rows exported from the player list without treating STT as the name', () => {
    const exportedRows = buildPlayerExportRows([
      {
        fullName: 'Nguyễn Văn An',
        gender: 'MALE',
        phone: '0901234567',
        note: 'Đội trưởng',
      },
      {
        fullName: 'Trần Thị Diệu',
        gender: 'FEMALE',
        phone: '0907654321',
        note: 'Chính thức',
      },
    ]);

    expect(parsePlayerImportRows(rowsFromObjects(exportedRows))).toEqual([
      {
        fullName: 'Nguyễn Văn An',
        gender: 'MALE',
        phone: '0901234567',
        note: 'Đội trưởng',
      },
      {
        fullName: 'Trần Thị Diệu',
        gender: 'FEMALE',
        phone: '0907654321',
        note: 'Chính thức',
      },
    ]);
  });

  it('continues to import the template format without STT', () => {
    expect(parsePlayerImportRows([
      ['Họ và tên', 'Giới tính', 'Số điện thoại', 'Ghi chú'],
      ['Nguyễn Văn An', 'Nam', '0901234567', 'Đội trưởng'],
      ['Trần Thị Diệu', 'Nữ', '0907654321', 'Chính thức'],
    ])).toEqual([
      {
        fullName: 'Nguyễn Văn An',
        gender: 'MALE',
        phone: '0901234567',
        note: 'Đội trưởng',
      },
      {
        fullName: 'Trần Thị Diệu',
        gender: 'FEMALE',
        phone: '0907654321',
        note: 'Chính thức',
      },
    ]);
  });
});
