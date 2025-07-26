window.addEventListener('load', () => {
// Enhanced game state
const gameState = {
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    player: null,
    playerModel: null,
    playerStats: { speed: 1, agility: 1, boost: 1 },
    playerTrail: [],
    playerGhost: null,
    
    // Movement
    velocity: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    targetRotation: new THREE.Euler(),
    mouseLook: { x: 0, y: 0 },
    
    // Game metrics
    score: 0,
    speed: 0.5,
    baseSpeed: 0.5,
    maxSpeed: 3.0,
    distance: 0,
    combo: 1,
    comboTimer: 0,
    boostEnergy: 100,
    scoreMultiplier: 1,
    magnetActive: false,
    
    // Collections
    obstacles: [],
    collectibles: [],
    powerups: [],
    particles: [],
    bubbleParticles: [],
    tunnelSegments: [],
    creatures: [],
    
    // Flags
    gameStarted: false,
    boosting: false,
    invulnerable: false,
    
    // Timers
    clock: new THREE.Clock(),
    deltaTime: 0,
    elapsedTime: 0,
    
    // Effects
    postProcessing: null,
    waterCurrent: new THREE.Vector3(),
    
    // Leaderboard
    leaderboard: [
        { name: "AquaKing", score: 50000 },
        { name: "DeepDiver", score: 35000 },
        { name: "SpeedFish", score: 25000 },
        { name: "WaveRider", score: 15000 },
        { name: "Bubbles", score: 10000 }
    ]
};

// Log unhandled errors to help diagnose issues
window.addEventListener('error', e => {
    console.error('Unhandled error:', e.error || e.message);
});

// Input handling
const input = {
    keys: {},
    mouse: { x: 0, y: 0 },
    touch: { active: false, x: 0, y: 0 }
};

// Character configurations
const characterConfigs = {
    fish: {
        color: 0xffaa00,
        emissive: 0xff6600,
        scale: 1.0,
        trailColor: 0xffcc00
    },
    dolphin: {
        color: 0x6699ff,
        emissive: 0x3366cc,
        scale: 1.2,
        trailColor: 0x99ccff
    },
    squid: {
        color: 0xff66cc,
        emissive: 0xcc3399,
        scale: 1.1,
        trailColor: 0xff99dd
    },
    turtle: {
        color: 0x66dd66,
        emissive: 0x339933,
        scale: 1.3,
        trailColor: 0x99ff99
    },
    octopus: {
        color: 0xff6633,
        emissive: 0xcc3300,
        scale: 1.15,
        trailColor: 0xffaa66
    }
};

// Initialize
let playerType = 'fish';

// Character selection
document.querySelectorAll('.characterCard').forEach(card => {
    card.addEventListener('click', function() {
        document.querySelectorAll('.characterCard').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        playerType = this.dataset.type;
        gameState.playerStats = {
            speed: parseFloat(this.dataset.speed),
            agility: parseFloat(this.dataset.agility),
            boost: parseFloat(this.dataset.boost)
        };
    });
});

// Start game
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('loadingScreen').style.opacity = '1';

    setTimeout(() => {
        try {
            initGame();
            document.getElementById('loadingScreen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loadingScreen').classList.add('hidden');
                document.querySelectorAll('#ui, #minimap, #controls, #leaderboard').forEach(el => {
                    el.classList.remove('hidden');
                });
                gameState.gameStarted = true;
                animate();
            }, 1000);
        } catch (e) {
            console.error('Failed to start game:', e);
            alert('Error starting game. Check console for details.');
        }
    }, 100);
});

// Select fish by default
document.querySelector('[data-type="fish"]').click();

function initGame() {
    // Scene setup with enhanced fog
    gameState.scene = new THREE.Scene();
    gameState.scene.fog = new THREE.FogExp2(0x002040, 0.015);
    
    // Camera with better FOV
    gameState.camera = new THREE.PerspectiveCamera(
        80, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    gameState.camera.position.set(0, 6, 15);
    
    // Renderer with maximum quality
    gameState.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
    });
    gameState.renderer.setSize(window.innerWidth, window.innerHeight);
    gameState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    gameState.renderer.shadowMap.enabled = true;
    gameState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    gameState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    gameState.renderer.toneMappingExposure = 1.3;
    gameState.renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(gameState.renderer.domElement);
    
    // Lighting setup
    setupLighting();
    
    // Create environment
    createEnvironment();
    
    // Create player
    createAdvancedPlayer();
    
    // Generate initial world
    for (let i = 0; i < 20; i++) {
        generateAdvancedTunnelSegment(i * 25 - 100);
    }
    
    // Setup effects
    createSpeedEffect();
    setupMinimap();
    
    // Input listeners
    setupInputListeners();
    
    // Start ambient effects
    startAmbientEffects();
    
    // Initialize UI
    updateLeaderboard();
}

function setupLighting() {
    // Ambient light with color variation
    const ambientLight = new THREE.AmbientLight(0x4466aa, 0.3);
    gameState.scene.add(ambientLight);
    
    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(20, 40, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.bias = -0.0005;
    gameState.scene.add(directionalLight);
    
    // Caustic lights
    const causticLight1 = new THREE.PointLight(0x00ffff, 0.4, 40);
    causticLight1.position.set(0, 20, 0);
    gameState.scene.add(causticLight1);
    
    const causticLight2 = new THREE.PointLight(0xff00ff, 0.3, 30);
    causticLight2.position.set(-20, 15, -20);
    gameState.scene.add(causticLight2);
    
    // Moving lights for atmosphere
    gameState.movingLights = [causticLight1, causticLight2];
}

function createEnvironment() {
    // Create multi-layered background
    const bgGeometry = new THREE.SphereGeometry(800, 64, 64);
    const bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            topColor: { value: new THREE.Color(0x001a33) },
            bottomColor: { value: new THREE.Color(0x004080) },
            cloudColor: { value: new THREE.Color(0x0066cc) }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform vec3 cloudColor;
            uniform float time;
            varying vec3 vWorldPosition;
            varying vec2 vUv;
            
            float noise(vec2 uv) {
                return sin(uv.x * 10.0 + time) * sin(uv.y * 10.0 + time * 0.7) * 0.5 + 0.5;
            }
            
            void main() {
                float h = normalize(vWorldPosition).y;
                vec3 color = mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.8), 0.0));
                
                // Add animated clouds
                float clouds = noise(vUv * 3.0 + time * 0.05);
                color = mix(color, cloudColor, clouds * 0.3 * (1.0 - abs(h)));
                
                // Add depth fog
                float depth = length(vWorldPosition) / 800.0;
                color = mix(color, bottomColor * 0.5, depth * 0.3);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.BackSide
    });
    
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.userData.material = bgMaterial;
    gameState.scene.add(bgMesh);
    
    // Add floating debris particles
    const debrisGeometry = new THREE.BufferGeometry();
    const debrisCount = 500;
    const positions = new Float32Array(debrisCount * 3);
    const colors = new Float32Array(debrisCount * 3);
    const sizes = new Float32Array(debrisCount);
    
    for (let i = 0; i < debrisCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        
        colors[i * 3] = 0.5 + Math.random() * 0.5;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
        colors[i * 3 + 2] = 1;
        
        sizes[i] = Math.random() * 2;
    }
    
    debrisGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    debrisGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    debrisGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const debrisMaterial = new THREE.PointsMaterial({
        size: 1,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    const debris = new THREE.Points(debrisGeometry, debrisMaterial);
    gameState.scene.add(debris);
    gameState.debris = debris;
}

function createAdvancedPlayer() {
    const playerGroup = new THREE.Group();
    const config = characterConfigs[playerType];
    
    // Create detailed player model
    let bodyMesh;
    
    switch(playerType) {
        case 'dolphin':
            bodyMesh = createDolphinModel(config);
            break;
        case 'squid':
            bodyMesh = createSquidModel(config);
            break;
        case 'turtle':
            bodyMesh = createTurtleModel(config);
            break;
        case 'octopus':
            bodyMesh = createOctopusModel(config);
            break;
        default:
            bodyMesh = createFishModel(config);
    }
    
    bodyMesh.scale.setScalar(config.scale);
    playerGroup.add(bodyMesh);
    
    // Add dynamic glow effect
    const glowMesh = createPlayerGlow(config);
    playerGroup.add(glowMesh);
    
    // Add particle emitter
    const emitter = createParticleEmitter(config);
    playerGroup.add(emitter);
    
    gameState.player = playerGroup;
    gameState.playerModel = bodyMesh;
    gameState.scene.add(playerGroup);
    
    // Create ghost trail
    createGhostTrail(config);
}

function createFishModel(config) {
    const fishGroup = new THREE.Group();
    
    // Main body with better geometry
    const bodyGeometry = new THREE.SphereGeometry(0.6, 24, 16).scale(1.8, 1, 0.8);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: config.color,
        emissive: config.emissive,
        emissiveIntensity: 0.3,
        shininess: 120,
        specular: 0xffffff,
        flatShading: false
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    fishGroup.add(body);
    
    // Detailed tail
    const tailGroup = new THREE.Group();
    const tailGeometry = new THREE.ConeGeometry(0.5, 1, 12).scale(2, 1, 0.4);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.x = -1.2;
    tail.rotation.z = -Math.PI / 2;
    tailGroup.add(tail);
    tailGroup.position.x = -0.5;
    fishGroup.add(tailGroup);
    fishGroup.userData.tail = tailGroup;
    
    // Fins
    const finMaterial = new THREE.MeshPhongMaterial({
        color: config.color,
        emissive: config.emissive,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    
    // Top fin
    const topFinGeometry = new THREE.PlaneGeometry(0.8, 0.6).rotateX(-Math.PI / 2);
    const topFin = new THREE.Mesh(topFinGeometry, finMaterial);
    topFin.position.y = 0.5;
    fishGroup.add(topFin);
    
    // Side fins
    const sideFinGeometry = new THREE.PlaneGeometry(0.6, 0.4);
    const leftFin = new THREE.Mesh(sideFinGeometry, finMaterial);
    leftFin.position.set(0, 0, 0.5);
    leftFin.rotation.x = 0.3;
    fishGroup.add(leftFin);
    
    const rightFin = new THREE.Mesh(sideFinGeometry, finMaterial);
    rightFin.position.set(0, 0, -0.5);
    rightFin.rotation.x = -0.3;
    fishGroup.add(rightFin);
    
    fishGroup.userData.fins = [leftFin, rightFin, topFin];
    
    // Eyes with glow
    addEyes(fishGroup, 0.5, 0.2, 0.3);
    
    return fishGroup;
}

function createDolphinModel(config) {
    const dolphinGroup = new THREE.Group();
    
    // Streamlined body
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0, 0);
    bodyShape.quadraticCurveTo(1, 0.5, 2, 0);
    bodyShape.quadraticCurveTo(1, -0.5, 0, 0);
    
    const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, {
        depth: 0.8,
        bevelEnabled: true,
        bevelThickness: 0.3,
        bevelSize: 0.2,
        bevelSegments: 8
    });
    
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: config.color,
        emissive: config.emissive,
        emissiveIntensity: 0.3,
        shininess: 150,
        specular: 0xffffff
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.scale.set(1, 1.2, 1);
    dolphinGroup.add(body);
    
    // Dorsal fin
    const dorsalGeometry = new THREE.ConeGeometry(0.3, 0.8, 6);
    const dorsal = new THREE.Mesh(dorsalGeometry, bodyMaterial);
    dorsal.position.set(-0.5, 0.8, 0);
    dorsal.rotation.z = -0.3;
    dolphinGroup.add(dorsal);
    
    // Tail flukes
    const flukeGeometry = new THREE.CylinderGeometry(0.1, 0.8, 0.2, 12).rotateZ(Math.PI / 2);
    const fluke = new THREE.Mesh(flukeGeometry, bodyMaterial);
    fluke.position.x = -1.8;
    dolphinGroup.add(fluke);
    dolphinGroup.userData.tail = fluke;
    
    // Flippers
    const flipperGeometry = new THREE.SphereGeometry(0.4, 8, 6).scale(2, 0.3, 1);
    const leftFlipper = new THREE.Mesh(flipperGeometry, bodyMaterial);
    leftFlipper.position.set(0.5, -0.3, 0.6);
    leftFlipper.rotation.z = 0.3;
    dolphinGroup.add(leftFlipper);
    
    const rightFlipper = new THREE.Mesh(flipperGeometry, bodyMaterial);
    rightFlipper.position.set(0.5, -0.3, -0.6);
    rightFlipper.rotation.z = -0.3;
    dolphinGroup.add(rightFlipper);
    
    dolphinGroup.userData.fins = [leftFlipper, rightFlipper];
    
    // Eyes
    addEyes(dolphinGroup, 1.2, 0.3, 0.4);
    
    return dolphinGroup;
}

function createSquidModel(config) {
    const squidGroup = new THREE.Group();
    
    // Mantle (main body)
    const mantleGeometry = new THREE.ConeGeometry(0.6, 2, 12);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: config.color,
        emissive: config.emissive,
        emissiveIntensity: 0.4,
        shininess: 100,
        specular: 0xffffff
    });
    
    const mantle = new THREE.Mesh(mantleGeometry, bodyMaterial);
    squidGroup.add(mantle);
    
    // Tentacles with physics simulation
    const tentacles = [];
    for (let i = 0; i < 8; i++) {
        const tentacle = new THREE.Group();
        const segments = 5;
        
        for (let j = 0; j < segments; j++) {
            const radius = 0.15 - (j * 0.02);
            const segmentGeometry = new THREE.CylinderGeometry(radius, radius * 0.8, 0.4, 8);
            const segment = new THREE.Mesh(segmentGeometry, bodyMaterial);
            segment.position.y = -j * 0.4;
            tentacle.add(segment);
        }
        
        const angle = (i / 8) * Math.PI * 2;
        tentacle.position.set(
            Math.cos(angle) * 0.4,
            -1,
            Math.sin(angle) * 0.4
        );
        tentacle.userData.baseAngle = angle;
        tentacle.userData.segments = tentacle.children;
        tentacles.push(tentacle);
        squidGroup.add(tentacle);
    }
    
    squidGroup.userData.tentacles = tentacles;
    
    // Eyes
    addEyes(squidGroup, 0.2, 0.3, 0.5, 0.2);
    
    return squidGroup;
}

