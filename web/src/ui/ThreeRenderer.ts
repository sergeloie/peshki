import {
  Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight,
  CylinderGeometry, SphereGeometry, PlaneGeometry, ConeGeometry,
  MeshStandardMaterial, MeshBasicMaterial, Mesh, Color, Vector3,
  Raycaster, Vector2, Group, TextureLoader, CanvasTexture,
  Object3D, PCFSoftShadowMap,
} from 'three';
import { Board } from '../engine/Board';
import { Cell, CellType } from '../engine/Cell';
import { Pawn, PawnState } from '../engine/Pawn';
import { computeBoardLayout } from './BoardGeometry';

const PLAYER_COLORS = [0xe88c8c, 0x8cc9a8, 0xf0c87a, 0x8ab4d6];
const PLAYER_COLORS_LIGHT = [0xf2b8b8, 0xb8dfc8, 0xf5dda8, 0xb0cfe6];
const CELL_COLOR = 0xe8ddd0;
const CELL_HIGHLIGHT = 0x8cc9a8;
const CELL_SELECTED = 0xc9a8e8;
const ISLAND_COLOR = 0x8cc9a8;
const ISLAND_SIDE = 0x8b7355;
const WATER_COLOR = 0x87ceeb;
const BG_COLOR = 0xf5ede3;

export class ThreeRenderer {
  readonly domElement: HTMLCanvasElement;
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private raycaster: Raycaster;
  private mouse: Vector2;

  private layout = computeBoardLayout();
  private cellMeshes: Map<Cell, Mesh> = new Map();
  private pawnMeshes: Map<number, Group> = new Map();
  private cellKeyMap: Map<string, Cell> = new Map();
  private selectedPawnMesh: Mesh | null = null;
  private glowMeshes: Mesh[] = [];

  private board!: Group;
  private pawnsGroup!: Group;
  private decorGroup!: Group;

