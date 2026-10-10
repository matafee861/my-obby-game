
import * as THREE from
  'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// ---------- ตั้งค่าเกม ----------
let selectedColor = null;
let started = false;
let player = null;
let velocityY = 0;
let onGround = false;
let jumpPressed = false;
let platforms = [];
let keys = {};
let stageNumber = 1;

const START = new THREE.Vector3(0, 0.03, 0);
const checkpoint = START.clone();
const PLAYER_RADIUS = 0.28;
const PLAYER_HEIGHT = 1.9;
const GRAVITY = 0.012;
const JUMP_POWER = 0.24;
const MOVE_SPEED = 0.12;

// ---------- สร้างฉาก 3 มิติ ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 45, 100);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x708090, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 2.5);
sunlight.position.set(10, 20, 10);
sunlight.castShadow = true;
scene.add(sunlight);

// ---------- เลือกตัวละคร ----------
window.chooseCharacter = function (color) {
  selectedColor = color;

  document.getElementById('selected').textContent =
    color === 'blue'
      ? 'เลือกตัวละคร A สีฟ้าแล้ว!'
      : 'เลือกตัวละคร B สีชมพูแล้ว!';

  document.getElementById('startButton').disabled = false;
};

// ---------- สร้างบล็อก ----------
function makeBlock(x, y, z, w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color })
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  platforms.push({
    mesh,
    top: y + h / 2,
    bottom: y - h / 2,
    w,
    d
  });

  return mesh;
}

// ---------- สร้างตัวละคร ----------
function makeCharacter(color) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: color === 'blue' ? 0x2589ff : 0xff65ad
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffd2ae
  });

  function part(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
  }

  // ตัวละครหันหน้าไปทาง -Z
  part(0.65, 0.65, 0.35, 0, 0.95, 0, bodyMat);
  part(0.48, 0.48, 0.42, 0, 1.55, 0, skinMat);

  part(0.22, 0.55, 0.22, -0.18, 0.275, 0, bodyMat);
  part(0.22, 0.55, 0.22, 0.18, 0.275, 0, bodyMat);

  part(0.16, 0.55, 0.2, -0.43, 0.95, 0, bodyMat);
  part(0.16, 0.55, 0.2, 0.43, 0.95, 0, bodyMat);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  part(0.06, 0.06, 0.025, -0.12, 1.58, -0.225, eyeMat);
  part(0.06, 0.06, 0.025, 0.12, 1.58, -0.225, eyeMat);

  scene.add(group);
  return group;
}

// ---------- สร้างด่านทั้ง 3 ----------
function buildWorld() {
  // จุดเริ่มต้น
  makeBlock(0, -0.25, 0, 5, 0.5, 5, 0x43c76b);

  // ด่าน 1: บล็อกใกล้กัน
  makeBlock(0, 0.0, -4, 2.5, 0.5, 2.5, 0xffd166);
  makeBlock(1, 0.3, -7, 2.2, 0.5, 2.2, 0xffd166);
  makeBlock(-0.5, 0.6, -10, 2.2, 0.5, 2.2, 0xffd166);
  makeBlock(0, 0.6, -13, 3.5, 0.5, 2.5, 0x45d483);

  // ด่าน 2: กระโดดสลับซ้ายขวา
  makeBlock(1.5, 0.9, -16, 2.0, 0.5, 2.0, 0xff8b94);
  makeBlock(-0.5, 1.2, -19, 2.0, 0.5, 2.0, 0xff8b94);
  makeBlock(-1.5, 1.5, -22, 2.0, 0.5, 2.0, 0xff8b94);
  makeBlock(0, 1.5, -25, 3.5, 0.5, 2.5, 0x45d483);

  // ด่าน 3: บล็อกท้าทาย
  makeBlock(-1.5, 1.8, -28, 1.9, 0.5, 1.9, 0xb28dff);
  makeBlock(1, 2.1, -31, 1.9, 0.5, 1.9, 0xb28dff);
  makeBlock(1.5, 2.4, -34, 1.9, 0.5, 1.9, 0xb28dff);
  makeBlock(0, 2.4, -37, 4.5, 0.5, 3.5, 0x20c997);

  // ธงเส้นชัย
  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.2, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  pole.position.set(1.3, 3.75, -37);
  scene.add(pole);

  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.55, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xff3333 })
  );
  flag.position.set(1.8, 4.35, -37);
  scene.add(flag);

  // พื้นตกแต่งด้านล่าง ไม่ใช่พื้นสำหรับยืน
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x73c9d8 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -5, -18);
  scene.add(ground);
}

// ---------- เริ่มเกม ----------
window.startGame = function () {
  if (!selectedColor) return;

  if (!started) {
    buildWorld();
    player = makeCharacter(selectedColor);
    started = true;
  }

  player.position.copy(START);
  velocityY = 0;
  onGround = false;
  jumpPressed = false;

  document.getElementById('menu').hidden = true;
  document.getElementById('win').hidden = true;
  document.getElementById('hud').hidden = false;
};