function createTurtleModel(config) {
    const turtleGroup = new THREE.Group();
    
    // Shell with detailed texture
    const shellGeometry = new THREE.SphereGeometry(1, 16, 12).scale(1.2, 0.6, 1);
    const shellMaterial = new THREE.MeshPhongMaterial({
        color: config.color,
        emissive: config.emissive,
        emissiveIntensity: 0.2,
        shininess: 80,
        specular: 0x669966
    });
    
    // Add shell pattern with vertex colors
    const shellColors = [];
    const positions = shellGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        const pattern = Math.sin(positions.getX(i) * 5) * Math.sin(positions.getZ(i) * 5);
        const color = new THREE.Color(config.color);
        color.multiplyScalar(0.8 + pattern * 0.2);
        shellColors.push(color.r, color.g, color.b);
    }
    shellGeometry.setAttribute('color', new THREE.Float32BufferAttribute(shellColors, 3));
    shellMaterial.vertexColors = true;
    
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    turtleGroup.add(shell);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.35, 12, 8);
    const head = new THREE.Mesh(headGeometry, shellMaterial);
    head.position.set(0.8, 0, 0);
    turtleGroup.add(head);
    turtleGroup.userData.head = head;
    
    // Flippers with animation
    const flipperGeometry = new THREE.SphereGeometry(0.4, 8, 6).scale(2.5, 0.3, 1);
    const flippers = [];
    
    const positions_flippers = [
        { x: 0.6, y: -0.3, z: 0.7 },
        { x: 0.6, y: -0.3, z: -0.7 },
        { x: -0.6, y: -0.3, z: 0.7 },
        { x: -0.6, y: -0.3, z: -0.7 }
    ];
    
    positions_flippers.forEach((pos, i) => {
        const flipper = new THREE.Mesh(flipperGeometry, shellMaterial);
        flipper.position.set(pos.x, pos.y, pos.z);
        flipper.rotation.y = i < 2 ? 0 : Math.PI;
        flippers.push(flipper);
        turtleGroup.add(flipper);
    });
    
    turtleGroup.userData.flippers = flippers;
    
    // Eyes
    addEyes(head, 0.2, 0.15, 0.25);
    
    return turtleGroup;
}

function createOctopusModel(config) {
    const octopusGroup = new THREE.Group();
    
    // Main body
    const bodyGeometry = new THREE.SphereGeometry(0.8, 16, 12);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: config.color,
        emissive: config.emissive,
        emissiveIntensity: 0.3,
        shininess: 90,
        specular: 0xffffff
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    octopusGroup.add(body);
    
    // 8 animated tentacles
    const tentacles = [];
    for (let i = 0; i < 8; i++) {
        const tentacle = new THREE.Group();
        const segments = 6;
        const baseRadius = 0.2;
        
        for (let j = 0; j < segments; j++) {
            const t = j / segments;
            const radius = baseRadius * (1 - t * 0.8);
            const height = 0.5;
            
            const segmentGeometry = new THREE.CylinderGeometry(
                radius,
                radius * 0.8,
                height,
                8
            );
            
            const segment = new THREE.Mesh(segmentGeometry, bodyMaterial);
            segment.position.y = -j * height * 0.9;
            
            // Add suckers
            if (j > 1) {
                const suckerGeometry = new THREE.TorusGeometry(radius * 0.3, radius * 0.1, 4, 8);
                const suckerMaterial = new THREE.MeshPhongMaterial({
                    color: 0x330000,
                    emissive: 0x110000
                });
                const sucker1 = new THREE.Mesh(suckerGeometry, suckerMaterial);
                sucker1.position.z = radius;
                sucker1.rotation.x = Math.PI / 2;
                segment.add(sucker1);
            }
            
            tentacle.add(segment);
        }
        
        const angle = (i / 8) * Math.PI * 2;
        tentacle.position.set(
            Math.cos(angle) * 0.6,
            -0.5,
            Math.sin(angle) * 0.6
        );
        tentacle.userData.baseAngle = angle;
        tentacle.userData.segments = tentacle.children;
        tentacles.push(tentacle);
        octopusGroup.add(tentacle);
    }
    
    octopusGroup.userData.tentacles = tentacles;
    
    // Large eyes
    addEyes(octopusGroup, 0.3, 0.2, 0.5, 0.25);
    
    return octopusGroup;
}

function addEyes(parent, x, y, z, size = 0.15) {
    const eyeGeometry = new THREE.SphereGeometry(size);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        emissive: 0x111111
    });
    const pupilMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000 
    });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(x, y, z);
    parent.add(leftEye);
    
    const leftPupil = new THREE.Mesh(
        new THREE.SphereGeometry(size * 0.5),
        pupilMaterial
    );
    leftPupil.position.set(x + size * 0.5, y, z);
    parent.add(leftPupil);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(x, y, -z);
    parent.add(rightEye);
    
    const rightPupil = new THREE.Mesh(
        new THREE.SphereGeometry(size * 0.5),
        pupilMaterial
    );
    rightPupil.position.set(x + size * 0.5, y, -z);
    parent.add(rightPupil);
    
    // Eye glow
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    
    const leftGlow = new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.5),
        glowMaterial
    );
    leftGlow.position.copy(leftEye.position);
    parent.add(leftGlow);
    
    const rightGlow = new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.5),
        glowMaterial
    );
    rightGlow.position.copy(rightEye.position);
    parent.add(rightGlow);
    
    parent.userData.eyes = [leftPupil, rightPupil];
}

function createPlayerGlow(config) {
    const glowGeometry = new THREE.SphereGeometry(2, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            c: { value: 0.3 },
            p: { value: 4.5 },
            glowColor: { value: new THREE.Color(config.emissive) },
            intensity: { value: 1.0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPositionNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            uniform float c;
            uniform float p;
            uniform float intensity;
            varying vec3 vNormal;
            varying vec3 vPositionNormal;
            void main() {
                float a = pow(c + dot(vNormal, vPositionNormal), p);
                gl_FragColor = vec4(glowColor, a * intensity);
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    
    return new THREE.Mesh(glowGeometry, glowMaterial);
}

function createParticleEmitter(config) {
    const emitter = new THREE.Group();
    emitter.userData = {
        particles: [],
        config: config,
        emit: function() {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1 + Math.random() * 0.1),
                new THREE.MeshBasicMaterial({
                    color: config.trailColor,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending
                })
            );
            
            particle.position.set(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                0
            );
            
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                0.5 + Math.random() * 0.5
            );
            
            particle.life = 1.0;
            this.particles.push(particle);
            emitter.add(particle);
        }
    };
    
    return emitter;
}

