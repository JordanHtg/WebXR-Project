import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// Setup Scene, Camera, Renderer
const scene = new THREE.Scene();
// Warna background studio yang estetik (Dark Navy/Grey)
const studioColor = new THREE.Color(0x1a1c24);
scene.background = studioColor;
scene.fog = new THREE.Fog(studioColor, 10, 40);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 2.5, 8);

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('c'),
    antialias: true
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Bayangan lebih halus
renderer.xr.enabled = true;

// --- PENCAHAYAAN LEBIH REALISTIS (Tone Mapping) ---
renderer.toneMapping = THREE.ACESFilmicToneMapping; 
renderer.toneMappingExposure = 1.1;

// --- AESTHETIC LIGHTING SETUP ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4); // Cahaya dasar

// 1. Key Light (Cahaya Utama Putih Hangat pembentuk bayangan)
const dirLight = new THREE.DirectionalLight(0xfffaed, 2.5); 
dirLight.position.set(6, 12, 8); 
dirLight.castShadow = true;

// Perbaikan Shadow agar Full & Tajam (Cakupan diperluas)
dirLight.shadow.mapSize.width = 2048; 
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -12; 
dirLight.shadow.camera.right = 12; 
dirLight.shadow.camera.top = 12;
dirLight.shadow.camera.bottom = -12;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.bias = -0.0001; 

// 2. Accent Light Kiri (Cyan) - Mewarnai sisi kiri objek
const fillLightCyan = new THREE.PointLight(0x00d4ff, 5, 20);
fillLightCyan.position.set(-8, 2, 2);

// 3. Accent Light Kanan (Magenta) - Mewarnai sisi kanan objek
const fillLightPink = new THREE.PointLight(0xff0066, 5, 20);
fillLightPink.position.set(8, 2, 2);

scene.add(ambient, dirLight, fillLightCyan, fillLightPink);

// --- LANTAI (Studio Matte agar bayangan jelas) ---
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({
        color: studioColor, // Warna sama dengan background agar terasa tanpa batas
        roughness: 1.0,     // Dibuat 100% kasar agar bayangan tercetak jelas
        metalness: 0.0
    })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1;
floor.receiveShadow = true;
scene.add(floor);

// --- SYARAT: TextureLoader ---
const textureLoader = new THREE.TextureLoader();

// Data Objek: Nama, Info Detail, dan URL/Nama File Tekstur
const objectData = [
    { name: 'Kotak Kayu', info: 'Merupakan kotak kargo standar untuk penyimpanan barang.', texture: 'https://threejs.org/examples/textures/crate.gif', color: 0xffffff },
    { name: 'Bola Kaki', info: 'Merupakan benda yang digunakan dalam permainan sepak bola.', texture: 'bola.jpg', color: 0xffffff },
    { name: 'Silinder Besi', info: 'Material berbahan besi padat yang biasa dipakai di konstruksi.', texture: 'besi.jpg', color: 0xffffff },
    { name: 'Torus Roti', info: 'Cemilan berbentuk seperti donat manis bertekstur lembut.', texture: 'roti.jpg', color: 0xffffff },
    { name: 'Kerucut', info: 'Bangun ruang geometris dasar tanpa tekstur tambahan.', texture: null, color: 0x5BA8C9 }
];

const geoList = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.SphereGeometry(0.6, 32, 32),
    new THREE.CylinderGeometry(0.4, 0.4, 1.2, 32),
    new THREE.TorusGeometry(0.5, 0.2, 16, 60),
    new THREE.ConeGeometry(0.6, 1.2, 32)
];
const objects = [];

// Looping pembuatan objek berdasarkan data di atas
geoList.forEach((geo, i) => {
    const data = objectData[i];
    let materialOptions = { color: data.color, roughness: 0.5, metalness: 0.15 };
    
    // Jika data tekstur ada, load teksturnya
    if (data.texture) {
        materialOptions.map = textureLoader.load(data.texture);
        
        // Khusus untuk besi, tambahkan efek metalik agar lebih realistis
        if (data.name === 'Silinder Besi') {
            materialOptions.metalness = 0.8;
            materialOptions.roughness = 0.3;
        }
    }

    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(materialOptions));
    mesh.position.set((i - 2) * 2.5, 1.2, -4);
    mesh.castShadow = mesh.receiveShadow = true;
    
    // Simpan data nama dan info ke userData objek
    mesh.userData = { name: data.name, info: data.info }; 
    scene.add(mesh);
    objects.push(mesh);
});

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2;

// --- SYARAT: Raycasting (2 Interaksi) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-100, -100); 
const infoDiv = document.getElementById('info');
let selected = null;
let hovered = null;

window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
});

window.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(objects);

    if (selected) {
        selected.scale.setScalar(1);
        selected = null;
        infoDiv.innerHTML = 'Klik Object untuk memilih';
    }

    // Tampilkan Nama + Info saat objek diklik
    if (hits.length > 0) {
        selected = hits[0].object;
        selected.scale.setScalar(1.5); 
        const objData = selected.userData;
        infoDiv.innerHTML = `<strong>${objData.name}</strong><br><span style="font-size: 0.9em; font-weight: normal;">${objData.info}</span>`; 
    }
});

// Animation Loop
renderer.setAnimationLoop(() => {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(objects);

    // --- FITUR KURSOR POINTER SAAT HOVER ---
    document.body.style.cursor = hits.length > 0 ? 'pointer' : 'default';

    if (hovered && hovered !== selected) {
        hovered.material.emissive.setHex(0x000000); 
        hovered = null;
    }

    if (hits.length > 0) {
        const object = hits[0].object;
        if (object !== selected) {
            hovered = object;
            // Glow saat hover disesuaikan agar cocok dengan tema
            hovered.material.emissive.setHex(0x333333); 
        }
    }

    objects.forEach(obj => {
        if (obj !== selected) {
            obj.rotation.y += 0.008;
            obj.rotation.x += 0.003;
        }
    });

    controls.update();
    renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// WebXR
const vrBtn = document.getElementById('vrBtn');

async function checkXRSupport() {
    if (!('xr' in navigator)) {
        vrBtn.innerText = 'WebXR Tidak Didukung';
        vrBtn.disabled = true; return;
    }
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    if (supported) {
        vrBtn.disabled = false;
        vrBtn.innerText = 'Masuk VR';
    } else {
        vrBtn.innerText = 'VR Tidak Tersedia';
        vrBtn.disabled = true;
    }
}

vrBtn.addEventListener('click', async () => {
    try {
        const session = await navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor'] 
        });
        await renderer.xr.setSession(session);
        vrBtn.innerText = 'VR Aktif';
        session.addEventListener('end', () => vrBtn.innerText = 'Masuk VR');
    } catch (e) { console.error(e);}
});
checkXRSupport();