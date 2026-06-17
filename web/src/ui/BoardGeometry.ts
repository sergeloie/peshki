import { Vector3 } from 'three';

export interface BoardLayout {
  corners: Vector3[];
  fields: Vector3[][];
  homes: Vector3[][];
  allCells: Map<string, Vector3>;
}

export function computeBoardLayout(): BoardLayout {
  const fieldR = 5;
  const homeOffset = 1.2;
  const cornerAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

  const corners: Vector3[] = cornerAngles.map(angle =>
    new Vector3(fieldR * Math.cos(angle), 0, fieldR * Math.sin(angle))
  );

  const fields: Vector3[][] = [];
  for (let side = 0; side < 4; side++) {
    const start = corners[side];
    const end = corners[(side + 1) % 4];
    const sideFields: Vector3[] = [];
    for (let j = 1; j <= 6; j++) {
      const t = j / 7;
      sideFields.push(new Vector3(
        start.x + (end.x - start.x) * t,
        0,
        start.z + (end.z - start.z) * t,
      ));
    }
    fields.push(sideFields);
  }

  const homeDirs = [
    new Vector3(0, 0, 1),
    new Vector3(-1, 0, 0),
    new Vector3(0, 0, -1),
    new Vector3(1, 0, 0),
  ];

  const homes: Vector3[][] = [];
  for (let i = 0; i < 4; i++) {
    const cp = corners[i];
    const d = homeDirs[i];
    const sideHomes: Vector3[] = [];
    for (let j = 1; j <= 3; j++) {
      sideHomes.push(new Vector3(
        cp.x + d.x * homeOffset * j,
        0,
        cp.z + d.z * homeOffset * j,
      ));
    }
    homes.push(sideHomes);
  }

  const allCells = new Map<string, Vector3>();
  for (let i = 0; i < 4; i++) {
    allCells.set(`corner_${i}`, corners[i]);
  }
  for (let side = 0; side < 4; side++) {
    for (let j = 0; j < 6; j++) {
      allCells.set(`field_${side}_${j}`, fields[side][j]);
    }
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      allCells.set(`home_${i}_${j}`, homes[i][j]);
    }
  }

  return { corners, fields, homes, allCells };
}