function createGhostTrail(config) {
    const trailMaterial = new THREE.MeshBasicMaterial({
        color: config.trailColor,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    
    gameState.playerGhost = {
        meshes: [],
        material: trailMaterial,
        maxGhosts: 10
    };
}

function generateAdvancedTunnelSegment(zPosition) {
    const segment = new THREE.Group();
    
    // Create organic tunnel shape
    const radius = 18 + Math.sin(zPosition * 0.03) * 10 + Math.cos(zPosition * 0.07) * 5;
    const tunnelGeometry = new THREE.CylinderGeometry(
        radius + Math.sin(zPosition * 0.1) * 4,
        radius + Math.sin((zPosition + 25) * 0.1) * 4,
        25,
        32,
        1,
        true
    );
    
    // Deform vertices for organic look
    const positions = tunnelGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        const noise1 = Math.sin(x * 0.3 + zPosition * 0.01) * Math.cos(z * 0.3) * 1;
        const noise2 = Math.sin(y * 0.2 + zPosition * 0.02) * 0.5;
        
        positions.setX(i, x + noise1);
        positions.setZ(i, z + noise2);
    }
    positions.needsUpdate = true;
    tunnelGeometry.computeVertexNormals();
    
    // Advanced water shader
    const tunnelMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(0x001a4d) },
            color2: { value: new THREE.Color(0x0066cc) },
            color3: { value: new THREE.Color(0x00ccff) },
            fogColor: { value: new THREE.Color(0x002040) },
            fogNear: { value: 10 },
            fogFar: { value: 100 },
            causticIntensity: { value: 0.5 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vWorldPosition;
            uniform float time;
            
            void main() {
                vUv = uv;
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);
                
                vec3 pos = position;
                
                // Wave distortion
                float wave1 = sin(position.x * 0.1 + time * 2.0) * 0.5;
                float wave2 = cos(position.z * 0.1 + time * 1.5) * 0.5;
                pos.x += wave1;
                pos.z += wave2;
                
                vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
                vWorldPosition = worldPosition.xyz;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color1;
            uniform vec3 color2;
            uniform vec3 color3;
            uniform float time;
            uniform vec3 fogColor;
            uniform float fogNear;
            uniform float fogFar;
            uniform float causticIntensity;
            
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vWorldPosition;
            
            vec3 caustic(vec2 uv, float t) {
                vec2 p = uv * 8.0;
                float val = 0.0;
                
                for(int i = 0; i < 3; i++) {
                    p += sin(p.yx * 3.0 + t * 0.5) * 0.1;
                    val += sin(p.x + sin(p.y + t * 0.3)) * 0.5 + 0.5;
                }
                
                return vec3(val * causticIntensity);
            }
            
            void main() {
                // Base color gradient
                float depth = vUv.y;
                vec3 color = mix(color1, color2, depth);
                color = mix(color, color3, pow(depth, 2.0));
                
                // Animated patterns
                float pattern1 = sin(vUv.x * 30.0 + time * 2.0) * sin(vUv.y * 20.0 + time) * 0.1;
                float pattern2 = cos(vWorldPosition.x * 0.5 + time) * sin(vWorldPosition.z * 0.5 + time * 0.7) * 0.1;
                
                color += vec3(0.0, pattern1 + pattern2, pattern1 * 2.0);
                
                // Caustic lighting
                vec3 causticLight = caustic(vUv + time * 0.02, time);
                color += causticLight * vec3(0.2, 0.5, 0.8);
                
                // Normal-based shading
                float normalShade = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
                color *= 0.7 + normalShade * 0.3;
                
                // Fog
                float fogDepth = length(vWorldPosition - cameraPosition);
                float fogFactor = smoothstep(fogNear, fogFar, fogDepth);
                color = mix(color, fogColor, fogFactor * 0.8);
                
                // Rim lighting
                vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
                float rim = 1.0 - max(dot(viewDirection, vNormal), 0.0);
                color += vec3(0.0, 0.3, 0.5) * pow(rim, 2.0) * 0.5;
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.BackSide
    });
    
    const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
    tunnel.rotation.x = Math.PI / 2;
    tunnel.position.z = zPosition;
    tunnel.userData.material = tunnelMaterial;
    segment.add(tunnel);
    
    // Add complex decorations
    if (Math.random() > 0.3) {
        addTunnelDecorations(segment, radius, zPosition);
    }
    
    // Add obstacles with variety
    if (Math.random() > 0.4 && zPosition < -50) {
        const obstacleCount = Math.floor(Math.random() * 5) + 2;
        for (let i = 0; i < obstacleCount; i++) {
            const obstacle = createAdvancedObstacle();
            const angle = Math.random() * Math.PI * 2;
            const r = 3 + Math.random() * (radius - 6);
            obstacle.position.set(
                Math.cos(angle) * r,
                Math.sin(angle) * r,
                zPosition + (Math.random() - 0.5) * 20
            );
            obstacle.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            segment.add(obstacle);
            gameState.obstacles.push(obstacle);
        }
    }
    
    // Add collectibles in patterns
    if (Math.random() > 0.3) {
        const pattern = Math.floor(Math.random() * 3);
        createCollectiblePattern(segment, radius, zPosition, pattern);
    }
    
    // Add powerups rarely
    if (Math.random() > 0.9 && zPosition < -100) {
        const powerup = createPowerup();
        const angle = Math.random() * Math.PI * 2;
        const r = 5 + Math.random() * 5;
        powerup.position.set(
            Math.cos(angle) * r,
            Math.sin(angle) * r,
            zPosition + Math.random() * 10
        );
        segment.add(powerup);
        gameState.powerups.push(powerup);
    }
    
    // Add sea creatures
    if (Math.random() > 0.7) {
        const creature = createSeaCreature();
        creature.position.set(
            (Math.random() - 0.5) * radius * 1.5,
            (Math.random() - 0.5) * radius,
            zPosition + (Math.random() - 0.5) * 20
        );
        segment.add(creature);
        gameState.creatures.push(creature);
    }
    
    gameState.scene.add(segment);
    gameState.tunnelSegments.push(segment);
}

function addTunnelDecorations(segment, radius, zPosition) {
    const decorationType = Math.floor(Math.random() * 3);
    
    switch(decorationType) {
        case 0: // Kelp forest
            const kelpCount = 10 + Math.floor(Math.random() * 10);
            for (let i = 0; i < kelpCount; i++) {
                const kelp = createAdvancedKelp();
                const angle = Math.random() * Math.PI * 2;
                const r = radius - 1 - Math.random() * 3;
                kelp.position.set(
                    Math.cos(angle) * r,
                    -radius + 1,
                    (Math.random() - 0.5) * 20
                );
                kelp.rotation.y = Math.random() * Math.PI;
                kelp.scale.y = 0.8 + Math.random() * 0.4;
                segment.add(kelp);
            }
            break;
            
        case 1: // Rock formation
            const rockCount = 5 + Math.floor(Math.random() * 8);
            for (let i = 0; i < rockCount; i++) {
                const rock = createDetailedRock();
                const angle = Math.random() * Math.PI * 2;
                const r = radius - 2 - Math.random() * 4;
                rock.position.set(
                    Math.cos(angle) * r,
                    -radius + Math.random() * 4,
                    (Math.random() - 0.5) * 15
                );
                rock.scale.setScalar(0.5 + Math.random() * 1.5);
                segment.add(rock);
            }
            break;
            
        case 2: // Coral reef
            const coralCount = 8 + Math.floor(Math.random() * 12);
            for (let i = 0; i < coralCount; i++) {
                const coral = createDetailedCoral();
                const angle = (i / coralCount) * Math.PI * 2 + Math.random() * 0.5;
                const r = radius - 1.5 - Math.random() * 2;
                coral.position.set(
                    Math.cos(angle) * r,
                    -radius + 1 + Math.random() * 3,
                    (Math.random() - 0.5) * 10
                );
                segment.add(coral);
            }
            break;
    }
}

