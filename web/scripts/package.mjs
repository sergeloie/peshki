import { deflateRawSync } from 'node:zlib';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const ARCHIVE = 'peshki.zip';
const SIZE_LIMIT = 8 * 1024 * 1024;

function collect(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collect(full));
    } else {
      files.push(full);
    }
  }
  return files.sort();
}

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function entryName(file) {
  const name = relative(DIST, file).split(sep).join('/');
  // Yandex Games requires ASCII file names without spaces in the archive.
  if (!/^[\x21-\x7e/]+$/.test(name) || name.includes(' ')) {
    throw new Error(`archive path is not plain ASCII: ${name}`);
  }
  return name;
}

const files = collect(DIST);
if (!files.includes(join(DIST, 'index.html'))) {
  throw new Error('dist/index.html is missing: the archive root must contain index.html');
}

const local = [];
const central = [];
let offset = 0;

for (const file of files) {
  const name = Buffer.from(entryName(file), 'ascii');
  const data = readFileSync(file);
  const body = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);

  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0x21, 12); // 1980-01-01, keeps the archive reproducible
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(body.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);

  local.push(header, name, body);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(0, 8);
  entry.writeUInt16LE(8, 10);
  entry.writeUInt16LE(0, 12);
  entry.writeUInt16LE(0x21, 14);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(body.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(name.length, 28);
  entry.writeUInt32LE(offset, 42);
  central.push(entry, name);

  offset += header.length + name.length + body.length;
}

const centralSize = central.reduce((sum, buffer) => sum + buffer.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

const archive = Buffer.concat([...local, ...central, end]);
if (archive.length > SIZE_LIMIT) {
  throw new Error(`archive is ${archive.length} bytes, over the ${SIZE_LIMIT} byte limit`);
}

mkdirSync('.', { recursive: true });
writeFileSync(ARCHIVE, archive);

const megabytes = (archive.length / (1024 * 1024)).toFixed(2);
console.log(`${ARCHIVE}: ${archive.length} bytes (${megabytes} MB), ${files.length} files`);
for (const file of files) {
  console.log(`  ${entryName(file)}`);
}