  constructor(canvas: HTMLCanvasElement) {
    this.domElement = canvas;

    this.scene = new Scene();
    this.scene.background = new Color(BG_COLOR);

    const aspect = canvas.width / canvas.height;
    this.camera = new PerspectiveCamera(30, aspect, 0.1, 100);
    this.camera.position.set(8, 10, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.toneMapping = 1;
    this.renderer.toneMappingExposure = 1.1;

    this.raycaster = new Raycaster();
    this.mouse = new Vector2();

    const ambient = new AmbientLight(0xfff5e6, 0.7);
    this.scene.add(ambient);

    const sun = new DirectionalLight(0xffffff, 1.0);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    const hemi = new AmbientLight(0xffffff, 0.3);
    hemi.position.set(0, 10, 0);
    this.scene.add(hemi);

    this.createWater();
    this.createIsland();
  }

  private createWater(): void {
    const waterGeo = new PlaneGeometry(40, 40);
    const waterMat = new MeshStandardMaterial({
      color: WATER_COLOR,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const water = new Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.8;
    water.receiveShadow = true;
    this.scene.add(water);
  }

  private createIsland(): void {
    this.board = new Group();

    const baseGeo = new CylinderGeometry(6.5, 7, 1.2, 32);
    const baseMat = new MeshStandardMaterial({ color: ISLAND_COLOR, roughness: 0.9 });
    const base = new Mesh(baseGeo, baseMat);
    base.position.y = -0.6;
    base.receiveShadow = true;
    base.castShadow = true;
    this.board.add(base);

    const sideGeo = new CylinderGeometry(7, 7.5, 1.0, 32);
    const sideMat = new MeshStandardMaterial({ color: ISLAND_SIDE, roughness: 0.95 });
    const side = new Mesh(sideGeo, sideMat);
    side.position.y = -1.3;
    side.receiveShadow = true;
    this.board.add(side);

    const topGeo = new CylinderGeometry(6.3, 6.5, 0.1, 32);
    const topMat = new MeshStandardMaterial({ color: 0x9ad4a0, roughness: 0.85 });
    const top = new Mesh(topGeo, topMat);
    top.position.y = 0.0;
    top.receiveShadow = true;
    this.board.add(top);

    this.scene.add(this.board);

    this.pawnsGroup = new Group();
    this.scene.add(this.pawnsGroup);

    this.decorGroup = new Group();
    this.scene.add(this.decorGroup);

    this.createDecorations();
  }

  private createDecorations(): void {
    const treePositions = [
      new Vector3(-3, 0, -2), new Vector3(2, 0, -3.5),
      new Vector3(-1.5, 0, 3), new Vector3(3.5, 0, 1),
      new Vector3(-4, 0, 0.5), new Vector3(0, 0, -4),
      new Vector3(4, 0, -1), new Vector3(-2.5, 0, 2.5),
    ];

    for (const pos of treePositions) {
      this.createTree(pos);
    }
  }

  private createTree(pos: Vector3): void {
    const trunkGeo = new CylinderGeometry(0.06, 0.08, 0.4, 8);
    const trunkMat = new MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 });
    const trunk = new Mesh(trunkGeo, trunkMat);
    trunk.position.set(pos.x, 0.3, pos.z);
    trunk.castShadow = true;
    this.decorGroup.add(trunk);

    const leavesGeo = new ConeGeometry(0.3, 0.6, 8);
    const leavesMat = new MeshStandardMaterial({ color: 0x4a8c3f, roughness: 0.85 });
    const leaves = new Mesh(leavesGeo, leavesMat);
    leaves.position.set(pos.x, 0.7, pos.z);
    leaves.castShadow = true;
    this.decorGroup.add(leaves);
  }

  render(board: Board, selectedPawn: Pawn | null = null, validTargets: Cell[] = []): void {
    this.cellMeshes.clear();
    this.cellKeyMap.clear();
    this.glowMeshes.forEach(m => this.scene.remove(m));
    this.glowMeshes = [];

    while (this.pawnsGroup.children.length > 0) {
      const child = this.pawnsGroup.children[0];
      this.pawnsGroup.remove(child);
    }

    const sortedPlayers = [...board.players].sort((a, b) => a.number - b.number);
    const cornerAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

    for (let i = 0; i < 4; i++) {
      const corner = board.getCorner(sortedPlayers[i]);
      const pos = this.layout.corners[i];
      this.createCellMesh(corner, pos, 0.45, true, validTargets, selectedPawn);
    }

    for (let side = 0; side < 4; side++) {
      let cell: Cell | null = board.getCorner(sortedPlayers[side]);
      for (let j = 0; j < 6; j++) {
        cell = cell!.nextFieldCell;
        if (cell) {
          this.createCellMesh(cell, this.layout.fields[side][j], 0.35, false, validTargets, selectedPawn);
        }
      }
    }

    for (let i = 0; i < 4; i++) {
      const corner = board.getCorner(sortedPlayers[i]);
      let home = corner.nextHomeCell;
      let idx = 0;
      while (home !== null) {
        this.createCellMesh(home, this.layout.homes[i][idx], 0.3, false, validTargets, selectedPawn);
        home = home.nextHomeCell;
        idx++;
      }
    }

    const allCells = board.getAllCells();
    for (const cell of allCells) {
      if (cell.pawn) {
        this.createPawnMesh(cell.pawn, this.getCellPosition(cell, board));
      }
    }
  }

  private createCellMesh(
    cell: Cell,
    pos: Vector3,
    radius: number,
    isCorner: boolean,
    validTargets: Cell[],
    selectedPawn: Pawn | null,
  ): void {
    const isValidTarget = validTargets.includes(cell);
    const isSelected = selectedPawn?.cell === cell;

    const height = isCorner ? 0.18 : 0.12;
    const geo = new CylinderGeometry(radius, radius, height, 24);
    const color = isValidTarget ? CELL_HIGHLIGHT : isSelected ? CELL_SELECTED : CELL_COLOR;
    const mat = new MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.05,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(pos.x, height / 2, pos.z);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.userData.cell = cell;

    this.cellMeshes.set(cell, mesh);
    this.scene.add(mesh);

    if (isValidTarget) {
      const glowGeo = new CylinderGeometry(radius + 0.08, radius + 0.08, 0.02, 24);
      const glowMat = new MeshBasicMaterial({
        color: 0x6ab88a,
        transparent: true,
        opacity: 0.4,
      });
      const glow = new Mesh(glowGeo, glowMat);
      glow.position.set(pos.x, 0.01, pos.z);
      this.scene.add(glow);
      this.glowMeshes.push(glow);
    }
  }

  private createPawnMesh(pawn: Pawn, pos: Vector3): void {
    const colorIdx = pawn.player.number - 1;
    const r = 0.22;
    const h = 0.5;

    const bodyGeo = new CylinderGeometry(r * 0.8, r, h, 16);
    const bodyMat = new MeshStandardMaterial({
      color: PLAYER_COLORS[colorIdx],
      roughness: 0.4,
      metalness: 0.1,
    });
    const body = new Mesh(bodyGeo, bodyMat);
    body.position.set(pos.x, h / 2 + 0.12, pos.z);
    body.castShadow = true;
    body.receiveShadow = true;

    const topGeo = new SphereGeometry(r * 0.6, 12, 8);
    const topMat = new MeshStandardMaterial({
      color: PLAYER_COLORS_LIGHT[colorIdx],
      roughness: 0.3,
      metalness: 0.05,
    });
    const top = new Mesh(topGeo, topMat);
    top.position.y = h / 2 + 0.05;
    top.castShadow = true;

    const pawnGroup = new Group();
    pawnGroup.add(body);
    pawnGroup.add(top);

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(pawn.number), 32, 32);
    const texture = new CanvasTexture(canvas);

    const labelGeo = new PlaneGeometry(0.25, 0.25);
    const labelMat = new MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });
    const label = new Mesh(labelGeo, labelMat);
    label.position.y = h / 2 + 0.12;
    label.rotation.x = -Math.PI / 6;
    pawnGroup.add(label);

    this.pawnsGroup.add(pawnGroup);
    this.pawnMeshes.set(pawn.number + pawn.player.number * 100, pawnGroup);
  }

  private getCellPosition(cell: Cell, board: Board): Vector3 {
    const sortedPlayers = [...board.players].sort((a, b) => a.number - b.number);

    for (let i = 0; i < 4; i++) {
      if (board.getCorner(sortedPlayers[i]) === cell) {
        return this.layout.corners[i];
      }
    }

    for (let side = 0; side < 4; side++) {
      let current: Cell | null = board.getCorner(sortedPlayers[side]);
      for (let j = 0; j < 6; j++) {
        current = current!.nextFieldCell;
        if (current === cell) return this.layout.fields[side][j];
      }
    }

    for (let i = 0; i < 4; i++) {
      const corner = board.getCorner(sortedPlayers[i]);
      let home = corner.nextHomeCell;
      let idx = 0;
      while (home !== null) {
        if (home === cell) return this.layout.homes[i][idx];
        home = home.nextHomeCell;
        idx++;
      }
    }

    return new Vector3(0, 0, 0);
  }

  getCellAt(clientX: number, clientY: number, board: Board): Cell | null {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.cellMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      return intersects[0].object.userData.cell || null;
    }
    return null;
  }

  animate(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