function createAdvancedKelp() {
    const kelpGroup = new THREE.Group();
    const segments = 8 + Math.floor(Math.random() * 4);
    
    const kelpMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(0x228844) },
            wind: { value: new THREE.Vector2(0.5, 0.3) }
        },
        vertexShader: `
            uniform float time;
            uniform vec2 wind;
            varying vec2 vUv;
            varying float vY;
            
            void main() {
                vUv = uv;
                vY = position.y;
                
                vec3 pos = position;
                float windStrength = smoothstep(0.0, 1.0, vY / 8.0);
                pos.x += sin(time * 2.0 + vY * 0.5) * wind.x * windStrength;
                pos.z += cos(time * 1.5 + vY * 0.3) * wind.y * windStrength;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying vec2 vUv;
            varying float vY;
            
            void main() {
                vec3 finalColor = color * (0.6 + vY * 0.05);
                float alpha = 1.0 - smoothstep(0.8, 1.0, vUv.y);
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    for (let i = 0; i < segments; i++) {
        const width = (1 - i / segments) * 0.8 + 0.2;
        const height = 1.2;
        const segmentGeometry = new THREE.PlaneGeometry(width, height, 4, 2);
        const segment = new THREE.Mesh(segmentGeometry, kelpMaterial);
        segment.position.y = i * 0.9;
        segment.rotation.y = Math.random() * 0.3 - 0.15;
        kelpGroup.add(segment);
    }
    
    kelpGroup.userData.material = kelpMaterial;
    return kelpGroup;
}

function createDetailedRock() {
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    
    // Deform for natural look
    const positions = rockGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const vertex = new THREE.Vector3(
            positions.getX(i),
            positions.getY(i),
            positions.getZ(i)
        );
        const offset = vertex.normalize().multiplyScalar(Math.random() * 0.3);
        positions.setXYZ(i,
            vertex.x + offset.x,
            vertex.y + offset.y,
            vertex.z + offset.z
        );
    }
    positions.needsUpdate = true;
    rockGeometry.computeVertexNormals();
    
    const rockMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0.1, 0.1, 0.3 + Math.random() * 0.2),
        shininess: 20,
        flatShading: true
    });
    
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
}

function createDetailedCoral() {
    const coralGroup = new THREE.Group();
    const coralType = Math.floor(Math.random() * 3);
    
    const hue = Math.random();
    const coralMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(hue, 0.8, 0.6),
        emissive: new THREE.Color().setHSL(hue, 0.8, 0.3),
        emissiveIntensity: 0.3,
        shininess: 100
    });
    
    switch(coralType) {
        case 0: // Brain coral
            const brainGeometry = new THREE.SphereGeometry(1, 16, 12);
            const positions = brainGeometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const z = positions.getZ(i);
                const noise = Math.sin(x * 10) * Math.cos(z * 10) * 0.1;
                positions.setY(i, y + noise);
            }
            positions.needsUpdate = true;
            brainGeometry.computeVertexNormals();
            
            const brain = new THREE.Mesh(brainGeometry, coralMaterial);
            brain.scale.y = 0.6;
            coralGroup.add(brain);
            break;
            
        case 1: // Staghorn coral
            const branches = 5 + Math.floor(Math.random() * 5);
            for (let i = 0; i < branches; i++) {
                const branchLength = 1.5 + Math.random();
                const branch = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.1, 0.2, branchLength, 6),
                    coralMaterial
                );
                const angle = (i / branches) * Math.PI * 2;
                branch.position.set(
                    Math.cos(angle) * 0.3,
                    branchLength / 2,
                    Math.sin(angle) * 0.3
                );
                branch.rotation.z = angle * 0.3;
                branch.rotation.x = Math.random() * 0.3;
                coralGroup.add(branch);
                
                // Add sub-branches
                if (Math.random() > 0.5) {
                    const subBranch = new THREE.Mesh(
                        new THREE.ConeGeometry(0.08, 0.6, 5),
                        coralMaterial
                    );
                    subBranch.position.y = branchLength * 0.7;
                    subBranch.rotation.z = Math.random() * 0.5 - 0.25;
                    branch.add(subBranch);
                }
            }
            break;
            
        case 2: // Table coral
            const tableBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.5, 1, 8),
                coralMaterial
            );
            coralGroup.add(tableBase);
            
            const tableTop = new THREE.Mesh(
                new THREE.CylinderGeometry(2, 1.5, 0.3, 16),
                coralMaterial
            );
            tableTop.position.y = 0.6;
            coralGroup.add(tableTop);
            
            // Add texture
            const details = 8;
            for (let i = 0; i < details; i++) {
                const detail = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 6, 4),
                    coralMaterial
                );
                const angle = (i / details) * Math.PI * 2;
                detail.position.set(
                    Math.cos(angle) * 1.5,
                    0.7,
                    Math.sin(angle) * 1.5
                );
                coralGroup.add(detail);
            }
            break;
    }
    
    return coralGroup;
}

function createAdvancedObstacle() {
    const types = ['rock', 'coral', 'crystal', 'shipwreck', 'mine'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    switch(type) {
        case 'rock':
            const rock = createDetailedRock();
            rock.scale.setScalar(1 + Math.random() * 1.5);
            rock.userData.type = 'obstacle';
            rock.userData.damage = 20;
            return rock;
            
        case 'coral':
            const coral = createDetailedCoral();
            coral.scale.setScalar(1.5 + Math.random());
            coral.userData.type = 'obstacle';
            coral.userData.damage = 15;
            return coral;
            
        case 'crystal':
            const crystalGroup = new THREE.Group();
            const crystalMaterial = new THREE.MeshPhongMaterial({
                color: 0x00ffff,
                emissive: 0x0088ff,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8,
                shininess: 200,
                specular: 0xffffff
            });
            
            for (let i = 0; i < 5; i++) {
                const crystal = new THREE.Mesh(
                    new THREE.OctahedronGeometry(0.3 + Math.random() * 0.5, 0),
                    crystalMaterial
                );
                crystal.position.set(
                    (Math.random() - 0.5) * 1,
                    Math.random() * 2,
                    (Math.random() - 0.5) * 1
                );
                crystal.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                crystal.scale.y = 1 + Math.random();
                crystalGroup.add(crystal);
            }
            
            // Add glow
            const glowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            crystalGroup.add(glow);
            
            crystalGroup.userData.type = 'obstacle';
            crystalGroup.userData.damage = 10;
            return crystalGroup;
            
        case 'shipwreck':
            const shipGroup = new THREE.Group();
            const woodMaterial = new THREE.MeshPhongMaterial({
                color: 0x4a3c28,
                emissive: 0x2a1c08,
                emissiveIntensity: 0.1
            });
            
            // Hull piece
            const hull = new THREE.Mesh(
                new THREE.BoxGeometry(3, 1.5, 0.5),
                woodMaterial
            );
            hull.rotation.z = Math.random() * 0.5 - 0.25;
            shipGroup.add(hull);
            
            // Mast piece
            const mast = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.3, 4, 8),
                woodMaterial
            );
            mast.position.set(0.5, 0, 0);
            mast.rotation.z = 0.3;
            shipGroup.add(mast);
            
            shipGroup.userData.type = 'obstacle';
            shipGroup.userData.damage = 25;
            return shipGroup;
            
        case 'mine':
            const mineGroup = new THREE.Group();
            const mineMaterial = new THREE.MeshPhongMaterial({
                color: 0x333333,
                emissive: 0xff0000,
                emissiveIntensity: 0.3,
                metalness: 0.8,
                roughness: 0.2
            });
            
            // Main sphere
            const mineSphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.8, 16, 12),
                mineMaterial
            );
            mineGroup.add(mineSphere);
            
            // Spikes
            const spikeGeometry = new THREE.ConeGeometry(0.15, 0.8, 4);
            const spikeCount = 8;
            for (let i = 0; i < spikeCount; i++) {
                const spike = new THREE.Mesh(spikeGeometry, mineMaterial);
                const phi = Math.acos(1 - 2 * (i / spikeCount));
                const theta = Math.sqrt(spikeCount * Math.PI) * phi;
                
                spike.position.setFromSphericalCoords(0.8, phi, theta);
                spike.lookAt(spike.position.clone().multiplyScalar(2));
                mineGroup.add(spike);
            }
            
            // Warning light
            const light = new THREE.PointLight(0xff0000, 1, 5);
            light.position.y = 1;
            mineGroup.add(light);
            
            mineGroup.userData.type = 'obstacle';
            mineGroup.userData.damage = 30;
            mineGroup.userData.explosive = true;
            return mineGroup;
    }
}

function createCollectiblePattern(segment, radius, zPosition, pattern) {
    const collectibles = [];
    
    switch(pattern) {
        case 0: // Circle
            const count = 8;
            const ringRadius = 5;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const collectible = createAdvancedCollectible();
                collectible.position.set(
                    Math.cos(angle) * ringRadius,
                    Math.sin(angle) * ringRadius,
                    zPosition
                );
                collectibles.push(collectible);
            }
            break;
            
        case 1: // Spiral
            const spiralCount = 12;
            for (let i = 0; i < spiralCount; i++) {
                const t = i / spiralCount;
                const angle = t * Math.PI * 4;
                const r = 3 + t * 5;
                const collectible = createAdvancedCollectible();
                collectible.position.set(
                    Math.cos(angle) * r,
                    Math.sin(angle) * r,
                    zPosition + i * 2 - spiralCount
                );
                collectibles.push(collectible);
            }
            break;
            
        case 2: // Line
            const lineCount = 6;
            for (let i = 0; i < lineCount; i++) {
                const collectible = createAdvancedCollectible();
                collectible.position.set(
                    0,
                    -5 + i * 2,
                    zPosition + i * 3
                );
                collectibles.push(collectible);
            }
            break;
    }
    
    collectibles.forEach(collectible => {
        segment.add(collectible);
        gameState.collectibles.push(collectible);
    });
}

function createAdvancedCollectible() {
    const collectibleGroup = new THREE.Group();
    
    // Main bubble with refraction effect
    const bubbleGeometry = new THREE.SphereGeometry(0.6, 32, 24);
    const bubbleMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ccff,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.3,
        shininess: 200,
        specular: 0xffffff,
        refractionRatio: 0.98,
        reflectivity: 0.9
    });
    
    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    collectibleGroup.add(bubble);
    
    // Inner core
    const coreGeometry = new THREE.IcosahedronGeometry(0.2, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    collectibleGroup.add(core);
    
    // Particle ring
    const ringGeometry = new THREE.TorusGeometry(0.7, 0.05, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    collectibleGroup.add(ring);
    
    // Outer glow
    const glowGeometry = new THREE.SphereGeometry(1, 16, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    collectibleGroup.add(glow);
    
    collectibleGroup.userData.type = 'collectible';
    collectibleGroup.userData.value = 100;
    collectibleGroup.userData.core = core;
    collectibleGroup.userData.ring = ring;
    
    return collectibleGroup;
}

function createPowerup() {
    const powerupTypes = ['speed', 'shield', 'magnet', 'multiplier'];
    const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    
    const powerupGroup = new THREE.Group();
    
    // Container
    const containerGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const containerMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.5
    });
    
    const container = new THREE.Mesh(containerGeometry, containerMaterial);
    container.rotation.y = Math.PI / 4;
    powerupGroup.add(container);
    
    // Icon based on type
    let icon;
    switch(type) {
        case 'speed':
            icon = '⚡';
            containerMaterial.color = new THREE.Color(0xffff00);
            containerMaterial.emissive = new THREE.Color(0xffaa00);
            break;
        case 'shield':
            icon = '🛡️';
            containerMaterial.color = new THREE.Color(0x00ff00);
            containerMaterial.emissive = new THREE.Color(0x00aa00);
            break;
        case 'magnet':
            icon = '🧲';
            containerMaterial.color = new THREE.Color(0xff00ff);
            containerMaterial.emissive = new THREE.Color(0xaa00aa);
            break;
        case 'multiplier':
            icon = '×2';
            containerMaterial.color = new THREE.Color(0xff0000);
            containerMaterial.emissive = new THREE.Color(0xaa0000);
            break;
    }
    
    // Add glow
    const glowGeometry = new THREE.SphereGeometry(1.5, 16, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: containerMaterial.color,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    powerupGroup.add(glow);
    
    // Add rotating outer ring
    const ringGeometry = new THREE.TorusGeometry(1, 0.1, 8, 32);
    const ring = new THREE.Mesh(ringGeometry, containerMaterial);
    powerupGroup.add(ring);
    
    powerupGroup.userData.type = 'powerup';
    powerupGroup.userData.powerType = type;
    powerupGroup.userData.icon = icon;
    powerupGroup.userData.container = container;
    powerupGroup.userData.ring = ring;
    
    return powerupGroup;
}

function createSeaCreature() {
    const creatureTypes = ['jellyfish', 'school', 'ray', 'shark'];
    const type = creatureTypes[Math.floor(Math.random() * creatureTypes.length)];
    
    switch(type) {
        case 'jellyfish':
            return createJellyfish();
        case 'school':
            return createFishSchool();
        case 'ray':
            return createMantaRay();
        case 'shark':
            return createShark();
    }
}

function createJellyfish() {
    const jellyfishGroup = new THREE.Group();
    
    // Bell
    const bellGeometry = new THREE.SphereGeometry(1, 16, 12).scale(1, 0.6, 1);
    const bellMaterial = new THREE.MeshPhongMaterial({
        color: 0xff66cc,
        emissive: 0xcc3399,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    
    const bell = new THREE.Mesh(bellGeometry, bellMaterial);
    jellyfishGroup.add(bell);
    
    // Tentacles
    const tentacleCount = 12;
    const tentacles = [];
    for (let i = 0; i < tentacleCount; i++) {
        const tentacle = new THREE.Group();
        const segments = 8;
        
        for (let j = 0; j < segments; j++) {
            const radius = 0.05 * (1 - j / segments);
            const segmentGeometry = new THREE.CylinderGeometry(radius, radius * 0.8, 0.3, 6);
            const segment = new THREE.Mesh(segmentGeometry, bellMaterial);
            segment.position.y = -j * 0.3;
            tentacle.add(segment);
        }
        
        const angle = (i / tentacleCount) * Math.PI * 2;
        tentacle.position.set(
            Math.cos(angle) * 0.6,
            -0.3,
            Math.sin(angle) * 0.6
        );
        tentacles.push(tentacle);
        jellyfishGroup.add(tentacle);
    }
    
    jellyfishGroup.userData.type = 'creature';
    jellyfishGroup.userData.creatureType = 'jellyfish';
    jellyfishGroup.userData.tentacles = tentacles;
    jellyfishGroup.userData.animationOffset = Math.random() * Math.PI * 2;
    
    return jellyfishGroup;
}

function createFishSchool() {
    const schoolGroup = new THREE.Group();
    const fishCount = 15 + Math.floor(Math.random() * 10);
    
    const fishGeometry = new THREE.ConeGeometry(0.15, 0.5, 6);
    const fishMaterial = new THREE.MeshPhongMaterial({
        color: 0x88ccff,
        emissive: 0x4488cc,
        emissiveIntensity: 0.2,
        shininess: 100
    });
    
    const fish = [];
    for (let i = 0; i < fishCount; i++) {
        const fishMesh = new THREE.Mesh(fishGeometry, fishMaterial);
        fishMesh.position.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3
        );
        fishMesh.rotation.y = Math.PI / 2;
        fishMesh.userData.offset = Math.random() * Math.PI * 2;
        fish.push(fishMesh);
        schoolGroup.add(fishMesh);
    }
    
    schoolGroup.userData.type = 'creature';
    schoolGroup.userData.creatureType = 'school';
    schoolGroup.userData.fish = fish;
    
    return schoolGroup;
}

function createMantaRay() {
    const rayGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(2, 0.3, 1.5);
    const rayMaterial = new THREE.MeshPhongMaterial({
        color: 0x334455,
        emissive: 0x112233,
        emissiveIntensity: 0.2
    });
    
    const body = new THREE.Mesh(bodyGeometry, rayMaterial);
    rayGroup.add(body);
    
    // Wings
    const wingGeometry = new THREE.PlaneGeometry(3, 2);
    const leftWing = new THREE.Mesh(wingGeometry, rayMaterial);
    leftWing.position.set(-2, 0, 0);
    leftWing.rotation.y = -0.3;
    rayGroup.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, rayMaterial);
    rightWing.position.set(2, 0, 0);
    rightWing.rotation.y = 0.3;
    rayGroup.add(rightWing);
    
    // Tail
    const tailGeometry = new THREE.ConeGeometry(0.1, 1.5, 6);
    const tail = new THREE.Mesh(tailGeometry, rayMaterial);
    tail.position.set(0, 0, -1.5);
    tail.rotation.x = -Math.PI / 2;
    rayGroup.add(tail);
    
    rayGroup.userData.type = 'creature';
    rayGroup.userData.creatureType = 'ray';
    rayGroup.userData.wings = [leftWing, rightWing];
    
    return rayGroup;
}

function createShark() {
    const sharkGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.ConeGeometry(0.5, 3, 8);
    const sharkMaterial = new THREE.MeshPhongMaterial({
        color: 0x556677,
        emissive: 0x223344,
        emissiveIntensity: 0.2
    });
    
    const body = new THREE.Mesh(bodyGeometry, sharkMaterial);
    body.rotation.z = -Math.PI / 2;
    sharkGroup.add(body);
    
    // Dorsal fin
    const finGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const dorsalFin = new THREE.Mesh(finGeometry, sharkMaterial);
    dorsalFin.position.set(0, 0.6, 0);
    dorsalFin.rotation.x = -Math.PI / 2;
    sharkGroup.add(dorsalFin);
    
    // Tail
    const tailGeometry = new THREE.PlaneGeometry(1, 0.8);
    const tail = new THREE.Mesh(tailGeometry, sharkMaterial);
    tail.position.set(-1.5, 0, 0);
    tail.rotation.y = Math.PI / 2;
    sharkGroup.add(tail);
    
    sharkGroup.userData.type = 'creature';
    sharkGroup.userData.creatureType = 'shark';
    sharkGroup.userData.dangerous = true;
    
    return sharkGroup;
}

function createSpeedEffect() {
    const speedEffect = document.getElementById('speedEffect');
    for (let i = 0; i < 30; i++) {
        const line = document.createElement('div');
        line.className = 'speedLine';
        line.style.top = Math.random() * 100 + '%';
        line.style.width = Math.random() * 300 + 100 + 'px';
        line.style.height = Math.random() * 3 + 1 + 'px';
        line.style.left = -line.style.width;
        speedEffect.appendChild(line);
    }
}

function setupMinimap() {
    const canvas = document.getElementById('minimapCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    
    gameState.minimapCtx = ctx;
}

function updateMinimap() {
    const ctx = gameState.minimapCtx;
    const size = 200;
    const center = size / 2;
    const scale = 0.5;
    
    // Clear
    ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
    ctx.fillRect(0, 0, size, size);
    
    // Draw tunnel outline
    ctx.strokeStyle = 'rgba(0, 100, 150, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, 80, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw player
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(center, center, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw nearby obstacles
    gameState.obstacles.forEach(obstacle => {
        const relativeZ = obstacle.position.z - gameState.player.position.z;
        if (Math.abs(relativeZ) < 50) {
            const x = center + obstacle.position.x * scale * 5;
            const y = center - relativeZ * scale * 2;
            
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x - 2, y - 2, 4, 4);
        }
    });
    
    // Draw collectibles
    gameState.collectibles.forEach(collectible => {
        const relativeZ = collectible.position.z - gameState.player.position.z;
        if (Math.abs(relativeZ) < 50) {
            const x = center + collectible.position.x * scale * 5;
            const y = center - relativeZ * scale * 2;
            
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function setupInputListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
        input.keys[e.key.toLowerCase()] = true;
        
        // Prevent scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        input.keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse
    window.addEventListener('mousemove', (e) => {
        input.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        input.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    
    // Touch
    window.addEventListener('touchstart', (e) => {
        input.touch.active = true;
        input.touch.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        input.touch.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    });
    
    window.addEventListener('touchmove', (e) => {
        if (input.touch.active) {
            input.touch.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            input.touch.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        }
    });
    
    window.addEventListener('touchend', () => {
        input.touch.active = false;
    });
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function startAmbientEffects() {
    // Bubble spawner
    setInterval(() => {
        if (gameState.gameStarted && gameState.bubbleParticles.length < 30) {
            const bubble = new THREE.Mesh(
                new THREE.SphereGeometry(0.1 + Math.random() * 0.3),
                new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.4,
                    blending: THREE.AdditiveBlending
                })
            );
            
            bubble.position.set(
                (Math.random() - 0.5) * 40,
                -20,
                gameState.player.position.z + (Math.random() - 0.5) * 40
            );
            
            bubble.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                0.5 + Math.random() * 0.5,
                0
            );
            
            gameState.scene.add(bubble);
            gameState.bubbleParticles.push(bubble);
        }
    }, 300);
}

function updatePlayer() {
    if (!gameState.player) return;
    
    const delta = gameState.deltaTime;
    const stats = gameState.playerStats;
    
    // Calculate movement
    const moveSpeed = 5 * stats.agility * delta;
    const rotateSpeed = 3 * stats.agility * delta;
    
    // Keyboard/Touch input
    let targetX = gameState.player.position.x;
    let targetY = gameState.player.position.y;
    
    if (input.keys['arrowleft'] || input.keys['a']) {
        targetX -= moveSpeed;
        gameState.targetRotation.z = 0.3;
        gameState.targetRotation.y = 0.2;
    } else if (input.keys['arrowright'] || input.keys['d']) {
        targetX += moveSpeed;
        gameState.targetRotation.z = -0.3;
        gameState.targetRotation.y = -0.2;
    } else {
        gameState.targetRotation.z = 0;
        gameState.targetRotation.y = 0;
    }
    
    if (input.keys['arrowup'] || input.keys['w']) {
        targetY += moveSpeed;
        gameState.targetRotation.x = -0.2;
    } else if (input.keys['arrowdown'] || input.keys['s']) {
        targetY -= moveSpeed;
        gameState.targetRotation.x = 0.2;
    } else {
        gameState.targetRotation.x = 0;
    }
    
    // Mouse look influence
    targetX += input.mouse.x * 2;
    targetY += input.mouse.y * 2;
    
    // Boost
    if (input.keys[' '] && gameState.boostEnergy > 0) {
        gameState.boosting = true;
        gameState.boostEnergy -= delta * 50;
        gameState.speed = Math.min(gameState.maxSpeed, gameState.speed + delta * 2 * stats.boost);
    } else {
        gameState.boosting = false;
        gameState.boostEnergy = Math.min(100, gameState.boostEnergy + delta * 20);
    }
    
    // Apply movement with smoothing
    gameState.player.position.x += (targetX - gameState.player.position.x) * 0.1;
    gameState.player.position.y += (targetY - gameState.player.position.y) * 0.1;
    
    // Clamp position
    gameState.player.position.x = Math.max(-12, Math.min(12, gameState.player.position.x));
    gameState.player.position.y = Math.max(-12, Math.min(12, gameState.player.position.y));
    
    // Smooth rotation
    gameState.player.rotation.x += (gameState.targetRotation.x - gameState.player.rotation.x) * 0.1;
    gameState.player.rotation.y += (gameState.targetRotation.y - gameState.player.rotation.y) * 0.1;
    gameState.player.rotation.z += (gameState.targetRotation.z - gameState.player.rotation.z) * 0.1;
    
    // Swimming animation
    const swimTime = gameState.elapsedTime * 3;
    gameState.player.position.y += Math.sin(swimTime) * 0.05;
    
    // Animate character-specific parts
    animateCharacter();
    
    // Update particle emitter
    if (gameState.player.children[2] && gameState.player.children[2].userData.emit) {
        if (Math.random() < gameState.speed / 2) {
            gameState.player.children[2].userData.emit();
        }
    }
    
    // Update ghost trail
    updateGhostTrail();
}

function animateCharacter() {
    const time = gameState.elapsedTime;
    const speed = gameState.speed;
    
    switch(playerType) {
        case 'fish':
            // Animate tail
            if (gameState.playerModel.userData.tail) {
                gameState.playerModel.userData.tail.rotation.y = Math.sin(time * 8 * speed) * 0.3;
            }
            // Animate fins
            if (gameState.playerModel.userData.fins) {
                gameState.playerModel.userData.fins.forEach((fin, i) => {
                    fin.rotation.z = Math.sin(time * 6 + i) * 0.2;
                });
            }
            break;
            
        case 'dolphin':
            // Animate tail flukes
            if (gameState.playerModel.userData.tail) {
                gameState.playerModel.userData.tail.rotation.x = Math.sin(time * 10 * speed) * 0.4;
            }
            // Animate flippers
            if (gameState.playerModel.userData.fins) {
                gameState.playerModel.userData.fins.forEach((fin, i) => {
                    fin.rotation.z = Math.sin(time * 5 + i * Math.PI) * 0.2;
                });
            }
            break;
            
        case 'squid':
            // Animate tentacles
            if (gameState.playerModel.userData.tentacles) {
                gameState.playerModel.userData.tentacles.forEach((tentacle, i) => {
                    const offset = i * 0.5;
                    tentacle.rotation.z = Math.sin(time * 4 + offset) * 0.2;
                    tentacle.children.forEach((segment, j) => {
                        segment.rotation.x = Math.sin(time * 6 + offset + j * 0.3) * 0.1;
                    });
                });
            }
            break;
            
        case 'turtle':
            // Animate flippers
            if (gameState.playerModel.userData.flippers) {
                gameState.playerModel.userData.flippers.forEach((flipper, i) => {
                    const phase = i < 2 ? 0 : Math.PI;
                    flipper.rotation.z = Math.sin(time * 4 * speed + phase) * 0.3;
                });
            }
            // Bob head
            if (gameState.playerModel.userData.head) {
                gameState.playerModel.userData.head.position.x = 0.8 + Math.sin(time * 2) * 0.05;
            }
            break;
            
        case 'octopus':
            // Complex tentacle animation
            if (gameState.playerModel.userData.tentacles) {
                gameState.playerModel.userData.tentacles.forEach((tentacle, i) => {
                    const offset = i * (Math.PI * 2 / 8);
                    tentacle.rotation.y = tentacle.userData.baseAngle + Math.sin(time * 3 + offset) * 0.2;
                    
                    tentacle.children.forEach((segment, j) => {
                        const segmentOffset = j * 0.5;
                        segment.rotation.x = Math.sin(time * 5 + offset + segmentOffset) * 0.15;
                        segment.rotation.z = Math.cos(time * 4 + offset + segmentOffset) * 0.1;
                    });
                });
            }
            break;
    }
    
    // Eye tracking
    if (gameState.playerModel.userData && gameState.playerModel.userData.eyes) {
        const lookDirection = gameState.velocity.clone().normalize();
        gameState.playerModel.userData.eyes.forEach(eye => {
            eye.position.x = eye.position.x * 0.9 + lookDirection.x * 0.05;
            eye.position.y = eye.position.y * 0.9 + lookDirection.y * 0.05;
        });
    }
}

function updateGhostTrail() {
    if (!gameState.playerGhost || !gameState.boosting) return;
    
    // Add new ghost
    if (gameState.elapsedTime % 0.1 < gameState.deltaTime) {
        const ghost = gameState.playerModel.clone();
        ghost.traverse(child => {
            if (child.isMesh) {
                child.material = gameState.playerGhost.material.clone();
                child.material.opacity = 0.3;
            }
        });
        
        ghost.position.copy(gameState.player.position);
        ghost.rotation.copy(gameState.player.rotation);
        ghost.scale.copy(gameState.player.scale);
        
        gameState.scene.add(ghost);
        gameState.playerGhost.meshes.push({
            mesh: ghost,
            age: 0
        });
        
        // Limit trail length
        if (gameState.playerGhost.meshes.length > gameState.playerGhost.maxGhosts) {
            const oldGhost = gameState.playerGhost.meshes.shift();
            gameState.scene.remove(oldGhost.mesh);
        }
    }
    
    // Update existing ghosts
    gameState.playerGhost.meshes.forEach((ghost, index) => {
        ghost.age += gameState.deltaTime;
        ghost.mesh.position.z += gameState.speed * gameState.deltaTime * 10;
        
        const opacity = 0.3 * (1 - ghost.age);
        ghost.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.opacity = opacity;
            }
        });
        
        if (opacity <= 0) {
            gameState.scene.remove(ghost.mesh);
            gameState.playerGhost.meshes.splice(index, 1);
        }
    });
}

function checkCollisions() {
    if (!gameState.player || gameState.invulnerable) return;
    
    const playerBox = new THREE.Box3().setFromObject(gameState.player);
    
    // Check obstacle collisions
    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
        const obstacle = gameState.obstacles[i];
        if (Math.abs(obstacle.position.z) > 30) continue;
        
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        if (playerBox.intersectsBox(obstacleBox)) {
            // Apply damage
            const damage = obstacle.userData.damage || 20;
            gameState.speed = Math.max(gameState.baseSpeed * 0.5, gameState.speed - damage * 0.01);
            
            // Create impact effect
            createImpactEffect(gameState.player.position, 0xff0000, 30);
            
            // Camera shake
            shakeCamera(damage * 0.02);
            
            // Explosive mines
            if (obstacle.userData.explosive) {
                createExplosion(obstacle.position);
                
                // Damage nearby objects
                gameState.obstacles.forEach(other => {
                    if (other !== obstacle && other.position.distanceTo(obstacle.position) < 5) {
                        gameState.scene.remove(other);
                    }
                });
            }
            
            // Reset combo
            gameState.combo = 1;
            gameState.comboTimer = 0;
            
            // Brief invulnerability
            gameState.invulnerable = true;
            setTimeout(() => { gameState.invulnerable = false; }, 1000);
            
            // Flash player
            flashPlayer();
            
            gameState.scene.remove(obstacle);
            gameState.obstacles.splice(i, 1);
        }
    }
    
    // Check collectible collisions
    for (let i = gameState.collectibles.length - 1; i >= 0; i--) {
        const collectible = gameState.collectibles[i];
        if (Math.abs(collectible.position.z) > 30) continue;
        
        const collectibleBox = new THREE.Box3().setFromObject(collectible);
        if (playerBox.intersectsBox(collectibleBox)) {
            // Increase score with combo
            const baseScore = collectible.userData.value || 100;
            const comboScore = baseScore * gameState.combo;
            gameState.score += comboScore;
            
            // Increase combo
            gameState.combo = Math.min(gameState.combo + 1, 10);
            gameState.comboTimer = 3; // 3 seconds to maintain combo
            
            // Show combo popup
            if (gameState.combo > 1) {
                showCombo(gameState.combo);
            }
            
            // Speed boost
            gameState.speed = Math.min(gameState.maxSpeed, gameState.speed + 0.3);
            
            // Create collection effect
            createImpactEffect(collectible.position, 0x00ffff, 40);
            createCollectionTrail(collectible.position, gameState.player.position);
            
            gameState.scene.remove(collectible);
            gameState.collectibles.splice(i, 1);
        }
    }
    
    // Check powerup collisions
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const powerup = gameState.powerups[i];
        if (Math.abs(powerup.position.z) > 30) continue;
        
        const powerupBox = new THREE.Box3().setFromObject(powerup);
        if (playerBox.intersectsBox(powerupBox)) {
            activatePowerup(powerup.userData.powerType, powerup.userData.icon);
            createImpactEffect(powerup.position, powerup.children[0].material.color, 50);
            
            gameState.scene.remove(powerup);
            gameState.powerups.splice(i, 1);
        }
    }
    
    // Check creature interactions
    gameState.creatures.forEach(creature => {
        if (creature.userData.dangerous && Math.abs(creature.position.z) < 30) {
            const creatureBox = new THREE.Box3().setFromObject(creature);
            if (playerBox.intersectsBox(creatureBox)) {
                // Shark attack!
                gameState.speed *= 0.5;
                shakeCamera(0.5);
                createImpactEffect(gameState.player.position, 0xff0000, 40);
            }
        }
    });
}

function createImpactEffect(position, color, count) {
    for (let i = 0; i < count; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.1 + Math.random() * 0.2),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1,
                blending: THREE.AdditiveBlending
            })
        );
        
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            Math.random() * 2
        );
        particle.life = 1.0;
        
        gameState.scene.add(particle);
        gameState.particles.push(particle);
    }
}

function createExplosion(position) {
    // Shockwave
    const shockwaveGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
    const shockwaveMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    
    const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
    shockwave.position.copy(position);
    shockwave.lookAt(gameState.camera.position);
    
    gameState.scene.add(shockwave);
    
    // Animate shockwave
    const startTime = gameState.elapsedTime;
    const animateShockwave = () => {
        const elapsed = gameState.elapsedTime - startTime;
        const scale = 1 + elapsed * 20;
        shockwave.scale.setScalar(scale);
        shockwave.material.opacity = 1 - elapsed * 2;
        
        if (elapsed < 0.5) {
            requestAnimationFrame(animateShockwave);
        } else {
            gameState.scene.remove(shockwave);
        }
    };
    animateShockwave();
    
    // Explosion particles
    createImpactEffect(position, 0xffaa00, 60);
}

function createCollectionTrail(start, end) {
    const trailPoints = [];
    const segments = 10;
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = new THREE.Vector3().lerpVectors(start, end, t);
        point.y += Math.sin(t * Math.PI) * 2;
        trailPoints.push(point);
    }
    
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        linewidth: 3
    });
    
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    gameState.scene.add(trail);
    
    // Fade out trail
    const fadeTrail = () => {
        trail.material.opacity -= gameState.deltaTime * 3;
        if (trail.material.opacity > 0) {
            requestAnimationFrame(fadeTrail);
        } else {
            gameState.scene.remove(trail);
        }
    };
    fadeTrail();
}

function shakeCamera(intensity) {
    const startPos = gameState.camera.position.clone();
    const shakeTime = 0.5;
    const startTime = gameState.elapsedTime;
    
    const shake = () => {
        const elapsed = gameState.elapsedTime - startTime;
        const progress = elapsed / shakeTime;
        
        if (progress < 1) {
            const shakeAmount = intensity * (1 - progress);
            gameState.camera.position.x = startPos.x + (Math.random() - 0.5) * shakeAmount;
            gameState.camera.position.y = startPos.y + (Math.random() - 0.5) * shakeAmount;
            requestAnimationFrame(shake);
        }
    };
    shake();
}

function flashPlayer() {
    const originalMaterials = [];
    gameState.playerModel.traverse(child => {
        if (child.isMesh) {
            originalMaterials.push(child.material);
            child.material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
        }
    });
    
    setTimeout(() => {
        let index = 0;
        gameState.playerModel.traverse(child => {
            if (child.isMesh) {
                child.material = originalMaterials[index++];
            }
        });
    }, 100);
}

function showCombo(combo) {
    const comboDisplay = document.getElementById('comboDisplay');
    comboDisplay.textContent = `${combo}x COMBO!`;
    comboDisplay.style.opacity = '1';
    comboDisplay.style.animation = 'none';
    
    setTimeout(() => {
        comboDisplay.style.animation = 'comboPopup 1s ease-out';
    }, 10);
}

function activatePowerup(type, icon) {
    const indicator = document.getElementById('powerupIndicator');
    const powerupDiv = document.createElement('div');
    powerupDiv.className = 'powerup active';
    powerupDiv.textContent = icon;
    indicator.appendChild(powerupDiv);
    
    let duration = 0;
    
    switch(type) {
        case 'speed':
            gameState.maxSpeed = 4.0;
            gameState.speed = Math.min(4.0, gameState.speed + 1);
            duration = 10000;
            
            // Add speed trail effect
            gameState.player.children[1].material.uniforms.intensity.value = 2.0;
            break;
            
        case 'shield':
            gameState.invulnerable = true;
            duration = 8000;
            
            // Add shield visual
            const shieldGeometry = new THREE.SphereGeometry(2.5, 32, 32);
            const shieldMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
            gameState.player.add(shield);
            
            setTimeout(() => {
                gameState.player.remove(shield);
                gameState.invulnerable = false;
            }, duration);
            break;
            
        case 'magnet':
            gameState.magnetActive = true;
            duration = 12000;
            
            setTimeout(() => {
                gameState.magnetActive = false;
            }, duration);
            break;
            
        case 'multiplier':
            gameState.scoreMultiplier = 2;
            duration = 15000;
            
            setTimeout(() => {
                gameState.scoreMultiplier = 1;
            }, duration);
            break;
    }
    
    // Remove indicator after duration
    setTimeout(() => {
        indicator.removeChild(powerupDiv);
        if (type === 'speed') {
            gameState.maxSpeed = 3.0;
            gameState.player.children[1].material.uniforms.intensity.value = 1.0;
        }
    }, duration);
}

function updateEnvironment() {
    const delta = gameState.deltaTime;
    const moveDistance = gameState.speed * delta * 10;
    gameState.distance += moveDistance;
    
    // Update tunnel segments
    for (let i = gameState.tunnelSegments.length - 1; i >= 0; i--) {
        const segment = gameState.tunnelSegments[i];
        segment.position.z += moveDistance;
        
        // Update water shader
        segment.children.forEach(child => {
            if (child.userData.material && child.userData.material.uniforms) {
                child.userData.material.uniforms.time.value = gameState.elapsedTime;
            }
        });
        
        // Remove old segments
        if (segment.position.z > 50) {
            gameState.scene.remove(segment);
            gameState.tunnelSegments.splice(i, 1);
        }
    }
    
    // Update all moving objects
    updateMovingObjects(moveDistance);
    
    // Generate new segments
    if (gameState.tunnelSegments.length < 20) {
        const lastZ = gameState.tunnelSegments.length > 0 ? 
            gameState.tunnelSegments[gameState.tunnelSegments.length - 1].position.z - 25 : -100;
        generateAdvancedTunnelSegment(lastZ);
    }
    
    // Update water current effect
    gameState.waterCurrent.x = Math.sin(gameState.elapsedTime * 0.5) * 0.5;
    gameState.waterCurrent.y = Math.cos(gameState.elapsedTime * 0.3) * 0.3;
    
    // Progressive difficulty
    gameState.baseSpeed = Math.min(2.0, 0.5 + gameState.distance * 0.00003) * gameState.playerStats.speed;
    
    // Speed decay
    if (!gameState.boosting) {
        gameState.speed = Math.max(gameState.baseSpeed, gameState.speed - delta * 0.2);
    }
    
    // Update combo timer
    if (gameState.comboTimer > 0) {
        gameState.comboTimer -= delta;
        if (gameState.comboTimer <= 0) {
            gameState.combo = 1;
        }
    }
    
    // Update background elements
    updateBackground();
    
    // Update lighting
    updateLighting();
}

function updateMovingObjects(moveDistance) {
    // Update obstacles
    gameState.obstacles.forEach((obstacle, index) => {
        obstacle.position.z += moveDistance;
        
        // Rotate obstacles
        if (obstacle.rotation) {
            obstacle.rotation.x += gameState.deltaTime * 0.5;
            obstacle.rotation.y += gameState.deltaTime * 0.3;
        }
        
        // Apply water current
        obstacle.position.x += gameState.waterCurrent.x * gameState.deltaTime;
        obstacle.position.y += gameState.waterCurrent.y * gameState.deltaTime;
    });
    
    // Update collectibles with magnet effect
    gameState.collectibles.forEach((collectible, index) => {
        collectible.position.z += moveDistance;
        
        // Rotation and float animation
        collectible.rotation.y += gameState.deltaTime * 2;
        collectible.position.y += Math.sin(gameState.elapsedTime * 2 + collectible.position.x) * 0.02;
        
        // Update inner animations
        if (collectible.userData.core) {
            collectible.userData.core.rotation.x += gameState.deltaTime * 3;
            collectible.userData.core.rotation.y += gameState.deltaTime * 4;
        }
        if (collectible.userData.ring) {
            collectible.userData.ring.rotation.z += gameState.deltaTime * 2;
        }
        
        // Magnet effect
        if (gameState.magnetActive) {
            const distance = collectible.position.distanceTo(gameState.player.position);
            if (distance < 15) {
                const direction = new THREE.Vector3()
                    .subVectors(gameState.player.position, collectible.position)
                    .normalize();
                collectible.position.add(direction.multiplyScalar(gameState.deltaTime * 20 / distance));
            }
        }
    });
    
    // Update powerups
    gameState.powerups.forEach(powerup => {
        powerup.position.z += moveDistance;
        
        // Animate powerup
        powerup.rotation.y += gameState.deltaTime;
        if (powerup.userData.container) {
            powerup.userData.container.rotation.x += gameState.deltaTime * 2;
            powerup.userData.container.rotation.z += gameState.deltaTime * 1.5;
        }
        if (powerup.userData.ring) {
            powerup.userData.ring.rotation.x += gameState.deltaTime * 3;
            powerup.userData.ring.rotation.y += gameState.deltaTime * 2;
        }
        
        // Pulsing effect
        const pulse = 1 + Math.sin(gameState.elapsedTime * 3) * 0.1;
        powerup.scale.setScalar(pulse);
    });
    
    // Update creatures
    gameState.creatures.forEach(creature => {
        creature.position.z += moveDistance;
        
        // Creature-specific animations
        switch(creature.userData.creatureType) {
            case 'jellyfish':
                // Pulsing motion
                const jellyfishPulse = 0.6 + Math.sin(gameState.elapsedTime * 2 + creature.userData.animationOffset) * 0.2;
                creature.children[0].scale.y = jellyfishPulse;
                
                // Tentacle wave
                if (creature.userData.tentacles) {
                    creature.userData.tentacles.forEach((tentacle, i) => {
                        const offset = i * 0.5;
                        tentacle.rotation.z = Math.sin(gameState.elapsedTime * 3 + offset) * 0.2;
                    });
                }
                
                // Float up and down
                creature.position.y += Math.sin(gameState.elapsedTime + creature.userData.animationOffset) * 0.01;
                break;
                
            case 'school':
                // School movement pattern
                if (creature.userData.fish) {
                    const centerX = Math.sin(gameState.elapsedTime * 0.5) * 2;
                    const centerY = Math.cos(gameState.elapsedTime * 0.3) * 1.5;
                    
                    creature.userData.fish.forEach((fish, i) => {
                        const offset = fish.userData.offset;
                        const radius = 2 + Math.sin(gameState.elapsedTime + offset) * 0.5;
                        const angle = gameState.elapsedTime * 2 + offset;
                        
                        fish.position.x = centerX + Math.cos(angle) * radius;
                        fish.position.y = centerY + Math.sin(angle) * radius * 0.5;
                        fish.position.z = Math.sin(angle * 0.5) * 1;
                        
                        // Point fish in movement direction
                        fish.lookAt(
                            fish.position.x + Math.sin(angle),
                            fish.position.y,
                            fish.position.z - 1
                        );
                    });
                }
                break;
                
            case 'ray':
                // Manta ray gliding
                if (creature.userData.wings) {
                    creature.userData.wings.forEach((wing, i) => {
                        const phase = i === 0 ? 0 : Math.PI;
                        wing.rotation.z = Math.sin(gameState.elapsedTime * 2 + phase) * 0.3;
                    });
                }
                
                // Gentle glide pattern
                creature.position.x += Math.sin(gameState.elapsedTime * 0.5) * 0.02;
                creature.position.y += Math.cos(gameState.elapsedTime * 0.7) * 0.01;
                break;
                
            case 'shark':
                // Menacing patrol
                const sharkSpeed = 0.05;
                creature.position.x += Math.sin(gameState.elapsedTime * 0.8) * sharkSpeed;
                creature.rotation.y = Math.sin(gameState.elapsedTime * 0.8) * 0.3;
                
                // Track player if nearby
                const playerDistance = creature.position.distanceTo(gameState.player.position);
                if (playerDistance < 10) {
                    creature.lookAt(gameState.player.position);
                }
                break;
        }
    });
    
    // Update particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const particle = gameState.particles[i];
        particle.position.add(particle.velocity);
        particle.position.z += moveDistance;
        particle.life -= gameState.deltaTime * 2;
        particle.material.opacity = particle.life;
        particle.scale.multiplyScalar(0.98);
        
        if (particle.life <= 0 || particle.position.z > 50) {
            gameState.scene.remove(particle);
            gameState.particles.splice(i, 1);
        }
    }
    
    // Update ambient bubbles
    for (let i = gameState.bubbleParticles.length - 1; i >= 0; i--) {
        const bubble = gameState.bubbleParticles[i];
        bubble.position.add(bubble.velocity);
        bubble.position.x += Math.sin(gameState.elapsedTime * 2 + i) * 0.02;
        bubble.position.z += moveDistance;
        
        if (bubble.position.y > 20 || bubble.position.z > 50) {
            gameState.scene.remove(bubble);
            gameState.bubbleParticles.splice(i, 1);
        }
    }
    
    // Update kelp animations
    gameState.tunnelSegments.forEach(segment => {
        segment.children.forEach(child => {
            if (child.userData && child.userData.material && child.userData.material.uniforms) {
                child.userData.material.uniforms.time.value = gameState.elapsedTime;
            }
        });
    });
    
    // Clean up distant objects
    cleanupDistantObjects();
}

function updateBackground() {
    // Update background shader
    gameState.scene.children.forEach(child => {
        if (child.userData && child.userData.material && child.userData.material.uniforms && child.userData.material.uniforms.time) {
            child.userData.material.uniforms.time.value = gameState.elapsedTime;
        }
    });
    
    // Update debris field
    if (gameState.debris) {
        gameState.debris.rotation.y += gameState.deltaTime * 0.05;
        gameState.debris.position.z = gameState.player.position.z;
    }
}

function updateLighting() {
    // Animate caustic lights
    if (gameState.movingLights) {
        gameState.movingLights[0].position.x = Math.sin(gameState.elapsedTime * 0.7) * 20;
        gameState.movingLights[0].position.z = Math.cos(gameState.elapsedTime * 0.5) * 20;
        
        gameState.movingLights[1].position.x = Math.cos(gameState.elapsedTime * 0.6) * 15;
        gameState.movingLights[1].position.z = Math.sin(gameState.elapsedTime * 0.8) * 15;
        
        // Vary intensity
        gameState.movingLights[0].intensity = 0.4 + Math.sin(gameState.elapsedTime * 2) * 0.1;
        gameState.movingLights[1].intensity = 0.3 + Math.cos(gameState.elapsedTime * 1.5) * 0.1;
    }
}

function cleanupDistantObjects() {
    // Remove distant obstacles
    gameState.obstacles = gameState.obstacles.filter(obj => {
        if (obj.position.z > 50 || obj.position.z < -200) {
            gameState.scene.remove(obj);
            return false;
        }
        return true;
    });
    
    // Remove distant collectibles
    gameState.collectibles = gameState.collectibles.filter(obj => {
        if (obj.position.z > 50 || obj.position.z < -200) {
            gameState.scene.remove(obj);
            return false;
        }
        return true;
    });
    
    // Remove distant powerups
    gameState.powerups = gameState.powerups.filter(obj => {
        if (obj.position.z > 50 || obj.position.z < -200) {
            gameState.scene.remove(obj);
            return false;
        }
        return true;
    });
    
    // Remove distant creatures
    gameState.creatures = gameState.creatures.filter(obj => {
        if (obj.position.z > 50 || obj.position.z < -200) {
            gameState.scene.remove(obj);
            return false;
        }
        return true;
    });
}

function updateCamera() {
    // Dynamic camera positioning
    const targetCameraPos = new THREE.Vector3(
        gameState.player.position.x * 0.3,
        gameState.player.position.y * 0.3 + 6,
        15
    );
    
    // Smooth camera movement
    gameState.camera.position.lerp(targetCameraPos, 0.05);
    
    // Camera sway for immersion
    gameState.camera.position.x += Math.sin(gameState.elapsedTime * 0.5) * 0.1;
    gameState.camera.position.y += Math.cos(gameState.elapsedTime * 0.3) * 0.1;
    
    // Speed-based effects
    if (gameState.speed > 2) {
        // Camera shake at high speed
        gameState.camera.position.x += (Math.random() - 0.5) * gameState.speed * 0.01;
        gameState.camera.position.y += (Math.random() - 0.5) * gameState.speed * 0.01;
        
        // FOV change
        gameState.camera.fov = 80 + (gameState.speed - 2) * 5;
        gameState.camera.updateProjectionMatrix();
    } else {
        // Reset FOV
        gameState.camera.fov = 80;
        gameState.camera.updateProjectionMatrix();
    }
    
    // Look at player with offset
    const lookTarget = new THREE.Vector3(
        gameState.player.position.x * 0.1,
        gameState.player.position.y * 0.1,
        -10
    );
    gameState.camera.lookAt(lookTarget);
}

function updateUI() {
    // Update score with animation
    const scoreElement = document.getElementById('score');
    const displayScore = Math.floor(gameState.score);
    if (parseInt(scoreElement.textContent) !== displayScore) {
        scoreElement.textContent = displayScore;
        scoreElement.parentElement.classList.add('boost');
        setTimeout(() => scoreElement.parentElement.classList.remove('boost'), 300);
    }
    
    // Update speed
    document.getElementById('speed').textContent = Math.floor(gameState.speed * 50);
    if (gameState.boosting) {
        document.getElementById('speedElement').classList.add('boost');
    } else {
        document.getElementById('speedElement').classList.remove('boost');
    }
    
    // Update distance
    document.getElementById('distance').textContent = Math.floor(gameState.distance);
    
    // Update combo
    document.getElementById('combo').textContent = `x${gameState.combo}`;
    
    // Update speed lines effect
    updateSpeedLines();
    
    // Update minimap
    updateMinimap();
    
    // Check leaderboard position
    checkLeaderboardPosition();
}

function updateSpeedLines() {
    const speedEffect = document.getElementById('speedEffect');
    const speedLines = speedEffect.querySelectorAll('.speedLine');
    
    speedLines.forEach((line, index) => {
        if (gameState.speed > 1.5) {
            const opacity = Math.min(1, (gameState.speed - 1.5) * 0.5);
            line.style.opacity = opacity;
            line.style.animation = `speedRush ${1 / gameState.speed}s linear infinite`;
            line.style.animationDelay = `${index * 0.05}s`;
        } else {
            line.style.opacity = '0';
            line.style.animation = 'none';
        }
    });
}

function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    gameState.leaderboard.forEach((entry, index) => {
        const div = document.createElement('div');
        div.className = 'leaderboardEntry';
        if (entry.isPlayer) div.classList.add('player');
        
        div.innerHTML = `
            <span>${index + 1}. ${entry.name}</span>
            <span>${entry.score.toLocaleString()}</span>
        `;
        
        leaderboardList.appendChild(div);
    });
}

function checkLeaderboardPosition() {
    // Check if player has beaten any scores
    let playerPosition = -1;
    for (let i = 0; i < gameState.leaderboard.length; i++) {
        if (gameState.score > gameState.leaderboard[i].score) {
            playerPosition = i;
            break;
        }
    }
    
    if (playerPosition !== -1 && !gameState.leaderboard.find(e => e.isPlayer)) {
        // Insert player into leaderboard
        gameState.leaderboard.splice(playerPosition, 0, {
            name: "YOU",
            score: Math.floor(gameState.score),
            isPlayer: true
        });
        
        // Keep only top 5
        if (gameState.leaderboard.length > 5) {
            gameState.leaderboard.pop();
        }
        
        updateLeaderboard();
    } else if (gameState.leaderboard.find(e => e.isPlayer)) {
        // Update player score
        const playerEntry = gameState.leaderboard.find(e => e.isPlayer);
        playerEntry.score = Math.floor(gameState.score);
        
        // Re-sort
        gameState.leaderboard.sort((a, b) => b.score - a.score);
        updateLeaderboard();
    }
}

function animate() {
    if (!gameState.gameStarted) return;
    
    requestAnimationFrame(animate);
    
    // Update time
    gameState.deltaTime = Math.min(gameState.clock.getDelta(), 0.1);
    gameState.elapsedTime = gameState.clock.getElapsedTime();
    
    // Update game systems
    updatePlayer();
    checkCollisions();
    updateEnvironment();
    updateCamera();
    updateUI();
    
    // Update player glow intensity based on speed
    if (gameState.player && gameState.player.children[1]) {
        const glowIntensity = 0.5 + (gameState.speed / gameState.maxSpeed) * 0.5;
        gameState.player.children[1].material.uniforms.intensity.value = glowIntensity;
    }
    
    // Update particle emitter
    if (gameState.player && gameState.player.children[2]) {
        const emitter = gameState.player.children[2];
        if (emitter.userData.particles) {
            emitter.userData.particles.forEach((particle, index) => {
                particle.position.z += gameState.speed * gameState.deltaTime * 10;
                particle.life -= gameState.deltaTime;
                particle.material.opacity = particle.life;
                particle.scale.multiplyScalar(0.95);
                
                if (particle.life <= 0) {
                    emitter.remove(particle);
                    emitter.userData.particles.splice(index, 1);
                }
            });
        }
    }
    
    // Render scene
    gameState.renderer.render(gameState.scene, gameState.camera);
}

function onWindowResize() {
    gameState.camera.aspect = window.innerWidth / window.innerHeight;
    gameState.camera.updateProjectionMatrix();
    gameState.renderer.setSize(window.innerWidth, window.innerHeight);
}

    });
