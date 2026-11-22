import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function ribbon(curve, width, elevation, material, segments = 360) {
  const positions = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    for (const side of [-1, 1]) positions.push(p.x + normal.x * width * side / 2, elevation, p.z + normal.z * width * side / 2);
    if (i < segments) { const j = i * 2; indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

export default function Track({ paused, jump, onStage, onLap, onReady }) {
  const mount = useRef(null);
  const state = useRef({ paused, jump, onStage, onLap, onReady });
  state.current = { paused, jump, onStage, onLap, onReady };

  useEffect(() => {
    const host = mount.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { state.current.onReady(false); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(11, 13.5, 16.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.4;
    controls.maxPolarAngle = 1.2;
    controls.minAzimuthAngle = -0.3;
    controls.maxAzimuthAngle = 1.4;
    controls.target.set(0, 0, 0);
    const ambient = new THREE.HemisphereLight(0xffffff, 0x67755b, 3);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfffced, 4);
    sun.position.set(-5, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, far: 40 });
    sun.shadow.normalBias = 0.03;
    scene.add(sun);

    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
    const groundMaterial = mat('#dfe7d4');
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 8.8, 0.36, 96), groundMaterial);
    ground.scale.set(1, 1, 0.66);
    ground.position.y = -0.34;
    ground.receiveShadow = true;
    scene.add(ground);
    const islandEdge = new THREE.Mesh(new THREE.CylinderGeometry(8.85, 8.85, 0.08, 96), mat('#b7c8a8'));
    islandEdge.scale.set(1, 1, 0.66);
    islandEdge.position.y = -0.53;
    scene.add(islandEdge);
    const points = [[-6.4,-1.8],[-4.3,-3.5],[-1.8,-3.5],[0,-1.9],[2.3,-3.1],[5.4,-2.8],[6.2,-0.7],[4.9,1.7],[2.7,2.4],[0.8,1.2],[-1.2,2.9],[-4.6,2.6],[-6.5,0.7]];
    const curve = new THREE.CatmullRomCurve3(points.map(([x,z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.3);
    const base = ribbon(curve, 1.24, -0.08, mat('#7c8c75', { side: THREE.DoubleSide }));
    base.receiveShadow = true;
    scene.add(base);
    const curb = ribbon(curve, 1.12, 0.015, mat('#f2f6e8', { side: THREE.DoubleSide }));
    scene.add(curb);
    // Alternating rumble strips follow the exact arc-length parameter of the road.
    const curbMat = mat('#b4d753');
    for (let i = 0; i < 180; i += 2) {
      const t = i / 180, p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.13, 0.015, 0.16), curbMat);
      strip.position.set(p.x, 0.025, p.z);
      strip.rotation.y = Math.atan2(tangent.x, tangent.z);
      scene.add(strip);
    }
    const road = ribbon(curve, 0.88, 0.05, mat('#344b40', { side: THREE.DoubleSide }));
    road.receiveShadow = true;
    scene.add(road);
    const dashMat = mat('#b7c6a3');
    for (let i = 0; i < 100; i++) {
      const t = i / 100, p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.008, 0.14), dashMat);
      dash.position.set(p.x, 0.063, p.z);
      dash.rotation.y = Math.atan2(tangent.x, tangent.z);
      scene.add(dash);
    }
    const start = curve.getPointAt(0), direction = curve.getTangentAt(0);
    const checker = new THREE.Group();
    for (let x = 0; x < 6; x++) for (let z = 0; z < 2; z++) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.14), mat((x + z) % 2 ? '#f9fae9' : '#142f27'));
      tile.position.set((x - 2.5) * 0.14, 0.073, (z - 0.5) * 0.14);
      checker.add(tile);
    }
    checker.position.set(start.x, 0, start.z);
    checker.rotation.y = Math.atan2(direction.x, direction.z);
    scene.add(checker);

    // Four illuminated beacons mark the campaign's four stages.
    const beacons = [];
    for (let i = 0; i < 4; i++) {
      const p = curve.getPointAt(i / 4), tangent = curve.getTangentAt(i / 4);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), mat('#819676'));
      pole.position.set(p.x + normal.x * 0.88, 0.5, p.z + normal.z * 0.88);
      scene.add(pole);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat('#deff7a', { emissive: '#a8cf51', emissiveIntensity: 0.4 }));
      cap.position.copy(pole.position).y = 1.1;
      scene.add(cap); beacons.push(cap);
    }
    const treePositions = [[-3.5,-1.5],[-3,-1.8],[-4.1,-1.3],[3.4,-1.3],[3.9,-1],[2.9,-1.5],[-1,0],[-1.5,-0.3],[5,0.1],[-5,0.5],[-4.4,0.7],[0.4,-3.6],[0.8,-3.8]];
    const leaves = mat('#74916a');
    for (const [index, [x,z]] of treePositions.entries()) {
      const h = 0.55 + (index % 3) * 0.14;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.05,0.28,7),mat('#7d8764'));
      trunk.position.set(x,0.1,z); scene.add(trunk);
      const tree = new THREE.Mesh(new THREE.ConeGeometry(0.25,h,7),leaves);
      tree.position.set(x,h/2+0.2,z); tree.castShadow=true; scene.add(tree);
    }
    // Low-profile pit buildings and solar roofs make the loop a miniature world.
    for (let i=0;i<4;i++) {
      const pit = new THREE.Mesh(new THREE.BoxGeometry(0.65,0.28,0.45),mat('#f2f3df'));
      pit.position.set(-2.9+i*0.7,0.08,-2.55); pit.castShadow=true; scene.add(pit);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.68,0.04,0.5),mat('#214d3d'));
      roof.position.set(pit.position.x,0.24,-2.55); scene.add(roof);
    }
    const centerRing = new THREE.Mesh(new THREE.TorusGeometry(0.65,0.08,8,40),mat('#b4cd8e'));
    centerRing.rotation.x=-Math.PI/2; centerRing.position.set(1.5,-0.1,-0.1); scene.add(centerRing);
    const car = new THREE.Group();
    const bodyMat = mat('#ddff71', { metalness: 0.25, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.17,0.1,0.42),bodyMat); body.position.y=0.15; body.castShadow=true;car.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.07,0.23),bodyMat); nose.position.set(0,0.12,0.27);car.add(nose);
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.085,12,8),mat('#163d30'));cockpit.scale.set(0.7,0.6,1);cockpit.position.set(0,0.23,-0.04);car.add(cockpit);
    for (const x of [-0.14,0.14]) for (const z of [-0.16,0.18]) {
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.065,12),mat('#142a23'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,0.11,z);car.add(wheel);
    }
    for(const z of [-0.26,0.36]){const wing=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.035,0.07),bodyMat);wing.position.set(0,0.18,z);car.add(wing);}
    scene.add(car);

    const resize = () => { const w=host.clientWidth, h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix(); };
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    let visible = true;
    const intersection=new IntersectionObserver(([entry]) => { visible=entry.isIntersecting; });intersection.observe(host);
    let frame, previous=performance.now(), progress=0.025, lastStage=-1, lastJump=null;
    const tick=(now)=>{
      frame=requestAnimationFrame(tick);
      const delta=Math.min((now-previous)/1000,0.1);previous=now;
      if(!visible)return;
      if(state.current.jump && lastJump!==state.current.jump){progress=state.current.jump.stage/4+0.005;lastJump=state.current.jump;}
      if(!state.current.paused){progress+=delta/24;if(progress>=1){progress-=1;state.current.onLap();}}
      const stage=Math.floor(progress*4)%4;
      if(stage!==lastStage){lastStage=stage;state.current.onStage(stage);}
      const p=curve.getPointAt(progress%1),tangent=curve.getTangentAt(progress%1);
      car.position.set(p.x,0.04,p.z);car.rotation.y=Math.atan2(tangent.x,tangent.z);
      beacons.forEach((b,i)=>{b.scale.setScalar(i===stage?1.3:0.8);b.material.emissiveIntensity=i===stage?1:0.1;});
      controls.update();renderer.render(scene,camera);
    };
    frame=requestAnimationFrame(tick);state.current.onReady(true);
    const lost=(event)=>{event.preventDefault();state.current.onReady(false);};
    renderer.domElement.addEventListener('webglcontextlost',lost);
    return ()=>{
      cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost',lost);
      scene.traverse((object)=>{object.geometry?.dispose();if(object.material){for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});
      renderer.dispose();renderer.domElement.remove();
    };
  }, []);

  return <div className="track-canvas" ref={mount} role="img" aria-label="Interactive three-dimensional campaign race circuit. Drag to rotate the view. The car moves through Discover, Brief, Launch, and Measure." />;
}