// ---------- ปุ่มควบคุม ----------
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if ([
    'Space', 'ArrowUp', 'ArrowDown',
    'ArrowLeft', 'ArrowRight'
  ].includes(e.code)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// ---------- ระบบเกม ----------
function update() {
  if (started && player) {
    // บันทึกตำแหน่งเท้าก่อนเคลื่อนที่
    const previousY = player.position.y;

    // เดินหน้าใช้ -Z
    let dx = 0;
    let dz = 0;

    if (keys.KeyA || keys.ArrowLeft) dx -= MOVE_SPEED;
    if (keys.KeyD || keys.ArrowRight) dx += MOVE_SPEED;
    if (keys.KeyW || keys.ArrowUp) dz -= MOVE_SPEED;
    if (keys.KeyS || keys.ArrowDown) dz += MOVE_SPEED;

    // ทำให้เดินทแยงไม่เร็วกว่าปกติ
    const length = Math.hypot(dx, dz);
    if (length > 0) {
      dx = dx / length * MOVE_SPEED;
      dz = dz / length * MOVE_SPEED;
    }

    // ตรวจจับการชนด้านข้าง ไม่ให้เดินทะลุบล็อก
    function canMoveTo(x, z) {
      const footY = player.position.y;
      const headY = footY + PLAYER_HEIGHT;

      for (const p of platforms) {
        const m = p.mesh;

        const overlapX =
          Math.abs(x - m.position.x) < p.w / 2 + PLAYER_RADIUS;
        const overlapZ =
          Math.abs(z - m.position.z) < p.d / 2 + PLAYER_RADIUS;

        const verticalOverlap =
          footY < p.top - 0.01 &&
          headY > p.bottom + 0.01;

        if (overlapX && overlapZ && verticalOverlap) {
          // อนุญาตให้ขยับบนบล็อกที่กำลังยืนอยู่
          const standingOnThisBlock =
            onGround &&
            Math.abs(footY - p.top) < 0.04;

          if (!standingOnThisBlock) return false;
        }
      }

      return true;
    }

    if (canMoveTo(player.position.x + dx, player.position.z)) {
      player.position.x += dx;
    }

    if (canMoveTo(player.position.x, player.position.z + dz)) {
      player.position.z += dz;
    }

    // กระโดดด้วย Space เท่านั้น
    if (keys.Space && onGround && !jumpPressed) {
      velocityY = JUMP_POWER;
      onGround = false;
      jumpPressed = true;
    }

    if (!keys.Space) jumpPressed = false;

    // แรงโน้มถ่วง
    velocityY -= GRAVITY;
    player.position.y += velocityY;
    onGround = false;

    // ตรวจสอบการลงบนพื้นบล็อกจากด้านบน
    if (velocityY <= 0) {
      let landingTop = -Infinity;

      for (const p of platforms) {
        const m = p.mesh;

        const overlapX =
          Math.abs(player.position.x - m.position.x)
          < p.w / 2 + PLAYER_RADIUS;

        const overlapZ =
          Math.abs(player.position.z - m.position.z)
          < p.d / 2 + PLAYER_RADIUS;

        const crossedTop =
          previousY >= p.top - 0.015 &&
          player.position.y <= p.top;

        if (overlapX && overlapZ && crossedTop) {
          landingTop = Math.max(landingTop, p.top);
        }
      }

      if (landingTop > -Infinity) {
        player.position.y = landingTop;
        velocityY = 0;
        onGround = true;
      }
    }

    // ตกจากฉากแล้วเกิดใหม่
    if (player.position.y < -4) {
      player.position.copy(checkpoint);
      velocityY = 0;
      onGround = false;
    }

    // แสดงหมายเลขด่าน
    const z = player.position.z;
    stageNumber = z > -13 ? 1 : z > -25 ? 2 : 3;

    document.getElementById('stage').textContent =
      `ด่าน ${stageNumber} / 3`;

    // ตรวจจับเส้นชัย
    if (
      z < -35.0 &&
      Math.abs(player.position.x) < 2.1 &&
      player.position.y >= 2.8
    ) {
      started = false;
      document.getElementById('hud').hidden = true;
      document.getElementById('win').hidden = false;
    }

    // กล้องติดตามตัวละครจากด้านหลัง
    const cameraTarget = new THREE.Vector3(
      player.position.x,
      player.position.y + 3.5,
      player.position.z + 7
    );

    camera.position.lerp(cameraTarget, 0.12);

    camera.lookAt(
      player.position.x,
      player.position.y + 0.7,
      player.position.z - 2
    );
  }

  renderer.render(scene, camera);
  requestAnimationFrame(update);
}

// ---------- ขนาดหน้าจอ ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

camera.position.set(0, 5, 9);
camera.lookAt(0, 0, -3);

update();
